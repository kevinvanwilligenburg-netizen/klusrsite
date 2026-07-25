// @ts-nocheck
/**
 * Stage 3 — vertaal de productcatalogus (titels, omschrijvingen, highlights)
 * naar EN/FR/DE met Claude (Sonnet 4.6) via de **Message Batches API** (50%
 * goedkoper, want niet tijdkritisch).
 *
 * Bron van waarheid blijft het Nederlandse feed-bestand; per taal schrijven we
 * een overlay `src/lib/data/i18n/products.<locale>.json` (productId → velden).
 * De webshop merget die overlay alleen wanneer de taal ≠ nl is (zie
 * src/lib/data/products-i18n.ts). Zonder overlay valt alles netjes terug op NL.
 *
 * Incrementeel: een manifest houdt per product een hash van de bronvelden bij,
 * zodat een herhaalde run alléén nieuwe of gewijzigde producten vertaalt. Zo
 * kost de dagelijkse sync na de eerste keer nog maar een paar cent.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/translate-catalog.mjs
 *
 * Opties (env):
 *   I18N_LOCALES=en,fr,de     welke talen (default en,fr,de)
 *   I18N_CHUNK=20             producten per batch-request (default 20)
 *   I18N_LIMIT=0              max. aantal producten deze run (0 = alle)
 *   ANTHROPIC_MODEL=...       model (default claude-sonnet-4-6)
 *   I18N_POLL_MS=15000        poll-interval voor de batch (default 15s)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data");
const I18N = join(DATA, "i18n");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const LOCALES = (process.env.I18N_LOCALES || "en,fr,de,pl").split(",").map((s) => s.trim()).filter(Boolean);
const CHUNK = Math.max(1, parseInt(process.env.I18N_CHUNK || "20", 10));
const LIMIT = parseInt(process.env.I18N_LIMIT || "0", 10);
const POLL_MS = Math.max(3000, parseInt(process.env.I18N_POLL_MS || "15000", 10));

const LANG_NAME = { en: "English", fr: "French (français)", de: "German (Deutsch)", pl: "Polish (polski)" };

if (!API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY ontbreekt — zet de key en draai opnieuw.");
  process.exit(1);
}

const readJson = (p, fb) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fb;
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** De velden die we vertalen, in een stabiele vorm voor hashing + prompt. */
function source(p) {
  return {
    title: p.title || "",
    description: p.description || "",
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
  };
}
const hashOf = (obj) => createHash("sha1").update(JSON.stringify(obj)).digest("hex").slice(0, 12);

function api(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "message-batches-2024-09-24",
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const SYSTEM =
  "You are a professional e-commerce translator for a Dutch paint & DIY webshop (KLUSR). " +
  "Translate product copy from Dutch into the target language with natural, commercial, " +
  "store-quality phrasing. Keep brand names, product names, units (ml, L, kg), color codes " +
  "(RAL 9010) and numbers exactly as-is. Do not add or invent information. Return ONLY valid " +
  "JSON, no prose, no markdown.";

/** Bouw de user-prompt voor één chunk producten naar één doeltaal. */
function prompt(items, locale) {
  const payload = items.map((it) => ({ id: it.id, ...it.src }));
  return (
    `Translate the "title", "description" and each string in "highlights" of every product ` +
    `below from Dutch into ${LANG_NAME[locale] || locale}. Keep the same JSON shape and the ` +
    `same "id" values. Return a JSON object: {"items":[{"id","title","description","highlights"}]}.\n\n` +
    JSON.stringify({ items: payload })
  );
}

function parseResult(text) {
  // Pak het eerste JSON-object uit het antwoord (defensief tegen extra tekst).
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    return null;
  }
}

