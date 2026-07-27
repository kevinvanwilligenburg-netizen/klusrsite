// @ts-nocheck
/**
 * Bouw de KLUSR-catalogus uit de directe Tilroy/De Voordeelmarkt feeds.
 * (Fallback-bron; primair loopt productdata via Channable — zie
 * build-channable-catalog.mjs.)
 *
 *   node scripts/build-tilroy-catalog.mjs
 *   TILROY_FEED_URL=… TILROY_STOCK_URL=… node scripts/build-tilroy-catalog.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildCatalog, decodeEntities } from "./lib/catalog-map.mjs";
import { loadFeatures } from "./lib/feature-feed.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "feed-products.generated.json");

const FEED_URL =
  process.env.TILROY_FEED_URL ||
  "https://tilroy.s3.eu-west-1.amazonaws.com/780/feed/google_devoordeelmarkt_NL.xml";
const STOCK_URL =
  process.env.TILROY_STOCK_URL ||
  "https://tilroy.s3.eu-west-1.amazonaws.com/780/feed/google_stock_devoordeelmarkt.csv";

function tag(block, name) {
  const re = new RegExp(`<g:${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</g:${name}>`);
  const m = block.match(re);
  return m ? m[1].trim() : undefined;
}

function parseItems(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const b = m[1];
    const id = tag(b, "id");
    if (!id) continue;
    items.push({
      id,
      title: tag(b, "title") ? decodeEntities(tag(b, "title")) : "",
      description: tag(b, "description") || "",
      link: tag(b, "link") || "",
      image: tag(b, "image_link") || "",
      additionalImage: tag(b, "additional_image_link") || "",
      availability: tag(b, "availability") || "out of stock",
      price: parseFloat((tag(b, "price") || "0").replace(",", ".")) || 0,
      productType: tag(b, "product_type") ? decodeEntities(tag(b, "product_type")) : "",
      brand: tag(b, "brand") ? decodeEntities(tag(b, "brand")) : "Onbekend",
      gtin: tag(b, "gtin") || "",
      color: tag(b, "color") ? decodeEntities(tag(b, "color")) : "",
      size: tag(b, "size") ? decodeEntities(tag(b, "size")) : "",
      groupId: tag(b, "item_group_id") || id,
    });
  }
  return items;
}

function parseStock(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const storeCols = header.slice(2);
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    map.set(cols[0], {
      total: parseInt(cols[1], 10) || 0,
      perStore: storeCols.map((_, idx) => parseInt(cols[2 + idx], 10) || 0),
    });
  }
  return map;
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch ${url} → ${res.status}`);
  return res.text();
}

async function main() {
  console.log("→ Tilroy feeds ophalen…");
  const [xml, csv] = await Promise.all([fetchText(FEED_URL), fetchText(STOCK_URL)]);
  const items = parseItems(xml);
  const stock = parseStock(csv);
  console.log(`  ${items.length} feed-items, ${stock.size} stock-rijen`);

  const featuresById = await loadFeatures();
  const snapshot = buildCatalog(items, stock, { source: FEED_URL, featuresById });

  // Gezondheidscheck vóór het overschrijven: een kapotte of verschoven feed
  // (hernoemde categorieën, lege prijzen, template-ruis) mag de bestaande
  // snapshot nooit vervangen. We vergelijken ook met de vorige snapshot zodat
  // een instortende categorie (zoals "reiniging" bij de feed-wijziging van
  // 2026-07) de import laat weigeren in plaats van stilletjes doorgaat.
  let prev = null;
  try {
    prev = JSON.parse(readFileSync(OUT, "utf8"));
  } catch {
    /* geen vorige snapshot — alleen de absolute checks */
  }
  const withImg = snapshot.products.filter((p) => p.images?.length).length;
  const dirty = snapshot.products.filter(
    (p) =>
      /\b(basis|base|zn|ln|sb)\b/i.test(p.title) ||
      /\d{2,4}\s+\d{2,4}/.test(p.title) ||
      /\b([a-z]{3,})\s+\1\b/i.test(p.title),
  ).length;
  const problems = [];
  if (snapshot.count < 2000) problems.push(`te weinig producten (${snapshot.count})`);
  if (withImg < snapshot.count * 0.8)
    problems.push(`te weinig afbeeldingen (${withImg}/${snapshot.count})`);
  if (dirty > snapshot.count * 0.05) problems.push(`te veel rommelige titels (${dirty})`);
  if (prev?.count && snapshot.count < prev.count * 0.85)
    problems.push(`productaantal zakt te hard (${prev.count} → ${snapshot.count})`);
  for (const [cat, n] of Object.entries(prev?.countsByCategory ?? {})) {
    const nu = snapshot.countsByCategory[cat] ?? 0;
    if (n >= 25 && nu < n * 0.2) problems.push(`categorie "${cat}" stort in (${n} → ${nu})`);
  }
  if (problems.length) {
    throw new Error(`catalogus ongezond — snapshot behouden: ${problems.join("; ")}`);
  }

  writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
  console.log(`✓ ${snapshot.count} producten → ${OUT}`);
  console.log("  per categorie:", snapshot.countsByCategory);
}

main().catch((err) => {
  console.error("✗ Catalogus-build mislukt:", err);
  process.exit(1);
});
