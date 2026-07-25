import type { Order } from "@/types";
import {
  isKvEnabled,
  kvHGetAll,
  kvHIncrBy,
  kvLPush,
  kvLRange,
  kvLTrim,
  kvSetNX,
} from "./kv";

/**
 * Gedeeld voorraad-grootboek (stock ledger) — de kern van de omnichannel-voorraad.
 *
 * De catalogus-voorraad (`stockByStore`) is een momentopname uit de Channable/
 * Tilroy-feed die alleen bij een build/deploy ververst. Elke verkoop — zowel via
 * de webshop als via de fysieke kassa (POS) — boeken we hier als "verkocht sinds
 * de feed". De live-voorraad is dan: feed-voorraad − verkocht (≥ 0).
 *
 * Zo telt een toonbankverkoop in Nijverdal direct mee met wat de webshop nog als
 * beschikbaar ziet, en omgekeerd. Persistent via KV (hash `stock:sold`), met een
 * in-memory fallback voor demo. Idempotent per order: een order wordt nooit twee
 * keer afgeboekt (claim via SET NX), ook niet over serverless-instances heen.
 */

const SOLD_KEY = "stock:sold"; // hash: variantId → cumulatief verkochte stuks
const ADJUST_KEY = "stock:adjust"; // hash: variantId → netto handmatige correctie (±)
const MOVES_KEY = "stock:moves"; // lijst met recente voorraadmutaties (gecapt)
const claimKey = (orderId: string) => `stock:claimed:${orderId}`;
const MAX_MOVES = 200;

// In-memory fallback (demo / geen KV).
const memSold = new Map<string, number>();
const memAdjust = new Map<string, number>();
const memMoves: StockMovement[] = [];
const memClaimed = new Set<string>();

/** Soort voorraadmutatie. */
export type StockMoveKind = "sale" | "receive" | "adjust" | "count";

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
  const map = await getSoldMap();
  return map[variantId] ?? 0;
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
