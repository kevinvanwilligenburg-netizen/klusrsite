import type { Order } from "@/types";
import baseline from "@/lib/data/stock-baseline.generated.json";
import {
  isKvEnabled,
  kvHGetAll,
  kvHMGet,
  kvHIncrBy,
  kvLPush,
  kvLRange,
  kvLTrim,
  kvSetNX,
} from "./kv";

/**
 * Gedeeld voorraad-grootboek (stock ledger) — de kern van de omnichannel-voorraad.
 *
 * De catalogus-voorraad (`stockByStore`) is een momentopname uit Tilroy. Elke
 * verkoop — zowel via de webshop als via de fysieke kassa (POS) — boeken we hier
 * als "verkocht sinds die momentopname". De live-voorraad is dan:
 * feed-voorraad − verkocht + handmatige correcties (≥ 0). Zo telt een
 * toonbankverkoop in Nijverdal direct mee met wat de webshop nog als beschikbaar
 * ziet, en omgekeerd.
 *
 * ⚠️ GEBONDEN AAN DE MOMENTOPNAME. Sinds de voorraad dagelijks uit Tilroy wordt
 * ververst (scripts/backfill-stock.mjs) is "sinds de feed" een bewegend
 * ijkpunt. Een cumulatieve teller zou verkopen dubbel aftrekken zodra Tilroy ze
 * óók heeft uitgeboekt — de stand zou monotoon wegzakken tot alles ten onrechte
 * uitverkocht lijkt. Daarom zijn de tellers **gescoped op het ijkpunt**: de
 * sleutels dragen de `asOf` van de Tilroy-stand waarop ze zijn geteld
 * (stock-baseline.generated.json, meegeschreven door de backfill). Komt er een
 * verse stand binnen, dan begint het tellen automatisch bij nul tegen die nieuwe
 * basis — zonder resetjob, en zonder dat oude tellingen kunnen blijven hangen.
 *
 * Aanvaarde marge: verkopen tussen het Tilroy-moment en de deploy van die stand
 * vallen tegen de oude basis en tellen niet mee (venster van minuten tot een
 * uur). Dat kan de voorraad kortstondig iets te hoog laten lijken; dat is de
 * veilige kant vergeleken met structureel wegzakken, en vervalt zodra
 * webshop-orders rechtstreeks in Tilroy worden ingeschoten.
 *
 * Persistent via KV, met een in-memory fallback voor demo. Idempotent per order:
 * een order wordt nooit twee keer afgeboekt (claim via SET NX), ook niet over
 * serverless-instances heen.
 */

/**
 * IJkpunt van de huidige voorraadbasis: de `asOf` van de Tilroy-stand in de
 * snapshot. Vast voor de levensduur van een deployment (het JSON-bestand wordt
 * bij de build ingelezen), dus alle instances rekenen met dezelfde sleutels.
 * Kolons eruit zodat de KV-sleutel leesbaar blijft.
 */
const BASELINE = String((baseline as { asOf?: string }).asOf || "onbekend").replace(/:/g, "-");

const SOLD_KEY = `stock:sold:${BASELINE}`; // hash: variantId → verkocht sinds dit ijkpunt
const ADJUST_KEY = `stock:adjust:${BASELINE}`; // hash: variantId → netto correctie sinds dit ijkpunt
const MOVES_KEY = "stock:moves"; // lijst met recente voorraadmutaties (gecapt, ijkpunt-overstijgend)
const claimKey = (orderId: string) => `stock:claimed:${orderId}`;
const reverseKey = (orderId: string) => `stock:reversed:${orderId}`;
const MAX_MOVES = 200;

// In-memory fallback (demo / geen KV).
const memSold = new Map<string, number>();
const memAdjust = new Map<string, number>();
const memMoves: StockMovement[] = [];
const memClaimed = new Set<string>();
const memReversed = new Set<string>();

/** Soort voorraadmutatie. */
export type StockMoveKind = "sale" | "receive" | "adjust" | "count" | "cancel";

export interface StockMovement {
  orderId: string;
  reference: string;
  variantId: string;
  productId: string;
  title: string;
  /** Aantal afgeboekte/bijgeboekte stuks (magnitude, positief getal). */
  qty: number;
  /** Getekende mutatie: negatief = eraf (verkoop), positief = erbij (ontvangst). */
  delta: number;
  kind: StockMoveKind;
  channel: "web" | "pos";
  ts: number;
}

/**
 * Boek een betaalde order af op de voorraad — exact één keer per order. De claim
 * (SET NX) voorkomt dubbel afboeken bij webhook-retries of dubbele kassa-polls.
 * Best-effort: gooit nooit, zodat dit nooit een betaal-/fulfilment-flow breekt.
 */
