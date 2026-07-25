import type { Product, ProductVariant, StoreStock } from "@/types";
import { stores } from "./stores";
import { categories } from "./categories";
import feedData from "./feed-products.generated.json";
import priceOverrides from "./price-overrides.generated.json";
import catalogOverridesData from "./catalog-overrides.generated.json";
import customProductsData from "./custom-products.generated.json";
import { applyCatalogOverlay, type CatalogOverrides } from "./catalog-overlay";
import { onlineStock } from "@/lib/stock";

/** Adviesprijs/normale prijs per sku uit de prijsfeed (scripts/build-price-feed.mjs). */
const PRICE_OVERRIDES = priceOverrides as Record<string, { n?: number; a?: number }>;

/**
 * De kale SKU van een product-/variant-id, los van de (legacy) bron-prefix. Het
 * `tilroy-`-voorvoegsel is sinds de Tilroy-ontkoppeling puur historisch: ids
 * blijven stabiel (orders, overlays, slugs verwijzen ernaar), maar de logica is
 * bron-agnostisch — eigen producten dragen gewoon hun eigen id zonder prefix.
 */
export function skuOf(id: string): string {
  return id.replace(/^(?:tilroy|channable|feed)-/, "");
}

/**
 * Verrijkt een variant/product met de adviesprijs (RRP) uit de prijsfeed als
 * doorgestreepte "van"-prijs — alleen wanneer die hoger is dan de verkoopprijs.
 */
function withAdviesPrice<T extends { id: string; price: number; compareAtPrice?: number }>(
  v: T,
): T {
  const o = PRICE_OVERRIDES[skuOf(v.id)];
  if (o?.a != null && o.a > v.price) return { ...v, compareAtPrice: o.a };
  return v;
}

/**
 * Live productcatalogus uit de Tilroy/De Voordeelmarkt feeds (zie
 * scripts/build-tilroy-catalog.mjs). Wanneer de snapshot leeg is, valt de
 * webshop terug op de handmatige `curatedProducts` hieronder.
 */
/**
 * Lost een feed-afbeelding op naar een URL die vanaf élke origin laadt:
 *   1. channableusercontent.com → direct gebruiken (voorkeur).
 *   2. cloudimg.io-wrapper → terugbrengen naar de rauwe bron-URL (S3); de
 *      prosteps-cloudimg laat alleen devoordeelmarkt.nl toe en geeft elders 403.
 */
export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.includes("channableusercontent.com")) return url;
  const ci = url.indexOf("cloudimg.io/");
  if (ci !== -1) {
    const rest = url.slice(ci);
    const at = rest.search(/https?:\/\//);
    if (at !== -1) return rest.slice(at);
  }
  return url;
}

/** Volume van een variant in ml (voor sortering); valt terug op het eerste getal. */
function variantVolumeMl(v: ProductVariant): number {
  const m = v.label.toLowerCase().match(/([\d]+(?:[.,]\d+)?)\s*(ml|cl|l|liter)\b/);
  if (m) {
    const n = parseFloat(m[1].replace(",", "."));
    return m[2] === "ml" ? n : m[2] === "cl" ? n * 10 : n * 1000;
  }
  const n = v.label.match(/([\d]+(?:[.,]\d+)?)/);
  return n ? parseFloat(n[1].replace(",", ".")) : 0;
}

/** Sorteer maatvarianten klein → groot (bv. 500 ml vóór 1 L). */
function sortVariants(variants: ProductVariant[]): ProductVariant[] {
  const hasVolume = variants.some((v) => /\b(ml|cl|l|liter)\b/i.test(v.label));
  return hasVolume
    ? [...variants].sort((a, b) => variantVolumeMl(a) - variantVolumeMl(b))
    : variants;
}

const CAT_LABELS: Record<string, string> = {
  verf: "verf",
  "afbouw-fijnbouw": "afbouw & fijnbouw",
  ijzerwaren: "ijzerwaren",
  elektra: "elektra",
  gereedschap: "gereedschap",
  tuin: "tuin & buiten",
  verlichting: "verlichting",
  "vloeren-raam": "vloeren & raamdecoratie",
};

/** Verrijkt een dunne feed-omschrijving tot een unieke, SEO-vriendelijke tekst. */
function enrichDescription(p: Product): string {
  const base = (p.description || "").trim();
  if (base.length >= 220) return base;
  const brand = p.brand && p.brand !== "Onbekend" ? `${p.brand} ` : "";
  const catLabel = CAT_LABELS[p.category] || "klusmateriaal";
  const out: string[] = [
    `${brand}${p.title} koop je online bij KLUSR — jouw specialist in ${catLabel}.`,
  ];
  if (base) out.push(base);
  if (p.highlights?.length) {
    out.push(`Belangrijkste kenmerken: ${p.highlights.slice(0, 4).join(", ")}.`);
  }
  if (p.colorMatchable) {
    out.push("Deze verf mengen wij exact op de door jou gekozen kleur, klaar voor gebruik.");
  }
  out.push(
    "Professionele kwaliteit, scherp geprijsd met je gratis KLUSRPAS en advies van ex-schilders. Voor 19:00 besteld morgen in huis, bezorgd door heel Nederland en België.",
  );
  return out.join(" ");
}

const feedProducts = (
  ((feedData as { products?: unknown[] }).products ?? []) as unknown as Product[]
).map((p) => {
  const variants = sortVariants((p.variants ?? []).map(withAdviesPrice));
  // De productprijs toont de goedkoopste variant → spiegel diens adviesprijs.
  const base = variants.find((v) => v.price === p.price) ?? variants[0];
  const compareAtPrice = base?.compareAtPrice ?? withAdviesPrice(p).compareAtPrice;
  return {
    ...p,
    images: (p.images ?? []).map(resolveImageUrl).filter(Boolean),
    variants,
    ...(compareAtPrice != null ? { compareAtPrice } : {}),
    description: enrichDescription(p),
  };
});

/* ------------------------------------------------------------------ helpers */

function stock(map: Partial<Record<string, number>>): StoreStock[] {
  return stores.map((s) => ({ storeId: s.id, quantity: map[s.id] ?? 0 }));
}

function img(seed: string, n = 1): string[] {
  return Array.from({ length: n }, (_, i) =>
    `https://picsum.photos/seed/klusr-${seed}-${i}/900/900`,
  );
}


/** Paint variants in 1L / 2.5L / 5L / 10L with bigger = cheaper per litre. */
function paintVariants(
  id: string,
  base: { price: number; compareAt: number; kluspas: number },
  stockMap: Partial<Record<string, number>>,
): ProductVariant[] {
  const sizes: { label: string; size: number; factor: number }[] = [
    { label: "1L", size: 1, factor: 0.16 },
    { label: "2.5L", size: 2.5, factor: 0.36 },
    { label: "5L", size: 5, factor: 0.65 },
    { label: "10L", size: 10, factor: 1 },
  ];
  return sizes.map((s) => ({
    id: `${id}-${s.label}`,
    label: s.label,
    size: s.size,
    unit: "L" as const,
    price: Math.round(base.price * s.factor * 100) / 100,
    compareAtPrice: Math.round(base.compareAt * s.factor * 100) / 100,
    kluspasPrice: Math.round(base.kluspas * s.factor * 100) / 100,
    stockByStore: stock(stockMap),
  }));
}

/* ----------------------------------------------------------------- products */

