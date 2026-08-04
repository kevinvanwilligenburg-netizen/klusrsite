import { products } from "@/lib/data";
import { onlineStock } from "@/lib/stock";
import type { Product } from "@/types";

/**
 * "Hier heb je ook nog dit voor nodig" — aanvulling op basis van wát er in de
 * winkelwagen ligt.
 *
 * De bestaande suggestie (`getAccessorySuggestions`) kijkt niet naar de
 * winkelwagen: die geeft altijd dezelfde drie goedkope accessoires, of je nu
 * muurverf of een blik lak koopt. Zo'n carrousel wordt weggescrold.
 *
 * Waarom dit ertoe doet: de gemiddelde bestelling is € 30 en een bestelling
 * kost ons € 43,53 aan advertentiekosten. Dat verschil los je niet op in Google
 * Ads — Google kan alleen beter kiezen tussen bezoekers die je toch al krijgt,
 * niet de orderwaarde verhogen. Wie een pot verf koopt heeft ook een roller,
 * tape en afdekfolie nodig; van € 30 naar € 45 is genoeg om de som te laten
 * kloppen.
 *
 * **De ondergrond komt uit de catalogus, niet uit de titel.** Classificeren op
 * productnaam ging mis: "Histor Perfect Finish Acryl Zijdeglans" is een lak,
 * maar dat staat er nergens; 284 van de 541 verfproducten bleven zo
 * ongeclassificeerd. De specificatie `Geschikt voor ondergrond` zegt het wél
 * (Hout, Muren, Metaal). Ontbreekt die, dan vallen we terug op de drie dingen
 * die je bij élke verfklus nodig hebt.
 */

interface Behoefte {
  id: string;
  /** Waarom de klant dit nodig heeft — staat als bijschrift bij het product. */
  reden: string;
  patroon: RegExp;
}

const ROLLER: Behoefte = {
  id: "roller",
  reden: "Om grote vlakken snel en streeploos te rollen",
  patroon: /\b(verf)?roller|verfrol|vachtje|muurroller\b/i,
};
const KWAST: Behoefte = {
  id: "kwast",
  reden: "Voor randen, hoeken en kozijnen",
  patroon: /\bkwast(en)?|platte kwast|blokkwast\b/i,
};
const TAPE: Behoefte = {
  id: "tape",
  reden: "Strakke lijnen langs plinten en kozijnen",
  patroon: /\bafplaktape|schilderstape|afplak|masking\b/i,
};
const BAK: Behoefte = {
  id: "bak",
  reden: "Hoort bij de roller",
  patroon: /\bverfbak|verfrooster|rollerbak\b/i,
};
const AFDEK: Behoefte = {
  id: "afdek",
  reden: "Vloer en meubels beschermen",
  patroon: /\bafdekfolie|afdekzeil|afdekpapier|stucloper\b/i,
};
const SCHUUR: Behoefte = {
  id: "schuur",
  reden: "Ondergrond eerst opruwen, anders hecht de lak niet",
  patroon: /\bschuurpapier|schuurspons|schuurblok|schuurvlies\b/i,
};

/** Per ondergrond, in volgorde van hoe vaak het écht nodig is. */
const PER_ONDERGROND: Record<string, Behoefte[]> = {
  muren: [ROLLER, TAPE, BAK, AFDEK],
  hout: [KWAST, SCHUUR, TAPE],
  metaal: [KWAST, SCHUUR, TAPE],
  kunststof: [KWAST, SCHUUR, TAPE],
  tegels: [KWAST, SCHUUR, TAPE],
};

/** Zonder bruikbare specificatie: wat je bij elke verfklus nodig hebt. */
const ALGEMEEN: Behoefte[] = [KWAST, ROLLER, TAPE];

/**
 * Geen gereedschap maar een middel.
 *
 * "Alabastine Kwastenreiniger" matchte op het kwast-patroon en werd voorgesteld
 * aan iemand die een kwást zocht. Zelfde risico bij rollerreiniger en
 * verfverdunner: het woord staat erin, het artikel is iets anders.
 *
 * Let op de ontbrekende `\b` aan de voorkant: die zat er eerst wél, en toen
 * matchte "Kwaste**nreiniger**" niet — er staat geen woordgrens tussen de n en
 * de r. Van de drie kwastreinigers in de catalogus glipten er zo twee doorheen.
 */
const GEEN_GEREEDSCHAP =
  /reiniger|ontvetter|ontvetten|verdunner|verdunning|afbijt|terpentine|thinner|\bzeep/i;

