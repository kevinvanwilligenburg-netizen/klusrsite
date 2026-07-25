import {
  isKvEnabled,
  kvGetJSON,
  kvSetJSON,
  kvSAdd,
  kvSMembers,
} from "./kv";
import { recordAdjustment } from "./stock-ledger";

/**
 * Inkooporders (purchase orders). Bestel voorraad bij een leverancier; bij
 * ontvangst boeken we de stuks bij op het gedeelde voorraad-grootboek, zodat de
 * webshop én kassa de aangevulde voorraad zien. KV-persistent met in-memory
 * fallback (demo), net als de orderstore.
 */

export type PurchaseOrderStatus = "concept" | "besteld" | "ontvangen" | "geannuleerd";

export interface PurchaseOrderLine {
  productId: string;
  variantId: string;
  title: string;
  variantLabel?: string;
  qty: number;
  /** Inkoopprijs per stuk (excl. btw), optioneel. */
  costPrice?: number;
  /** Reeds ontvangen stuks (voor (deel)ontvangst). */
  receivedQty?: number;
}

export interface PurchaseOrder {
  id: string;
  reference: string;
  supplier: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  note?: string;
  createdAt: string;
  expectedAt?: string;
  orderedAt?: string;
  receivedAt?: string;
}

const mem = new Map<string, PurchaseOrder>();
const KEY = {
  po: (id: string) => `po:${id}`,
  index: "po:index",
};

const genId = () => "po_" + Math.random().toString(36).slice(2, 10);
const genRef = () => `INK-${Math.floor(100000 + Math.random() * 900000)}`;

async function persist(po: PurchaseOrder): Promise<void> {
  mem.set(po.id, po);
  if (!isKvEnabled()) return;
  await kvSetJSON(KEY.po(po.id), po);
  await kvSAdd(KEY.index, po.id);
}

async function load(id: string): Promise<PurchaseOrder | undefined> {
  const m = mem.get(id);
  if (m) return m;
  const kv = await kvGetJSON<PurchaseOrder>(KEY.po(id));
  if (kv) {
    mem.set(kv.id, kv);
    return kv;
  }
  return undefined;
}

export interface CreatePurchaseOrderInput {
  supplier: string;
  lines: PurchaseOrderLine[];
  note?: string;
  expectedAt?: string;
  /** Direct als "besteld" markeren (anders "concept"). */
  ordered?: boolean;
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
): Promise<PurchaseOrder> {
  const now = new Date().toISOString();
  const po: PurchaseOrder = {
    id: genId(),
    reference: genRef(),
    supplier: input.supplier.trim() || "Onbekende leverancier",
    status: input.ordered ? "besteld" : "concept",
    lines: input.lines.map((l) => ({ ...l, receivedQty: 0 })),
    note: input.note?.trim() || undefined,
    createdAt: now,
    expectedAt: input.expectedAt || undefined,
    orderedAt: input.ordered ? now : undefined,
  };
  await persist(po);
  return po;
}

export async function getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
  return load(id);
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const byId = new Map<string, PurchaseOrder>();
  if (isKvEnabled()) {
    const ids = await kvSMembers(KEY.index);
    const loaded = await Promise.all(ids.map((id) => load(id)));
    for (const p of loaded) if (p) byId.set(p.id, p);
  }
  for (const p of mem.values()) byId.set(p.id, p);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Wijzig de status (bv. concept → besteld, of annuleren). */
export async function setPurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder | undefined> {
  const po = await load(id);
  if (!po) return undefined;
  po.status = status;
  if (status === "besteld" && !po.orderedAt) po.orderedAt = new Date().toISOString();
  await persist(po);
  return po;
}

/**
 * Ontvang (een deel van) een inkooporder: boekt de ontvangen stuks bij op het
 * voorraad-grootboek en werkt de regels/status bij. Zonder `receive` ontvang je
 * het resterende openstaande aantal van elke regel. Idempotent op het reeds
 * ontvangen aantal per regel.
 */
export async function receivePurchaseOrder(
  id: string,
  receive?: { variantId: string; qty: number }[],
): Promise<PurchaseOrder | undefined> {
  const po = await load(id);
  if (!po) return undefined;

  const want = new Map<string, number>();
  if (receive) for (const r of receive) want.set(r.variantId, Math.max(0, Math.round(r.qty)));

  for (const line of po.lines) {
    const already = line.receivedQty ?? 0;
    const remaining = Math.max(0, line.qty - already);
    const qty = receive ? Math.min(remaining, want.get(line.variantId) ?? 0) : remaining;
    if (qty <= 0) continue;
    await recordAdjustment({
      variantId: line.variantId,
      productId: line.productId,
      title: line.title,
      delta: qty,
      kind: "receive",
      reference: `Inkoop ${po.reference}`,
    });
    line.receivedQty = already + qty;
  }

  const fullyReceived = po.lines.every((l) => (l.receivedQty ?? 0) >= l.qty);
  po.status = fullyReceived ? "ontvangen" : "besteld";
  if (fullyReceived) po.receivedAt = new Date().toISOString();
  await persist(po);
  return po;
}