const curatedProducts: Product[] = [
  /* ===== HERO / BINNENVERF ===== */
  {
    id: "sikkens-alpha-pure-mat",
    title: "Sikkens Alpha Pure Mat SF",
    slug: "sikkens-alpha-pure-mat-sf",
    brand: "Sikkens",
    highlights: [
      "Onbeperkt dekkend",
      "Schrobvast klasse 1",
      "Matte, strakke uitstraling",
      "Geschikt voor muren en plafonds binnen",
    ],
    description:
      "Sikkens Alpha Pure Mat SF is een hoogwaardige, matte muurverf voor binnen met uitstekende dekking en schrobvastheid. Geschikt voor wanden en plafonds. Spatvrije, gladde verwerking en een diepmat eindresultaat dat lang mooi blijft.",
    images: img("sikkens-alpha", 4),
    price: 74.95,
    compareAtPrice: 89.99,
    kluspasPrice: 74.95,
    category: "verf",
    subCategory: "binnenmuurverf",
    badges: ["BESTSELLER", "PRO KEUZE"],
    rating: 4.6,
    reviewCount: 124,
    specifications: [
      {
        group: "Eigenschappen",
        items: [
          { label: "Bindmiddel", value: "Acrylaat" },
          { label: "Glansgraad", value: "Mat" },
          { label: "Schrobvastheid", value: "Klasse 1 (ISO 11998)" },
          { label: "Rendement", value: "8 - 10 m² per liter" },
        ],
      },
      {
        group: "Verwerking",
        items: [
          { label: "Verdunnen", value: "Met water, max. 5%" },
          { label: "Droogtijd stofdroog", value: "30 minuten" },
          { label: "Overschilderbaar", value: "Na 4 uur" },
          { label: "Gereedschap", value: "Roller, kwast of spuit" },
        ],
      },
    ],
    faqs: [
      {
        question: "Hoeveel lagen heb ik nodig?",
        answer:
          "Op een egale ondergrond is meestal één tot twee lagen voldoende dankzij de hoge dekkracht. Bij een sterke kleurovergang adviseren we twee lagen.",
      },
      {
        question: "Kan ik deze verf op een vochtige muur gebruiken?",
        answer:
          "Nee, de ondergrond moet droog, schoon en stofvrij zijn. Behandel vochtproblemen eerst en gebruik zo nodig een vochtregulerende primer.",
      },
    ],
    processingAdvice:
      "Roer de verf goed door. Werk nat-in-nat en houd een natte rand aan om aanzetten te voorkomen. Breng de verf kruislings aan en rol af in één richting voor een egaal resultaat.",
    variants: paintVariants(
      "sikkens-alpha-pure-mat",
      { price: 74.95, compareAt: 89.99, kluspas: 74.95 },
      { nijverdal: 18, emmen: 6, zutphen: 0, apeldoorn: 4, deventer: 9 },
    ),
    stockByStore: stock({ nijverdal: 18, emmen: 6, zutphen: 0, apeldoorn: 4, deventer: 9 }),
    frequentlyBoughtTogether: ["anza-roller-silver", "anza-kwast-50", "frogtape-afplaktape"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
    contentFlags: { description: "complete", specifications: "complete", faqs: "complete", seo: "approved" },
  },
  {
    id: "flexa-creations-muurverf",
    title: "Flexa Creations Muurverf Extra Mat",
    slug: "flexa-creations-muurverf-extra-mat",
    brand: "Flexa",
    highlights: ["Extra mat", "Vlekbestendig", "Op kleur te mengen", "Geurarm"],
    description:
      "Flexa Creations is een vlekbestendige, extra matte muurverf die eenvoudig te reinigen is. Perfect voor woonkamers, slaapkamers en gangen. Op elke gewenste kleur te mengen.",
    images: img("flexa-creations", 3),
    price: 39.95,
    compareAtPrice: 47.99,
    kluspasPrice: 36.95,
    category: "verf",
    subCategory: "binnenmuurverf",
    badges: ["ACTIE"],
    rating: 4.2,
    reviewCount: 211,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Glansgraad", value: "Extra mat" },
        { label: "Inhoud", value: "Zie variant" },
        { label: "Reinigbaar", value: "Ja, vlekbestendig" },
        { label: "Rendement", value: "9 - 11 m² per liter" },
      ]},
    ],
    variants: paintVariants(
      "flexa-creations-muurverf",
      { price: 79.9, compareAt: 95.98, kluspas: 73.9 },
      { nijverdal: 24, emmen: 12, zutphen: 8, apeldoorn: 10, deventer: 14 },
    ),
    stockByStore: stock({ nijverdal: 24, emmen: 12, zutphen: 8, apeldoorn: 10, deventer: 14 }),
    frequentlyBoughtTogether: ["anza-roller-silver", "frogtape-afplaktape", "alabastine-allesvuller"],
    colorMatchable: true,
    aiGeneratedContentStatus: "missing",
    contentFlags: { description: "complete", specifications: "missing", faqs: "missing", seo: "suggested" },
  },
  {
    id: "histor-binnenlatex",
    title: "Histor Binnenlatex Mat",
    slug: "histor-binnenlatex-mat",
    brand: "Histor",
    highlights: ["Voordelig", "Goede dekking", "Snel droog", "Voor muur en plafond"],
    description:
      "Een betrouwbare, voordelige binnenlatex met goede dekking voor muren en plafonds. Ideaal voor grotere oppervlakken en klustdagen waarop je veel meters maakt.",
    images: img("histor-latex", 3),
    price: 29.95,
    compareAtPrice: 34.99,
    kluspasPrice: 27.5,
    category: "verf",
    subCategory: "binnenmuurverf",
    rating: 3.6,
    reviewCount: 142,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Glansgraad", value: "Mat" },
        { label: "Rendement", value: "8 - 10 m² per liter" },
        { label: "Droogtijd", value: "Overschilderbaar na 4 uur" },
      ]},
    ],
    variants: paintVariants(
      "histor-binnenlatex",
      { price: 59.9, compareAt: 69.98, kluspas: 55 },
      { nijverdal: 30, emmen: 20, zutphen: 16, apeldoorn: 18, deventer: 22 },
    ),
    stockByStore: stock({ nijverdal: 30, emmen: 20, zutphen: 16, apeldoorn: 18, deventer: 22 }),
    frequentlyBoughtTogether: ["anza-roller-silver", "frogtape-afplaktape"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },

  /* ===== BUITENVERF ===== */
  {
    id: "sikkens-rubbol-bl-satin",
    title: "Sikkens Rubbol BL Satin",
    slug: "sikkens-rubbol-bl-satin",
    brand: "Sikkens",
    highlights: ["Watergedragen", "Zijdeglans", "Uitstekende hechting", "Voor buitenhout"],
    description:
      "Sikkens Rubbol BL Satin is een watergedragen zijdeglanslak voor buitenhoutwerk. Uitstekende duurzaamheid en kleurbehoud, ideaal voor kozijnen, deuren en boeidelen.",
    images: img("rubbol-satin", 3),
    price: 44.95,
    compareAtPrice: 52.99,
    kluspasPrice: 41.5,
    category: "verf",
    subCategory: "buitenmuurverf",
    badges: ["PRO KEUZE"],
    rating: 4.5,
    reviewCount: 62,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Glansgraad", value: "Zijdeglans" },
        { label: "Toepassing", value: "Buitenhoutwerk" },
        { label: "Rendement", value: "12 - 14 m² per liter" },
      ]},
    ],
    variants: paintVariants(
      "sikkens-rubbol-bl-satin",
      { price: 89.9, compareAt: 105.98, kluspas: 83 },
      { nijverdal: 14, emmen: 7, zutphen: 5, apeldoorn: 6, deventer: 8 },
    ),
    stockByStore: stock({ nijverdal: 14, emmen: 7, zutphen: 5, apeldoorn: 6, deventer: 8 }),
    frequentlyBoughtTogether: ["anza-kwast-50", "sigma-multiprimer", "frogtape-afplaktape"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },

  /* ===== LAK ===== */
  {
    id: "sigma-contour-aqua-pu",
    title: "Sigma Contour Aqua PU Satin",
    slug: "sigma-contour-aqua-pu-satin",
    brand: "Sigma",
    highlights: ["Watergedragen PU-lak", "Krasvast", "Vergeelt nauwelijks", "Binnen & buiten"],
    description:
      "Een professionele watergedragen PU-lak met uitstekende krasvastheid en kleurbehoud. Geschikt voor deuren, kozijnen en trappen. Strak, egaal eindresultaat.",
    images: img("sigma-contour", 3),
    price: 42.95,
    compareAtPrice: 49.99,
    kluspasPrice: 39.95,
    category: "verf",
    subCategory: "lak",
    rating: 4.4,
    reviewCount: 73,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Type", value: "Watergedragen PU" },
        { label: "Glansgraad", value: "Satin / zijdeglans" },
        { label: "Rendement", value: "12 m² per liter" },
      ]},
    ],
    variants: [
      { id: "sigma-contour-0_75", label: "0.75L", size: 0.75, unit: "L", price: 32.95, compareAtPrice: 38.99, kluspasPrice: 30.5, stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 4, apeldoorn: 5, deventer: 7 }) },
      { id: "sigma-contour-2_5", label: "2.5L", size: 2.5, unit: "L", price: 84.95, compareAtPrice: 99.99, kluspasPrice: 78.5, stockByStore: stock({ nijverdal: 9, emmen: 4, zutphen: 2, apeldoorn: 3, deventer: 5 }) },
    ],
    stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 4, apeldoorn: 5, deventer: 7 }),
    frequentlyBoughtTogether: ["anza-kwast-50", "schuurpapier-set", "sigma-multiprimer"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },

  /* ===== BEITS ===== */
  {
    id: "sikkens-cetol-bl-tinta",
    title: "Sikkens Cetol BL Tinta",
    slug: "sikkens-cetol-bl-tinta",
    brand: "Sikkens",
    highlights: ["Transparante beits", "UV-bescherming", "Watergedragen", "Voor buitenhout"],
    description:
      "Transparante, watergedragen beits die de houtnerf laat zien en optimaal beschermt tegen weersinvloeden en UV. Ideaal voor schuttingen, tuinhuizen en gevelbekleding.",
    images: img("cetol-tinta", 3),
    price: 36.95,
    compareAtPrice: 42.99,
    kluspasPrice: 33.95,
    category: "verf",
    subCategory: "beits",
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Type", value: "Transparante beits" },
        { label: "Toepassing", value: "Buitenhout" },
        { label: "Rendement", value: "12 - 16 m² per liter" },
      ]},
    ],
    variants: [
      { id: "cetol-tinta-1", label: "1L", size: 1, unit: "L", price: 36.95, compareAtPrice: 42.99, kluspasPrice: 33.95, stockByStore: stock({ nijverdal: 16, emmen: 9, zutphen: 7, apeldoorn: 8, deventer: 11 }) },
      { id: "cetol-tinta-2_5", label: "2.5L", size: 2.5, unit: "L", price: 79.95, compareAtPrice: 92.99, kluspasPrice: 73.5, stockByStore: stock({ nijverdal: 10, emmen: 5, zutphen: 3, apeldoorn: 4, deventer: 6 }) },
    ],
    stockByStore: stock({ nijverdal: 16, emmen: 9, zutphen: 7, apeldoorn: 8, deventer: 11 }),
    frequentlyBoughtTogether: ["anza-kwast-50", "schuurpapier-set"],
    colorMatchable: false,
    aiGeneratedContentStatus: "missing",
    contentFlags: { description: "complete", specifications: "complete", faqs: "missing", seo: "missing" },
  },

  /* ===== PRIMER ===== */
  {
    id: "sigma-multiprimer",
    title: "Sigma S2U Nova Multiprimer",
    slug: "sigma-s2u-nova-multiprimer",
    brand: "Sigma",
    highlights: ["Hecht op vrijwel alles", "Watergedragen", "Snel droog", "Binnen & buiten"],
    description:
      "Veelzijdige multiprimer met uitstekende hechting op moeilijke ondergronden zoals tegels, kunststof en gegalvaniseerd staal. De ideale basis voor een duurzaam eindresultaat.",
    images: img("sigma-primer", 3),
    price: 34.95,
    compareAtPrice: 39.99,
    kluspasPrice: 31.95,
    category: "verf",
    subCategory: "primer",
    badges: ["PRO KEUZE"],
    rating: 4.6,
    reviewCount: 95,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Type", value: "Watergedragen multiprimer" },
        { label: "Hecht op", value: "Hout, metaal, kunststof, tegels" },
        { label: "Rendement", value: "10 - 12 m² per liter" },
      ]},
    ],
    variants: [
      { id: "sigma-primer-1", label: "1L", size: 1, unit: "L", price: 34.95, compareAtPrice: 39.99, kluspasPrice: 31.95, stockByStore: stock({ nijverdal: 20, emmen: 11, zutphen: 9, apeldoorn: 10, deventer: 13 }) },
      { id: "sigma-primer-2_5", label: "2.5L", size: 2.5, unit: "L", price: 74.95, compareAtPrice: 84.99, kluspasPrice: 68.5, stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 4, apeldoorn: 5, deventer: 8 }) },
    ],
    stockByStore: stock({ nijverdal: 20, emmen: 11, zutphen: 9, apeldoorn: 10, deventer: 13 }),
    frequentlyBoughtTogether: ["anza-roller-silver", "schuurpapier-set"],
    colorMatchable: false,
    aiGeneratedContentStatus: "complete",
  },

  /* ===== SCHILDERSGEREEDSCHAP ===== */
  {
    id: "anza-roller-silver",
    title: "Anza Verfroller Silver 18 cm",
    slug: "anza-verfroller-silver-18cm",
    brand: "Anza",
    highlights: ["Spettert minder", "Voor muurverf & latex", "Inclusief beugel", "Hoge opnamecapaciteit"],
    description:
      "De Anza Silver verfroller neemt veel verf op en spettert minder, voor een snel en egaal resultaat op muren en plafonds. Inclusief stevige beugel.",
    images: img("anza-roller", 3),
    price: 9.95,
    kluspasPrice: 8.5,
    category: "gereedschap",
    subCategory: "schildersgereedschap",
    badges: ["BESTSELLER"],
    rating: 4.7,
    reviewCount: 356,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Breedte", value: "18 cm" },
        { label: "Poolhoogte", value: "12 mm" },
        { label: "Geschikt voor", value: "Muurverf, latex" },
      ]},
    ],
    variants: [
      { id: "anza-roller-default", label: "18 cm", unit: "st", price: 9.95, kluspasPrice: 8.5, stockByStore: stock({ nijverdal: 60, emmen: 40, zutphen: 35, apeldoorn: 38, deventer: 45 }) },
    ],
    stockByStore: stock({ nijverdal: 60, emmen: 40, zutphen: 35, apeldoorn: 38, deventer: 45 }),
    frequentlyBoughtTogether: ["sikkens-alpha-pure-mat", "frogtape-afplaktape", "anza-kwast-50"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "anza-kwast-50",
    title: "Anza Platte Kwast 50 mm",
    slug: "anza-platte-kwast-50mm",
    brand: "Anza",
    highlights: ["Synthetische vezels", "Voor watergedragen verf", "Strakke afgifte", "Ergonomische steel"],
    description:
      "Professionele platte kwast met synthetische vezels, speciaal voor watergedragen lakken en beitsen. Geeft de verf gelijkmatig af voor een strak eindresultaat.",
    images: img("anza-kwast", 3),
    price: 7.95,
    kluspasPrice: 6.75,
    category: "gereedschap",
    subCategory: "schildersgereedschap",
    rating: 4.3,
    reviewCount: 156,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Breedte", value: "50 mm" },
        { label: "Vezel", value: "Synthetisch" },
        { label: "Geschikt voor", value: "Lak, beits, grondverf" },
      ]},
    ],
    variants: [
      { id: "anza-kwast-50-default", label: "50 mm", unit: "st", price: 7.95, kluspasPrice: 6.75, stockByStore: stock({ nijverdal: 70, emmen: 45, zutphen: 40, apeldoorn: 42, deventer: 50 }) },
    ],
    stockByStore: stock({ nijverdal: 70, emmen: 45, zutphen: 40, apeldoorn: 42, deventer: 50 }),
    frequentlyBoughtTogether: ["sigma-contour-aqua-pu", "sikkens-rubbol-bl-satin"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "anza-pro-kwastset",
    title: "Anza Pro Verfkwastset (3-delig)",
    slug: "anza-pro-verfkwastset",
    brand: "Anza",
    highlights: ["3 maten", "Voor elke klus", "Synthetisch", "Inclusief radiatorkwast"],
    description:
      "Complete set van drie professionele kwasten in verschillende maten, inclusief een handige radiatorkwast voor lastige plekken. De ideale basis voor elke schilderklus.",
    images: img("anza-set", 3),
    price: 16.95,
    compareAtPrice: 21.99,
    kluspasPrice: 14.5,
    category: "gereedschap",
    subCategory: "schildersgereedschap",
    badges: ["ACTIE"],
    rating: 4.5,
    reviewCount: 41,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Maten", value: "20, 40, 60 mm" },
        { label: "Extra", value: "Radiatorkwast" },
      ]},
    ],
    variants: [
      { id: "anza-set-default", label: "3-delig", unit: "st", price: 16.95, compareAtPrice: 21.99, kluspasPrice: 14.5, stockByStore: stock({ nijverdal: 35, emmen: 22, zutphen: 18, apeldoorn: 20, deventer: 26 }) },
    ],
    stockByStore: stock({ nijverdal: 35, emmen: 22, zutphen: 18, apeldoorn: 20, deventer: 26 }),
    frequentlyBoughtTogether: ["sigma-contour-aqua-pu", "frogtape-afplaktape"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "frogtape-afplaktape",
    title: "FrogTape Multi-Surface Afplaktape",
    slug: "frogtape-multi-surface-afplaktape",
    brand: "FrogTape",
    highlights: ["PaintBlock technologie", "Scherpe verflijnen", "Laat geen lijmresten achter", "24 mm x 41,1 m"],
    description:
      "FrogTape met unieke PaintBlock-technologie zorgt voor messcherpe verflijnen. Voorkomt doorlopen van verf en laat geen lijmresten achter. Voor binnen op gladde ondergronden.",
    images: img("frogtape", 3),
    price: 8.95,
    kluspasPrice: 7.95,
    category: "afbouw-fijnbouw",
    subCategory: "schuren",
    badges: ["BESTSELLER"],
    rating: 4.8,
    reviewCount: 487,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Breedte", value: "24 mm" },
        { label: "Lengte", value: "41,1 m" },
        { label: "Toepassing", value: "Binnen, gladde ondergrond" },
      ]},
    ],
    variants: [
      { id: "frogtape-default", label: "24 mm x 41,1 m", unit: "st", price: 8.95, kluspasPrice: 7.95, stockByStore: stock({ nijverdal: 80, emmen: 50, zutphen: 45, apeldoorn: 48, deventer: 55 }) },
    ],
    stockByStore: stock({ nijverdal: 80, emmen: 50, zutphen: 45, apeldoorn: 48, deventer: 55 }),
    frequentlyBoughtTogether: ["sikkens-alpha-pure-mat", "anza-roller-silver"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "schuurpapier-set",
    title: "KLUSR Schuurpapier Assortiment (10-delig)",
    slug: "klusr-schuurpapier-assortiment",
    brand: "KLUSR",
    highlights: ["Korrel 80 t/m 240", "Voor hout en plamuur", "Scheurvast", "Handig formaat"],
    description:
      "Assortiment schuurpapier in verschillende korrels voor het voorbereiden en tussentijds schuren van houtwerk en geplamuurde delen. Scheurvast en lang meegaand.",
    images: img("schuurpapier", 2),
    price: 6.95,
    kluspasPrice: 5.95,
    category: "afbouw-fijnbouw",
    subCategory: "schuren",
    rating: 3.8,
    reviewCount: 53,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Korrels", value: "80, 120, 180, 240" },
        { label: "Aantal", value: "10 vellen" },
      ]},
    ],
    variants: [
      { id: "schuurpapier-default", label: "10-delig", unit: "st", price: 6.95, kluspasPrice: 5.95, stockByStore: stock({ nijverdal: 55, emmen: 30, zutphen: 28, apeldoorn: 32, deventer: 36 }) },
    ],
    stockByStore: stock({ nijverdal: 55, emmen: 30, zutphen: 28, apeldoorn: 32, deventer: 36 }),
    frequentlyBoughtTogether: ["sigma-contour-aqua-pu", "alabastine-allesvuller"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== ELEKTRISCH GEREEDSCHAP ===== */
  {
    id: "bosch-gsr-18v",
    title: "Bosch Professional GSR 18V-55 Accuschroefboormachine",
    slug: "bosch-professional-gsr-18v-55",
    brand: "Bosch",
    highlights: ["18V brushless motor", "55 Nm koppel", "Incl. 2 accu's", "Compact en licht"],
    description:
      "Krachtige en compacte accuschroefboormachine met brushless motor voor een lange levensduur en hoog koppel. Geleverd met twee accu's, lader en koffer. Voor de veeleisende klusser.",
    images: img("bosch-gsr", 4),
    price: 189.0,
    compareAtPrice: 229.0,
    kluspasPrice: 174.0,
    category: "gereedschap",
    subCategory: "elektrisch-gereedschap",
    badges: ["PRO KEUZE", "ACTIE"],
    rating: 4.8,
    reviewCount: 214,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Spanning", value: "18V" },
        { label: "Max. koppel", value: "55 Nm" },
        { label: "Accu's", value: "2 x 2,0 Ah" },
        { label: "Gewicht", value: "1,0 kg" },
      ]},
    ],
    faqs: [
      { question: "Zitten er bits bij?", answer: "Bij deze set worden twee accu's, een lader en een koffer geleverd. Bits en boren bestel je los of als accessoireset." },
    ],
    variants: [
      { id: "bosch-gsr-default", label: "Set met 2 accu's", unit: "st", price: 189.0, compareAtPrice: 229.0, kluspasPrice: 174.0, stockByStore: stock({ nijverdal: 8, emmen: 4, zutphen: 2, apeldoorn: 3, deventer: 5 }) },
    ],
    stockByStore: stock({ nijverdal: 8, emmen: 4, zutphen: 2, apeldoorn: 3, deventer: 5 }),
    frequentlyBoughtTogether: ["spax-schroeven-set", "fischer-pluggen", "makita-bitset"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "makita-bitset",
    title: "Makita Bit- en Borenset (70-delig)",
    slug: "makita-bit-en-borenset-70-delig",
    brand: "Makita",
    highlights: ["70 delen", "Hout-, metaal- en steenboren", "In handige houder", "Voor elke machine"],
    description:
      "Uitgebreide 70-delige set met boren en bits voor hout, metaal en steen. In een overzichtelijke houder zodat je altijd het juiste accessoire bij de hand hebt.",
    images: img("makita-bitset", 3),
    price: 34.95,
    compareAtPrice: 44.95,
    kluspasPrice: 29.95,
    category: "gereedschap",
    subCategory: "elektrisch-gereedschap",
    badges: ["ACTIE"],
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Aantal delen", value: "70" },
        { label: "Type", value: "Boren + bits" },
      ]},
    ],
    variants: [
      { id: "makita-bitset-default", label: "70-delig", unit: "st", price: 34.95, compareAtPrice: 44.95, kluspasPrice: 29.95, stockByStore: stock({ nijverdal: 18, emmen: 9, zutphen: 7, apeldoorn: 8, deventer: 11 }) },
    ],
    stockByStore: stock({ nijverdal: 18, emmen: 9, zutphen: 7, apeldoorn: 8, deventer: 11 }),
    frequentlyBoughtTogether: ["bosch-gsr-18v", "spax-schroeven-set"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== IJZERWAREN ===== */
  {
    id: "spax-schroeven-set",
    title: "SPAX Spaanplaatschroeven Assortiment (450 st)",
    slug: "spax-spaanplaatschroeven-assortiment",
    brand: "SPAX",
    highlights: ["450 schroeven", "T-Star plus aandrijving", "Verzinkt", "Diverse maten"],
    description:
      "Praktische assortimentsdoos met 450 SPAX spaanplaatschroeven in verschillende maten met T-Star plus aandrijving voor optimale grip. Verzinkt voor binnengebruik.",
    images: img("spax", 3),
    price: 24.95,
    kluspasPrice: 21.95,
    category: "ijzerwaren",
    subCategory: "schroeven",
    badges: ["BESTSELLER"],
    rating: 4.6,
    reviewCount: 118,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Aantal", value: "450 stuks" },
        { label: "Aandrijving", value: "T-Star plus (Torx)" },
        { label: "Materiaal", value: "Staal verzinkt" },
      ]},
    ],
    variants: [
      { id: "spax-default", label: "450 stuks", unit: "st", price: 24.95, kluspasPrice: 21.95, stockByStore: stock({ nijverdal: 26, emmen: 14, zutphen: 11, apeldoorn: 13, deventer: 17 }) },
    ],
    stockByStore: stock({ nijverdal: 26, emmen: 14, zutphen: 11, apeldoorn: 13, deventer: 17 }),
    frequentlyBoughtTogether: ["fischer-pluggen", "bosch-gsr-18v", "makita-bitset"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "fischer-pluggen",
    title: "Fischer DuoPower Pluggen Assortiment (210 st)",
    slug: "fischer-duopower-pluggen-assortiment",
    brand: "Fischer",
    highlights: ["210 pluggen", "Voor elke ondergrond", "2-componenten", "Diverse maten"],
    description:
      "Het slimme 2-componenten plug-systeem van Fischer dat zich aanpast aan de ondergrond — van beton tot gipsplaat. Assortiment met de meest gebruikte maten.",
    images: img("fischer", 3),
    price: 18.95,
    kluspasPrice: 16.5,
    category: "ijzerwaren",
    subCategory: "pluggen",
    rating: 4.7,
    reviewCount: 263,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Aantal", value: "210 stuks" },
        { label: "Type", value: "DuoPower 2-componenten" },
        { label: "Maten", value: "6, 8, 10 mm" },
      ]},
    ],
    variants: [
      { id: "fischer-default", label: "210 stuks", unit: "st", price: 18.95, kluspasPrice: 16.5, stockByStore: stock({ nijverdal: 30, emmen: 18, zutphen: 14, apeldoorn: 16, deventer: 20 }) },
    ],
    stockByStore: stock({ nijverdal: 30, emmen: 18, zutphen: 14, apeldoorn: 16, deventer: 20 }),
    frequentlyBoughtTogether: ["spax-schroeven-set", "bosch-gsr-18v"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== ELEKTRA ===== */
  {
    id: "gira-stopcontact",
    title: "Gira Systeem 55 Stopcontact met Randaarde",
    slug: "gira-systeem-55-stopcontact-randaarde",
    brand: "Gira",
    highlights: ["Randaarde", "Inbouw", "Tijdloos wit", "Kindveilig"],
    description:
      "Tijdloos en veilig inbouwstopcontact met randaarde en kinderbeveiliging uit de populaire Gira Systeem 55-serie. Eenvoudig te combineren met schakelaars in dezelfde stijl.",
    images: img("gira", 3),
    price: 12.95,
    kluspasPrice: 11.25,
    category: "elektra",
    subCategory: "schakelmateriaal",
    badges: ["PRO KEUZE"],
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Type", value: "Inbouw, randaarde" },
        { label: "Kleur", value: "Zuiver wit glanzend" },
        { label: "Kinderbeveiliging", value: "Ja" },
      ]},
    ],
    faqs: [
      { question: "Mag ik dit zelf vervangen?", answer: "Het vervangen van een stopcontact mag je zelf doen, mits je de groep spanningsvrij maakt. Twijfel je? Schakel een erkend installateur in." },
    ],
    variants: [
      { id: "gira-default", label: "Per stuk", unit: "st", price: 12.95, kluspasPrice: 11.25, stockByStore: stock({ nijverdal: 40, emmen: 24, zutphen: 20, apeldoorn: 22, deventer: 28 }) },
    ],
    stockByStore: stock({ nijverdal: 40, emmen: 24, zutphen: 20, apeldoorn: 22, deventer: 28 }),
    frequentlyBoughtTogether: ["makita-bitset", "installatiekabel"],
    aiGeneratedContentStatus: "missing",
    contentFlags: { description: "complete", specifications: "complete", faqs: "complete", seo: "missing" },
  },
  {
    id: "installatiekabel",
    title: "Installatiekabel XMvK-as 3x2,5 mm² (rol 50 m)",
    slug: "installatiekabel-xmvk-3x25",
    brand: "KLUSR",
    highlights: ["3 x 2,5 mm²", "Rol 50 meter", "Voor groepen tot 16A", "Voldoet aan NEN 1010"],
    description:
      "Degelijke installatiekabel voor vaste aansluitingen in huis, geschikt voor groepen tot 16 ampère. Op een handige rol van 50 meter.",
    images: img("kabel", 2),
    price: 64.95,
    kluspasPrice: 58.5,
    category: "elektra",
    subCategory: "kabel",
    rating: 3.4,
    reviewCount: 29,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Doorsnede", value: "3 x 2,5 mm²" },
        { label: "Lengte", value: "50 meter" },
        { label: "Norm", value: "NEN 1010" },
      ]},
    ],
    variants: [
      { id: "kabel-default", label: "Rol 50 m", unit: "m", price: 64.95, kluspasPrice: 58.5, stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 4, apeldoorn: 5, deventer: 8 }) },
    ],
    stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 4, apeldoorn: 5, deventer: 8 }),
    frequentlyBoughtTogether: ["gira-stopcontact"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== AFBOUW & FIJNBOUW ===== */
  {
    id: "alabastine-allesvuller",
    title: "Alabastine Allesvuller Binnen 1 kg",
    slug: "alabastine-allesvuller-binnen-1kg",
    brand: "Alabastine",
    highlights: ["Voor gaten en scheuren", "Krimpt niet", "Goed schuurbaar", "Snel overschilderbaar"],
    description:
      "Universele vulmiddel voor het herstellen van gaten, scheuren en beschadigingen in muren en plafonds binnen. Krimpt niet en is na drogen eenvoudig glad te schuren.",
    images: img("alabastine", 3),
    price: 8.95,
    kluspasPrice: 7.75,
    category: "afbouw-fijnbouw",
    subCategory: "plamuur",
    rating: 4.2,
    reviewCount: 88,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Inhoud", value: "1 kg poeder" },
        { label: "Toepassing", value: "Binnen, muur en plafond" },
        { label: "Schuurbaar", value: "Ja" },
      ]},
    ],
    variants: [
      { id: "alabastine-default", label: "1 kg", unit: "kg", price: 8.95, kluspasPrice: 7.75, stockByStore: stock({ nijverdal: 44, emmen: 26, zutphen: 22, apeldoorn: 24, deventer: 30 }) },
    ],
    stockByStore: stock({ nijverdal: 44, emmen: 26, zutphen: 22, apeldoorn: 24, deventer: 30 }),
    frequentlyBoughtTogether: ["schuurpapier-set", "sigma-multiprimer", "sikkens-alpha-pure-mat"],
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "bison-acrylaatkit",
    title: "Bison Acrylaatkit Wit + Kitpistool",
    slug: "bison-acrylaatkit-wit-kitpistool",
    brand: "Bison",
    highlights: ["Overschilderbaar", "Blijvend elastisch", "Inclusief kitpistool", "Voor naden en kieren"],
    description:
      "Set met overschilderbare acrylaatkit en een handig kitpistool. Ideaal voor het netjes afkitten van naden en kieren rondom kozijnen en plinten binnen.",
    images: img("bison-kit", 3),
    price: 14.95,
    compareAtPrice: 18.95,
    kluspasPrice: 12.95,
    category: "afbouw-fijnbouw",
    subCategory: "kit",
    badges: ["BUNDEL", "ACTIE"],
    rating: 3.3,
    reviewCount: 47,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Kit", value: "Acrylaat wit 310 ml" },
        { label: "Extra", value: "Kitpistool" },
        { label: "Overschilderbaar", value: "Ja" },
      ]},
    ],
    variants: [
      { id: "bison-kit-default", label: "Set", unit: "st", price: 14.95, compareAtPrice: 18.95, kluspasPrice: 12.95, stockByStore: stock({ nijverdal: 28, emmen: 16, zutphen: 12, apeldoorn: 14, deventer: 18 }) },
    ],
    stockByStore: stock({ nijverdal: 28, emmen: 16, zutphen: 12, apeldoorn: 14, deventer: 18 }),
    frequentlyBoughtTogether: ["sigma-contour-aqua-pu", "frogtape-afplaktape"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== TUIN ===== */
  {
    id: "hermadix-tuinhoutbeits",
    title: "Hermadix Tuinhoutbeits Dekkend",
    slug: "hermadix-tuinhoutbeits-dekkend",
    brand: "Hermadix",
    highlights: ["Dekkend", "Waterafstotend", "Lang houdbaar", "Voor schutting & tuinhuis"],
    description:
      "Dekkende, waterafstotende beits voor tuinhout zoals schuttingen, tuinhuizen en vlonders. Beschermt langdurig tegen weer en wind en is op kleur te mengen.",
    images: img("hermadix-beits", 3),
    price: 32.95,
    compareAtPrice: 38.95,
    kluspasPrice: 29.5,
    category: "tuin",
    subCategory: "tuinhoutbeits",
    badges: ["ACTIE"],
    rating: 3.7,
    reviewCount: 88,
    specifications: [
      { group: "Eigenschappen", items: [
        { label: "Type", value: "Dekkende beits" },
        { label: "Toepassing", value: "Buiten, tuinhout" },
        { label: "Rendement", value: "6 - 8 m² per liter" },
      ]},
    ],
    variants: [
      { id: "hermadix-beits-2_5", label: "2.5L", size: 2.5, unit: "L", price: 32.95, compareAtPrice: 38.95, kluspasPrice: 29.5, stockByStore: stock({ nijverdal: 22, emmen: 12, zutphen: 9, apeldoorn: 11, deventer: 14 }) },
      { id: "hermadix-beits-5", label: "5L", size: 5, unit: "L", price: 59.95, compareAtPrice: 69.95, kluspasPrice: 53.5, stockByStore: stock({ nijverdal: 14, emmen: 7, zutphen: 5, apeldoorn: 6, deventer: 9 }) },
    ],
    stockByStore: stock({ nijverdal: 22, emmen: 12, zutphen: 9, apeldoorn: 11, deventer: 14 }),
    frequentlyBoughtTogether: ["anza-pro-kwastset", "schuurpapier-set"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },

  /* ===== VERLICHTING ===== */
  {
    id: "philips-led-set",
    title: "Philips LED-lampen E27 Warm Wit (6-pack)",
    slug: "philips-led-lampen-e27-6pack",
    brand: "Philips",
    highlights: ["6 stuks", "Warm wit 2700K", "Zuinig 8,5W = 60W", "Lange levensduur"],
    description:
      "Voordelige 6-pack LED-lampen met warmwit licht en een vertrouwde E27-fitting. Energiezuinig en met een lange levensduur — vervang je oude lampen in één keer.",
    images: img("philips-led", 3),
    price: 19.95,
    compareAtPrice: 26.95,
    kluspasPrice: 17.5,
    category: "verlichting",
    subCategory: "led-lampen",
    badges: ["BESTSELLER", "ACTIE"],
    rating: 4.6,
    reviewCount: 298,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Fitting", value: "E27" },
        { label: "Kleurtemperatuur", value: "2700K warm wit" },
        { label: "Vermogen", value: "8,5W (= 60W)" },
        { label: "Aantal", value: "6 stuks" },
      ]},
    ],
    variants: [
      { id: "philips-led-default", label: "6-pack", unit: "st", price: 19.95, compareAtPrice: 26.95, kluspasPrice: 17.5, stockByStore: stock({ nijverdal: 50, emmen: 30, zutphen: 26, apeldoorn: 28, deventer: 34 }) },
    ],
    stockByStore: stock({ nijverdal: 50, emmen: 30, zutphen: 26, apeldoorn: 28, deventer: 34 }),
    frequentlyBoughtTogether: ["gira-stopcontact"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== VLOEREN & RAAM ===== */
  {
    id: "laminaat-eiken",
    title: "KLUSR Laminaat Natuureiken (2,4 m²)",
    slug: "klusr-laminaat-natuureiken",
    brand: "KLUSR",
    highlights: ["Kliksysteem", "Slijtvast klasse 32", "2,4 m² per pak", "Eenvoudig te leggen"],
    description:
      "Warm ogend natuureiken laminaat met handig kliksysteem en hoge slijtvastheid (klasse 32). Geschikt voor woonkamers en gangen. Per pak van 2,4 m².",
    images: img("laminaat", 3),
    price: 27.95,
    compareAtPrice: 32.95,
    kluspasPrice: 24.95,
    category: "vloeren-raam",
    subCategory: "laminaat-pvc",
    badges: ["ACTIE"],
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Inhoud", value: "2,4 m² per pak" },
        { label: "Slijtvastheid", value: "Klasse 32" },
        { label: "Systeem", value: "Klik" },
        { label: "Dikte", value: "8 mm" },
      ]},
    ],
    variants: [
      { id: "laminaat-default", label: "Pak 2,4 m²", unit: "st", price: 27.95, compareAtPrice: 32.95, kluspasPrice: 24.95, stockByStore: stock({ nijverdal: 60, emmen: 30, zutphen: 24, apeldoorn: 28, deventer: 36 }) },
    ],
    stockByStore: stock({ nijverdal: 60, emmen: 30, zutphen: 24, apeldoorn: 28, deventer: 36 }),
    frequentlyBoughtTogether: ["ondervloer-pak"],
    aiGeneratedContentStatus: "missing",
    contentFlags: { description: "complete", specifications: "missing", faqs: "missing", seo: "missing" },
  },
  {
    id: "ondervloer-pak",
    title: "KLUSR Ondervloer 3 mm (10 m²)",
    slug: "klusr-ondervloer-3mm",
    brand: "KLUSR",
    highlights: ["Geluiddempend", "Vochtwerend", "10 m² per rol", "Voor laminaat & PVC"],
    description:
      "Geluiddempende en vochtwerende ondervloer die je vloer comfortabeler maakt en oneffenheden egaliseert. Geschikt onder laminaat en click-PVC. Per rol van 10 m².",
    images: img("ondervloer", 2),
    price: 21.95,
    kluspasPrice: 19.5,
    category: "vloeren-raam",
    subCategory: "ondervloer",
    rating: 3.9,
    reviewCount: 38,
    specifications: [
      { group: "Specificaties", items: [
        { label: "Dikte", value: "3 mm" },
        { label: "Inhoud", value: "10 m² per rol" },
        { label: "Eigenschap", value: "Geluiddempend, vochtwerend" },
      ]},
    ],
    variants: [
      { id: "ondervloer-default", label: "Rol 10 m²", unit: "st", price: 21.95, kluspasPrice: 19.5, stockByStore: stock({ nijverdal: 34, emmen: 18, zutphen: 14, apeldoorn: 16, deventer: 20 }) },
    ],
    stockByStore: stock({ nijverdal: 34, emmen: 18, zutphen: 14, apeldoorn: 16, deventer: 20 }),
    frequentlyBoughtTogether: ["laminaat-eiken"],
    aiGeneratedContentStatus: "complete",
  },

  /* ===== BUNDELS ===== */
  {
    id: "bundel-muurverfset",
    title: "Complete Muurverfset — Verf, Roller, Tape & Vuller",
    slug: "complete-muurverfset",
    brand: "KLUSR",
    highlights: ["Alles voor één kamer", "Bespaar t.o.v. los", "Inclusief afplaktape", "Klaar om te beginnen"],
    description:
      "Begin direct met verven dankzij deze complete set: muurverf, een professionele roller, FrogTape afplaktape en allesvuller voor kleine reparaties. Voordeliger dan los gekocht.",
    images: img("bundel-muur", 3),
    price: 99.95,
    compareAtPrice: 119.8,
    kluspasPrice: 89.95,
    category: "verf",
    subCategory: "binnenmuurverf",
    badges: ["BUNDEL", "ACTIE"],
    rating: 4.4,
    reviewCount: 34,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Muurverf", value: "Flexa Creations 5L" },
        { label: "Roller", value: "Anza Silver 18 cm" },
        { label: "Tape", value: "FrogTape 24 mm" },
        { label: "Vuller", value: "Alabastine 1 kg" },
      ]},
    ],
    variants: [
      { id: "bundel-muur-default", label: "Set", unit: "st", price: 99.95, compareAtPrice: 119.8, kluspasPrice: 89.95, stockByStore: stock({ nijverdal: 16, emmen: 8, zutphen: 6, apeldoorn: 7, deventer: 10 }) },
    ],
    stockByStore: stock({ nijverdal: 16, emmen: 8, zutphen: 6, apeldoorn: 7, deventer: 10 }),
    frequentlyBoughtTogether: ["anza-pro-kwastset", "schuurpapier-set"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "bundel-kozijn-pakket",
    title: "Kozijn Schilder Pakket — Lak, Primer, Kwast & Schuur",
    slug: "kozijn-schilder-pakket",
    brand: "KLUSR",
    highlights: ["Voor strak houtwerk", "Lak + primer", "Inclusief kwasten", "Schuurmateriaal"],
    description:
      "Het complete pakket voor het schilderen van kozijnen en deuren: watergedragen PU-lak, multiprimer, een professionele kwastset en schuurpapier. Alles in één keer in huis.",
    images: img("bundel-kozijn", 3),
    price: 89.95,
    compareAtPrice: 104.8,
    kluspasPrice: 81.95,
    category: "verf",
    subCategory: "lak",
    badges: ["BUNDEL"],
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Lak", value: "Sigma Contour Aqua PU 0,75L" },
        { label: "Primer", value: "Sigma Multiprimer 1L" },
        { label: "Kwasten", value: "Anza Pro set 3-delig" },
        { label: "Schuur", value: "Schuurpapier assortiment" },
      ]},
    ],
    variants: [
      { id: "bundel-kozijn-default", label: "Set", unit: "st", price: 89.95, compareAtPrice: 104.8, kluspasPrice: 81.95, stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 5, apeldoorn: 6, deventer: 8 }) },
    ],
    stockByStore: stock({ nijverdal: 12, emmen: 6, zutphen: 5, apeldoorn: 6, deventer: 8 }),
    frequentlyBoughtTogether: ["frogtape-afplaktape"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },
  {
    id: "bundel-beits-starter",
    title: "Beits Starterspakket — Beits, Kwast & Schuur",
    slug: "beits-starterspakket",
    brand: "KLUSR",
    highlights: ["Voor tuinhout", "Beits + kwasten", "Schuurmateriaal", "Voordeelprijs"],
    description:
      "Alles om je schutting of tuinhuis een nieuwe look te geven: dekkende tuinhoutbeits, een set kwasten en schuurpapier voor de voorbereiding. Voordelig samengesteld.",
    images: img("bundel-beits", 3),
    price: 49.95,
    compareAtPrice: 58.85,
    kluspasPrice: 44.95,
    category: "tuin",
    subCategory: "tuinhoutbeits",
    badges: ["BUNDEL"],
    rating: 0,
    reviewCount: 0,
    specifications: [
      { group: "Inhoud", items: [
        { label: "Beits", value: "Hermadix Tuinhoutbeits 2,5L" },
        { label: "Kwasten", value: "Anza Pro set 3-delig" },
        { label: "Schuur", value: "Schuurpapier assortiment" },
      ]},
    ],
    variants: [
      { id: "bundel-beits-default", label: "Set", unit: "st", price: 49.95, compareAtPrice: 58.85, kluspasPrice: 44.95, stockByStore: stock({ nijverdal: 14, emmen: 7, zutphen: 5, apeldoorn: 6, deventer: 9 }) },
    ],
    stockByStore: stock({ nijverdal: 14, emmen: 7, zutphen: 5, apeldoorn: 6, deventer: 9 }),
    frequentlyBoughtTogether: ["hermadix-tuinhoutbeits"],
    colorMatchable: true,
    aiGeneratedContentStatus: "complete",
  },
];