export async function recordOrderSale(order: Order): Promise<void> {
  try {
    if (!order.items.length) return;
    const channel = order.channel === "pos" ? "pos" : "web";

    // Claim: precies één keer afboeken.
    if (isKvEnabled()) {
      const claimed = await kvSetNX(claimKey(order.id), new Date().toISOString());
      if (!claimed) return;
    } else {
      if (memClaimed.has(order.id)) return;
      memClaimed.add(order.id);
    }

    for (const it of order.items) {
      const qty = Math.max(0, Math.round(it.quantity));
      if (!qty || !it.variantId) continue;
      const move: StockMovement = {
        orderId: order.id,
        reference: order.reference,
        variantId: it.variantId,
        productId: it.productId,
        title: it.title,
        qty,
        delta: -qty,
        kind: "sale",
        channel,
        ts: Date.now(),
      };
      if (isKvEnabled()) {
        await kvHIncrBy(SOLD_KEY, it.variantId, qty);
        await kvLPush(MOVES_KEY, move);
      } else {
        memSold.set(it.variantId, (memSold.get(it.variantId) ?? 0) + qty);
        memMoves.unshift(move);
        if (memMoves.length > MAX_MOVES) memMoves.length = MAX_MOVES;
      }
    }
    if (isKvEnabled()) await kvLTrim(MOVES_KEY, 0, MAX_MOVES - 1);
  } catch {
    /* voorraad-grootboek mag nooit een flow breken */
  }
}

/**
 * Draai een eerdere afboeking terug — bij een annulering of retour.
 *
 * Werkt **per regel** en niet per order, ook al roept de annuleerwebhook 'm nu
 * altijd met alle regels aan. Zo is een deelannulering later een kwestie van
 * andere invoer in plaats van een herbouw; de dashboard-sessie vroeg er expliciet
 * om de deur zo open te houden.
 *
 * ⚠️ Alleen óns eigen grootboek. De voorraad in Tilroy wordt door het dashboard
 * teruggedraaid (`POST /orders/{orderId}/cancel`). Zouden wij daar óók aankomen,
 * dan boeken we dubbel terug en staat er straks meer op voorraad dan er ligt.
 *
 * Idempotent per order: de claim van `recordOrderSale` wordt vrijgegeven en
 * mag maar één keer worden teruggedraaid, want het dashboard kan opnieuw
 * aanroepen.
 */
export async function reverseOrderSale(
  order: Order,
  regels?: { variantId: string; quantity: number }[],
): Promise<void> {
  try {
    const teDraaien = (regels ?? order.items).filter((r) => r.variantId && r.quantity > 0);
    if (!teDraaien.length) return;

    // Alleen terugdraaien wat ook écht is afgeboekt. `recordOrderSale` draait
    // pas bij een betaalde order, dus een nooit-betaalde bestelling heeft geen
    // voorraad gekost — die terugdraaien zou stuks uit het niets bijschrijven.
    const isAfgeboekt =
      order.paymentStatus === "paid" ||
      order.paymentStatus === "authorized" ||
      order.paymentStatus === "shipped" ||
      order.paymentStatus === "delivered";
    if (!isAfgeboekt) return;

    // Precies één keer terugdraaien: het dashboard mag opnieuw aanroepen.
    if (isKvEnabled()) {
      const nieuw = await kvSetNX(reverseKey(order.id), new Date().toISOString());
      if (!nieuw) return;
    } else {
      if (memReversed.has(order.id)) return;
      memReversed.add(order.id);
    }

    const channel = order.channel === "pos" ? "pos" : "web";
    for (const r of teDraaien) {
      const qty = Math.max(0, Math.round(r.quantity));
      if (!qty) continue;
      const bron = order.items.find((it) => it.variantId === r.variantId);
      const move: StockMovement = {
        orderId: order.id,
        reference: order.reference,
        variantId: r.variantId,
        productId: bron?.productId ?? r.variantId,
        title: bron?.title ?? r.variantId,
        qty,
        delta: qty, // positief: komt terug op voorraad
        kind: "cancel",
        channel,
        ts: Date.now(),
      };
      if (isKvEnabled()) {
        await kvHIncrBy(SOLD_KEY, r.variantId, -qty);
        await kvLPush(MOVES_KEY, move);
      } else {
        memSold.set(r.variantId, (memSold.get(r.variantId) ?? 0) - qty);
        memMoves.unshift(move);
        if (memMoves.length > MAX_MOVES) memMoves.length = MAX_MOVES;
      }
    }
    if (isKvEnabled()) await kvLTrim(MOVES_KEY, 0, MAX_MOVES - 1);
  } catch {
    /* voorraad-grootboek mag nooit een flow breken */
  }
}

/** Aantal sinds de feed verkochte stuks per variant-id (alle varianten). */
export async function getSoldMap(): Promise<Record<string, number>> {
  try {
    if (isKvEnabled()) {
      const raw = await kvHGetAll(SOLD_KEY);
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (n > 0) out[k] = n;
      }
      return out;
    }
    return Object.fromEntries([...memSold.entries()].filter(([, n]) => n > 0));
  } catch {
    return {};
  }
}

