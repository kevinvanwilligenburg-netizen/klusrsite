/**
 * Pre-build: leg de beheer-catalogus-overlay vast.
 *
 * Leest de door de admin ingestelde prijs-/zichtbaarheids-overrides en eigen
 * (custom/dropship) producten uit KV en schrijft ze naar:
 *   - src/lib/data/catalog-overrides.generated.json
 *   - src/lib/data/custom-products.generated.json
 * die de webshop synchroon toepast (zie src/lib/data/catalog-overlay.ts).
 *
 * Fail-safe: zonder KV of bij een fout laten we de bestaande (gecommitte)
 * bestanden ongemoeid en gaat de build gewoon door — een overlay-sync mag de
 * deploy nooit breken.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data");
const OVERRIDES_OUT = join(DATA, "catalog-overrides.generated.json");
const CUSTOM_OUT = join(DATA, "custom-products.generated.json");

const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!URL || !TOKEN) {
  console.log("→ Catalogus-overlay: geen KV geconfigureerd — overgeslagen.");
  process.exit(0);
}

/** Eén Redis-commando via de Upstash REST API. Gooit bij een HTTP-fout. */
async function cmd(args) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} → HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`KV ${args[0]} → ${data.error}`);
  return data.result ?? null;
}

function parse(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function main() {
  console.log("→ Catalogus-overlay verversen uit KV…");

  const overridesRaw = await cmd(["GET", "catalog:overrides"]);
  const overrides = parse(overridesRaw, { products: {}, variants: {} });
  const safeOverrides = {
    products: overrides.products ?? {},
    variants: overrides.variants ?? {},
  };

  const ids = (await cmd(["SMEMBERS", "catalog:custom:index"])) ?? [];
  const products = [];
  for (const id of ids) {
    const rec = parse(await cmd(["GET", `catalog:custom:${id}`]), null);
    if (rec && rec.product && rec.product.id && rec.product.slug) products.push(rec.product);
  }

  writeFileSync(OVERRIDES_OUT, JSON.stringify(safeOverrides, null, 2));
  writeFileSync(CUSTOM_OUT, JSON.stringify(products, null, 2));

  const pCount = Object.keys(safeOverrides.products).length;
  const vCount = Object.keys(safeOverrides.variants).length;
  console.log(
    `✓ Overlay: ${pCount} product- + ${vCount} variant-overrides, ${products.length} eigen product(en).`,
  );
}

main().catch((err) => {
  console.warn(
    `⚠ Catalogus-overlay-sync mislukt (${err?.message ?? err}) — bestaande overlay behouden.`,
  );
  process.exit(0);
});