/**
 * KLUSRPAS = vaste 5% korting op de normale prijs, over de HÉLE collectie. We
 * dwingen dit hier centraal af (op het product én elke variant), zodat de
 * weergave, winkelwagen, checkout én de Google-feed altijd exact 5% tonen —
 * ongeacht de (wisselende) kluspasPrice die in de feed/curated data staat.
 */
const KLUSPAS_RATE = 0.05;
const fivePctPrice = (price: number) =>
  Math.round(price * (1 - KLUSPAS_RATE) * 100) / 100;
function enforceKluspasDiscount(p: Product): Product {
  return {
    ...p,
    kluspasPrice: fivePctPrice(p.price),
    variants: p.variants.map((v) => ({ ...v, kluspasPrice: fivePctPrice(v.price) })),
  };
}

/**
 * The active catalogus: real Tilroy feed products when available, otherwise the
 * curated fallback set. Helpers below operate on this combined source. De
 * KLUSRPAS-prijs wordt centraal op een vaste 5% korting gezet.
 */
export const products: Product[] = applyCatalogOverlay(
  (feedProducts.length ? feedProducts : curatedProducts).map(enforceKluspasDiscount),
  catalogOverridesData as CatalogOverrides,
  customProductsData as unknown as Product[],
);

/* ------------------------------------------------------------------ lookups */

