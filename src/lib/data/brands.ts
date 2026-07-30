import type { Product } from "@/types";
import { products } from "./products";
import { bestVariantStock, onlineStock } from "@/lib/stock";

/**
 * Merken-laag voor de SEO-merkpagina's (`/merk/[slug]`).
 *
 * De lijst wordt afgeleid uit de catalogus, niet apart bijgehouden: zo lopen de
 * aantallen en categorieën automatisch mee met elke import. Een merk krijgt
 * alleen een pagina als het én een logo heeft én genoeg leverbare producten —
 * een lege of bijna-lege merkpagina is slechte SEO (thin content) en een
 * teleurstelling voor de bezoeker.
 *
 * Let op: de feed levert dezelfde merknaam soms in verschillende schrijfwijzen
 * ("Rambo" én "RAMBO", "Sam" én "SAM"). We groeperen daarom op de slug, zodat
 * één merk niet in twee halve pagina's uiteenvalt.
 */

/** Minimum aantal leverbare producten voordat een merk een eigen pagina krijgt. */
const MIN_PRODUCTS = 3;

/**
 * Slugs waarvoor een logo in `public/merken/` staat. Bewust een expliciete
 * lijst en geen directory-scan: de catalogus wordt server-side gerenderd en een
 * ontbrekend bestand zou anders pas in productie als gebroken beeld opvallen.
 */
const LOGO_SLUGS = new Set([
  "alabastine", "anza", "avis", "benson", "btc", "cando", "cetabever",
  "copenhagen", "den-braven", "drenth", "dulux", "dutch-wallcoverings", "elro",
  "fischer", "fitex", "flexa", "glitsa", "hammerite", "hg", "histor",
  "hofftech-germany", "led-s-light", "levis", "mack", "multiblade", "noordwand",
  "parador", "pattex", "rambo", "rasch", "rubson", "sam", "sikkens",
  "talen-tools", "trae-lyx", "veba", "wd-40",
]);

/** Merknamen die geen echt merk zijn (inkoopkanaal/verzamelbak). */
const JUNK = new Set([
  "", "onbekend", "merk", "overig", "overige", "essentieel overige",
  "partijhandel", "partij", "no brand", "diversen",
]);

/**
 * Korte, feitelijke merkomschrijvingen. Alleen ingevuld waar we het zeker
 * weten; de rest krijgt een uit de catalogus afgeleide tekst (zie
 * `brandIntro`), zodat er nooit iets verzonnen op een merkpagina staat.
 */
const DESCRIPTIONS: Record<string, string> = {
  sikkens:
    "Sikkens is het professionele verfmerk van AkzoNobel, bekend van de Rubbol-lakken en Alpha-muurverven. Schilders kiezen het merk om de dekking en de standtijd buiten.",
  histor:
    "Histor is een Nederlands verfmerk voor binnen en buiten, met de Perfect Finish-lijn als bekendste product. Alle kleuren laten we exact op maat voor je mengen.",
  hammerite:
    "Hammerite is gemaakt voor metaal: je schildert er direct op roest mee, zonder eerst te gronden. Ideaal voor hekwerk, poorten en tuinmeubelen.",
  alabastine:
    "Alabastine is gespecialiseerd in het voorbereidende werk: plamuur, vulmiddelen en reparatiepasta's voor wanden, plafonds en houtwerk.",
  anza: "Anza is een Zweedse fabrikant van kwasten, rollers en schildersgereedschap.",
  pattex: "Pattex maakt lijmen, kitten en montageproducten voor klussen in en om het huis.",
  fischer: "Fischer is specialist in bevestiging: pluggen, ankers en schroeven voor elke ondergrond.",
  "wd-40": "WD-40 is het bekende multi-spray voor smeren, ontroesten en beschermen.",
  dulux: "Dulux is het internationale verfmerk van AkzoNobel voor muren, plafonds en houtwerk.",
  flexa: "Flexa is een Nederlands verfmerk van AkzoNobel voor binnen- en buitenwerk.",
  levis: "Levis is een verfmerk van AkzoNobel, met een breed assortiment muurverf en lak.",
  cetabever: "CetaBever is gespecialiseerd in houtbescherming: beits, houtolie en buitenlak.",
  "trae-lyx": "Trae Lyx maakt lakken, oliën en beschermlagen voor houten vloeren en meubels.",
  "den-braven": "Den Braven (Zwaluw) maakt kitten, purschuim en afdichtingsproducten.",
  rubson: "Rubson is gespecialiseerd in vocht- en waterafdichting, van kit tot vochtvreters.",
  hg: "HG maakt reinigings- en onderhoudsmiddelen voor specifieke materialen en probleemvlekken.",
  rasch: "Rasch is een Duitse behangfabrikant met een breed dessin-aanbod.",
  "dutch-wallcoverings": "Dutch Wallcoverings is een Nederlandse behangleverancier met collecties voor elke ruimte.",
  noordwand: "Noordwand is een Nederlandse behangfabrikant, bekend van fotobehang en natuurdessins.",
  parador: "Parador maakt vloeren: laminaat, vinyl en bijbehorende plinten en ondervloeren.",
  "led-s-light": "Led's Light levert ledverlichting voor binnen en buiten, van lichtbronnen tot armaturen.",
  "talen-tools": "Talen Tools maakt tuingereedschap: spades, harken, snoeischaren en kruiwagens.",
};

