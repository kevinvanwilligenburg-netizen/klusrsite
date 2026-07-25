// @ts-nocheck
/**
 * Vertaal de UI-berichtencatalogus (de getypeerde `Messages` uit
 * src/lib/i18n/dictionaries.ts) naar de overlay-talen (default: Pools) met Claude.
 *
 * Nederlands is de bron. Per taal schrijven we een overlay
 * src/lib/i18n/messages.<locale>.json (key → vertaalde string). De dictionary
 * merget die overlay bovenop NL, dus ontbrekende keys vallen netjes terug op het
 * Nederlands.
 *
 * Incrementeel: een manifest (messages.<locale>.manifest.json) bewaart per key een
 * hash van de NL-bron. Een herhaalde run vertaalt alléén nieuwe of gewijzigde keys
 * — ideaal voor een nachtelijke cron (kost daarna nog maar een paar cent).
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npx tsx scripts/translate-ui.ts
 *
 * Env-opties:
 *   I18N_UI_LOCALES=pl          welke overlay-talen (komma-gescheiden, default pl)
 *   I18N_UI_CHUNK=40            keys per request (default 40)
 *   ANTHROPIC_MODEL=...         model (default claude-sonnet-4-6)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dictionaries } from "../src/lib/i18n/dictionaries";

const __dirname = dirname(fileURLToPath(import.meta.url));
const I18N_DIR = join(__dirname, "..", "src", "lib", "i18n");

const API_KEY = process.env.ANTHROPIC_API_KEY;
const BASE_URL = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const LOCALES = (process.env.I18N_UI_LOCALES || "pl")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const CHUNK = Math.max(1, parseInt(process.env.I18N_UI_CHUNK || "40", 10));

const LANG_NAME = {
  pl: "Polish (polski)",
  en: "English",
  fr: "French (français)",
  de: "German (Deutsch)",
};

if (!API_KEY) {
  console.error("✗ ANTHROPIC_API_KEY ontbreekt — zet de key en draai opnieuw.");
  process.exit(1);
}

const nl = dictionaries.nl;
const hashOf = (s) => createHash("sha1").update(s).digest("hex").slice(0, 10);
const readJson = (p, fb) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fb;
  }
};
const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

async function translateChunk(locale, entries) {
  const lang = LANG_NAME[locale] || locale;
  const payload = Object.fromEntries(entries);
  const prompt = `Translate the VALUES of this JSON object from Dutch to ${lang}, for a Dutch home-improvement / paint webshop (KLUSR).

Hard rules:
- Keep every JSON key EXACTLY the same.
- Translate ONLY the values, naturally and idiomatically (e-commerce UI tone).
- PRESERVE every placeholder like {amount}, {count}, {h}, {m}, {free} EXACTLY as-is.
- Preserve HTML/markup, punctuation and leading/trailing spaces.
- Keep brand/product names untranslated: KLUSR, KLUSRPAS, ProfPas, Klushulp, Mollie, iDEAL, Apple Pay, Google Pay, PayPal, Klarna, Bancontact, PostNL.
- Return ONLY the JSON object — no commentary, no code fences.

${JSON.stringify(payload, null, 2)}`;

  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    console.warn(`  ⚠ ${locale}: API ${res.status} — chunk overgeslagen`);
    return {};
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]);
  } catch {
    console.warn(`  ⚠ ${locale}: respons niet als JSON te lezen — chunk overgeslagen`);
    return {};
  }
}

async function run(locale) {
  const overlayPath = join(I18N_DIR, `messages.${locale}.json`);
  const manifestPath = join(I18N_DIR, `messages.${locale}.manifest.json`);
  const overlay = readJson(overlayPath, {});
  const manifest = readJson(manifestPath, {});

  // Te vertalen: ontbrekend in de overlay OF de NL-bron is gewijzigd.
  const todo = [];
  for (const [key, value] of Object.entries(nl)) {
    if (typeof value !== "string") continue;
    if (overlay[key] === undefined || manifest[key] !== hashOf(value)) todo.push([key, value]);
  }
  console.log(`→ ${locale}: ${todo.length}/${Object.keys(nl).length} keys te vertalen`);
  if (todo.length === 0) return;

  for (let i = 0; i < todo.length; i += CHUNK) {
    const chunk = todo.slice(i, i + CHUNK);
    const translated = await translateChunk(locale, chunk);
    for (const [key, value] of chunk) {
      if (typeof translated[key] === "string" && translated[key].trim()) {
        overlay[key] = translated[key];
        manifest[key] = hashOf(value);
      }
    }
    // Tussentijds wegschrijven → robuust bij onderbreking / rate-limit.
    writeFileSync(overlayPath, JSON.stringify(sortObj(overlay), null, 2) + "\n");
    writeFileSync(manifestPath, JSON.stringify(sortObj(manifest), null, 2) + "\n");
    console.log(`  ✓ ${Math.min(i + CHUNK, todo.length)}/${todo.length}`);
  }
}

async function main() {
  for (const locale of LOCALES) {
    await run(locale).catch((e) => console.warn(`⚠ ${locale} overgeslagen:`, e?.message ?? e));
  }
  console.log("Klaar. Commit de overlay-bestanden (messages.*.json).");
}

// Geen top-level await: esbuild/tsx transformeert dit script naar CJS, en dat
// ondersteunt geen top-level await. Daarom in een main()-functie.
main();
