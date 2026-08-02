import { NextResponse } from "next/server";
import { getOrderByReference, updateOrderStatus, markCanceledMailSent } from "@/lib/store/orders";
import { reverseOrderSale } from "@/lib/store/stock-ledger";
import { sendAnnulering } from "@/lib/email";
import { controleerWebhookSleutel } from "@/lib/webhook-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Het dashboard meldt hier dat een bestelling is geannuleerd.
 *
 *   POST { reference: "KLR-345110", reden: "…", terugbetaald: 4.35 }
 *   Authorization: Bearer <SITE_API_KEY>
 *
 * **Wat wij wél doen:** de order op geannuleerd zetten, ons eigen
 * voorraad-grootboek terugdraaien en de klant mailen.
 *
 * **Wat wij bewust NIET doen:**
 *
 *  - *terugbetalen.* Het dashboard maakt de Mollie-refund aan; die heeft de
 *    sleutel en de `molliePaymentId`. Geld op één plek houden betekent één
 *    systeem dat kan terugbetalen en één plek waar de idempotentie zit. Het
 *    bedrag komt hier alleen mee zodat we het in de mail kunnen noemen.
 *
 *    ⚠️ `terugbetaald` is wat teruggestort *gaat worden*, niet wat al terug is.
 *    Het dashboard annuleert eerst in Tilroy, licht dan ons in, en betaalt pás
 *    daarna terug — Mollie kent geen idempotency-key op refunds, dus twee keer
 *    posten is twee keer geld terug, en daarom staat de onomkeerbare stap
 *    achteraan. De klantmail spreekt dus in de toekomende tijd.
 *  - *de voorraad in Tilroy corrigeren.* Dat doet het dashboard met
 *    `POST /orders/{orderId}/cancel`. Zouden wij daar óók aankomen, dan boeken
 *    we dubbel terug en staat er meer op voorraad dan er ligt.
 *
 * Idempotent op de referentie: het dashboard mag opnieuw aanroepen, maar
 * dezelfde klant mag niet twee keer een annuleringsmail krijgen.
 */
export async function POST(req: Request) {
  const geweigerd = controleerWebhookSleutel(req);
  if (geweigerd) return geweigerd;

  let body: { reference?: string; reden?: string; terugbetaald?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const reference = String(body.reference ?? "").trim().toUpperCase();
  const reden = String(body.reden ?? "").trim() || undefined;
  const terugbetaald =
    typeof body.terugbetaald === "number" && body.terugbetaald > 0 ? body.terugbetaald : undefined;

  if (!reference) {
    return NextResponse.json({ error: "reference ontbreekt." }, { status: 400 });
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    return NextResponse.json({ error: "Bestelling onbekend." }, { status: 404 });
  }

  if (order.canceledMailSentAt) {
    return NextResponse.json({ ok: true, alGemeld: true });
  }

  // Voorraad terugdraaien vóór de statuswijziging: reverseOrderSale leest de
  // betaalstatus om te bepalen of er überhaupt is afgeboekt, en die is straks
  // "canceled". Alleen ons eigen grootboek — Tilroy doet het dashboard.
  await reverseOrderSale(order);

  const bijgewerkt = await updateOrderStatus(order.id, "canceled");
  const doel = bijgewerkt ?? order;

  // Mail pas markeren als hij écht weg is; anders eet een mailstoring de
  // melding op en denkt het dashboard bij een herhaling dat het gemeld is.
  let gemaild = false;
  try {
    const res = await sendAnnulering({ order: doel, reden, terugbetaald });
    gemaild = res.ok;
    if (res.ok) await markCanceledMailSent(order.id);
  } catch (e) {
    console.error(`[geannuleerd] mail mislukt voor ${reference}:`, e);
  }

  return NextResponse.json({
    ok: true,
    reference,
    status: doel.paymentStatus,
    voorraadTeruggedraaid: true,
    gemaild,
  });
}