export interface Brand {
  slug: string;
  /** Weergavenaam, netjes gekapitaliseerd. */
  name: string;
  /** Pad naar het logo in `public/`, of `undefined` als we er geen hebben. */
  logo?: string;
  /** Aantal online leverbare producten. */
  productCount: number;
  /** Categorieën waarin dit merk producten heeft, meeste eerst. */
  categories: string[];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Nette weergavenaam. De feed schrijft merken door elkaar in hoofdletters
 * ("RASCH", "DEN BRAVEN") en kleine letters; we kapitaliseren alleen wat
 * volledig in kapitalen staat, zodat merken als "CanDo" en "WD-40" hun eigen
 * schrijfwijze houden.
 */
function displayName(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .replace(/(^|[\s-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function isSellable(p: Product): boolean {
  return onlineStock(bestVariantStock(p)) > 0;
}

/** Merken met een eigen pagina, op aantal leverbare producten (meeste eerst). */
export const brands: Brand[] = (() => {
  const groups = new Map<
    string,
    { names: Map<string, number>; count: number; cats: Map<string, number> }
  >();

  for (const p of products) {
    const raw = (p.brand ?? "").trim();
    if (!raw || JUNK.has(raw.toLowerCase())) continue;
    if (!isSellable(p)) continue;
    const slug = slugify(raw);
    if (!slug) continue;
    const g = groups.get(slug) ?? { names: new Map(), count: 0, cats: new Map() };
    g.names.set(raw, (g.names.get(raw) ?? 0) + 1);
    g.count++;
    if (p.category) g.cats.set(p.category, (g.cats.get(p.category) ?? 0) + 1);
    groups.set(slug, g);
  }

  const out: Brand[] = [];
  for (const [slug, g] of groups) {
    if (g.count < MIN_PRODUCTS || !LOGO_SLUGS.has(slug)) continue;
    // Meest voorkomende schrijfwijze wint; die netjes kapitaliseren.
    const raw = [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push({
      slug,
      name: displayName(raw),
      logo: `/merken/${slug}.png`,
      productCount: g.count,
      categories: [...g.cats.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
    });
  }
  return out.sort((a, b) => b.productCount - a.productCount);
})();

export function getBrand(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}

/** Leverbare producten van dit merk (schrijfwijze-onafhankelijk). */
export function getBrandProducts(slug: string): Product[] {
  return products.filter((p) => slugify((p.brand ?? "").trim()) === slug && isSellable(p));
}

/** Vaste merktekst, of `undefined` wanneer we die niet hebben. */
export function brandDescription(slug: string): string | undefined {
  return DESCRIPTIONS[slug];
}

/**
 * Slug van de merkpagina voor een merknaam uit de catalogus, of `undefined`
 * wanneer dit merk geen eigen pagina heeft. Bedoeld om server-side te bepalen
 * of de merknaam op de productpagina een link mag worden.
 */
export function brandSlugFor(name: string | undefined): string | undefined {
  const slug = slugify((name ?? "").trim());
  return slug && brands.some((b) => b.slug === slug) ? slug : undefined;
}
