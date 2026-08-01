import type { CartItem, SelectedColor } from "@/types";

/**
 * Kleurtester: 30 ml in élke kleur, en het bedrag komt terug als tegoed.
 *
 * Waarom: de grootste drempel bij mengverf is dat je de kleur niet kunt zien
 * voordat hij gemengd is, en gemengde verf nemen we niet terug. Een tester van
 * € 2,99 haalt die drempel weg. Doordat het bedrag ná betaling terugkomt als
 * voucher — geldig bij een bestelling mét mengverf — kost hij de klant per
 * saldo niets zodra hij de verf ook echt koopt.
 *
 * **De tester is een virtueel artikel.** Hij staat niet in de Tilroy-catalogus
 * en niet in de Google-feed: er is geen voorraad van 30-ml-potjes in elke
 * denkbare kleur, die worden per bestelling gemengd. Dat heeft twee gevolgen
 * die makkelijk fout gaan:
 *
 *  1. de voorraadcontrole moet hem overslaan — anders blokkeert de
 *     uitverkocht-logica een artikel dat per definitie geen voorraad heeft;
 *  2. de prijscontrole moet hem kennen — anders klopt het ordertotaal niet met
 *     de catalogus en weigert `verifyOrderTotal` de hele bestelling.
 *
 * Allebei zijn gemeld door de VDM-sessie, die ze tegenkwam toen hun testers
 * stilletjes niet te bestellen waren.
 */

/** Vaste sku. Niet in de feed, niet bij Tilroy — puur van ons. */
export const KLEURTESTER_ID = "klusr-kleurtester-30ml";

/** Prijs per tester (incl. btw), gelijk aan wat verfwinkel.nl ervoor vraagt. */
export const KLEURTESTER_PRIJS = 2.99;

/** Hoe lang de voucher geldig is, in maanden. */
export const VOUCHER_MAANDEN = 12;

/** Is deze regel een kleurtester? */
export function isKleurtester(it: { productId?: string; variantId?: string }): boolean {
  return it.productId === KLEURTESTER_ID || it.variantId === KLEURTESTER_ID;
}

/** Bevat de winkelwagen mengverf? Bepaalt of een voucher inwisselbaar is. */
export function bevatMengverf(items: CartItem[]): boolean {
  return items.some((it) => !isKleurtester(it) && Boolean(it.selectedColor));
}

/** De testers in een winkelwagen. */
export function testersIn(items: CartItem[]): CartItem[] {
  return items.filter(isKleurtester);
}

/** Totale waarde aan testers — dat wordt straks de voucher. */
export function testerBedrag(items: CartItem[]): number {
  const cent = testersIn(items).reduce(
    (n, it) => n + Math.round(it.price * 100) * it.quantity,
    0,
  );
  return cent / 100;
}

/** Bouw een winkelwagenregel voor een tester in een gekozen kleur. */
export function kleurtesterRegel(kleur: SelectedColor, quantity = 1): CartItem {
  return {
    // De kleurcode hoort in de sleutel: twee testers in verschillende kleuren
    // zijn twee regels, geen aantal 2 van hetzelfde.
    key: `${KLEURTESTER_ID}__${kleur.code || kleur.name}`,
    productId: KLEURTESTER_ID,
    variantId: KLEURTESTER_ID,
    title: `Kleurtester 30 ml — ${kleur.name}`,
    brand: "KLUSR",
    image: "",
    variantLabel: "30 ml",
    slug: "kleurtester",
    quantity,
    price: KLEURTESTER_PRIJS,
    // Geen KLUSRPAS-korting op een artikel dat je toch terugkrijgt als tegoed.
    kluspasPrice: KLEURTESTER_PRIJS,
    selectedColor: kleur,
  };
}
