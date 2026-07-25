import { products } from "@/lib/data";
import type { Product, ProductVariant } from "@/types";
import { primaryStock } from "@/lib/stock";

/**
 * Catalogus-helpers voor de kassa (server-only). Zoeken op titel/merk/EAN en het
 * terugzoeken van een (product, variant) voor de server-autoritatieve prijs.
 *
 * `feedStock` is de voorraad van de hoofdvestiging (Nijverdal) uit de feed-
 * momentopname; de kassa-route trekt daar het verkochte-grootboek vanaf voor de
 * live voorraad.
 */

export interface PosVariantHit {
  id: string;
  label: string;
  price: number;
  kluspasPrice: number;
  /** Voorraad hoofdvestiging uit de feed (vóór aftrek grootboek). */
  feedStock: number;
}

export interface PosProductHit {
  productId: string;
  title: string;
  brand: string;
  slug: string;
  image?: string;
  gtin?: string;
  category: string;
  variants: PosVariantHit[];
}

function toVariantHit(v: ProductVariant): PosVariantHit {
  return {
    id: v.id,
    label: v.label,
    price: v.price,
    kluspasPrice: v.kluspasPrice,
    feedStock: primaryStock(v.stockByStore),
  };
}

function toProductHit(p: Product): PosProductHit {
  return {
    productId: p.id,
    title: p.title,
    brand: p.brand,
    slug: p.slug,
    image: (p.images ?? []).find((u) => /^https?:\/\//.test(u)),
    gtin: p.gtin,
    category: p.category,
    variants: p.variants.map(toVariantHit),
  };
}

const isBarcode = (q: string) => /^\d{8,14}$/.test(q);

/**
 * Zoek producten voor de kassa. Een pure cijferreeks (8–14 cijfers) behandelen we
 * als een gescande EAN/GTIN en matchen we exact; anders een tekstzoek op
 * titel/merk. Gelimiteerd tot `limit` resultaten.
 */
export function searchCatalog(query: string, limit = 25): PosProductHit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  if (isBarcode(q)) {
    const exact = products.filter((p) => (p.gtin ?? "").trim() === q);
    if (exact.length) return exact.slice(0, limit).map(toProductHit);
  }

  const out: PosProductHit[] = [];
  for (const p of products) {
    const hay = `${p.title} ${p.brand} ${p.gtin ?? ""}`.toLowerCase();
    if (hay.includes(q)) {
      out.push(toProductHit(p));
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Zoek (product, variant) terug voor een kassaregel. Null als niet gevonden. */
export function resolveLine(
  productId: string,
  variantId: string,
): { product: Product; variant: ProductVariant } | null {
  const product = products.find((p) => p.id === productId);
  if (!product) return null;
  const variant = product.variants.find((v) => v.id === variantId);
  if (!variant) return null;
  return { product, variant };
}
