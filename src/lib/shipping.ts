/**
 * Verzendlanden + tarieven (PostNL). Server- én client-safe (geen side effects).
 *
 * Alleen EU-landen (geen douane) — Zwitserland, VK, Noorwegen e.d. zijn bewust
 * weggelaten i.v.m. douane. **Gratis verzending alleen voor NL en BE.**
 *
 * De internationale tarieven (buiten NL/BE) komen rechtstreeks uit het PostNL-
 * tariefblad "Landenoverzicht zakelijke tarieven (bus)pakjes — per januari 2026",
 * tabel **Klein Pakket met track & trace**, gewichtsklasse **500–1000 g**,
 * omgerekend van excl. → incl. 21% btw en afgerond op €0,05. Andere
 * gewichtsklasse als basis? Pas dan alleen de `price`-waarden hieronder aan.
 * NL en BE houden hun eigen consumentprijs met gratis verzending vanaf €59.
 */

export interface CountryShipping {
  code: string;
  name: string;
  /** Verzendkosten (incl. btw). */
  price: number;
  /** Gratis vanaf dit subtotaal (alleen NL en BE). */
  freeOver?: number;
}

const FREE_THRESHOLD = 59;

export const SHIPPING_COUNTRIES: CountryShipping[] = [
  // Gratis vanaf €59 — eigen consumentprijs (NL/BE)
  { code: "NL", name: "Nederland", price: 4.95, freeOver: FREE_THRESHOLD },
  { code: "BE", name: "België", price: 7.95, freeOver: FREE_THRESHOLD },
  // Buurlanden — PostNL Klein Pakket met T&T (500–1000 g) × btw
  { code: "DE", name: "Duitsland", price: 9.45 },
  { code: "FR", name: "Frankrijk", price: 11.2 },
  { code: "LU", name: "Luxemburg", price: 12.1 },
  // Overige EU (oplopend) — zelfde PostNL-tabel, incl. 21% btw
  { code: "ES", name: "Spanje", price: 11.8 },
  { code: "PT", name: "Portugal", price: 11.8 },
  { code: "CZ", name: "Tsjechië", price: 12.1 },
  { code: "EE", name: "Estland", price: 12.1 },
  { code: "LV", name: "Letland", price: 12.1 },
  { code: "PL", name: "Polen", price: 12.45 },
  { code: "IT", name: "Italië", price: 12.45 },
  { code: "SE", name: "Zweden", price: 12.45 },
  { code: "HU", name: "Hongarije", price: 12.75 },
  { code: "FI", name: "Finland", price: 12.75 },
  { code: "LT", name: "Litouwen", price: 12.75 },
  { code: "HR", name: "Kroatië", price: 12.9 },
  { code: "CY", name: "Cyprus", price: 12.9 },
  { code: "DK", name: "Denemarken", price: 13.15 },
  { code: "AT", name: "Oostenrijk", price: 13.35 },
  { code: "SI", name: "Slovenië", price: 13.35 },
  { code: "RO", name: "Roemenië", price: 13.35 },
  { code: "BG", name: "Bulgarije", price: 13.35 },
  { code: "MT", name: "Malta", price: 15.35 },
  { code: "IE", name: "Ierland", price: 15.45 },
  { code: "GR", name: "Griekenland", price: 15.45 },
  { code: "SK", name: "Slowakije", price: 16.95 },
];

export const SHIPPING_COUNTRY_MAP: Record<string, CountryShipping> = Object.fromEntries(
  SHIPPING_COUNTRIES.map((c) => [c.code, c]),
);

export const DEFAULT_COUNTRY = "NL";

/** Voordelig brievenbuspakje-tarief (incl. btw) — alleen Nederland. */
export const BRIEVENBUS_PRICE: Record<string, number> = { NL: 3.95 };

/** Verzendkosten (incl. btw) voor een land; gratis alleen NL/BE boven de drempel.
 *  Met `brievenbus: true` (alleen NL) geldt het goedkopere brievenbuspakje-tarief. */
export function shippingForCountry(
  grossSubtotal: number,
  code: string = DEFAULT_COUNTRY,
  opts?: { brievenbus?: boolean },
): number {
  const c = SHIPPING_COUNTRY_MAP[code] ?? SHIPPING_COUNTRY_MAP[DEFAULT_COUNTRY];
  if (grossSubtotal <= 0) return 0;
  if (c.freeOver != null && grossSubtotal >= c.freeOver) return 0;
  if (opts?.brievenbus && BRIEVENBUS_PRICE[code] != null) return BRIEVENBUS_PRICE[code];
  return c.price;
}

/** Heeft dit land gratis verzending (boven de drempel)? — alleen NL/BE. */
export function hasFreeShipping(code: string): boolean {
  return SHIPPING_COUNTRY_MAP[code]?.freeOver != null;
}

/** Cookie met het door de klant gekozen/bevestigde bezorgland (1 jaar). */
export const COUNTRY_COOKIE = "country";

/** Kortlevende cookie met een geo-voorstel voor het bezorgland; gelezen door de
 *  suggestie-banner en als slimme standaard in de checkout. */
export const COUNTRY_SUGGEST_COOKIE = "country-suggest";

/** Verzenden we naar dit land? (case-insensitief) */
export function isShippingCountry(code: string | null | undefined): boolean {
  return !!code && code.toUpperCase() in SHIPPING_COUNTRY_MAP;
}

/**
 * Het bezorgland zoals we het aan de clientkant kennen, uit de cookies.
 *
 * Zelfde volgorde als de checkout: eerst de bevestigde keuze, dan het
 * geo-voorstel, anders NL. Op de server bestaat `document` niet en krijg je de
 * standaard — roep dit dus pas ná mount aan, anders wijkt de hydratie af.
 *
 * Bestaat omdat de PDP en de express-wallets hun verzendkosten met een vaste
 * "NL" berekenden. Een Belgische bezoeker zag daar € 4,95 en betaalde bij Apple
 * Pay ook € 4,95, terwijl het tarief € 7,95 is: € 3 te weinig, én een
 * orderbedrag dat niet strookt met wat Tilroy uitrekent.
 */
export function bezorglandUitCookie(): string {
  if (typeof document === "undefined") return DEFAULT_COUNTRY;
  const lees = (naam: string) =>
    document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith(`${naam}=`))
      ?.slice(naam.length + 1) ?? "";
  const keuze = (lees(COUNTRY_COOKIE) || lees(COUNTRY_SUGGEST_COOKIE)).toUpperCase();
  return isShippingCountry(keuze) ? keuze : DEFAULT_COUNTRY;
}
