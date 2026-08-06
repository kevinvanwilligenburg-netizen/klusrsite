import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, setMolliePaymentId } from "@/lib/store/orders";
import { createPayment } from "@/lib/payments";
import { getProductById } from "@/lib/data/products";
import { shippingForCountry } from "@/lib/shipping";
import { checkStockForItems, shortageMessage } from "@/lib/live-stock";
import { resolveCartColors } from "@/lib/paint-color-resolve";
import { resolveBaseSkus } from "@/lib/mengverf";
import type { CartItem, OrderCustomer } from "@/types";

export const runtime = "nodejs";

/**
 * Apple Pay Direct — afronding (stap 2 van de native Apple Pay-flow).
 *
 * De client levert in `onpaymentauthorized` de payment-token + het door Apple
 * verzamelde contact/bezorgadres aan. We bouwen hier server-side de order op
 * (zodat de bedragen niet manipuleerbaar zijn) en maken via Mollie een betaling
 * met de Apple Pay-token. Verzendkosten worden — net als op de client-sheet —
 * altijd voor NL berekend, zodat het totaal exact overeenkomt.
 */

const colorSchema = z
  .object({
    name: z.string(),
    code: z.string(),
    hex: z.string(),
    collection: z.string().optional(),
  })
  .nullable()
  .optional();

const bodySchema = z.object({
  productId: z.string(),
  variantId: z.string(),
  quantity: z.number().int().positive(),
  color: colorSchema,
  token: z.unknown(),
  // Apple Pay shippingContact — losjes getypeerd; we lezen de velden defensief uit.
  contact: z.any(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Ongeldige Apple Pay-gegevens" },
        { status: 500 },
      );
    }
    const data = parsed.data;

    // 1. Product + variant opzoeken (terugval op de eerste variant).
    const product = getProductById(data.productId);
    if (!product) {
      return NextResponse.json({ ok: false, error: "Product niet gevonden" }, { status: 400 });
    }
    const variant =
      product.variants.find((v) => v.id === data.variantId) ?? product.variants[0];
    if (!variant) {
      return NextResponse.json({ ok: false, error: "Variant niet gevonden" }, { status: 400 });
    }

    // 2. Eventuele gekozen kleur. De Apple Pay-sheet rekent met de kale
    //    variantprijs, zodat de regel exact op `subtotal` aansluit; er is ook
    //    geen basistoeslag om mee te tellen. De kleur zelf wordt hieronder
    //    gecontroleerd (stap 3a).
    const color = data.color ?? undefined;

    // 3. Regel opbouwen (zelfde vorm als create-payment verwacht).
    const cartItem: CartItem = {
      key: [product.id, variant.id, color?.code ?? "default"].join("__"),
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      brand: product.brand,
      image: product.images[0],
      variantLabel: variant.label,
      slug: product.slug,
      gtin: product.gtin,
      quantity: data.quantity,
      price: variant.price,
      kluspasPrice: variant.kluspasPrice,
      selectedColor: color,
    };

    // 3a. Kleurcontrole. De kleur komt van de client en bepaalt wat de winkel
    // mengt, dus we zoeken 'm opnieuw op in onze eigen bron — hij stond hier als
    // "alleen ter info", maar hij belandt wel degelijk op de order. Het opzoeken
    // levert meteen de mengbasis, die deze route helemaal niet kende, en daarmee
    // de sku van het basisartikel waarvan Tilroy moet afboeken.
    const kleuren = await resolveCartColors([cartItem]);
    if (kleuren.fout) {
      return NextResponse.json({ ok: false, error: kleuren.fout }, { status: 409 });
    }
    const [regel] = (await resolveBaseSkus(kleuren.items)).items;

    // 3b. Voorraad-guard (Nijverdal): zie lib/live-stock.ts. Fail-open bij storing.
    const shortages = await checkStockForItems([regel]);
    if (shortages.length) {
      return NextResponse.json(
        { ok: false, error: shortageMessage(shortages), shortages },
        { status: 409 },
      );
    }

    // 4. Klantgegevens uit het Apple Pay-contact.
    const contact = (data.contact ?? {}) as {
      givenName?: string;
      familyName?: string;
      emailAddress?: string;
      phoneNumber?: string;
      addressLines?: string[];
      postalCode?: string;
      locality?: string;
      countryCode?: string;
    };
    const customer: OrderCustomer = {
      firstName: contact.givenName ?? "",
      lastName: contact.familyName ?? "",
      email: contact.emailAddress ?? "",
      phone: contact.phoneNumber,
      street: contact.addressLines?.[0] ?? "",
      postalCode: contact.postalCode ?? "",
      city: contact.locality ?? "",
      country: (contact.countryCode || "NL").toUpperCase(),
    };

    // 5. Bedragen: verzendkosten voor het land uit het wallet-adres.
    //
    // Stond hier eerst hard op "NL". Het adres hierboven komt wél uit de wallet,
    // dus een Belgische klant kreeg een Belgisch bezorgadres met het Nederlandse
    // tarief: € 4,95 in plaats van € 7,95. Drie euro te weinig, en een
    // orderbedrag dat niet strookt met wat Tilroy uitrekent — waardoor elke
    // Belgische order onder € 59 daar als onbruikbare draft blijft staan.
    const subtotal = variant.price * data.quantity;
    const shipping = shippingForCountry(subtotal, customer.country, {});
    const total = subtotal + shipping;

    // 6. Order vastleggen (status "open").
    const order = await createOrder({
      customer,
      items: [regel],
      subtotal,
      shipping,
      total,
      kluspasSavings: 0,
      paymentMethod: "applepay",
    });

    // 7. Mollie-betaling met de Apple Pay-token. Factuuradres zoals create-payment.
    const origin =
      req.headers.get("origin") ||
      (() => {
        try {
          return new URL(req.url).origin;
        } catch {
          return undefined;
        }
      })();

    const billingAddress = {
      givenName: customer.firstName,
      familyName: customer.lastName,
      email: customer.email,
      streetAndNumber: customer.street,
      postalCode: customer.postalCode,
      city: customer.city,
      country: (customer.country || "NL").toUpperCase().slice(0, 2),
    };

    const payment = await createPayment({
      orderId: order.id,
      reference: order.reference,
      amount: total,
      method: "applepay",
      applePayToken: JSON.stringify(data.token),
      baseUrl: origin,
      billingAddress,
    });

    if (payment.molliePaymentId) {
      await setMolliePaymentId(order.id, payment.molliePaymentId);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      reference: order.reference,
    });
  } catch (err) {
    // Faal hard maar netjes: de client breekt de Apple Pay-sheet af (STATUS_FAILURE).
    console.error("[api/checkout/applepay-pay]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