export function getProduct(slug: string): Product | undefined {
  const exact = products.find((p) => p.slug === slug);
  if (exact) return exact;
  // Terugval: een gewijzigde slug (bv. na een feed-rebuild waarbij de titel —
  // en dus het tekstdeel van de slug — veranderde) eindigt nog op het stabiele
  // tilroy-id. Resolve op dat id zodat bestaande winkelwagen-links, bookmarks en
  // zoekresultaten niet 404'en maar netjes op het juiste product uitkomen.
  const m = slug.match(/-(\d+)$/);
  if (m) return products.find((p) => p.id === `tilroy-${m[1]}`);
  return undefined;
}

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  if (categorySlug === "acties") {
    return products.filter((p) => p.badges?.includes("ACTIE"));
  }
  return products.filter((p) => p.category === categorySlug);
}

export function getProductsBySubCategory(sub: string): Product[] {
  return products.filter((p) => p.subCategory === sub);
}

/* ------------------------------------------------- subcategorieën (afgeleid) */

// Nette titels voor de ruwe feed-slugs; anders een prettify-fallback.
const SUB_TITLE_FIXUPS: Record<string, string> = {
  "schildersgereedschap": "Schildergereedschap",
  "schuurmateriaal": "Schuurmateriaal",
  "schimmel-aanslag": "Schimmel & aanslag",
  "acc-elektrisch-gereedschap": "Accessoires elektrisch gereedschap",
  "elektrisch-gereedschap": "Elektrisch gereedschap",
  "ijzerwaren-hang-en-sluitwerk": "Hang- & sluitwerk",
  "verlengkabels-en-tafelcontactdozen": "Verlengkabels & contactdozen",
  "lijmen-kitten-en-vulmiddelen": "Lijmen, kitten & vulmiddelen",
  "interbosch-aanhangw-en-auto": "Aanhangwagen & auto",
  "interbosch-gereedschap": "Gereedschap",
  "lichtbronnen-en-zaklampen": "Lichtbronnen & zaklampen",
  "hand-tuingereedschap": "Tuingereedschap",
  "overig-electra": "Overig elektra",
  "overige-ijzerwaren": "Overige ijzerwaren",
  "overige-bouwmaterialen": "Overige bouwmaterialen",
  "alabastine-toebehoren": "Toebehoren",
  "bouwemmers-en-speciekuipen": "Emmers & speciekuipen",
  "zelfklevende-artikelen": "Zelfklevende artikelen",
  "fitex-diversen": "Diversen",
  "fitex-non-paint": "Diversen",
};