async function main() {
  const feed = readJson(join(DATA, "feed-products.generated.json"), { products: [] });
  let products = feed.products || [];
  if (LIMIT > 0) products = products.slice(0, LIMIT);

  const manifest = readJson(join(I18N, ".manifest.json"), {});

  // Bepaal per taal welke producten (her)vertaald moeten worden.
  const requests = [];
  const overlays = {};
  for (const loc of LOCALES) overlays[loc] = readJson(join(I18N, `products.${loc}.json`), {});

  let queued = 0;
  for (const loc of LOCALES) {
    const todo = [];
    for (const p of products) {
      const src = source(p);
      const h = hashOf(src);
      const prev = manifest[p.id]?.[loc];
      if (prev === h && overlays[loc][p.id]) continue; // ongewijzigd → skip
      todo.push({ id: p.id, src, hash: h });
    }
    console.log(`  ${loc}: ${todo.length} producten te vertalen (van ${products.length})`);
    for (let i = 0; i < todo.length; i += CHUNK) {
      const chunk = todo.slice(i, i + CHUNK);
      requests.push({
        custom_id: `${loc}__${i / CHUNK}`,
        params: {
          model: MODEL,
          max_tokens: 8192,
          system: SYSTEM,
          messages: [{ role: "user", content: prompt(chunk, loc) }],
        },
        _loc: loc,
        _items: chunk,
      });
      queued += chunk.length;
    }
  }

  if (!requests.length) {
    console.log("✓ Niets te doen — alle producten zijn up-to-date vertaald.");
    return;
  }
  console.log(`→ ${requests.length} batch-requests indienen (${queued} product-vertalingen)…`);

  // Map custom_id → request-context voor de verwerking.
  const byId = new Map(requests.map((r) => [r.custom_id, r]));
  const submit = requests.map(({ custom_id, params }) => ({ custom_id, params }));

  const createRes = await api("/v1/messages/batches", { requests: submit });
  if (!createRes.ok) {
    console.error("✗ Batch indienen mislukt:", createRes.status, await createRes.text());
    process.exit(1);
  }
  const batch = await createRes.json();
  console.log(`  batch ${batch.id} — status ${batch.processing_status}`);

  // Pollen tot de batch klaar is.
  let status = batch;
  while (status.processing_status !== "ended") {
    await sleep(POLL_MS);
    const r = await api(`/v1/messages/batches/${batch.id}`);
    status = await r.json();
    const c = status.request_counts || {};
    console.log(`  … ${status.processing_status} (klaar:${c.succeeded || 0} bezig:${c.processing || 0} fout:${c.errored || 0})`);
  }

  // Resultaten ophalen (JSONL).
  const resRes = await fetch(status.results_url, {
    headers: { "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
  });
  const jsonl = await resRes.text();

  let ok = 0;
  let bad = 0;
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    const ctx = byId.get(row.custom_id);
    if (!ctx) continue;
    if (row.result?.type !== "succeeded") {
      bad += ctx._items.length;
      continue;
    }
    const text = (row.result.message.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const parsed = parseResult(text);
    const out = parsed?.items;
    if (!Array.isArray(out)) {
      bad += ctx._items.length;
      continue;
    }
    const byProduct = new Map(out.map((o) => [o.id, o]));
    for (const item of ctx._items) {
      const tr = byProduct.get(item.id);
      if (!tr || !tr.title) {
        bad++;
        continue;
      }
      overlays[ctx._loc][item.id] = {
        title: tr.title,
        description: tr.description || "",
        highlights: Array.isArray(tr.highlights) ? tr.highlights : [],
      };
      manifest[item.id] = { ...(manifest[item.id] || {}), [ctx._loc]: item.hash };
      ok++;
    }
  }

  for (const loc of LOCALES) {
    writeFileSync(join(I18N, `products.${loc}.json`), JSON.stringify(overlays[loc], null, 2));
  }
  writeFileSync(join(I18N, ".manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`✓ Klaar — ${ok} vertalingen geschreven, ${bad} mislukt. Overlays bijgewerkt.`);
}

main().catch((err) => {
  console.error("✗ translate-catalog:", err);
  process.exit(1);
});
