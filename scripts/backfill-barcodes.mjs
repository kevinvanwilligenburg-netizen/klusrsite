// @ts-nocheck
/**
 * Backfill productbarcodes (EAN/gtin) in de bestaande catalogus-snapshot —
 * NON-DESTRUCTIEF. Vult alleen `product.gtin`; prijzen, titels, voorraad en al
 * het andere blijven ongemoeid.
 *
 * Bron (in volgorde):
 *   1. VDM-dashboard prijsfeed (publiek; per product sku + ean) — geen secrets
 *      nodig. Override: PRIJSFEED_URL.
 *   2. Channable items-API — alleen als terugval wanneer de CHANNABLE_*-secrets
 *      aanwezig zijn (CHANNABLE_ITEMS_URL optioneel als endpoint-override).
 *
 *   node scripts/backfill-barcodes.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dirname, "..", "src", "lib", "data", "feed-products.generated.json");

const BASE = (process.env.CHANNABLE_API_BASE || "https://api.channable.com/v1").replace(/\/$/, "");
const TOKEN = process.env.CHANNABLE_TOKEN || process.env.CHANNABLE_API_TOKEN;
const COMPANY_ID = process.env.CHANNABLE_COMPANY_ID;
const PROJECT_ID = process.env.CHANNABLE_PROJECT_ID;

/** Geldige EAN/UPC/GTIN: 8 t/m 14 cijfers. */
const isGtin = (s) => /^\d{8,14}$/.test(String(s ?? "").trim());

function itemsUrl(offset, limit) {
  if (process.env.CHANNABLE_ITEMS_URL) {
    const u = new URL(process.env.CHANNABLE_ITEMS_URL);
    u.searchParams.set("offset", String(offset));
    u.searchParams.set("limit", String(limit));
    return u.toString();
  }
  return `${BASE}/companies/${COMPANY_ID}/projects/${PROJECT_ID}/items?offset=${offset}&limit=${limit}`;
}

const VDM_PRIJSFEED_URL =
  process.env.PRIJSFEED_URL ||
  process.env.VDM_PRIJSFEED_URL ||
  "https://dashboardvdm.vercel.app/api/prijsfeed";

/**
 * EAN's uit de VDM-dashboard prijsfeed (publiek; per product sku + ean).
 * Primaire bron sinds de Tilroy-migratie — geen Channable-secrets nodig.
 */
async function fetchGtinMapVdm() {
  const u = new URL(VDM_PRIJSFEED_URL);
  u.searchParams.set("format", "json");
  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`VDM-prijsfeed → ${res.status}`);
  const body = await res.json();
  const rows = Array.isArray(body) ? body : (body.products ?? body.items ?? []);
  const map = new Map();
  for (const r of rows) {
    const id = String(r.sku ?? "").trim();
    const gtin = String(r.ean ?? r.gtin ?? "").trim();
    if (id && isGtin(gtin)) map.set(id, gtin);
  }
  return map;
}

/** Terugval: alle Channable-items ophalen en een map artikel-id → gtin bouwen. */
async function fetchGtinMapChannable() {
  const map = new Map();
  const pageSize = 1000;
  let offset = 0;
  for (;;) {
    const res = await fetch(itemsUrl(offset, pageSize), {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Channable items → ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const rows = Array.isArray(body) ? body : body.items ?? body.data ?? body.results ?? [];
    if (!rows.length) break;
    for (const raw of rows) {
      const f = raw.data ?? raw;
      const id = String(f.id ?? "").trim();
      const gtin = String(f.gtin ?? f.ean ?? "").trim();
      if (id && isGtin(gtin)) map.set(id, gtin);
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

async function main() {
  let gtins = new Map();
  try {
    console.log(`→ Barcodes ophalen uit de VDM-dashboard prijsfeed: ${VDM_PRIJSFEED_URL}`);
    gtins = await fetchGtinMapVdm();
  } catch (err) {
    console.warn(`⚠ VDM-prijsfeed niet beschikbaar (${err.message}).`);
  }

  // Terugval: Channable items-API — alleen wanneer de secrets aanwezig zijn.
  if (gtins.size === 0 && TOKEN && COMPANY_ID && (PROJECT_ID || process.env.CHANNABLE_ITEMS_URL)) {
    console.log("→ Terugval: barcodes ophalen uit Channable…");
    gtins = await fetchGtinMapChannable();
  }

  console.log(`  ${gtins.size} items met een geldige EAN.`);
  if (gtins.size === 0) {
    console.warn("⚠ Geen EAN's gevonden — niets bij te werken.");
    process.exit(0);
  }

  const snap = JSON.parse(readFileSync(SNAP, "utf8"));
  const products = snap.products ?? [];
  let filled = 0;
  let unchanged = 0;
  for (const p of products) {
    // Artikel-id = Channable-item-id; het product draagt het als "tilroy-<id>".
    const sku = String(p.id ?? "").replace(/^tilroy-/, "");
    const gtin = gtins.get(sku);
    if (!gtin) continue;
    if (p.gtin === gtin) {
      unchanged++;
      continue;
    }
    p.gtin = gtin;
    filled++;
  }

  if (filled === 0) {
    console.log(`✓ Niets gewijzigd (${unchanged} al correct).`);
    process.exit(0);
  }

  writeFileSync(SNAP, JSON.stringify(snap, null, 2));
  console.log(`✓ ${filled} producten van een barcode voorzien (${unchanged} al correct) → ${SNAP}`);
}

main().catch((err) => {
  console.error("✗ Barcode-backfill mislukt:", err);
  process.exit(1);
});
