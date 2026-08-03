import KAART from "@/lib/data/voorgemengde-kleuren.generated.json";
import type { Product } from "@/types";

/**
 * De kleur van een voorgemengd blik, als we die zéker weten.
 *
 * Een blik "Flexa Expert Muurverf Ivoorbruin FE103" heeft één foto: het blik.
 * De kleur — precies waarvoor de klant komt — zie je er niet op. Bij mengverf
 * staat er een kleurkiezer op de pagina; bij voorgemengd stond er niets.
 *
 * **Alleen waar het zeker klopt.** De opzoeking gebeurt niet hier maar in
 * `scripts/sync-voorgemengde-kleuren.mjs`, tegen de volledige kleurenbron van
 * 54.222 kleuren, en die schrijft alleen de ondubbelzinnige treffers weg. Wat
 * daar afvalt krijgt hier bewust geen vlak:
 *
 *  - kale kleurwoorden ("Wit" staat bij 77 producten, en de bron kent er negen
 *    die zo heten);
 *  - waarden die op meerdere hexes uitkomen ("Donkergroen" op elf);
 *  - waarden die de bron niet kent.
 *
 * Dat is streng, en dat hoort: bij verf koopt iemand op wat hij ziet. Een
 * benaderde kleur is erger dan geen kleur. Van 406 voorgemengde producten
 * houden we er zo 8 over — de rest heeft een kleurveld dat in de kassa te vaag
 * is ingevuld, en dát is waar de winst zit, niet in beter gokken.
 */

export interface Kleurvlak {
  hex: string;
  naam: string;
  code: string;
  /** Beits en andere doorschijnende producten: het hout schijnt erdoorheen. */
  transparant?: boolean;
}

/**
 * Doorschijnend product?
 *
 * Bij een transparante beits is een dicht kleurvlak te stellig: "Rambo
 * pantserbeits deur en kozijn transp." in Licht eiken geeft op grenen een
 * andere kleur dan op eiken. De kleur klopt, het eindresultaat niet
 * noodzakelijk — dus tonen we hem mét die kanttekening in plaats van hem te
 * verzwijgen.
 */
const TRANSPARANT = /\b(transp\.?|transparant|translucent|beits|lazuur)\b/i;

const kaart = KAART.kleuren as Record<string, Kleurvlak>;

function specWaarde(p: Product, label: string): string {
  for (const groep of p.specifications ?? []) {
    for (const item of groep.items ?? []) {
      if (String(item.label ?? "").trim().toLowerCase() === label) {
        return String(item.value ?? "").trim();
      }
    }
  }
  return "";
}

export function kleurvlakVoor(p: Product): Kleurvlak | undefined {
  // Mengverf heeft een kleurkiezer; daar is een vast vlak juist misleidend.
  if (p.colorMatchable) return undefined;
  const waarde = specWaarde(p, "kleur");
  if (!waarde) return undefined;
  const treffer = kaart[waarde];
  if (!treffer) return undefined;
  return TRANSPARANT.test(p.title) ? { ...treffer, transparant: true } : treffer;
}

/** URL van het kleurvlak, voor <img> en voor g:additional_image_link. */
export function kleurvlakUrl(basis: string, k: Kleurvlak): string {
  const q = new URLSearchParams({ hex: k.hex, naam: k.naam });
  if (k.code) q.set("code", k.code);
  return `${basis.replace(/\/$/, "")}/api/kleurplaatje?${q.toString()}`;
}
