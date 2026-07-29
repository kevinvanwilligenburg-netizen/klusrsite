import type { StoreStock } from "@/types";

/**
 * Voorraadlogica voor de webshop. Online verkopen we uitsluitend vanuit de
 * hoofdvestiging (Nijverdal), en pas vanaf een instelbare veiligheidsvoorraad.
 * Zakt de Nijverdal-voorraad onder die drempel, dan is het product niet
 * leverbaar (wordt als uitverkocht getoond en niet verkocht).
 */

/** Hoofdvestiging waaruit we online leveren. */
export const PRIMARY_STORE_ID = "nijverdal";

/** Standaard veiligheidsvoorraad: onder dit aantal verkopen we niet online. */
export const DEFAULT_SAFETY_STOCK = 2;

/** Voorraad van de hoofdvestiging (Nijverdal). */
export function primaryStock(stockByStore: StoreStock[] | undefined): number {
  if (!stockByStore?.length) return 0;
  return stockByStore.find((s) => s.storeId === PRIMARY_STORE_ID)?.quantity ?? 0;
}

/**
 * Online beschikbare voorraad: de Nijverdal-voorraad, of 0 zodra die onder de
 * veiligheidsvoorraad zakt (dan tonen/verkopen we het product niet online).
 */
export function onlineStock(
  stockByStore: StoreStock[] | undefined,
  safety: number = DEFAULT_SAFETY_STOCK,
): number {
  const qty = primaryStock(stockByStore);
  return qty >= safety ? qty : 0;
}

/** Is het product online leverbaar? (Nijverdal-voorraad ≥ veiligheidsvoorraad) */
export function inStockOnline(
  stockByStore: StoreStock[] | undefined,
  safety: number = DEFAULT_SAFETY_STOCK,
): boolean {
  return primaryStock(stockByStore) >= safety;
}

/** Minimale vorm die `bestVariantStock` nodig heeft (geen import van de catalogus). */
interface StockedProduct {
  stockByStore?: StoreStock[];
  variants?: { stockByStore?: StoreStock[] }[];
}

/**
 * Goedkoopste variant die ook écht leverbaar is; `undefined` als geen enkele
 * variant dat is.
 *
 * "Snel toevoegen" op een kaart of listing-rij toont de goedkoopste variant,
 * maar die is niet altijd op voorraad — de kaart zelf kijkt naar de best
 * leverbare variant. Zonder deze filtering belandt er een onbestelbaar artikel
 * in de winkelwagen en loopt de klant pas in de checkout tegen een blokkade aan.
 */
export function cheapestSellableVariant<
  T extends { kluspasPrice: number; stockByStore?: StoreStock[] },
>(variants: T[] | undefined, safety: number = DEFAULT_SAFETY_STOCK): T | undefined {
  const leverbaar = (variants ?? []).filter((v) => inStockOnline(v.stockByStore, safety));
  if (!leverbaar.length) return undefined;
  return leverbaar.reduce((a, b) => (b.kluspasPrice < a.kluspasPrice ? b : a));
}

/**
 * Voorraad van de best leverbare variant van een product.
 *
 * Een product is verkoopbaar zolang één maat of kleur nog op voorraad ligt: de
 * lead-variant kan leeg zijn terwijl grotere maten er nog wel zijn. Overzichten
 * (listing, kaart, schema.org-beschikbaarheid) beslissen daarom hierop, in
 * plaats van op de product-niveau voorraad — die spiegelt de lead-variant en is
 * bedoeld als échte stand, niet als verkoopbaarheidssignaal.
 */
export function bestVariantStock(p: StockedProduct): StoreStock[] {
  const variants = p.variants ?? [];
  if (!variants.length) return p.stockByStore ?? [];
  const best = Math.max(...variants.map((v) => primaryStock(v.stockByStore)));
  return [{ storeId: PRIMARY_STORE_ID, quantity: best }];
}