function prettySubTitle(slug: string): string {
  if (SUB_TITLE_FIXUPS[slug]) return SUB_TITLE_FIXUPS[slug];
  const s = slug.replace(/-en-/g, " & ").replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : slug;
}

export interface SubCategory {
  slug: string;
  title: string;
  count: number;
}

/**
 * Rommel-subcategorieën uit de feed die we niet in de navigatie willen: merk-
 * namen, "diversen/overig/toebehoren", de categorie zelf en feed-prefixen.
 */
const JUNK_SUB_RE =
  /^(diversen|overig|overige|toebehoren|huishoudelijk|anza|euromat|zelfklevende-artikelen|non-paint|fitex-.+|interbosch-.+|overige-.+|alabastine-.+|.+-diversen|.+-toebehoren|.+-non-paint)$/i;

function isJunkSub(slug: string, categorySlug: string): boolean {
  return slug === categorySlug || JUNK_SUB_RE.test(slug);
}

const subsByCategory: Record<string, SubCategory[]> = (() => {
  const map = new Map<string, Map<string, number>>();
  for (const p of products) {
    if (!p.subCategory) continue;
    if (!map.has(p.category)) map.set(p.category, new Map());
    const m = map.get(p.category)!;
    m.set(p.subCategory, (m.get(p.subCategory) ?? 0) + 1);
  }
  const out: Record<string, SubCategory[]> = {};
  for (const [cat, m] of map) {
    out[cat] = [...m.entries()]
      .filter(([slug]) => !isJunkSub(slug, cat))
      .map(([slug, count]) => ({ slug, title: prettySubTitle(slug), count }))
      .sort((a, b) => b.count - a.count);
  }
  return out;
})();

