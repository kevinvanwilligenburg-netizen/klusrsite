// @ts-nocheck
/**
 * Backfill verkoopprijzen in de bestaande catalogus-snapshot — NON-DESTRUCTIEF.
 * Werkt alléén `price`, `kluspasPrice` en `compareAtPrice` (adviesprijs) bij;
 * titels, voorraad, overlay en al het andere blijven ongemoeid. De kluspasprijs
 * wordt runtime centraal afgeleid (enforceKluspasDiscount in
 * src/lib/data/products.ts), maar we schrijven 'm mee zodat de snapshot
 * intern consistent blijft. Admin-prijzen via de catalogus-overlay winnen
 * runtime altijd van deze basisprijzen.
 *
 * Bron (in volgorde):
 *   1. VDM-dashboard prijsfeed (publiek, sku = Tilroy-artikel-id, mét
 *      adviesprijs) — https://dashboardvdm.vercel.app/api/prijsfeed.
 *      Override: PRIJSFEED_URL (zelfde env als build-price-feed.mjs).
 *   2. Channable items-API — wanneer CHANNABLE_TOKEN/CHANNABLE_API_TOKEN,
 *      CHANNABLE_COMPANY_ID en CHANNABLE_PROJECT_ID (of CHANNABLE_ITEMS_URL)
 *      gezet zijn.
 *   3. Publieke Tilroy Google-feed (XML) — zelfde bronprijzen, geen adviesprijs.
 *      Override: TILROY_FEED_URL.
 *
 *   node scripts/backfill-prices.mjs
 *
 * Veilig: schrijft alleen wanneer de bron gezond is (voldoende matches met de
 * snapshot); anders exit 1 en blijft de bestaande snapshot staan.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dirname, "..", "src", "lib", "data", "feed-products.generated.json");

const VDM_PRIJSFEED_URL =
  process.env.PRIJSFEED_URL ||
  process.env.VDM_PRIJSFEED_URL ||
  "https://dashboardvdm.vercel.app/api/prijsfeed";
const BASE = (process.env.CHANNABLE_API_BASE || "https://api.channable.com/v1").replace(/\/$/, "");
const TOKEN = process.env.CHANNABLE_TOKEN || process.env.CHANNABLE_API_TOKEN;
const COMPANY_ID = process.env.CHANNABLE_COMPANY_ID;
const PROJECT_ID = process.env.CHANNABLE_PROJECT_ID;
const TILROY_FEED_URL =
  process.env.TILROY_FEED_URL ||
  "https://tilroy.s3.eu-west-1.amazonaws.com/780/feed/google_devoordeelmarkt_NL.xml";

/** Zelfde kluspasregel als runtime (KLUSPAS_RATE in products.ts). */
const kluspas = (price) => Math.round(price * 0.95 * 100) / 100;
const r2 = (n) => Math.round(n * 100) / 100;

const num = (v) =>
  typeof v === "number" ? v : v != null ? parseFloat(String(v).replace(",", ".")) : 0;

function channableConfigured() {
  return Boolean(TOKEN && COMPANY_ID && (PROJECT_ID || process.env.CHANNABLE_ITEMS_URL));
}

function itemsUrl(offset, limit) {
  if (process.env.CHANNABLE_ITEMS_URL) {
    const u = new URL(process.env.CHANNABLE_ITEMS_URL);
    u.searchParams.set("offset", String(offset));
    u.searchParams.set("limit", String(limit));
    return u.toString();
  }
  return `${BASE}/companies/${COMPANY_ID}/projects/${PROJECT_ID}/items?offset=${offset}&limit=${limit}`;
}

/** Prijs per artikel-id uit de Channable items-API. */
async function fetchChannablePrices() {
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
      const price = num(f.price);
      if (id && price > 0) map.set(id, { price, advies: null });
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

/**
 * Prijzen uit de VDM-dashboard prijsfeed (JSON): per product { sku, ean,
 * normalePrijs, adviesPrijs }. sku = het Tilroy-artikel-id — matcht 1-op-1 op
 * onze variant-ids. Retourneert Map<sku, { price, advies }>.
 */
async function fetchVdmPrices() {
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
    const sku = String(r.sku ?? "").trim();
    const price = num(r.normalePrijs ?? r.normale_prijs ?? r.price);
    const advies = num(r.adviesPrijs ?? r.advies_prijs ?? r.rrp);
    if (sku && price > 0) map.set(sku, { price, advies: advies > 0 ? advies : null });
  }
  return map;
}

/** Prijs per artikel-id uit de publieke Tilroy Google-feed (g:id + g:price). */
async function fetchTilroyPrices() {
  const res = await fetch(TILROY_FEED_URL, { headers: { "User-Agent": "KLUSR-price-backfill" } });
  if (!res.ok) throw new Error(`Tilroy-feed → ${res.status}`);
  const xml = await res.text();
  const map = new Map();
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const id = (b.match(/<g:id>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/g:id>/) || [])[1]?.trim();
    const raw = (b.match(/<g:price>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/g:price>/) || [])[1];
    const price = num((raw || "").replace(/[^\d.,]/g, ""));
    if (id && price > 0) map.set(id, { price, advies: null });
  }
  return map;
}

