/**
 * Bezorglogica ("bezorgklok") — puur, testbaar en client-veilig.
 *
 * Bepaalt WANNEER een bestelling geleverd wordt op basis van het bestelmoment.
 * De functie werkt met een meegegeven `now` (default `new Date()`) zodat 'ie
 * deterministisch te testen is en geen verborgen tijd-afhankelijkheid heeft.
 *
 * Alle berekeningen gebeuren in de LOKALE tijd van de bezoeker (NL-publiek):
 * we lezen/zetten uitsluitend via de lokale `getHours()/getDate()/setHours()`
 * etc., dus er is geen externe timezone-library nodig.
 *
 * Regels (DHL, bevestigd door de eigenaar — vervangt de oude PostNL-klok):
 *  - Cutoff = 10:00.
 *  - Besteld vóór 10:00  → nog DEZELFDE dag bezorgd (same-day).
 *  - Besteld 10:00–23:59 → de VOLGENDE dag bezorgd.
 *  - DHL bezorgt in de avond, door heel Nederland (geen regio-uitzondering).
 *
 * Controle-voorbeelden:
 *  - di 09:00 → di ("vandaag", 's avonds)
 *  - di 11:00 → wo ("morgen")
 *  - za 09:00 → za ("vandaag")
 *  - za 11:00 → ma (zondag wordt overgeslagen)
 */

/** Cutoff-uur (lokale tijd). Vóór dit hele uur bezorgen we nog vandaag. */
export const CUTOFF_HOUR = 10;

/**
 * Dagen waarop DHL niet bezorgt: zondag (0).
 *
 * Bevestig dit bij een wijziging in het DHL-contract — dit is de enige plek
 * waar het staat. Bezorgt DHL bijvoorbeeld ook niet op maandag, voeg dan 1 toe
 * en de hele site (beloftes, aftelling, bezorgdatum) volgt automatisch.
 */
const NON_DELIVERY_DAYS = new Set([0]);

export type DeliveryLabel = "today" | "tomorrow" | "dayAfter" | "weekday";

export interface DeliveryInfo {
  /** De (lokale) datum waarop bezorgd wordt, op middernacht genormaliseerd. */
  deliveryDate: Date;
  /** Was er besteld vóór de cutoff van 10:00 (en dus vandaag nog bezorgd)? */
  beforeCutoff: boolean;
  /**
   * Hoe de UI de dag mag presenteren:
   *  - "today"     → leverdatum is vandaag (same-day, 's avonds)
   *  - "tomorrow"  → leverdatum is exact vandaag + 1
   *  - "dayAfter"  → leverdatum is exact vandaag + 2
   *  - "weekday"   → anders; gebruik `deliveryDate` met
   *                  `Intl.DateTimeFormat(locale, { weekday: "long" })`.
   */
  label: DeliveryLabel;
  /**
   * Milliseconden tot de eerstvolgende 10:00 (voor de live aftelling). Alleen
   * zinvol als `beforeCutoff` true is; ná de cutoff is dit 0.
   */
  msUntilCutoff: number;
}

/** Geeft een kopie van `d` op lokale middernacht (00:00:00.000). */
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Geeft een nieuwe datum = `d` + `days` hele dagen (lokale tijd). */
function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * Bereken de bezorginformatie voor een bestelling geplaatst op `now`.
 *
 * @param now Het bestelmoment (default: het huidige moment).
 */
export function deliveryInfo(now: Date = new Date()): DeliveryInfo {
  const beforeCutoff = now.getHours() < CUTOFF_HOUR;

  // Vóór 10:00 bezorgen we vandaag nog; daarna is morgen de eerste kans.
  let deliveryDate = beforeCutoff ? startOfDay(now) : addDays(startOfDay(now), 1);

  // Rol door naar de eerstvolgende bezorgdag als het op een niet-bezorgdag valt.
  while (NON_DELIVERY_DAYS.has(deliveryDate.getDay())) {
    deliveryDate = addDays(deliveryDate, 1);
  }

  // Label bepalen t.o.v. "vandaag" (lokale middernacht).
  const today = startOfDay(now);
  const dayDiff = Math.round(
    (deliveryDate.getTime() - today.getTime()) / 86_400_000,
  );
  let label: DeliveryLabel;
  if (dayDiff === 0) label = "today";
  else if (dayDiff === 1) label = "tomorrow";
  else if (dayDiff === 2) label = "dayAfter";
  else label = "weekday";

  // ms tot de eerstvolgende 10:00 (alleen relevant vóór de cutoff).
  let msUntilCutoff = 0;
  if (beforeCutoff) {
    const cutoff = startOfDay(now);
    cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
    msUntilCutoff = Math.max(0, cutoff.getTime() - now.getTime());
  }

  return { deliveryDate, beforeCutoff, label, msUntilCutoff };
}