/**
 * Subcategorie-slugs die we bewust NIET in de navigatie tonen omdat een andere,
 * gevulde subcategorie ze al dekt (voorkomt dubbele menu-namen). De producten
 * blijven gewoon vindbaar onder de dekkende subcategorie.
 */
const REDUNDANT_SUBS = new Set(["led-lampen", "armaturen", "buitenverlichting"]);

const normSubTitle = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Subcategorieën van een categorie. Bron-van-waarheid is de taxonomie in
 * categories.ts (zodat SEO-landingspagina's altijd geldige routes zijn, ook als
 * de feed er nog geen producten voor heeft); aangevuld met subcategorieën die
 * alleen uit de catalogus komen. Het aantal (`count`) komt uit de echte feed.
 *
 * Lege (gedefinieerde) subcategorieën worden onderdrukt zodra hun titel
 * (bijna) samenvalt met een gevulde subcategorie — anders zie je dubbele
 * menunamen zoals "Schildersgereedschap" náást "Schildersgereedschap &
 * schuurpapier". Unieke, nog lege SEO-leaves (bv. Traplak) blijven staan.
 */
export function getSubCategories(categorySlug: string): SubCategory[] {
  const catalog = subsByCategory[categorySlug] ?? [];
  const defined = categories.find((c) => c.slug === categorySlug)?.subCategories ?? [];
  if (defined.length === 0) return catalog;

  const seen = new Set(catalog.map((s) => s.slug));
  const catalogTitles = catalog.map((s) => normSubTitle(s.title)).filter((t) => t.length >= 5);
  const duplicatesCatalogTitle = (title: string): boolean => {
    const n = normSubTitle(title);
    if (n.length < 5) return false;
    return catalogTitles.some((c) => c === n || c.includes(n) || n.includes(c));
  };

  const extras: SubCategory[] = defined
    .filter(
      (d) => !seen.has(d.slug) && !REDUNDANT_SUBS.has(d.slug) && !duplicatesCatalogTitle(d.title),
    )
    .map((d) => ({ slug: d.slug, title: d.title, count: 0 }));
  return [...catalog, ...extras];
}

