import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Controleert een EU-btw-nummer bij VIES (de officiële dienst van de Europese
 * Commissie).
 *
 * Waarom: het formaat controleren we al in de checkout, maar dat zegt alleen
 * dat het erúítziet als een btw-nummer. Of het bestaat en bij een echt bedrijf
 * hoort, weet je pas na een opzoeking. Voor een zakelijke bestelling met btw
 * verlegd is dat het verschil tussen een correcte factuur en een naheffing.
 *
 * **Alleen voor niet-Nederlandse nummers.** Voor NL-klanten leunen we op het
 * KVK-nummer, dat de checkout al verplicht stelt en op formaat controleert; een
 * Nederlandse ondernemer met een NL-btw-nummer rekent gewoon btw af, dus daar
 * verandert een VIES-check niets aan de factuur.
 *
 * **Fail-open.** VIES ligt er met enige regelmaat uit, en dan geeft hij per
 * lidstaat een andere fout (MS_UNAVAILABLE, SERVICE_UNAVAILABLE, timeouts). Een
 * bestelling mag daar niet op stuklopen: bij twijfel geven we `bekend: false`
 * terug en laat de checkout de klant gewoon door. Liever een order die we
 * achteraf natrekken dan een klant die niet kan afrekenen omdat Brussel er even
 * uit ligt.
 */

/** Kale vorm: hoofdletters, zonder spaties, punten en streepjes. */
function normaliseer(v: string): string {
  return String(v ?? "").toUpperCase().replace(/[\s.\-]/g, "");
}

/**
 * Lidstaatcodes zoals VIES ze kent (EL voor Griekenland, XI voor Noord-Ierland).
 *
 * Zonder deze lijst leest de regex hieronder "ONZIN" als land "ON" met nummer
 * "ZIN", gaat er alsnog een verzoek naar Brussel, en wacht de klant zes seconden
 * op een timeout voordat er niets verschijnt.
 */
const LIDSTATEN = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR",
  "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI",
  "SK", "XI",
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ruw = normaliseer(url.searchParams.get("btw") ?? "");

  const m = ruw.match(/^([A-Z]{2})([0-9A-Z]{2,14})$/);
  if (!m || !LIDSTATEN.has(m[1])) {
    return NextResponse.json({ bekend: false, reden: "formaat" }, { status: 200 });
  }
  const [, land, nummer] = m;

  // NL gaat op KVK; zie de toelichting hierboven.
  if (land === "NL") {
    return NextResponse.json({ bekend: false, reden: "nl-gaat-op-kvk" }, { status: 200 });
  }

  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${land}/vat/${nummer}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as {
      isValid?: boolean;
      name?: string;
      address?: string;
      userError?: string;
    };

    // VIES meldt een onbereikbare lidstaat met een userError en isValid:false.
    // Dat is iets anders dan "bestaat niet", dus dat mogen we niet als
    // afkeuring behandelen.
    const storing =
      typeof body.userError === "string" &&
      body.userError !== "VALID" &&
      body.userError !== "INVALID";
    if (storing) {
      return NextResponse.json({ bekend: false, reden: "dienst-onbereikbaar" });
    }

    return NextResponse.json({
      bekend: true,
      geldig: body.isValid === true,
      // VIES geeft "---" terug als de lidstaat de naam niet vrijgeeft (o.a. DE).
      naam: body.name && body.name !== "---" ? body.name : undefined,
      adres: body.address && body.address !== "---" ? body.address : undefined,
    });
  } catch (e) {
    console.warn(`[vies] opzoeken mislukt: ${e instanceof Error ? e.message : e}`);
    return NextResponse.json({ bekend: false, reden: "dienst-onbereikbaar" });
  }
}
