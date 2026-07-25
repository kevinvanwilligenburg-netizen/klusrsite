import type { Product } from "@/types";
import type { CatalogOverrides, ProductOverride } from "@/lib/data/catalog-overlay";
import {
  isKvEnabled,
  kvGetJSON,
  kvSetJSON,
  kvSAdd,
  kvSRem,
  kvSMembers,
  kvDel,
} from "./kv";

/**
 * Beheer-opslag voor de catalogus-overlay: prijs-/zichtbaarheids-overrides en
 * eigen (custom/dropship) producten. De admin schrijft hier; de build
 * (scripts/build-catalog-overrides.mjs) leest dit uit en legt het vast in de
 * generated JSON die de webshop synchroon toepast. KV-persistent, in-memory
 * fallback (demo).
 */

const OVERRIDES_KEY = "catalog:overrides";
const CUSTOM_INDEX = "catalog:custom:index";
const customKey = (id: string) => `catalog:custom:${id}`;

const EMPTY: CatalogOverrides = { products: {}, variants: {} };

let memOverrides: CatalogOverrides = { products: {}, variants: {} };
const memCustom = new Map<string, CustomProductRecord>();

export interface CustomProductRecord {
  product: Product;
  /** Dropship-product (geen eigen magazijnvoorraad; door leverancier verzonden). */
  dropship?: boolean;
  supplier?: string;
  /** Inkoopprijs per stuk (excl. btw), optioneel. */
  costPrice?: number;
}

/* ------------------------------------------------------------- overrides */

export async function getOverrides(): Promise<CatalogOverrides> {
  if (isKvEnabled()) {
    const kv = await kvGetJSON<CatalogOverrides>(OVERRIDES_KEY);
    if (kv) return { products: kv.products ?? {}, variants: kv.variants ?? {} };
  }
  return { products: { ...memOverrides.products }, variants: { ...memOverrides.variants } };
}

async function saveOverrides(o: CatalogOverrides): Promise<void> {
  memOverrides = { products: o.products ?? {}, variants: o.variants ?? {} };
  if (isKvEnabled()) await kvSetJSON(OVERRIDES_KEY, memOverrides);
}

/** Voeg een (deel-)overlay samen met de bestaande overrides. */
export async function mergeOverrides(patch: CatalogOverrides): Promise<CatalogOverrides> {
  const cur = await getOverrides();
  const next: CatalogOverrides = {
    products: { ...cur.products },
    variants: { ...cur.variants },
  };
  for (const [id, o] of Object.entries(patch.products ?? {})) {
    next.products![id] = { ...next.products![id], ...o };
  }
  for (const [id, o] of Object.entries(patch.variants ?? {})) {
    next.variants![id] = { ...next.variants![id], ...o };
  }
  await saveOverrides(next);
  return next;
}

/** Verwijder een override (product of variant). */
export async function clearOverride(kind: "product" | "variant", id: string): Promise<void> {
  const cur = await getOverrides();
  if (kind === "product") delete cur.products![id];
  else delete cur.variants![id];
  await saveOverrides(cur);
}

export async function resetOverrides(): Promise<void> {
  await saveOverrides({ ...EMPTY, products: {}, variants: {} });
}

/* --------------------------------------------------------- custom products */

async function loadCustom(id: string): Promise<CustomProductRecord | undefined> {
  const mem = memCustom.get(id);
  if (mem) return mem;
  if (isKvEnabled()) {
    const kv = await kvGetJSON<CustomProductRecord>(customKey(id));
    if (kv) {
      memCustom.set(id, kv);
      return kv;
    }
  }
  return undefined;
}

export async function listCustomProductRecords(): Promise<CustomProductRecord[]> {
  const byId = new Map<string, CustomProductRecord>();
  if (isKvEnabled()) {
    const ids = await kvSMembers(CUSTOM_INDEX);
    const loaded = await Promise.all(ids.map((id) => loadCustom(id)));
    for (const r of loaded) if (r) byId.set(r.product.id, r);
  }
  for (const r of memCustom.values()) byId.set(r.product.id, r);
  return [...byId.values()];
}

export async function listCustomProducts(): Promise<Product[]> {
  return (await listCustomProductRecords()).map((r) => r.product);
}

export async function upsertCustomProduct(record: CustomProductRecord): Promise<void> {
  memCustom.set(record.product.id, record);
  if (isKvEnabled()) {
    await kvSetJSON(customKey(record.product.id), record);
    await kvSAdd(CUSTOM_INDEX, record.product.id);
  }
}

export async function deleteCustomProduct(id: string): Promise<void> {
  memCustom.delete(id);
  if (isKvEnabled()) {
    await kvDel(customKey(id));
    await kvSRem(CUSTOM_INDEX, id);
  }
}

export type { CatalogOverrides, ProductOverride };
