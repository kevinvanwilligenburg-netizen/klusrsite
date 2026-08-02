import { NextResponse } from "next/server";
import { getOrderByReference, setShipped, markShippedMailSent } from "@/lib/store/orders";
import { sendShippingConfirmation } from "@/lib/email";
import { controleerWebhookSleutel } from "@/lib/webhook-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Het dashboard meldt hier dat er een verzendlabel is aangemaakt.
 *
 *   POST { reference: "KLR-345110", carrier: "dhl", trackTrace: "3S..." }
 *   Authorization: Bearer <SITE_API_KEY>
 *
 * Waarom dit er niet was en had moeten zijn: de DHL-labels worden in het
 * dashboard gemaakt, niet bij ons. Onze eigen `/api/admin/postnl-label` was
 * daardoor de énige plek die `setShipped` en de track&trace-mail aanriep — en
 * die draait alleen voor PostNL. Elke met DHL verzonden bestelling bleef dus op
 * "Betaald" staan en de klant hoorde nooit dat zijn pakket onderweg was. Het
 * dashboard belde bovendien naar een env-var die nergens gezet was, en die
 * aanroep is fire-and-forget, dus er kwam ook geen foutmelding. Dat is precies
 * de faalvorm waar we vandaag al vaker tegenaan liepen: stil niets doen.
 *
 * ⚠️ Idempotent op de referentie. Het dashboard mag opnieuw aanroepen als wij
 * even plat lagen, maar dezelfde klant mag niet twee keer horen dat zijn pakket
 * onderweg is. Bij een ongewijzigde code én een al verstuurde mail antwoorden
 * we gewoon 200 met `alGemeld: true`.
 */
export async function POST(req: Request) {
  const geweigerd = controleerWebhookSleutel(req);
  if (geweigerd) return geweigerd;

  let body: { reference?: string; carrier?: string; trackTrace?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const reference = String(body.reference ?? "").trim().toUpperCase();
  const trackTrace = String(body.trackTrace ?? "").trim();
  const carrier = body.carrier === "postnl" ? "postnl" : "dhl";

  if (!reference) {
    return NextResponse.json({ error: "reference ontbreekt." }, { status: 400 });
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    // 404 en niet 200: het dashboard mag weten dat deze bestelling hier niet
    // bestaat. Anders zoekt niemand ooit uit waarom die mail uitbleef — zoals
    // nu maandenlang is gebeurd.
    return NextResponse.json({ error: "Bestelling onbekend." }, { status: 404 });
  }

  const zelfdeCode = (order.shipment?.trackTrace ?? "") === trackTrace;
  if (order.shippedMailSentAt && zelfdeCode) {
    return NextResponse.json({ ok: true, alGemeld: true });
  }

  // setShipped schuift de status alleen op bij een betaalde/geautoriseerde
  // bestelling — een label bij een openstaande betaling is een fout die we niet
  // moeten wegpoetsen.
  const bijgewerkt = await setShipped(order.id, {
    ...(order.shipment ?? {}),
    // Bij DHL is de track&trace-code tevens de barcode; het dashboard stuurt
    // alleen die code mee. Een bestaande barcode laten we staan.
    barcode: order.shipment?.barcode || trackTrace,
    ...(trackTrace ? { trackTrace } : {}),
    carrier,
    // Het dashboard maakt het label, dus dít is het moment waarop het bestaat.
    // Een eerder vastgelegde tijd laten we staan.
    labelCreatedAt: order.shipment?.labelCreatedAt ?? new Date().toISOString(),
  });

  const doel = bijgewerkt ?? order;

  // Mail pas markeren als hij écht weg is; anders eet een mailstoring de
  // melding stilzwijgend op en krijgt de klant nooit iets.
  let gemaild = false;
  try {
    const res = await sendShippingConfirmation(doel);
    gemaild = res.ok;
    if (res.ok) await markShippedMailSent(order.id);
  } catch (e) {
    console.error(`[verzonden] mail mislukt voor ${reference}:`, e);
  }

  return NextResponse.json({
    ok: true,
    reference,
    status: doel.paymentStatus,
    trackTrace: doel.shipment?.trackTrace ?? null,
    gemaild,
  });
}
