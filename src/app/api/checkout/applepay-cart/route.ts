import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, setMolliePaymentId } from "@/lib/store/orders";
import { createPayment } from "@/lib/payments";
import { checkStockForItems, shortageMessage } from "@/lib/live-stock";
import { verifyOrderTotal } from "@/lib/checkout-pricing";
import { resolveCartColors } from "@/lib/paint-color-resolve";
import { resolveBaseSkus } from "@/lib/mengverf";
import { cartItemSchema } from "@/lib/checkout-schema";
import { shippingForCountry } from "@/lib/shipping";
import type { CartItem, OrderCustomer } from "@/types";

const r2 = (n: number) => Math.round(n * 100) / 100;

export const runtime = "nodejs";

/**
 * Apple Pay Direct vanuit de checkout — voor de HELE winkelwagen (express-knop
 * bovenaan de checkout). De client levert in `onpaymentauthorized` de payment-
 * token + het door Apple verzamelde contact/bezorgadres. We bouwen de order
 * server-side uit de meegestuurde cart + bedragen (niet manipuleerbaar) en maken
 * via Mollie een betaling met de Apple Pay-token. Zo hoeft de klant geen
 * formulier in te vullen: Apple levert naam, e-mail én bezorgadres.
 *
 * Tegenhanger van /api/checkout/applepay-pay (die voor één PDP-product is).
 */

const bodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
  kluspasSavings: z.number(),
  token: z.unknown(),
  // Apple Pay shippingContact — losjes getypeerd; defensief uitgelezen.
  contact: z.any(),
  ga: z
    .object({
      clientId: z.string().optional(),
      sessionId: z.string().optional(),
      gclid: z.string().optional(),
      consent: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Ongeldige Apple Pay-gegevens" }, { status: 400 });
    }
    const data = parsed.data;

    // Kleurcontrole: de kleur op de regel bepaalt wat de winkel mengt en komt
    // van de client, dus we zoeken 'm opnieuw op. Dit stond alleen in
    // create-payment, terwijl Apple Pay net zo goed een echte order aanmaakt —
    // een gemanipuleerde of verouderde regel kwam er hier dus ongezien door.
    // Zie lib/paint-color-resolve.ts.
    const kleuren = await resolveCartColors(data.items as CartItem[]);
    if (kleuren.fout) {
      return NextResponse.json({ ok: false, error: kleuren.fout }, { status: 409 });
    }
    // Mengverf: boek af van het basisartikel dat er écht in gaat, niet van de
    // variant waarop de klant klikte. Zie lib/mengverf.ts.
    const items = (await resolveBaseSkus(kleuren.items)).items;

    // 1. Klantgegevens uit het Apple Pay-contact (naam, e-mail, bezorgadres).
    //
    // Bewust vóór de prijscontrole: het bezorgland bepaalt de verzendkosten, en
    // zonder dat land toetste die controle een Belgische order tegen het
    // Nederlandse tarief.
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
      street: (contact.addressLines ?? []).join(" ").trim(),
      postalCode: contact.postalCode ?? "",
      city: contact.locality ?? "",
      country: (contact.countryCode || "NL").toUpperCase(),
    };

    // 2. Verzendkosten herrekenen op het land uit het wallet-adres.
    //
    // De browser stuurt `data.shipping` mee, maar die kwam uit de winkelwagen en
    // die rekent met het Nederlandse tarief — het bezorgadres is daar nog niet
    // bekend. Een Belgische wallet-klant belandde zo op € 4,95 in plaats van
    // € 7,95: te weinig geïnd, en een orderbedrag dat niet strookt met wat
    // Tilroy uitrekent. De sheet toont dit bedrag inmiddels ook (zie
    // onshippingcontactselected in express-checkout.tsx), dus de klant keurt
    // hetzelfde goed als wat hier wordt vastgelegd.
    const verzend = shippingForCountry(data.subtotal, customer.country, {});
    const totaal = r2(data.subtotal + verzend);

    // Prijscontrole: het client-totaal is manipuleerbaar en veroudert met de
    // winkelwagen; zie lib/checkout-pricing.ts. Toetst op ons eigen herberekende
    // totaal, met het land erbij zodat het Belgische tarief geldig is.
    const prijs = verifyOrderTotal({
      items,
      total: totaal,
      country: customer.country,
      freeShipping: verzend === 0,
    });
    if (!prijs.ok) {
      return NextResponse.json({ ok: false, error: prijs.message }, { status: 409 });
    }

    // Voorraad-guard (Nijverdal): zie lib/live-stock.ts. Fail-open bij storing.
    const shortages = await checkStockForItems(items);
    if (shortages.length) {
      return NextResponse.json(
        { ok: false, error: shortageMessage(shortages), shortages },
        { status: 409 },
      );
    }

    // 3. Order vastleggen uit de meegestuurde winkelwagen (status "open").
    const order = await createOrder({
      customer,
      // De opgezochte regels: de kleur op de order is onze eigen versie.
      items,
      subtotal: data.subtotal,
      shipping: verzend,
      total: totaal,
      kluspasSavings: data.kluspasSavings,
      paymentMethod: "applepay",
      ga: data.ga,
    });

    // 3. Mollie-betaling met de Apple Pay-token.
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
      // Ons eigen totaal, niet dat van de browser — anders legt de order een
      // ander bedrag vast dan Mollie int.
      amount: totaal,
      method: "applepay",
      applePayToken: JSON.stringify(data.token),
      baseUrl: origin,
      billingAddress,
    });

    if (payment.molliePaymentId) {
      await setMolliePaymentId(order.id, payment.molliePaymentId);
    }

    return NextResponse.json({ ok: true, orderId: order.id, reference: order.reference });
  } catch (err) {
    console.error("[api/checkout/applepay-cart]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