export function getSubCategory(
  categorySlug: string,
  subSlug: string,
): SubCategory | undefined {
  return getSubCategories(categorySlug).find((s) => s.slug === subSlug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.subCategory === product.subCategory),
    )
    .slice(0, limit);
}

function totalStock(p: Product): number {
  return onlineStock(p.stockByStore);
}

const ACCESSORY_CATEGORIES = ["gereedschap", "afbouw-fijnbouw"];

/** Cheap in-stock add-ons used for "vaak vergeten" / "vaak samen gekocht". */
const ACCESSORY_KEYWORDS =
  /kwast|roller|verfrol|radiatorrol|afplaktape|afplak|afdek|verfbak|aftak|schuur|plamuurmes|verfmenger|spaan|\btape\b/i;

export function getAccessorySuggestions(limit = 3, exclude: string[] = []): Product[] {
  const pool = products.filter(
    (p) =>
      ACCESSORY_CATEGORIES.includes(p.category) &&
      p.price < 30 &&
      totalStock(p) > 0 &&
      !exclude.includes(p.id),
  );
  // Echte schilders-/klusbenodigdheden (kwast, roller, tape…) vooraan.
  return pool
    .map((p) => ({
      p,
      score: (ACCESSORY_KEYWORDS.test(p.title) ? 100 : 0) + Math.min(p.reviewCount, 200) / 200,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

function getCompanionSuggestions(product: Product, limit: number): Product[] {
  if (product.category === "verf") {
    const acc = getAccessorySuggestions(limit, [product.id]);
    if (acc.length) return acc;
  }
  return getRelatedProducts(product, limit + 2)
    .filter((p) => p.id !== product.id)
    .slice(0, limit);
}

export function getFrequentlyBoughtTogether(product: Product): Product[] {
  const explicit = product.frequentlyBoughtTogether
    .map((id) => getProductById(id))
    .filter((p): p is Product => Boolean(p));
  if (explicit.length > 0) return explicit;
  // Feed-producten hebben geen expliciete combinaties → toon passende aanvulling.
  return getCompanionSuggestions(product, 3);
}

export function getBestsellers(limit = 8): Product[] {
  return products
    .filter((p) => p.badges?.includes("BESTSELLER") || p.rating >= 4.6)
    .slice(0, limit);
}

/* ----------------------------------------------- glansgraad-varianten (verf) */

const GLANS_LEVELS: { id: string; label: string; re: RegExp }[] = [
  // Nederlands
  { id: "mat", label: "Mat", re: /\bmat\b/i },
  { id: "zijdemat", label: "Zijdemat", re: /zijdemat/i },
  { id: "halfmat", label: "Halfmat", re: /halfmat/i },
  { id: "zijdeglans", label: "Zijdeglans", re: /zijdeglans/i },
  { id: "hoogglans", label: "Hoogglans", re: /hoogglans/i },
  { id: "glans", label: "Glans", re: /\bglans\b/i },
  // Engels (o.a. Sikkens) — blijft Engels, kiesbaar als glans-variant
  { id: "matt", label: "Matt", re: /\bmatte?\b/i },
  { id: "eggshell", label: "Eggshell", re: /\beggshell\b/i },
  { id: "satin", label: "Satin", re: /\bsatin\b/i },
  { id: "silk", label: "Silk", re: /\bsilk\b/i },
  { id: "highgloss", label: "High Gloss", re: /high[\s-]*gloss/i },
  { id: "semigloss", label: "Semi-gloss", re: /semi[\s-]*gloss/i },
  { id: "gloss", label: "Gloss", re: /\bgloss\b/i },
];
const GLANS_SPECIFICITY = [
  "zijdemat",
  "zijdeglans",
  "halfmat",
  "hoogglans",
  "highgloss",
  "semigloss",
  "eggshell",
  "satin",
  "silk",
  "matt",
  "mat",
  "gloss",
  "glans",
];

function glansOf(title: string): { id: string; label: string; re: RegExp } | null {
  for (const id of GLANS_SPECIFICITY) {
    const def = GLANS_LEVELS.find((g) => g.id === id)!;
    if (def.re.test(title)) return def;
  }
  return null;
}

function paintLineKey(p: Product): string {
  const g = glansOf(p.title);
  const base = (g ? p.title.replace(g.re, " ") : p.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${(p.brand || "").toLowerCase()}|${base}`;
}

export interface GlansVariant {
  id: string;
  label: string;
  slug: string;
  active: boolean;
}

/** Dezelfde verflijn in andere glansgraden (om als opties op de PDP te tonen). */
export function getGlansVariants(product: Product): GlansVariant[] {
  if (!product.colorMatchable || !glansOf(product.title)) return [];
  const key = paintLineKey(product);
  const byGlans = new Map<string, GlansVariant>();
  for (const p of products) {
    if (!p.colorMatchable) continue;
    const g = glansOf(p.title);
    if (!g || paintLineKey(p) !== key) continue;
    if (!byGlans.has(g.id)) {
      byGlans.set(g.id, {
        id: g.id,
        label: g.label,
        slug: p.slug,
        active: p.id === product.id,
      });
    }
  }
  if (byGlans.size < 2) return [];
  return GLANS_LEVELS.filter((l) => byGlans.has(l.id)).map((l) => byGlans.get(l.id)!);
}

export function getActieProducts(limit = 8): Product[] {
  return products.filter((p) => p.badges?.includes("ACTIE")).slice(0, limit);
}

export function getBundles(): Product[] {
  return products.filter((p) => p.badges?.includes("BUNDEL"));
}

/* ----------------------------------------------------------------- search */

function normalizeSearch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Levenshtein-afstand met vroege afkap — voor typo-tolerantie. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

interface SearchEntry {
  p: Product;
  title: string;
  brand: string;
  hay: string;
  words: string[];
}

let searchIndex: SearchEntry[] | null = null;
function getSearchIndex(): SearchEntry[] {
  if (searchIndex) return searchIndex;
  searchIndex = products.map((p) => {
    const hay = normalizeSearch(
      `${p.title} ${p.brand} ${p.category} ${p.subCategory ?? ""} ${p.highlights.join(" ")}`,
    );
    return {
      p,
      title: normalizeSearch(p.title),
      brand: normalizeSearch(p.brand),
      hay,
      words: Array.from(new Set(hay.split(/[^a-z0-9]+/).filter((w) => w.length > 1))),
    };
  });
  return searchIndex;
}

/**
 * Relevantie-zoekfunctie met typo-tolerantie (Doofinder-stijl): scoort op
 * exacte titel-/merktreffers, token-dekking en fuzzy bijna-treffers, en sorteert
 * op relevantie met populariteit als tie-breaker.
 */
export function searchProducts(query: string, limit = 60): Product[] {
  const q = normalizeSearch(query.trim());
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { p: Product; score: number }[] = [];

  for (const e of getSearchIndex()) {
    let score = 0;
    if (e.title === q) score += 120;
    else if (e.title.startsWith(q)) score += 60;
    if (e.title.includes(q)) score += 40;
    if (e.brand.includes(q)) score += 30;
    else if (e.hay.includes(q)) score += 12;

    let matched = 0;
    for (const t of tokens) {
      if (e.hay.includes(t)) {
        score += e.title.includes(t) ? 12 : 7;
        matched++;
        continue;
      }
      const tol = t.length <= 4 ? 1 : 2; // typo-tolerantie
      let best = tol + 1;
      for (const w of e.words) {
        const d = editDistance(w, t, tol);
        if (d < best) best = d;
        if (best === 0) break;
      }
      if (best <= tol) {
        score += 6 - best * 2;
        matched++;
      }
    }

    if (tokens.length > 1) {
      if (matched === 0) continue;
      if (matched < tokens.length) score -= (tokens.length - matched) * 10;
    } else if (matched === 0 && score === 0) {
      continue;
    }
    if (score <= 0) continue;

    score += Math.min(e.p.reviewCount, 250) / 250; // lichte populariteits-nudge
    scored.push({ p: e.p, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.p);
}

export const allProductSlugs = products.map((p) => p.slug);
