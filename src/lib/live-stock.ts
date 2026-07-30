import type { CartItem, PaintBaseSelection } from "@/types";
import { getVariantById, skuOf } from "@/lib/data/products";
import { paintBases } from "@/lib/paint-bases";
import { primaryStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import { getSafetyStock } from "@/lib/store/settings";
import { getSoldFor, getAdjustFor, liveStock } from "@/lib/store/stock-ledger";
import TILROY_SHOPS from "@/lib/data/tilroy-shops.json";

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
  process.env.VDM_STOCK_SKUS_URL || "https://dashboardvdm.vercel.app/api/voorraad/skus";
const SKUS_PER_CALL = 200;
const FETCH_TIMEOUT_MS = 2_500;
const CACHE_TTL_MS = 45_000;

/** Vestiging-keys zoals de dashboard-feed ze levert (winkel + magazijn). */
const NIJVERDAL_SHOP_IDS: string[] = (TILROY_SHOPS as { webshop: string[] }).webshop;

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
 * Live verkoopbare voorraad per variant-id (Nijverdal, na de
 * veiligheidsvoorraadregel). Onbekende varianten ontbreken in de map.
 * Gedeelde kern voor de checkout-guard én de PDP-live-voorraad-route.
 */
export async function liveAvailability(variantIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(variantIds.filter(Boolean))];
  const out = new Map<string, number>();
  if (!ids.length) return out;

  const [sold, adjust, safety] = await Promise.all([
    getSoldFor(ids),
    getAdjustFor(ids),
    getSafetyStock().catch(() => DEFAULT_SAFETY_STOCK),
  ]);
  const dashboard = await fetchDashboardStock(ids.map((id) => skuOf(id)));

  for (const variantId of ids) {
    // Catalogus is runtime Nijverdal-only; de index maakt dit een O(1)-lookup.
    const variant = getVariantById(variantId);
    if (!variant) continue; // onbekende variant
    const feedQty = primaryStock(variant.stockByStore);

    const ledgerLive = liveStock(feedQty, sold[variantId] ?? 0, adjust[variantId] ?? 0);
    const dashLive = dashboard.get(skuOf(variantId));
    const live = dashLive != null ? Math.min(ledgerLive, dashLive) : ledgerLive;
    // Zelfde verkoopregel als de storefront: onder de veiligheidsvoorraad
    // verkopen we niet online.
    out.set(variantId, live >= safety ? live : 0);
  }
  return out;
}

/**
 * Voorraad van één tinting-basis.
 *
 * Elke basis is bij Tilroy een eigen artikel met een eigen voorraadstand, maar
 * die stand kennen wij niet: onze import vouwt de basissen samen tot één
 * variant per maat. Eerder stond hier een geschatte factor (deep = 35% van de
 * variantvoorraad); die blokkeerde 67% van de mengverf voor donkere kleuren
 * terwijl de winkel gewoon kon leveren. Liever niets aftrekken dan een gok die
 * bestellingen weigert — de guard rekent daarom met de volle variantvoorraad
 * tot we de echte per-basis-stand hebben.
 */
function forBase(qty: number, _base?: PaintBaseSelection | null): number {
  return qty;
}

/**
 * Controleer of de gevraagde aantallen leverbaar zijn uit Nijverdal.
 * Retourneert de tekorten (leeg = alles leverbaar). Onbekende varianten
 * (bv. net verwijderd uit de catalogus) worden niet geblokkeerd.
 */
export async function checkStockForItems(items: CartItem[]): Promise<StockShortage[]> {
  try {
    // Groepeer per variant én tinting-basis: dezelfde maat kan twee keer in de
    // wagen staan in verschillende kleuren, en elke basis komt uit een eigen
    // blik. Regels binnen één groep tellen wél bij elkaar op.
    const requested = new Map<
      string,
      { variantId: string; base?: PaintBaseSelection; qty: number; title: string }
    >();
    for (const it of items) {
      const variantId = it.variantId || it.productId;
      if (!variantId) continue;
      const base = it.selectedColor?.base;
      const key = `${variantId}::${base?.id ?? ""}`;
      const cur = requested.get(key);
      requested.set(key, {
        variantId,
        base,
        qty: (cur?.qty ?? 0) + Math.max(0, Math.round(it.quantity)),
        title: cur?.title ?? it.title,
      });
    }
    if (requested.size === 0) return [];

    const availability = await liveAvailability(
      [...requested.values()].map((r) => r.variantId),
    );

    const shortages: StockShortage[] = [];
    for (const req of requested.values()) {
      const variantAvailable = availability.get(req.variantId);
      if (variantAvailable == null) continue; // onbekende variant → niet blokkeren
      const available = forBase(variantAvailable, req.base);
      if (req.qty > available) {
        shortages.push({
          variantId: req.variantId,
          title: req.title,
          requested: req.qty,
          available,
        });
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
