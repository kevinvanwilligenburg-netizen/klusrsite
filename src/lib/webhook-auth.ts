import { NextResponse } from "next/server";

/**
 * Gedeelde toegangscontrole voor webhooks die het VDM-dashboard bij ons
 * aanroept (verzendmelding, en straks waarschijnlijk annuleringen).
 *
 * Bewust apart: de dashboard-sessie kondigde al een tweede endpoint in dezelfde
 * stijl aan. Eén plek voor de sleutelcontrole betekent dat een fout hier ook
 * maar één keer gemaakt kan worden.
 *
 * Zonder `SITE_API_KEY` antwoorden we 503 en niet 200: een webhook die stil
 * doet alsof hij werkt terwijl er niets gebeurt, is precies hoe deze koppeling
 * maandenlang onopgemerkt kapot heeft gestaan.
 */
export function controleerWebhookSleutel(req: Request): NextResponse | null {
  const sleutel = process.env.SITE_API_KEY;
  if (!sleutel) {
    console.error("[webhook] SITE_API_KEY ontbreekt; aanvraag geweigerd.");
    return NextResponse.json({ error: "Niet geconfigureerd." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${sleutel}`) {
    return NextResponse.json({ error: "Niet toegestaan." }, { status: 401 });
  }
  return null;
}
