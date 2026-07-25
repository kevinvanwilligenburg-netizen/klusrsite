// @ts-nocheck
/**
 * Backfill productbarcodes (EAN/gtin) in de bestaande catalogus-snapshot vanuit
 * Channable — NON-DESTRUCTIEF. Vult alleen `product.gtin`; prijzen, titels,
 * voorraad en al het andere blijven ongemoeid. Respecteert de Tilroy-ontkoppeling
 * (overschrijft de catalogus niet, importeert 'm niet opnieuw).
 *
 * Channable heeft de EAN's wél (Items → veld `gtin`); onze gegenereerde snapshot
 * had ze niet. Dit haalt ze op en koppelt ze op het artikel-id.
 *
 *   CHANNABLE_TOKEN=… CHANNABLE_COMPANY_ID=… CHANNABLE_PROJECT_ID=… \
 *     node scripts/backfill-barcodes.mjs
 *
 * Optioneel: CHANNABLE_ITEMS_URL (volledige override van het items-endpoint).
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

/** Haal alle Channable-items op en bouw een map artikel-id → gtin. */
async function fetchGtinMap() {
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
  if (!TOKEN || !COMPANY_ID || (!PROJECT_ID && !process.env.CHANNABLE_ITEMS_URL)) {
    console.error(
      "✗ Channable niet geconfigureerd. Zet CHANNABLE_TOKEN, CHANNABLE_COMPANY_ID en CHANNABLE_PROJECT_ID (of CHANNABLE_ITEMS_URL).",
    );
    process.exit(1);
  }

  console.log("→ Barcodes ophalen uit Channable…");
  const gtins = await fetchGtinMap();
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
