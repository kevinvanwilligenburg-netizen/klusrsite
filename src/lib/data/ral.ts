import GEGENEREERD from "@/lib/data/ral-kleuren.generated.json";
import { products } from "@/lib/data/products";
import type { Product, SelectedColor } from "@/types";

/**
 * RAL-kleuren als landingspagina's.
 *
 * Waarom: wie "RAL 7016 verf" zoekt, zoekt niet naar een productcategorie maar
 * naar één kleur. Een pagina per kleur vangt die zoekopdracht op en leidt door
 * naar de verf die wij daadwerkelijk in die kleur mengen.
 *
 * ⚠️ Bewust GEEN pagina per merkkleur. De portalfeed heeft 54.222 kleuren; daar
 * een pagina van maken levert tienduizenden pagina's die allemaal vrijwel
 * hetzelfde zeggen, en dat straft Google af als thin content. RAL is de
 * uitzondering omdat er echt op gezocht wordt en de codes algemeen bekend zijn.
 *
 * ⚠️ RAL Classic telt officieel 213 kleuren; wij hebben er zoveel als onze
 * bronnen leveren (nu 82, zie scripts/sync-ral-kleuren.mjs). De ontbrekende
 * namen en hex-waarden verzinnen zou betekenen dat we kleuren laten mengen op
 * gegevens die we niet hebben.
 */

export interface RalKleur {
  nummer: number;
  naam: string;
  hex: string;
}

export const ralKleuren: RalKleur[] = (GEGENEREERD.kleuren as RalKleur[])
  .slice()
  .sort((a, b) => a.nummer - b.nummer);

/** URL-segment: "ral-7016". Het nummer is de sleutel, de naam mag wijzigen. */
export function ralSlug(k: RalKleur): string {
  return `ral-${k.nummer}`;
}

const perNummer = new Map(ralKleuren.map((k) => [k.nummer, k]));

/** Zoek een RAL-kleur bij een slug of code; tolerant voor schrijfwijze. */
export function getRal(slugOfCode: string): RalKleur | undefined {
  const m = String(slugOfCode ?? "").match(/([0-9]{4})/);
  return m ? perNummer.get(parseInt(m[1], 10)) : undefined;
}

/** De code zoals hij in onze catalogus en in `?kleur=` staat. */
export function ralCode(k: RalKleur): string {
  return `RAL ${k.nummer}`;
}

/**
 * Hoofdgroep van een RAL-kleur, afgeleid uit het eerste cijfer. Dat is geen
 * gok maar de opzet van het RAL-systeem zelf: 1 = geel, 2 = oranje, enzovoort.
 */
const FAMILIES: Record<number, string> = {
  1: "Geel",
  2: "Oranje",
  3: "Rood",
  4: "Paars",
  5: "Blauw",
  6: "Groen",
  7: "Grijs",
  8: "Bruin",
  9: "Wit & zwart",
};

export function ralFamilie(k: RalKleur): string {
  return FAMILIES[Math.floor(k.nummer / 1000)] ?? "Overig";
}

/** Kleuren uit dezelfde RAL-hoofdgroep, voor "verwante kleuren". */
export function verwanteRal(k: RalKleur, aantal = 8): RalKleur[] {
  const groep = Math.floor(k.nummer / 1000);
  return ralKleuren
    .filter((x) => x.nummer !== k.nummer && Math.floor(x.nummer / 1000) === groep)
    .sort((a, b) => Math.abs(a.nummer - k.nummer) - Math.abs(b.nummer - k.nummer))
    .slice(0, aantal);
}

/**
 * De producten die wij in deze kleur mengen, gegroepeerd per verfsoort.
 *
 * Elke mengbare verf kan élke RAL-kleur aan — de kleur zit niet in het product
 * maar in wat de mengmachine erin doet. De lijst is dus voor elke RAL-kleur
 * dezelfde; wat verschilt is de deeplink.
 */
export function mengbareProducten(): { soort: string; producten: Product[] }[] {
  const perSoort = new Map<string, Product[]>();
  for (const p of products) {
    if (!p.colorMatchable) continue;
    const soort = p.subCategory?.trim() || "Overige verf";
    const lijst = perSoort.get(soort);
    if (lijst) lijst.push(p);
    else perSoort.set(soort, [p]);
  }
  return [...perSoort.entries()]
    .map(([soort, lijst]) => ({
      soort,
      // Goedkoopste eerst: bij een kleurpagina wil je een instapprijs zien.
      producten: lijst.slice().sort((a, b) => a.price - b.price).slice(0, 6),
    }))
    .sort((a, b) => b.producten.length - a.producten.length);
}

/** Link naar een product met deze kleur al voorgeselecteerd. */
export function productLink(p: Product, k: RalKleur): string {
  return `/product/${p.slug}?kleur=${encodeURIComponent(ralCode(k))}`;
}

/** De kleur als winkelwagen-kleur, zodat de PDP 'm herkent. */
export function alsSelectedColor(k: RalKleur): SelectedColor {
  return { name: k.naam, code: ralCode(k), hex: k.hex, collection: "RAL Classic" };
}
