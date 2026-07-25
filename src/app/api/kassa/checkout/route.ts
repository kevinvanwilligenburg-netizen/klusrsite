import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import type { CartItem, OrderCustomer } from "@/types";
import { resolveLine } from "@/lib/pos-catalog";
import { getQuickKeys } from "@/lib/store/pos-quickkeys";
import { posLinePrice, posTotals, changeFor, type PosTotalsLine } from "@/lib/pos";
import { createOrder, setMolliePaymentId, updateOrderStatus } from "@/lib/store/orders";
import { createTerminalPayment } from "@/lib/payments";
import { recordOrderSale } from "@/lib/store/stock-ledger";
import { receiptDataForOrder } from "@/lib/pos-receipt";
import { persistOrderCustomer } from "@/lib/pos-customer";
import { PRIMARY_STORE_ID } from "@/lib/stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        quantity: z.number().int().positive().max(999),
        discountPct: z.number().min(0).max(100).optional(),
      }),
    )
    .optional(),
  // Losse regels via een snelknop (toeslag/korting). Bedrag + soort worden
  // server-zijdig uit de opgeslagen snelknop afgeleid — nooit van de client.
  adhocLines: z
    .array(
      z.object({
        quickKeyId: z.string().min(1),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .optional(),
  mode: z.enum(["particulier", "kluspas", "zakelijk"]),
  method: z.enum(["cash", "terminal", "pin", "manual"]),
  cashGiven: z.number().nonnegative().optional(),
  storeId: z.string().optional(),
  cashier: z.string().optional(),
  customer: z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      cocNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      /** Maak/koppel een KLUSRPAS-account aan deze klant. */
      createAccount: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige kassagegevens" }, { status: 400 });
  }
  const data = parsed.data;

  // 1. Regels server-autoritatief uit de catalogus opbouwen (prijzen nooit van
  //    de client vertrouwen).
  const items: CartItem[] = [];
  const totalLines: PosTotalsLine[] = [];
  const catalogLines = data.lines ?? [];
  for (let i = 0; i < catalogLines.length; i++) {
    const line = catalogLines[i];
    const found = resolveLine(line.productId, line.variantId);
    if (!found) {
      return NextResponse.json(
        { error: `Product niet gevonden (${line.productId}).` },
        { status: 400 },
      );
    }
    const { product, variant } = found;
    const pricing = posLinePrice(
      { price: variant.price, kluspasPrice: variant.kluspasPrice },
      data.mode,
      line.discountPct ?? 0,
    );
    items.push({
      key: `${variant.id}-${i}`,
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      brand: product.brand,
      image: (product.images ?? []).find((u) => /^https?:\/\//.test(u)) ?? "",
      variantLabel: variant.label,
      slug: product.slug,
      gtin: product.gtin,
      quantity: line.quantity,
      // Beide prijzen op de gerekende stuksprijs zetten → ondubbelzinnige totalen.
      price: pricing.unit,
      kluspasPrice: pricing.unit,
    });
    totalLines.push({ unit: pricing.unit, normalUnit: pricing.normalUnit, quantity: line.quantity });
  }

  // 1b. Losse regels (toeslag/korting) — bedrag + label uit de opgeslagen snelknop.
  if (data.adhocLines?.length) {
    const keys = await getQuickKeys();
    for (let j = 0; j < data.adhocLines.length; j++) {
      const al = data.adhocLines[j];
      const key = keys.find((k) => k.id === al.quickKeyId);
      if (!key || (key.kind !== "surcharge" && key.kind !== "discount")) {
        return NextResponse.json({ error: "Onbekende snelknop." }, { status: 400 });
      }
      const amt = Math.round((key.amount ?? 0) * 100) / 100;
      const unit = key.kind === "discount" ? -amt : amt;
      items.push({
        key: `adhoc-${key.id}-${j}`,
        productId: "pos-adhoc",
        variantId: "", // geen voorraad-afboeking (grootboek slaat lege variantId over)
        title: key.label,
        brand: "",
        image: "",
        variantLabel: "",
        slug: "",
        quantity: al.quantity,
        price: unit,
        kluspasPrice: unit,
      });
      totalLines.push({ unit, normalUnit: unit, quantity: al.quantity });
    }
  }

  if (!items.length) {
    return NextResponse.json({ error: "Geen verkoopregels." }, { status: 400 });
  }

  const totals = posTotals(totalLines);
  const isCash = data.method === "cash";
  const change = isCash ? changeFor(totals.total, data.cashGiven ?? 0) : undefined;

  // 2. Klant (optioneel) — anders een nette toonbank-pseudoklant. Zakelijke
  //    velden (bedrijf/KVK/btw) worden meegenomen → ProfPas + klanthistorie.
  const cust = data.customer;
  const customer: OrderCustomer = {
    email: (cust?.email ?? "").trim(),
    firstName: cust?.firstName?.trim() || "Toonbank",
    lastName: cust?.lastName?.trim() || "verkoop",
    street: "",
    postalCode: "",
    city: "",
    country: "NL",
    ...(cust?.phone?.trim() ? { phone: cust.phone.trim() } : {}),
    ...(cust?.company?.trim() ? { company: cust.company.trim() } : {}),
    ...(cust?.cocNumber?.trim() ? { cocNumber: cust.cocNumber.trim() } : {}),
    ...(cust?.vatNumber?.trim() ? { vatNumber: cust.vatNumber.trim() } : {}),
  };

  const storeId = data.storeId?.trim() || PRIMARY_STORE_ID;

  // 3. Order aanmaken (kanaal "pos").
  const order = await createOrder({
    customer,
    items,
    subtotal: totals.subtotal,
    shipping: 0,
    total: totals.total,
    kluspasSavings: totals.savings,
    paymentMethod: data.method,
    channel: "pos",
    pos: {
      storeId,
      cashier: data.cashier?.trim() || undefined,
      method: data.method,
      ...(isCash ? { cashGiven: data.cashGiven ?? 0, change: change ?? 0 } : {}),
    },
  });

  // Klant vastleggen (profiel + evt. KLUSRPAS-account) zodat de winkelaankoop in
  // dezelfde klanthistorie/het account belandt als de webshop. Best-effort.
  if (customer.email) {
    void persistOrderCustomer(customer, cust?.createAccount).catch(() => {});
  }

  // 4. Betaling afhandelen.
  if (data.method === "terminal") {
    // Mollie Point-of-Sale: bedrag verschijnt op de pinautomaat; kassa pollt.
    const origin = req.headers.get("origin") || new URL(req.url).origin;
    const pay = await createTerminalPayment({
      amount: totals.total,
      description: `KLUSR kassa ${order.reference}`,
      orderId: order.id,
      reference: order.reference,
      baseUrl: origin,
    });
    if (pay.molliePaymentId) await setMolliePaymentId(order.id, pay.molliePaymentId);
    if (pay.demo) {
      // Geen terminal gekoppeld → meteen als betaald afronden (demo).
      const paid = (await updateOrderStatus(order.id, "paid")) ?? order;
      await recordOrderSale(paid);
      return NextResponse.json({
        orderId: order.id,
        reference: order.reference,
        status: "paid",
        demo: true,
        change,
        receipt: receiptDataForOrder(paid),
      });
    }
    await updateOrderStatus(order.id, "pending");
    return NextResponse.json({
      orderId: order.id,
      reference: order.reference,
      status: "pending",
      paymentId: pay.molliePaymentId,
      change,
      receipt: receiptDataForOrder({ ...order, paymentStatus: "pending" }),
    });
  }

  // Contant / los pinapparaat / handmatig → direct betaald.
  const paid = (await updateOrderStatus(order.id, "paid")) ?? order;
  await recordOrderSale(paid);
  return NextResponse.json({
    orderId: order.id,
    reference: order.reference,
    status: "paid",
    change,
    receipt: receiptDataForOrder(paid),
  });
}
