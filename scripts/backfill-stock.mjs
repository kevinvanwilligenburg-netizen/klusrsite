// @ts-nocheck
/**
 * Backfill voorraad in de bestaande catalogus-snapshot vanuit de VDM-dashboard
 * stock-API — NON-DESTRUCTIEF. Werkt alléén de Nijverdal-regel van
 * `stockByStore` bij (de webshop verkoopt en toont uitsluitend Nijverdal);
 * titels, prijzen, overlay en de overige (referentie)winkelregels blijven
 * ongemoeid.
 *
 * Bron: GET {VDM_STOCK_URL}?limit=&offset= — JSON met { configured, asOf,
 * items: [...] }. Default is de speciaal hiervoor gebouwde dashboard-feed
 * `/api/voorraad/feed` (dashboardvdm PR #283): live uit de Tilroy Stock API,
 * per item een `sku`-veld plus `shops` met álle bekende vestigingen
 * (0 = écht uitverkocht). Zolang de Tilroy-keys in het dashboard ontbreken
 * antwoordt de feed `configured: false` en stopt dit script netjes.
 * Legacy-terugval: /api/stock (per EAN, alleen bedrijfstotalen).
 *
 * Matching (per item, in volgorde):
 *   1. `sku`-veld (Tilroy-artikel-id) → exacte variant-match.
 *   2. `ean` → product.gtin. Alleen veilig bij producten met één variant
 *      (de gtin hoort bij het lead-artikel); multi-variant wordt geteld en
 *      overgeslagen.
 *
 * Aantal (per item, in volgorde):
 *   1. Een Nijverdal-specifiek veld: `nijverdal`, `qtyNijverdal`,
 *      `shops.nijverdal` of `shops["7827"]`+`shops["8934"]` (winkel + magazijn).
 *   2. `qty` = bedrijfstotaal over alle vestigingen. Dat overschat wat er in
 *      Nijverdal ligt en wordt daarom ALLEEN gebruikt met
 *      VDM_STOCK_ACCEPT_TOTAL=1 (alleen relevant voor het legacy-endpoint).
 *
 *   node scripts/backfill-stock.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dirname, "..", "src", "lib", "data", "feed-products.generated.json");

const STOCK_URL =
  process.env.VDM_STOCK_URL || "https://dashboardvdm-k-evin-s-projects.vercel.app/api/voorraad/feed";
const ACCEPT_TOTAL = /^(1|true|ja|yes)$/i.test(process.env.VDM_STOCK_ACCEPT_TOTAL || "");
const PAGE = 2000; // max van de dashboard-API
const PRIMARY_STORE_ID = "nijverdal";

const skuOf = (id) => String(id ?? "").replace(/^(?:tilroy|channable|feed)-/, "");
const isGtin = (s) => /^\d{8,14}$/.test(String(s ?? "").trim());

function num(v) {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Nijverdal-aantal uit een stock-item; null wanneer de bron het niet levert. */
function nijverdalQty(item) {
  for (const key of ["nijverdal", "qtyNijverdal", "nijverdalQty"]) {
    const v = num(item[key]);
    if (v != null) return v;
  }
  const shops = item.shops ?? item.perStore ?? item.stockByStore;
  if (shops && typeof shops === "object" && !Array.isArray(shops)) {
    const named = num(shops[PRIMARY_STORE_ID]);
    if (named != null) return named;
    // Tilroy-shop-ids: 7827 = winkel Nijverdal, 8934 = magazijn/webshop.
    const winkel = num(shops["7827"]);
    const magazijn = num(shops["8934"]);
    if (winkel != null || magazijn != null) return (winkel ?? 0) + (magazijn ?? 0);
  }
  return null;
}

