import { products } from "@/lib/data/products";
import { brands } from "@/lib/data/brands";
import type { Product } from "@/types";

/**
 * Merken die wij níet voeren, met onze tegenhangers.
 *
 * Waarom: iemand die op "Wijzonol muurverf" zoekt, is op zoek naar muurverf —
 * niet per se naar Wijzonol. Zonder pagina landt die zoekopdracht bij een
 * concurrent; met deze pagina landt hij bij ons assortiment in dezelfde
 * verfsoort.
 *
 * **Wat we hier bewust NIET doen:** beweren dat product A gelijk is aan product
 * B, of uitspraken doen over de kwaliteit van een merk dat we niet verkopen.
 * Dat kunnen we niet onderbouwen — wij hebben die verf niet getest — en het is
 * bovendien geen fraaie manier om over een ander merk te praten. De pagina zegt
 * eerlijk dat we het merk niet voeren en laat zien wat we wél hebben in
 * dezelfde soort verf. De lezer beslist zelf.
 */

export interface Alternatief {
  slug: string;
  /** Het merk waarop gezocht wordt, in de schrijfwijze die mensen gebruiken. */
  merk: string;
  /**
   * Waar dit merk in de praktijk voor gekocht wordt — feitelijk en neutraal
   * gehouden, zodat we niets beweren wat we niet weten.
   */
  waarvoor: string;
  /** Onze soorten die dezelfde klus doen; de sleutel matcht op de titel. */
  soorten: { kop: string; patroon: RegExp }[];
}

export const ALTERNATIEVEN: Alternatief[] = [
  {
    slug: "wijzonol",
    merk: "Wijzonol",
    waarvoor: "muurverf, lakken en beitsen voor binnen en buiten",
    soorten: [
      { kop: "Muurverf", patroon: /\b(muurverf|latex|wandverf)\b/ },
      { kop: "Lak voor binnen en buiten", patroon: /\blak\b/ },
      { kop: "Beits voor buitenhout", patroon: /\bbeits\b/ },
    ],
  },
  {
    slug: "sigma",
    merk: "Sigma",
    waarvoor: "muurverf en lakken, veel gebruikt door schilders",
    soorten: [
      { kop: "Muurverf", patroon: /\b(muurverf|latex|wandverf)\b/ },
      { kop: "Lak voor binnen en buiten", patroon: /\blak\b/ },
      { kop: "Grondverf en primer", patroon: /\b(grondverf|primer|voorstrijk)\b/ },
    ],
  },
  {
    slug: "ralston",
    merk: "Ralston",
    waarvoor: "muurverf en lakken",
    soorten: [
      { kop: "Muurverf", patroon: /\b(muurverf|latex|wandverf)\b/ },
      { kop: "Lak voor binnen en buiten", patroon: /\blak\b/ },
    ],
  },
  {
    slug: "wilckens",
    merk: "Wilckens",
    waarvoor: "lakken en beitsen voor houtwerk",
    soorten: [
      { kop: "Lak voor binnen en buiten", patroon: /\blak\b/ },
      { kop: "Beits voor buitenhout", patroon: /\bbeits\b/ },
    ],
  },
];

export function getAlternatief(slug: string): Alternatief | undefined {
  return ALTERNATIEVEN.find((a) => a.slug === slug);
}

/** Voeren wij dit merk misschien tóch? Dan hoort er geen alternatief-pagina te zijn. */
const gevoerd = new Set(brands.map((b) => b.name.toLowerCase()));

export function voerenWijDit(merk: string): boolean {
  return gevoerd.has(merk.toLowerCase());
}

const titel = (p: Product) => `${p.brand} ${p.title}`.toLowerCase();

/** Onze producten per soort, best beoordeeld eerst. */
export function onzeTegenhangers(
  a: Alternatief,
  perSoort = 4,
): { kop: string; producten: Product[] }[] {
  return a.soorten
    .map((s) => ({
      kop: s.kop,
      producten: products
        .filter((p) => p.category === "verf" && s.patroon.test(titel(p)))
        .sort((x, y) => {
          const sx = x.reviewCount > 0 ? x.rating : 0;
          const sy = y.reviewCount > 0 ? y.rating : 0;
          if (sy !== sx) return sy - sx;
          return x.price - y.price;
        })
        .slice(0, perSoort),
    }))
    .filter((s) => s.producten.length > 0);
}
