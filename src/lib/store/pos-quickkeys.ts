import { isKvEnabled, kvGetJSON, kvSetJSON } from "./kv";

/**
 * Kassa-snelknoppen (quick keys) — door de beheerder zelf aangemaakte knoppen voor
 * de kassa. Drie soorten:
 *  - "catalog"   → snel een catalogusproduct toevoegen (handig voor artikelen
 *                  zónder barcode die je niet kunt scannen).
 *  - "surcharge" → een toeslag / los artikel (+€) als losse regel.
 *  - "discount"  → een actie / korting (−€) als losse regel.
 *
 * KV-persistent (één JSON-lijst onder `pos:quickkeys`), met in-memory fallback
 * voor demo. De bedragen worden altijd positief opgeslagen; "discount" wordt bij
 * het afrekenen als negatieve regel geboekt.
 */

export type PosQuickKeyKind = "catalog" | "surcharge" | "discount";

export interface PosQuickKey {
  id: string;
  label: string;
  kind: PosQuickKeyKind;
  /** Accentkleur (hex) voor de knop, optioneel. */
  color?: string;
  /** catalog: gekoppeld product + variant. */
  productId?: string;
  variantId?: string;
  /** surcharge/discount: bedrag in euro (altijd positief opgeslagen). */
  amount?: number;
}

const KEY = "pos:quickkeys";
let mem: PosQuickKey[] = [];

export async function getQuickKeys(): Promise<PosQuickKey[]> {
  if (isKvEnabled()) {
    const kv = await kvGetJSON<PosQuickKey[]>(KEY);
    if (Array.isArray(kv)) return kv;
  }
  return mem;
}

async function save(list: PosQuickKey[]): Promise<void> {
  mem = list;
  if (isKvEnabled()) await kvSetJSON(KEY, list);
}

/** Voeg een knop toe of werk 'm bij (op id). Retourneert de nieuwe lijst. */
export async function upsertQuickKey(rec: PosQuickKey): Promise<PosQuickKey[]> {
  const list = await getQuickKeys();
  const idx = list.findIndex((k) => k.id === rec.id);
  const next = [...list];
  if (idx >= 0) next[idx] = rec;
  else next.push(rec);
  await save(next);
  return next;
}

/** Verwijder een knop. Retourneert de nieuwe lijst. */
export async function deleteQuickKey(id: string): Promise<PosQuickKey[]> {
  const next = (await getQuickKeys()).filter((k) => k.id !== id);
  await save(next);
  return next;
}