async function fetchAllStock() {
  const items = [];
  let offset = 0;
  let asOf = null;
  let prevFirstKey = null;
  const MAX_PAGES = 50; // vangnet tegen een bron die limit/offset negeert
  for (let page = 0; page < MAX_PAGES; page++) {
    const u = new URL(STOCK_URL);
    u.searchParams.set("limit", String(PAGE));
    u.searchParams.set("offset", String(offset));
    // Ruime timeout: een koude lambda doet server-side een volledige gepagineerde
    // Tilroy-sweep en kan ~45-60s nodig hebben; daarna cachet het dashboard kort.
    const res = await fetch(u.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`VDM-stock → ${res.status}`);
    const body = await res.json();
    if (body.configured === false) {
      throw new Error(
        "de dashboard-feed is nog niet geconfigureerd (configured: false) — " +
          "zet de Tilroy-keys in het dashboard-project",
      );
    }
    asOf = body.asOf ?? asOf;
    const rows = body.items ?? [];
    // Negeert de bron onze offset (zelfde eerste item als de vorige pagina),
    // dan hebben we alles al — stoppen i.p.v. dubbel optellen.
    const firstKey = rows.length ? String(rows[0].sku ?? rows[0].ean ?? rows[0].id ?? "") : null;
    if (offset > 0 && firstKey != null && firstKey === prevFirstKey) break;
    prevFirstKey = firstKey;
    items.push(...rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return { items, asOf };
}

async function main() {
  console.log(`→ Voorraad ophalen uit het VDM-dashboard: ${STOCK_URL}`);
  const { items, asOf } = await fetchAllStock();
  console.log(`  ${items.length} stock-items (stand: ${asOf ?? "onbekend"}).`);
  if (items.length < 100) {
    console.error("✗ Verdacht weinig stock-items — bron ongezond, snapshot blijft ongemoeid.");
    process.exit(1);
  }
  if (asOf && Date.now() - Date.parse(asOf) > 7 * 86_400_000) {
    console.warn(
      `⚠ Stock-stand is ouder dan 7 dagen (${asOf}) — controleer de upload/cron in het dashboard.`,
    );
  }

  // Levert de bron een Nijverdal-aantal, of alleen bedrijfstotalen?
  const withNij = items.filter((i) => nijverdalQty(i) != null).length;
  const useTotal = withNij === 0;
  if (useTotal && !ACCEPT_TOTAL) {
    console.error(
      "✗ De stock-API levert alleen bedrijfstotalen (qty over álle vestigingen), " +
        "geen Nijverdal-aantal. De webshop verkoopt alleen Nijverdal — totalen " +
        "zouden de online voorraad overschatten. Zet VDM_STOCK_ACCEPT_TOTAL=1 om " +
        "totalen bewust te accepteren, of breid de dashboard-API uit " +
        "(zie docs/vdm-dashboard-koppeling.md). Snapshot blijft ongemoeid.",
    );
    process.exit(1);
  }
  if (useTotal) {
    console.warn("⚠ Bedrijfstotalen geaccepteerd (VDM_STOCK_ACCEPT_TOTAL=1) — Nijverdal krijgt het totaal.");
  } else {
    console.log(`  ${withNij}/${items.length} items met een Nijverdal-aantal.`);
  }

  // Indexen op sku en EAN.
  const bySku = new Map();
  const byEan = new Map();
  for (const it of items) {
    const qty = useTotal ? num(it.qty) : nijverdalQty(it);
    if (qty == null) continue;
    const q = Math.max(0, Math.round(qty)); // negatieve Tilroy-voorraad → 0 online
    const sku = String(it.sku ?? it.id ?? "").trim();
    if (sku) bySku.set(sku, q);
    const ean = String(it.ean ?? "").trim();
    if (isGtin(ean)) byEan.set(ean, q);
  }

  const snap = JSON.parse(readFileSync(SNAP, "utf8"));
  const products = snap.products ?? [];

  const setNijverdal = (stockByStore, q) => {
    const row = (stockByStore ?? []).find((s) => s.storeId === PRIMARY_STORE_ID);
    if (!row) return false;
    if (row.quantity === q) return false;
    row.quantity = q;
    return true;
  };

  let variantsSeen = 0;
  let matchedSku = 0;
  let matchedEan = 0;
  let skippedMultiVariant = 0;
  let changed = 0;

  for (const p of products) {
    let productTouched = false;
    for (const v of p.variants ?? []) {
      variantsSeen++;
      const bySkuQty = bySku.get(skuOf(v.id));
      if (bySkuQty != null) {
        matchedSku++;
        if (setNijverdal(v.stockByStore, bySkuQty)) {
          changed++;
          productTouched = true;
        }
        continue;
      }
      // EAN-terugval: gtin is product-niveau → alleen veilig bij één variant.
      if (isGtin(p.gtin) && byEan.has(p.gtin)) {
        if ((p.variants ?? []).length === 1) {
          matchedEan++;
          if (setNijverdal(v.stockByStore, byEan.get(p.gtin))) {
            changed++;
            productTouched = true;
          }
        } else {
          skippedMultiVariant++;
        }
      }
    }
    // Product-niveau spiegelt de lead-variant (zelfde conventie als de import).
    if (productTouched) {
      const lead = (p.variants ?? []).find((v) => v.id === p.id) ?? p.variants?.[0];
      const leadQty = (lead?.stockByStore ?? []).find(
        (s) => s.storeId === PRIMARY_STORE_ID,
      )?.quantity;
      if (leadQty != null) setNijverdal(p.stockByStore, leadQty);
    }
  }

  const matched = matchedSku + matchedEan;
  console.log(
    `  ${matched}/${variantsSeen} varianten gematcht (sku: ${matchedSku}, ean: ${matchedEan}), ` +
      `${skippedMultiVariant} multi-variant-producten zonder sku overgeslagen, ` +
      `${changed} voorraadstanden gewijzigd.`,
  );

  if (matched === 0) {
    // Diagnose: laat zien hoe de sku-waardenruimtes eruitzien, zodat een
    // mismatch (bv. Tilroy sourceId vs. artikel-id) direct zichtbaar is.
    // Handmatig te checken via {dashboard}/api/voorraad/skus?skus=<sku>.
    const feedSample = [...bySku.keys()].slice(0, 3);
    const snapSample = products
      .slice(0, 3)
      .map((p) => skuOf(p.variants?.[0]?.id ?? p.id));
    console.error(
      "✗ Geen enkele match met de snapshot — snapshot blijft ongemoeid.\n" +
        `  Feed-sku's (voorbeeld): ${feedSample.join(", ") || "(geen)"}\n` +
        `  Snapshot-sku's (voorbeeld): ${snapSample.join(", ")}\n` +
        "  Matcht de sku-waardenruimte niet? Check /api/voorraad/skus?skus=<sku> " +
        "op het dashboard. Geen sku's in de feed? Draai eerst de barcode-backfill (EAN's).",
    );
    process.exit(1);
  }

  if (changed === 0) {
    console.log("✓ Alle voorraadstanden waren al actueel — niets geschreven.");
    return;
  }

  writeFileSync(SNAP, JSON.stringify(snap, null, 2));
  console.log(`✓ ${changed} voorraadstanden (Nijverdal) bijgewerkt → ${SNAP}`);
}

main().catch((err) => {
  console.error("✗ Voorraad-backfill mislukt:", err);
  process.exit(1);
});
