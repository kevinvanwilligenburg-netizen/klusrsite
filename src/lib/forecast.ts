import type { Order, Product } from "@/types";
import { primaryStock } from "@/lib/stock";
import { liveStock } from "@/lib/store/stock-ledger";

/**
 * Voorraadprognose / bijbestel-advies. Leidt de verkoopsnelheid per variant af
 * uit de orderhistorie (web + kassa), berekent hoeveel dagen voorraad er nog is
 * en adviseert een bestelhoeveelheid om een gewenste dekking te halen.
 */

const PAID = new Set(["paid", "authorized", "shipped", "delivered"]);

/** Verkochte stuks per variant binnen een venster (vanaf `sinceTs`, ms). */
export function unitsSoldByVariant(orders: Order[], sinceTs: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) {
    if (o.isTest || !PAID.has(o.paymentStatus)) continue;
    if (new Date(o.createdAt).getTime() < sinceTs) continue;
    for (const it of o.items) {
      if (!it.variantId) continue;
      out.set(it.variantId, (out.get(it.variantId) ?? 0) + Math.max(0, Math.round(it.quantity)));
    }
  }
  return out;
}

export interface ForecastRow {
  productId: string;
  variantId: string;
  title: string;
  brand: string;
  variantLabel: string;
  image?: string;
  /** Voorraad hoofdvestiging uit de feed. */
  feedStock: number;
  /** Verkocht sinds de feed (grootboek). */
  sold: number;
  /** Handmatige correcties (ontvangsten e.d.). */
  adjust: number;
  /** Live beschikbare voorraad (feed − verkocht + correcties). */
  live: number;
  /** Verkocht binnen het prognosevenster. */
  soldWindow: number;
  /** Stuks per dag. */
  velocityPerDay: number;
  /** Dagen voorraad resterend (null = geen verkoop → oneindig). */
  daysCover: number | null;
  /** Reeds besteld (open inkooporders). */
  onOrder: number;
  /** Geadviseerde bijbestelling om de gewenste dekking te halen. */
  advies: number;
}

export interface ForecastOptions {
  days: number; // venster voor de snelheid
  coverDays: number; // gewenste voorraaddekking
  lowThreshold?: number; // toon ook items met live ≤ deze drempel
  limit?: number;
}

/**
 * Bouw bijbestel-adviesregels over de catalogus. Toont varianten die aandacht
 * vragen: met verkoop in het venster, of met lage/lege voorraad. Gesorteerd op
 * urgentie (snelst leeg eerst).
 */
export function forecastRows(
  products: Product[],
  maps: {
    sold: Record<string, number>;
    adjust: Record<string, number>;
    velocity: Map<string, number>;
    onOrder: Record<string, number>;
  },
  opts: ForecastOptions,
): ForecastRow[] {
  const { days, coverDays } = opts;
  const lowThreshold = opts.lowThreshold ?? 3;
  const limit = opts.limit ?? 300;
  const rows: ForecastRow[] = [];

  for (const p of products) {
    const image = (p.images ?? []).find((u) => /^https?:\/\//.test(u));
    for (const v of p.variants) {
      const sold = maps.sold[v.id] ?? 0;
      const adjust = maps.adjust[v.id] ?? 0;
      const feedStock = primaryStock(v.stockByStore);
      const live = liveStock(feedStock, sold, adjust);
      const soldWindow = maps.velocity.get(v.id) ?? 0;
      const onOrder = maps.onOrder[v.id] ?? 0;
      const velocityPerDay = days > 0 ? soldWindow / days : 0;

      const attention = soldWindow > 0 || live <= lowThreshold;
      if (!attention) continue;

      const daysCover = velocityPerDay > 0 ? live / velocityPerDay : null;
      const target = Math.ceil(velocityPerDay * coverDays);
      const advies = velocityPerDay > 0 ? Math.max(0, target - live - onOrder) : 0;

      rows.push({
        productId: p.id,
        variantId: v.id,
        title: p.title,
        brand: p.brand,
        variantLabel: v.label,
        image,
        feedStock,
        sold,
        adjust,
        live,
        soldWindow,
        velocityPerDay: Math.round(velocityPerDay * 100) / 100,
        daysCover: daysCover != null ? Math.round(daysCover * 10) / 10 : null,
        onOrder,
        advies,
      });
    }
  }

  // Urgentie: items die verkopen én (bijna) leeg zijn bovenaan.
  rows.sort((a, b) => {
    const ua = a.daysCover ?? Infinity;
    const ub = b.daysCover ?? Infinity;
    if (ua !== ub) return ua - ub;
    return b.soldWindow - a.soldWindow;
  });

  return rows.slice(0, limit);
}
