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
 *  - Cutoff = 09:00.
 *  - Besteld vóór 09:00  → nog DEZELFDE dag bezorgd (same-day).
 *  - Besteld 09:00–23:59 → de VOLGENDE dag bezorgd.
 *  - DHL bezorgt in de avond, door heel Nederland (geen regio-uitzondering).
 *  - Zaterdag rijden we de vrijdagorders zélf uit (dus niet via DHL). Zaterdag
 *    is daarmee wél een bezorgdag, maar géén dag waarop same-day kan: een
 *    bestelling die op zaterdag binnenkomt gaat mee met maandag.
 *  - Zondag wordt niet bezorgd.
 *
 * Controle-voorbeelden (let op: 09:00 zelf is al té laat):
 *  - di 08:00 → di ("vandaag", 's avonds)
 *  - di 09:00 → wo ("morgen")
 *  - vr 08:00 → vr ("vandaag")
 *  - vr 11:00 → za (wij bezorgen zelf)
 *  - za (elk tijdstip) → ma
 *  - zo (elk tijdstip) → ma
 */

/**
 * Cutoff-uur (lokale tijd). Vóór dit hele uur bezorgen we nog vandaag.
 *
 * Staat bewust op 09:00 en niet op 10:00: wíj moeten de pakketten vóór 10:00
 * bij het DHL-depot in Hengelo inleveren, dus de klant heeft tot 09:00 om te
 * bestellen. Zou hier 10:00 staan, dan beloven we same-day aan orders die de
 * rit naar het depot niet meer halen.
 */
export const CUTOFF_HOUR = 9;

/**
 * Dagen waarop niemand bezorgt: zondag (0). Maandag is met DHL wél een
 * bezorgdag — dat verschilt van de oude PostNL-klok, waar zondag én maandag
 * afvielen. Zaterdag staat hier bewust niet in: dan rijden we zelf.
 */
const NON_DELIVERY_DAYS = new Set([0]);

/**
 * Dagen waarop géén same-day mogelijk is: zaterdag (6). We rijden zaterdag wel,
 * maar alleen met de orders van vrijdag; wat op zaterdag zelf binnenkomt gaat
 * mee met maandag. Een zaterdagbestelling vóór 09:00 valt dus terug op de
 * normale "volgende bezorgdag"-regel.
 */
const NO_SAME_DAY_DAYS = new Set([6]);

export type DeliveryLabel = "today" | "tomorrow" | "dayAfter" | "weekday";

/**
 * Bezorgsoort zoals die op de order wordt vastgelegd. Het VDM-dashboard leest
 * dit veld om te bepalen of het DHL-label de SDD-optie (same day delivery)
 * meekrijgt — zonder "same-day" krijgt de klant een gewoon label, ook al heeft
 * hij ervoor betaald. Zelfde waarden als de VDM-site gebruikt.
 */
export type DeliveryType = "same-day" | "next-day" | "next-workday";

/** Toeslag voor same-day bezorging (incl. btw), bovenop de normale verzendkosten. */
export const SAME_DAY_SURCHARGE = 1.25;

export interface DeliveryInfo {
  /** De (lokale) datum waarop bezorgd wordt, op middernacht genormaliseerd. */
  deliveryDate: Date;
  /**
   * Haalt deze bestelling nog de bezorging van vandaag? Dat vraagt méér dan
   * "vóór 09:00": op zaterdag rijden we alleen de vrijdagorders uit, dus dan is
   * same-day niet mogelijk ook al is het 08:00.
   */
  sameDay: boolean;
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
   * Milliseconden tot de eerstvolgende 09:00 (voor de live aftelling). Alleen
   * zinvol als `sameDay` true is; anders 0 — aftellen naar een deadline die de
   * bezorgdag toch niet vervroegt zou de klant misleiden.
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
  // Mikken we op vandaag? Dat vraagt vóór de cutoff besteld én een dag waarop we
  // die dag nog rijden (zaterdag valt af — dan gaan alleen de vrijdagorders mee).
  const aimToday =
    now.getHours() < CUTOFF_HOUR && !NO_SAME_DAY_DAYS.has(now.getDay());

  // Vóór 09:00 bezorgen we vandaag nog; daarna is morgen de eerste kans.
  let deliveryDate = aimToday ? startOfDay(now) : addDays(startOfDay(now), 1);

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

  // Same-day leiden we af uit de uitkomst, niet uit de klok: op zondagochtend
  // is het wél vóór 09:00, maar bezorgen we pas maandag. Zo kan er nooit een
  // aftelling verschijnen die de bezorgdag toch niet vervroegt.
  const sameDay = dayDiff === 0;

  // ms tot de eerstvolgende 09:00 (alleen relevant als same-day nog kan).
  let msUntilCutoff = 0;
  if (sameDay) {
    const cutoff = startOfDay(now);
    cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
    msUntilCutoff = Math.max(0, cutoff.getTime() - now.getTime());
  }

  return { deliveryDate, sameDay, label, msUntilCutoff };
}

/**
 * Bezorgsoort voor op de order, altijd server-side af te leiden.
 *
 * `chosenSameDay` is de wens van de klant (de betaalde optie); of die ook
 * ingewilligd kán worden bepaalt de klok. Zo kan een client die om 23:00
 * `sameDay: true` meestuurt nooit een SDD-label afdwingen dat de rit naar het
 * depot niet haalt.
 */
export function deliveryTypeFor(
  chosenSameDay: boolean,
  now: Date = new Date(),
): DeliveryType {
  if (chosenSameDay && deliveryInfo(now).sameDay) return "same-day";

  // Zónder same-day is de eerste kans morgen — ook als het nu nog vóór de
  // cutoff is. De klok van deliveryInfo() mikt op vandaag en zou hier dus het
  // verkeerde antwoord geven; we rekenen daarom expliciet vanaf morgen.
  const today = startOfDay(now);
  let d = addDays(today, 1);
  while (NON_DELIVERY_DAYS.has(d.getDay())) d = addDays(d, 1);
  const dayDiff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  return dayDiff === 1 ? "next-day" : "next-workday";
}

/**
 * Kan same-day überhaupt aangeboden worden op dit moment? Alleen voor Nederland
 * — DHL rijdt de avondronde binnenlands, en de webshop levert uit Nijverdal.
 * De voorraadkant is impliciet gedekt: de catalogus voert uitsluitend de
 * Nijverdal-voorraad, dus wat verkoopbaar is, ligt daar.
 */
export function sameDayAvailable(country: string, now: Date = new Date()): boolean {
  return (country || "NL").toUpperCase() === "NL" && deliveryInfo(now).sameDay;
}
