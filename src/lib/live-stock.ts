import type { CartItem } from "@/types";
import { products, skuOf } from "@/lib/data/products";
import { primaryStock } from "@/lib/stock";
import { getSafetyStock } from "@/lib/store/settings";
import { getSoldMap, getAdjustMap, liveStock } from "@/lib/store/stock-ledger";

/**
 * Live verkoopbare voorraad (Nijverdal) voor de checkout-guard.
 *
 * Twee bronnen, gecombineerd met min() — conservatief-correct:
 *  1. Eigen grootboek: snapshot-voorraad − verkocht + correcties. Kent onze
 *     éigen web-/kassaverkopen direct, maar de snapshot-basis veroudert.
 *  2. VDM-dashboard `/api/voorraad/skus` (live Tilroy, max 200 sku's per
 *     call, korte cache): kent ook winkel­verkopen, maar mist webshop-orders
 *     die nog niet in Tilroy zijn ingeschoten.
 * min() van beide laat nooit méér verkopen dan één van de bronnen toestaat.
 *
 * Fail-open by design: elke fout (dashboard onbereikbaar, onbekende variant,
 * onverwachte respons) maakt de guard soepeler, nooit strenger — een
 * voorraadcheck mag de checkout niet breken. Het dashboard-endpoint bestaat
 * pas na deploy van dashboardvdm PR #283/#284; tot die tijd draait dit
 * volledig op het grootboek.
 */

const SKUS_URL =
  process.env.VDM_STOCK_SKUS_URL || "https://dashboardvdm-k-evin-s-projects.vercel.app/api/voorraad/skus";
const SKUS_PER_CALL = 200;
const FETCH_TIMEOUT_MS = 2_500;
const CACHE_TTL_MS = 45_000;

/** Vestiging-keys zoals de dashboard-feed ze levert (winkel + magazijn). */
const NIJVERDAL_SHOP_IDS = ["7827", "8934"] as const;

// Per-lambda cache: sku → { qty (Nijverdal) of null (onbekend), ts }.
const cache = new Map<string, { qty: number | null; ts: number }>();

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Nijverdal-aantal uit een dashboard-item; null wanneer niet aanwezig. */
function nijverdalQty(item: Record<string, unknown>): number | null {
  for (const key of ["nijverdal", "qtyNijverdal", "nijverdalQty"]) {
    const v = toNum(item[key]);
    if (v != null) return v;
  }
  const shops = item.shops ?? item.perStore;
  if (shops && typeof shops === "object" && !Array.isArray(shops)) {
    const rec = shops as Record<string, unknown>;
    const named = toNum(rec.nijverdal);
    if (named != null) return named;
    const parts = NIJVERDAL_SHOP_IDS.map((id) => toNum(rec[id]));
    if (parts.some((p) => p != null)) {
      return parts.reduce<number>((s, p) => s + (p ?? 0), 0);
    }
  }
  return null;
}

/**
 * Live Nijverdal-voorraad per sku uit het VDM-dashboard. Retourneert alleen
 * sku's waarvoor het dashboard een Nijverdal-aantal kent; bij fouten of een
 * ontbrekend endpoint een lege map (→ guard valt terug op het grootboek).
 */
async function fetchDashboardStock(skus: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const now = Date.now();
  const missing: string[] = [];
  for (const sku of skus) {
    const hit = cache.get(sku);
    if (hit && now - hit.ts < CACHE_TTL_MS) {
      if (hit.qty != null) out.set(sku, hit.qty);
    } else {
      missing.push(sku);
    }
  }

  for (let i = 0; i < missing.length; i += SKUS_PER_CALL) {
    const batch = missing.slice(i, i + SKUS_PER_CALL);
    try {
      const u = new URL(SKUS_URL);
      u.searchParams.set("skus", batch.join(","));
      const res = await fetch(u.toString(), {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      if (body.configured === false) throw new Error("niet geconfigureerd");
      const items = (Array.isArray(body) ? body : (body.items as unknown[])) ?? [];
      const seen = new Map<string, number>();
      for (const raw of items) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const sku = String(item.sku ?? item.id ?? "").trim();
        const qty = nijverdalQty(item);
        if (sku && qty != null) seen.set(sku, Math.max(0, Math.round(qty)));
      }
      for (const sku of batch) {
        const qty = seen.get(sku) ?? null;
        cache.set(sku, { qty, ts: now });
        if (qty != null) out.set(sku, qty);
      }
    } catch {
      // Dashboard (nog) niet beschikbaar → deze batch overslaan; korte
      // negatieve cache zodat we niet elke checkout opnieuw timeouten.
      for (const sku of batch) cache.set(sku, { qty: null, ts: now });
    }
  }
  return out;
}

export interface StockShortage {
  variantId: string;
  title: string;
  requested: number;
  available: number;
}

/**
 * Controleer of de gevraagde aantallen leverbaar zijn uit Nijverdal.
 * Retourneert de tekorten (leeg = alles leverbaar). Onbekende varianten
 * (bv. net verwijderd uit de catalogus) worden niet geblokkeerd.
 */
export async function checkStockForItems(items: CartItem[]): Promise<StockShortage[]> {
  try {
    // Zelfde variant kan als meerdere regels in de wagen staan (kleuren) —
    // valideer op het totaal per variant.
    const requested = new Map<string, { qty: number; title: string }>();
    for (const it of items) {
      const id = it.variantId || it.productId;
      if (!id) continue;
      const cur = requested.get(id);
      requested.set(id, {
        qty: (cur?.qty ?? 0) + Math.max(0, Math.round(it.quantity)),
        title: cur?.title ?? it.title,
      });
    }
    if (requested.size === 0) return [];

    const [sold, adjust, safety] = await Promise.all([
      getSoldMap(),
      getAdjustMap(),
      getSafetyStock().catch(() => 2),
    ]);
    const dashboard = await fetchDashboardStock(
      [...requested.keys()].map((id) => skuOf(id)),
    );

    const shortages: StockShortage[] = [];
    for (const [variantId, req] of requested) {
      // Vind de variant in de catalogus (catalogus is runtime Nijverdal-only).
      let feedQty: number | null = null;
      for (const p of products) {
        const v = p.variants.find((x) => x.id === variantId);
        if (v) {
          feedQty = primaryStock(v.stockByStore);
          break;
        }
      }
      if (feedQty == null) continue; // onbekende variant → niet blokkeren

      const ledgerLive = liveStock(feedQty, sold[variantId] ?? 0, adjust[variantId] ?? 0);
      const dashLive = dashboard.get(skuOf(variantId));
      const live = dashLive != null ? Math.min(ledgerLive, dashLive) : ledgerLive;
      // Zelfde verkoopregel als de storefront: onder de veiligheidsvoorraad
      // verkopen we niet online.
      const available = live >= safety ? live : 0;
      if (req.qty > available) {
        shortages.push({ variantId, title: req.title, requested: req.qty, available });
      }
    }
    return shortages;
  } catch (err) {
    // Guard mag de checkout nooit breken.
    console.error("[live-stock] voorraadcheck overgeslagen:", err);
    return [];
  }
}

/** Nette NL-foutmelding voor de checkout-UI bij tekorten. */
export function shortageMessage(shortages: StockShortage[]): string {
  const parts = shortages.map((s) =>
    s.available > 0
      ? `${s.title} (nog ${s.available} beschikbaar, ${s.requested} gevraagd)`
      : `${s.title} (uitverkocht)`,
  );
  return `Niet genoeg voorraad voor: ${parts.join(", ")}. Pas het aantal aan in je winkelwagen.`;
}