function spec(p: Product, label: string): string {
  for (const groep of p.specifications ?? []) {
    for (const item of groep.items ?? []) {
      if (String(item.label ?? "").trim().toLowerCase() === label) {
        return String(item.value ?? "").trim();
      }
    }
  }
  return "";
}

/** Welke behoeftes horen bij dit verfproduct? */
function behoeftenVoor(p: Product): Behoefte[] {
  const ondergrond = spec(p, "geschikt voor ondergrond").toLowerCase();
  if (!ondergrond) return ALGEMEEN;
  const uit: Behoefte[] = [];
  for (const [sleutel, lijst] of Object.entries(PER_ONDERGROND)) {
    if (ondergrond.includes(sleutel)) uit.push(...lijst);
  }
  return uit.length ? uit : ALGEMEEN;
}

/**
 * Het beste passende artikel per behoefte.
 *
 * Voorwaarden: op voorraad en niet duurder dan de goedkoopste verf in de mand —
 * een kwast van € 40 naast een pot van € 20 verkoopt niet, en oogt hebberig.
 */
function kiesArtikel(b: Behoefte, plafond: number, uitgesloten: Set<string>): Product | undefined {
  const kandidaten = products.filter(
    (p) =>
      !uitgesloten.has(p.id) &&
      b.patroon.test(p.title ?? "") &&
      !GEEN_GEREEDSCHAP.test(p.title ?? "") &&
      p.price > 0 &&
      p.price <= plafond &&
      onlineStock(p.stockByStore) > 0 &&
      (p.images ?? []).length > 0,
  );
  if (!kandidaten.length) return undefined;

  // Een artikel met echte beoordelingen wint: dat is wat mensen daadwerkelijk
  // kopen.
  const beoordeeld = kandidaten.filter((p) => (p.reviewCount ?? 0) >= 5);
  if (beoordeeld.length) {
    return beoordeeld.sort((a, b2) => (b2.reviewCount ?? 0) - (a.reviewCount ?? 0))[0];
  }

  // Anders het middensegment, niet de bodem. Vrijwel geen accessoire heeft
  // beoordelingen, dus sorteren op prijs betekende in de praktijk: altijd het
  // goedkoopste. Dat leverde een verfrooster van € 0,75 naast een pot verf van
  // € 22 — dat oogt niet serieus, en drie van zulke artikelen tillen de
  // orderwaarde nauwelijks op. Terwijl juist die orderwaarde het probleem is.
  const opPrijs = [...kandidaten].sort((a, b2) => a.price - b2.price);
  return opPrijs[Math.floor(opPrijs.length * 0.6)] ?? opPrijs[opPrijs.length - 1];
}

export interface Aanvulling {
  product: Product;
  reden: string;
}

/**
 * Aanvulling voor de producten die nu in de winkelwagen liggen.
 *
 * Slaat behoeftes over die de klant al in zijn mand heeft: wie al een roller
 * heeft ingelegd krijgt tape voorgesteld, niet nog een roller.
 */
export function klusAanvulling(productIds: string[], limiet = 3): Aanvulling[] {
  const inMand = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  if (!inMand.length) return [];

  const verf = inMand.filter((p) => p.category === "verf");
  if (!verf.length) return [];

  // Prijsplafond: in verhouding tot wat iemand van plan was uit te geven, zodat
  // er geen kwast van € 40 naast een pot van € 20 verschijnt. Ondergrens € 25,
  // anders blijft er bij een goedkope pot niets over dan de bodem van het
  // schap.
  const plafond = Math.max(25, Math.min(...verf.map((p) => p.price)));

  const uitgesloten = new Set(inMand.map((p) => p.id));
  const gedekt = new Set<string>();
  // Wat de klant al heeft telt als gedekt.
  for (const p of inMand) {
    for (const b of [ROLLER, KWAST, TAPE, BAK, AFDEK, SCHUUR]) {
      if (b.patroon.test(p.title ?? "")) gedekt.add(b.id);
    }
  }

  const volgorde: Behoefte[] = [];
  for (const p of verf) {
    for (const b of behoeftenVoor(p)) {
      if (!gedekt.has(b.id) && !volgorde.some((x) => x.id === b.id)) volgorde.push(b);
    }
  }

  const uit: Aanvulling[] = [];
  for (const b of volgorde) {
    if (uit.length >= limiet) break;
    const artikel = kiesArtikel(b, plafond, uitgesloten);
    if (!artikel) continue;
    uitgesloten.add(artikel.id);
    uit.push({ product: artikel, reden: b.reden });
  }
  return uit;
}
