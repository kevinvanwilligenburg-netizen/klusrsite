// @ts-nocheck
/**
 * Haalt de RAL-kleuren op bij de kleurenkiezer-feed van het VDM-dashboard en
 * legt ze lokaal vast, zodat de RAL-landingspagina's bij de build gegenereerd
 * kunnen worden.
 *
 *   node scripts/sync-ral-kleuren.mjs
 *
 * Waarom een gegenereerd bestand en niet een fetch op de pagina: de pagina's
 * zijn statisch (generateStaticParams), dus de lijst moet bij de build al
 * bekend zijn. En het moet reproduceerbaar zijn — een feed die even hapert mag
 * geen 80 pagina's uit de sitemap laten vallen.
 *
 * ⚠️ RAL Classic telt officieel 213 kleuren; wij hebben er zoveel als de bron
 * levert (nu 82: onze eigen gecureerde set plus de collectie "RAL kleuren" uit
 * de portal). De rest verzinnen zou betekenen dat we hex-waarden en namen uit
 * de duim zuigen voor kleuren die we vervolgens laten mengen — dus dat doen we
 * niet. Komt er een volledige RAL Classic-bron beschikbaar, dan groeit dit
 * bestand vanzelf mee.
 */

import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "ral-kleuren.generated.json");
const COLORS_TS = join(__dirname, "..", "src", "lib", "data", "colors.ts");

const FEED =
  process.env.VDM_KLEUREN_FEED ||
  "https://dashboardvdm-k-evin-s-projects.vercel.app/api/kleurenkiezer/feed";

/** "RAL 9010" → 9010, en alleen als het een geldige RAL Classic-code is. */
const RAL_REEKSEN = [
  [1000, 1037],
  [2000, 2013],
  [3000, 3033],
  [4001, 4012],
  [5000, 5026],
  [6000, 6038],
  [7000, 7048],
  [8000, 8029],
  [9001, 9023],
];

function ralNummer(tekst) {
  const m = String(tekst ?? "").match(/\bRAL\s*([0-9]{4})\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return RAL_REEKSEN.some(([a, b]) => n >= a && n <= b) ? n : null;
}

/** Onze eigen gecureerde RAL-kleuren rechtstreeks uit colors.ts. */
function uitEigenSet() {
  const src = readFileSync(COLORS_TS, "utf8");
  const uit = [];
  for (const m of src.matchAll(
    /\{\s*name:\s*"([^"]+)",\s*code:\s*"(RAL\s*[0-9]{4})",\s*hex:\s*"(#[0-9a-fA-F]{6})"/g,
  )) {
    const n = ralNummer(m[2]);
    if (n) uit.push({ nummer: n, naam: m[1].trim(), hex: m[3].toLowerCase() });
  }
  return uit;
}

async function uitPortal() {
  const res = await fetch(FEED, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
  const body = await res.json();
  const uit = [];
  for (const c of body.colors ?? []) {
    // Alleen de echte RAL-waaier; "Sikkens ACC to RAL" e.d. zijn
    // omzettabellen en leveren namen als "4051" zonder betekenis.
    if (!/^ral\b/i.test(String(c.collection ?? ""))) continue;
    const n = ralNummer(`${c.code ?? ""} ${c.name ?? ""}`);
    if (!n) continue;
    const naam = String(c.name ?? "").replace(/\bRAL\s*[0-9]{4}\b/i, "").trim();
    const hex = String(c.hex ?? "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue;
    uit.push({ nummer: n, naam: naam || `RAL ${n}`, hex: hex.toLowerCase() });
  }
  return uit;
}

async function main() {
  const eigen = uitEigenSet();
  console.log(`→ eigen gecureerde set: ${eigen.length} RAL-kleuren`);

  let portal = [];
  try {
    portal = await uitPortal();
    console.log(`→ portalfeed:           ${portal.length} RAL-kleuren`);
  } catch (err) {
    console.warn(`⚠ portalfeed niet bereikbaar (${err.message}) — alleen de eigen set`);
  }

  // Eigen set wint: die is met de hand gecureerd en heeft Nederlandse namen.
  const perNummer = new Map();
  for (const c of [...portal, ...eigen]) perNummer.set(c.nummer, c);

  const kleuren = [...perNummer.values()].sort((a, b) => a.nummer - b.nummer);
  if (kleuren.length < 30) {
    console.error(`✗ Slechts ${kleuren.length} kleuren — bestand niet vervangen.`);
    process.exit(1);
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ opgehaald: new Date().toISOString(), kleuren }, null, 2)}\n`,
  );
  console.log(`✓ ${kleuren.length} RAL-kleuren → ${OUT}`);
}

main().catch((err) => {
  console.error("✗ Ophalen van de RAL-kleuren mislukt:", err.message ?? err);
  process.exit(1);
});