/** Verkochte stuks voor één variant (sinds de feed-momentopname). */
export async function getSold(variantId: string): Promise<number> {
  const map = await getSoldFor([variantId]);
  return map[variantId] ?? 0;
}

/** Lees uit een KV-hash alleen de gevraagde varianten (HMGET), met mem-fallback. */
async function pickFromHash(
  key: string,
  mem: Map<string, number>,
  variantIds: string[],
  keepZero: boolean,
): Promise<Record<string, number>> {
  const ids = [...new Set(variantIds.filter(Boolean))];
  if (!ids.length) return {};
  try {
    const out: Record<string, number> = {};
    if (isKvEnabled()) {
      const raw = await kvHMGet(key, ids);
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (Number.isFinite(n) && (keepZero ? n !== 0 : n > 0)) out[k] = n;
      }
      return out;
    }
    for (const id of ids) {
      const n = mem.get(id) ?? 0;
      if (keepZero ? n !== 0 : n > 0) out[id] = n;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Verkochte stuks voor een specifieke set varianten. Gebruik dit in
 * verkoop-/weergavepaden (checkout-guard, productpagina) in plaats van
 * getSoldMap: dat leest de hele hash, die met elke verkoop groeit.
 */
export async function getSoldFor(variantIds: string[]): Promise<Record<string, number>> {
  return pickFromHash(SOLD_KEY, memSold, variantIds, false);
}

/** Netto handmatige correcties voor een specifieke set varianten. */
export async function getAdjustFor(variantIds: string[]): Promise<Record<string, number>> {
  return pickFromHash(ADJUST_KEY, memAdjust, variantIds, true);
}

export interface AdjustInput {
  variantId: string;
  productId: string;
  title: string;
  /** Getekende mutatie: positief = ontvangst/correctie erbij, negatief = eraf. */
  delta: number;
  kind?: StockMoveKind;
  /** Vrije omschrijving/herkomst, bv. "Inkooporder INK-1234" of "telling". */
  reference?: string;
}

/**
 * Boek een handmatige voorraadmutatie (ontvangst, correctie, telling). Past het
 * netto-correctiesaldo aan en logt de mutatie. Best-effort: gooit nooit.
 */
export async function recordAdjustment(input: AdjustInput): Promise<void> {
  try {
    const delta = Math.round(input.delta);
    if (!delta || !input.variantId) return;
    const move: StockMovement = {
      orderId: "",
      reference: input.reference ?? "",
      variantId: input.variantId,
      productId: input.productId,
      title: input.title,
      qty: Math.abs(delta),
      delta,
      kind: input.kind ?? (delta > 0 ? "receive" : "adjust"),
      channel: "pos",
      ts: Date.now(),
    };
    if (isKvEnabled()) {
      await kvHIncrBy(ADJUST_KEY, input.variantId, delta);
      await kvLPush(MOVES_KEY, move);
      await kvLTrim(MOVES_KEY, 0, MAX_MOVES - 1);
    } else {
      memAdjust.set(input.variantId, (memAdjust.get(input.variantId) ?? 0) + delta);
      memMoves.unshift(move);
      if (memMoves.length > MAX_MOVES) memMoves.length = MAX_MOVES;
    }
  } catch {
    /* voorraad-grootboek mag nooit een flow breken */
  }
}

/** Netto handmatige correcties per variant-id (kan negatief zijn). */
export async function getAdjustMap(): Promise<Record<string, number>> {
  try {
    if (isKvEnabled()) {
      const raw = await kvHGetAll(ADJUST_KEY);
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw)) {
        const n = Number(v);
        if (n) out[k] = n;
      }
      return out;
    }
    return Object.fromEntries([...memAdjust.entries()].filter(([, n]) => n !== 0));
  } catch {
    return {};
  }
}

/**
 * Live beschikbare voorraad voor een variant: de feed-voorraad minus wat sinds de
 * feed is verkocht (web + kassa), plus de handmatige correcties (ontvangsten),
 * afgekapt op 0.
 */
export function liveStock(feedStock: number, sold: number, adjust = 0): number {
  return Math.max(
    0,
    Math.round(feedStock) - Math.max(0, Math.round(sold)) + Math.round(adjust),
  );
}

/** Recente voorraadmutaties (nieuwste eerst) voor het admin-overzicht. */
export async function getRecentMovements(limit = 50): Promise<StockMovement[]> {
  try {
    if (isKvEnabled()) {
      return await kvLRange<StockMovement>(MOVES_KEY, 0, Math.max(0, limit - 1));
    }
    return memMoves.slice(0, limit);
  } catch {
    return [];
  }
}
