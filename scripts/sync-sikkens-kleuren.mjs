// @ts-nocheck
/**
 * Haalt de benoemde Sikkens-kleuren op uit de kleurenkiezer-feed en legt ze
 * lokaal vast voor de kleurenfeed (/google-merchant-kleuren.xml).
 *
 *   node scripts/sync-sikkens-kleuren.mjs
 *
 * Alleen kleuren met een échte naam. De Sikkens-waaiers bevatten er 6.917,
 * maar 4.287 daarvan hebben alleen een code (F8.41.80, 4051). Op zo'n code
 * zoekt niemand, en ze zouden de feed vullen vóór de namen aan de beurt zijn —
 * precies de valkuil die de VDM-webshop meldde. Blijft over: ~907 unieke namen,
 * van Monumentengroen tot Grachtengroen.
 *
 * Bij een gelijke naam in meerdere waaiers houden we de eerste; dezelfde kleur
 * twee keer adverteren levert alleen concurrentie met jezelf op.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "sikkens-kleuren.generated.json");

const FEED =
  process.env.VDM_KLEUREN_FEED ||
  "https://dashboardvdm-k-evin-s-projects.vercel.app/api/kleurenkiezer/feed";

/** Alleen een code (F8.41.80, 4051, N00) en dus geen naam om op te zoeken. */
const isCode = (s) => /^[A-Z]{0,2}[\d.\-/ ]+[A-Z]?$/i.test(String(s).trim());

async function main() {
  console.log(`→ kleuren ophalen: ${FEED}`);
  const res = await fetch(FEED, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();

  const uniek = new Map();
  let totaal = 0;
  for (const c of body.colors ?? []) {
    if (!/^sikkens/i.test(String(c.collection ?? ""))) continue;
    totaal++;
    const naam = String(c.name ?? "").trim();
    if (!naam || isCode(naam) || !/[a-z]{3}/i.test(naam)) continue;
    const hex = String(c.hex ?? "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue;
    const sleutel = naam.toLowerCase();
    if (uniek.has(sleutel)) continue;
    uniek.set(sleutel, {
      naam,
      code: String(c.code ?? "").trim(),
      hex: hex.toLowerCase(),
      collectie: String(c.collection ?? "").trim(),
    });
  }

  const kleuren = [...uniek.values()].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  if (kleuren.length < 100) {
    console.error(`✗ Slechts ${kleuren.length} kleuren — bestand niet vervangen.`);
    process.exit(1);
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ opgehaald: new Date().toISOString(), kleuren }, null, 2)}\n`,
  );
  console.log(`  ${totaal} Sikkens-kleuren, waarvan ${kleuren.length} met een unieke naam`);
  console.log(`✓ → ${OUT}`);
}

main().catch((err) => {
  console.error("✗ Ophalen mislukt:", err.message ?? err);
  process.exit(1);
});