const skuOf = (id) => String(id ?? "").replace(/^(?:tilroy|channable|feed)-/, "");

async function main() {
  let prices = null;
  let source = null;

  // 1. VDM-dashboard prijsfeed (publiek; sku = Tilroy-id; mét adviesprijs).
  try {
    console.log(`→ Prijzen ophalen uit het VDM-dashboard: ${VDM_PRIJSFEED_URL}`);
    prices = await fetchVdmPrices();
    source = "vdm-dashboard";
  } catch (err) {
    console.warn(`⚠ VDM-prijsfeed niet beschikbaar (${err.message}) — probeer volgende bron.`);
  }

  // 2. Channable items-API (vereist CHANNABLE_*-secrets).
  if (!prices?.size && channableConfigured()) {
    try {
      console.log("→ Prijzen ophalen uit de Channable items-API…");
      prices = await fetchChannablePrices();
      source = "channable-api";
    } catch (err) {
      console.warn(`⚠ Channable items-API faalde (${err.message}) — probeer volgende bron.`);
    }
  }

  // 3. Publieke Tilroy Google-feed (laatste terugval).
  if (!prices?.size) {
    console.log("→ Prijzen ophalen uit de publieke Tilroy-feed…");
    prices = await fetchTilroyPrices();
    source = "tilroy-feed";
  }

  console.log(`  ${prices.size} artikelen met een prijs (bron: ${source}).`);
  if (prices.size === 0) {
    console.error("✗ Bron leverde geen prijzen — snapshot blijft ongemoeid.");
    process.exit(1);
  }

  const snap = JSON.parse(readFileSync(SNAP, "utf8"));
  const products = snap.products ?? [];

  let variantsSeen = 0;
  let matched = 0;
  let changed = 0;
  let compareSet = 0;
  let compareDropped = 0;
  const biggest = [];

  for (const p of products) {
    for (const v of p.variants ?? []) {
      variantsSeen++;
      const src = prices.get(skuOf(v.id));
      if (!src) continue;
      matched++;
      const next = r2(src.price);
      const priceChanged = next !== v.price;
      if (priceChanged) {
        biggest.push({ id: v.id, title: p.title, label: v.label, van: v.price, naar: next });
        v.price = next;
        v.kluspasPrice = kluspas(next);
        changed++;
      }
      // Adviesprijs → doorgestreepte "van"-prijs, alléén wanneer die écht boven
      // de verkoopprijs ligt; anders is (een oude) compareAtPrice ruis.
      const advies = src.advies != null ? r2(src.advies) : null;
      if (advies != null && advies > next) {
        if (v.compareAtPrice !== advies) {
          v.compareAtPrice = advies;
          compareSet++;
        }
      } else if (v.compareAtPrice != null && v.compareAtPrice <= next) {
        delete v.compareAtPrice;
        compareDropped++;
      }
    }
    // Productprijs spiegelt de goedkoopste variant (incl. diens adviesprijs).
    const cheapest = (p.variants ?? []).reduce(
      (a, b) => (b.price < a.price ? b : a),
      p.variants?.[0],
    );
    if (cheapest) {
      if (cheapest.price !== p.price) {
        p.price = cheapest.price;
        p.kluspasPrice = kluspas(cheapest.price);
      }
      if (cheapest.compareAtPrice != null && cheapest.compareAtPrice > p.price) {
        p.compareAtPrice = cheapest.compareAtPrice;
      } else if (p.compareAtPrice != null && p.compareAtPrice <= p.price) {
        delete p.compareAtPrice;
      }
    }
  }

  const coverage = matched / Math.max(1, variantsSeen);
  console.log(
    `  ${matched}/${variantsSeen} varianten gematcht (${(coverage * 100).toFixed(1)}%), ` +
      `${changed} prijzen gewijzigd, ${compareSet} adviesprijzen gezet, ` +
      `${compareDropped} verouderde "van"-prijzen opgeruimd.`,
  );

  // Gezondheidscheck: bij een dunne match is de bron waarschijnlijk kapot/anders
  // gemapt — dan NIET schrijven (feed-prebuild behoudt de snapshot).
  if (coverage < 0.5) {
    console.error(
      `✗ Slechts ${(coverage * 100).toFixed(1)}% van de varianten gematcht — bron ongezond, snapshot blijft ongemoeid.`,
    );
    process.exit(1);
  }

  if (changed === 0 && compareSet === 0 && compareDropped === 0) {
    console.log("✓ Alle prijzen waren al actueel — niets geschreven.");
    return;
  }

  if (biggest.length) {
    biggest.sort((a, b) => Math.abs(b.naar - b.van) - Math.abs(a.naar - a.van));
    console.log("  Grootste wijzigingen:");
    for (const d of biggest.slice(0, 10)) {
      console.log(`    ${d.id} | €${d.van} → €${d.naar} | ${d.title} — ${d.label}`);
    }
  }

  writeFileSync(SNAP, JSON.stringify(snap, null, 2));
  console.log(`✓ ${changed} variantprijzen bijgewerkt (bron: ${source}) → ${SNAP}`);
}

main().catch((err) => {
  console.error("✗ Prijs-backfill mislukt:", err);
  process.exit(1);
});
