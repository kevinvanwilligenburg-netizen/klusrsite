import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, setMolliePaymentId, updateOrderStatus } from "@/lib/store/orders";
import { createPayment } from "@/lib/payments";
import { triggerCartReminder } from "@/lib/mailchimp";
import { fulfillPaidOrder, sendOrderConfirmationEmail } from "@/lib/order-fulfillment";
import { checkStockForItems, shortageMessage } from "@/lib/live-stock";
import { cartItemSchema } from "@/lib/checkout-schema";
import { deliveryTypeFor, SAME_DAY_SURCHARGE } from "@/lib/delivery";
import { verifyOrderTotal } from "@/lib/checkout-pricing";
import { resolveCartColors } from "@/lib/paint-color-resolve";
import { resolveBaseSkus } from "@/lib/mengverf";
import type { CartItem } from "@/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    street: z.string().min(1),
    postalCode: z.string().min(1),
    city: z.string().min(1),
    country: z.string().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    cocNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    billing: z
      .object({
        company: z.string().optional(),
        street: z.string(),
        postalCode: z.string(),
        city: z.string(),
      })
      .optional(),
  }),
  items: z.array(cartItemSchema).min(1),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
  surcharge: z.number().optional(),
  kluspasSavings: z.number(),
  method: z.string().optional(),
  issuer: z.string().optional(),
  cardToken: z.string().optional(),
  /** Wens van de klant: same-day tegen toeslag. De klok beslist of het kán. */
  sameDay: z.boolean().optional(),
  // GA4-attributie uit de cookies (op de client opgehaald) — voor de server-side
  // `purchase` (Measurement Protocol) vanuit de webhook. Volledig optioneel.
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
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ongeldige bestelgegevens", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // 0a. Kleurcontrole: de kiezer draait in de browser, dus naam/code/hex en de
    // mengbasis komen van de client. Die bepalen wat de winkel mengt, dus we
    // zoeken ze opnieuw op in onze eigen bron en rekenen verder met díé waarden.
    const kleuren = await resolveCartColors(data.items as CartItem[]);
    if (kleuren.fout) {
      return NextResponse.json({ error: kleuren.fout }, { status: 409 });
    }
    // 0a-bis. Mengverf: elke tinting-basis is in Tilroy een eigen artikel met
    // een eigen voorraad, maar onze import vouwt ze samen tot één variant per
    // maat. Zoek daarom op wélk basisartikel er gemengd wordt en zet díé sku op
    // de regel — anders boekt Tilroy van de lichte basis af terwijl de klant een
    // donkere kleur kocht. Kan pas hier: de basis volgt uit de zojuist
    // opgezochte kleur. Fail-safe: zonder treffer blijft de bestaande sku staan.
    const basissen = await resolveBaseSkus(kleuren.items);
    if (basissen.gezet) {
      console.info(`[checkout] mengverf: basis-sku gezet op ${basissen.gezet} regel(s)`);
    }
    const items = basissen.items;

    // 0b. Prijscontrole: het totaal komt uit de browser en is dus zowel te
    // manipuleren als te verouderen (de winkelwagen bewaart een
    // prijsmomentopname). We leiden het opnieuw af uit de catalogus en weigeren
    // bij afwijking, in plaats van een ander bedrag af te schrijven dan de klant
    // op zijn scherm zag. Op de opgezochte kleuren, zodat ook de basistoeslag
    // uit onze eigen tabel komt.
    const prijs = verifyOrderTotal({
      items,
      total: data.total,
      country: data.customer.country,
      sameDay: data.sameDay === true,
      freeShipping: data.shipping === 0,
    });
    if (!prijs.ok) {
      console.warn(
        `[checkout] totaal geweigerd: client € ${prijs.received}, catalogus € ${prijs.expected}`,
      );
      return NextResponse.json({ error: prijs.message }, { status: 409 });
    }

    // 0c. Voorraad-guard (Nijverdal, grootboek + live dashboard): voorkom dat
    // er wordt afgerekend voor meer dan we kunnen leveren. Fail-open bij
    // storingen — blokkeert alleen op een aantoonbaar tekort.
    const shortages = await checkStockForItems(items);
    if (shortages.length) {
      return NextResponse.json(
        { error: shortageMessage(shortages), shortages },
        { status: 409 },
      );
    }

    // 1. Persist the order (status "open"). De bezorgsoort leiden we hier af —
    // niet uit wat de client stuurt — zodat een verzoek buiten de cutoff nooit
    // een SDD-label kan afdwingen dat de rit naar het depot niet haalt.
    const deliveryType = deliveryTypeFor(data.sameDay === true);
    const order = await createOrder({
      customer: data.customer,
      // De opgezochte regels: de kleur op de order is onze eigen versie, niet
      // wat de browser aanleverde.
      items,
      subtotal: data.subtotal,
      shipping: data.shipping,
      total: data.total,
      kluspasSavings: data.kluspasSavings,
      paymentMethod: data.method,
      ga: data.ga,
      delivery: {
        type: deliveryType,
        ...(deliveryType === "same-day" ? { surcharge: SAME_DAY_SURCHARGE } : {}),
      },
    });

    // 2. Create the Mollie payment (or a simulated one in demo mode).
    const origin =
      req.headers.get("origin") ||
      (() => {
        try {
          return new URL(req.url).origin;
        } catch {
          return undefined;
        }
      })();

    // Factuuradres: het afwijkende factuuradres als dat is ingevuld, anders het
    // bezorgadres. organizationName (bedrijfsnaam) is verplicht voor Billie (B2B).
    const bill = data.customer.billing;
    const orgName = bill?.company || data.customer.company;
    const billingAddress = {
      ...(orgName ? { organizationName: orgName } : {}),
      givenName: data.customer.firstName,
      familyName: data.customer.lastName,
      email: data.customer.email,
      streetAndNumber: bill?.street || data.customer.street,
      postalCode: bill?.postalCode || data.customer.postalCode,
      city: bill?.city || data.customer.city,
      country: (data.customer.country || "NL").toUpperCase().slice(0, 2),
    };

    // Order-regels voor pay-later (Klarna): moeten exact optellen tot het totaal.
    // Altijd meesturen zodat pay-later op de gehoste Mollie-pagina beschikbaar is;
    // de regels worden alleen gebruikt als ze precies tot het totaal optellen,
    // zodat iDEAL/kaart nooit kan breken.
    const r2 = (n: number) => Math.round(n * 100) / 100;
    let lines: unknown[] | undefined;
    {
      const sumK = data.items.reduce((s, i) => s + r2(i.kluspasPrice) * i.quantity, 0);
      const sumN = data.items.reduce((s, i) => s + r2(i.price) * i.quantity, 0);
      const useK = Math.abs(r2(sumK) - r2(data.subtotal)) <= Math.abs(r2(sumN) - r2(data.subtotal));
      const vat = (tot: number) => r2(tot - r2(tot / 1.21));
      const all = data.items.map((i) => {
        const u = useK ? r2(i.kluspasPrice) : r2(i.price);
        const tot = r2(u * i.quantity);
        return {
          type: "physical",
          description: (i.title || "Artikel").slice(0, 100),
          quantity: i.quantity,
          unitPrice: { currency: "EUR", value: u.toFixed(2) },
          totalAmount: { currency: "EUR", value: tot.toFixed(2) },
          vatRate: "21.00",
          vatAmount: { currency: "EUR", value: vat(tot).toFixed(2) },
        };
      });
      const sumItems = all.reduce((s, l) => s + Number(l.totalAmount.value), 0);
      const ship = r2(data.total - sumItems);
      if (ship > 0) {
        all.push({
          type: "shipping_fee",
          description: "Verzendkosten",
          quantity: 1,
          unitPrice: { currency: "EUR", value: ship.toFixed(2) },
          totalAmount: { currency: "EUR", value: ship.toFixed(2) },
          vatRate: "21.00",
          vatAmount: { currency: "EUR", value: vat(ship).toFixed(2) },
        });
      }
      const linesSum = r2(all.reduce((s, l) => s + Number(l.totalAmount.value), 0));
      if (Math.abs(linesSum - r2(data.total)) < 0.005) lines = all;
    }

    const payment = await createPayment({
      orderId: order.id,
      reference: order.reference,
      amount: data.total,
      // Hosted-modus stuurt geen methode mee (data.method undefined) → Mollie
      // toont z'n eigen keuzescherm. De interne checkout (express) stuurt wél een
      // gekozen methode mee → Mollie gaat dan direct naar die methode.
      method: data.method,
      issuer: data.issuer,
      baseUrl: origin,
      cardToken: data.cardToken,
      billingAddress,
      lines,
    });

    if (payment.molliePaymentId) {
      await setMolliePaymentId(order.id, payment.molliePaymentId);
    }

    // In demo mode there is no webhook, so mark as paid and fulfil right away.
    if (payment.demo) {
      await updateOrderStatus(order.id, "paid");
      const paidOrder = { ...order, paymentStatus: "paid" as const };
      // Push the paid order to Channable → Tilroy (demo-safe).
      void fulfillPaidOrder(paidOrder).catch(() => {});
      // Send the branded order confirmation (Resend; no-op without a key).
      void sendOrderConfirmationEmail(paidOrder).catch(() => {});
    }

    // 3. Fire-and-forget abandoned-cart safety net (Mailchimp, demo-safe).
    void triggerCartReminder(data.customer.email).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      reference: order.reference,
      checkoutUrl: payment.checkoutUrl,
      demo: payment.demo,
    });
  } catch (err) {
    console.error("[api/checkout/create-payment]", err);
    // Toon de echte (Mollie) reden zodat fouten te diagnosticeren zijn.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Betaling aanmaken mislukt: ${detail}` },
      { status: 500 },
    );
  }
}
