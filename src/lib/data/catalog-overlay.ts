import type { Product } from "@/types";

/**
 * KLUSR catalogus-overlay: door de beheerder ingestelde prijs-/zichtbaarheids-
 * overrides en eigen (custom/dropship) producten, bovenop de Tilroy-feed.
 *
 * Net als `price-overrides.generated.json` wordt dit bij de build vastgelegd in
 * `catalog-overrides.generated.json` + `custom-products.generated.json` (zie
 * scripts/build-catalog-overrides.mjs) en hier synchroon toegepast — de webshop
 * blijft statisch/ISR. Met lege bestanden is dit een no-op (geen gedragswijziging).
 */

export interface ProductOverride {
  price?: number;
  kluspasPrice?: number;
  compareAtPrice?: number;
  /** false = verbergen in de webshop. */
  active?: boolean;
  // ---- master-velden (alleen productniveau) — eigenaarschap los van de feed ----
  title?: string;
  brand?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  gtin?: string;
  images?: string[];
  highlights?: string[];
}

export interface CatalogOverrides {
  products?: Record<string, ProductOverride>;
  variants?: Record<string, ProductOverride>;
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : undefined;

const text = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

const list = (v: unknown): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  return out.length ? out : undefined;
};

/**
 * Pas de bewerkbare master-velden toe (titel, merk, categorie, beeld, …). Leeg/
 * ongeldig = ongemoeid laten (terugval op de bron). `subCategory` mag bewust
 * gewist worden (lege string → geen subcategorie meer).
 */
function applyMaster(p: Product, o: ProductOverride): Product {
  const next: Product = { ...p };
  const title = text(o.title);
  if (title) next.title = title;
  const brand = text(o.brand);
  if (brand) next.brand = brand;
  const description = text(o.description);
  if (description) next.description = description;
  const category = text(o.category);
  if (category) next.category = category;
  if (o.subCategory !== undefined) next.subCategory = text(o.subCategory);
  const gtin = text(o.gtin);
  if (gtin) next.gtin = gtin;
  const images = list(o.images);
  if (images) next.images = images;
  const highlights = list(o.highlights);
  if (highlights) next.highlights = highlights;
  return next;
}

function applyOverride<T extends { price: number; kluspasPrice: number; compareAtPrice?: number }>(
  item: T,
  o?: ProductOverride,
): T {
  if (!o) return item;
  const price = num(o.price);
  const kluspasPrice = num(o.kluspasPrice);
  const compareAtPrice = num(o.compareAtPrice);
  return {
    ...item,
    ...(price != null ? { price } : {}),
    ...(kluspasPrice != null ? { kluspasPrice } : {}),
    ...(compareAtPrice != null ? { compareAtPrice } : {}),
  };
}

/**
 * Pas de beheer-overlay toe op de basiscatalogus: prijs-/pas-/adviesprijs-
 * overrides per product en per variant, verberg gedeactiveerde producten en voeg
 * eigen producten toe. Puur en fail-safe.
 */
export function applyCatalogOverlay(
  base: Product[],
  overrides: CatalogOverrides,
  custom: Product[],
): Product[] {
  const pov = overrides.products ?? {};
  const vov = overrides.variants ?? {};
  const hasVarOverrides = Object.keys(vov).length > 0;

  const merged: Product[] = [];
  for (const p of base) {
    const po = pov[p.id];
    if (po?.active === false) continue; // verborgen

    let next = p;
    if (hasVarOverrides) {
      next = { ...next, variants: next.variants.map((v) => applyOverride(v, vov[v.id])) };
    }
    if (po) {
      next = applyOverride(next, po); // prijzen
      next = applyMaster(next, po); // titel/merk/categorie/beeld/…
    }
    merged.push(next);
  }

  // Eigen producten achteraan (alleen geldige records).
  const customValid = (custom ?? []).filter(
    (p) => p && p.id && p.slug && Array.isArray(p.variants),
  );
  return [...merged, ...customValid];
}
