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

/**
 * HTML-entiteiten in de bron terugvertalen.
 *
 * De feed levert namen als `&#8211; RAL 1000` — een en-dash als entiteit. Die
 * kwamen letterlijk in de eerste versie van de feed terecht.
 */
function entities(s) {
  return String(s ?? "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/** Ziet dit eruit als een kleurcode (D5.22.60, 4051, D11-2) en niet als naam? */
const isCode = (s) =>
  /^[A-Z]{0,3}\d+([.\-]\d+)*[A-Z]?$/i.test(s) || /^[A-Z]?\d{2,}[-\d]*$/i.test(s);

async function main() {
  console.log(`→ kleuren ophalen: ${FEED}`);
  const res = await fetch(FEED, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();

  const uniek = new Map();
  let totaal = 0;
  for (const c of body.colors ?? []) {
    const collectie = String(c.collection ?? "").trim();
    if (!/^sikkens/i.test(collectie)) continue;
    totaal++;

    // Omzettabellen overslaan: in "Sikkens ACC to RAL" is de naam een
    // RAL-nummer en geen kleurnaam.
    if (/\bto\s+(ral|acc)\b/i.test(collectie)) continue;

    const naam = entities(c.name);
    const code = entities(c.code);

    // Dé regel: een kleur met een échte naam heeft óók een aparte code
    // ("Monumentengroen" / "N0.15.10"). Heeft hij die niet, dan ís de naam de
    // code ("D5.22.60"). Dat onderscheid is betrouwbaarder dan raden op basis
    // van letters — de eerste versie liet daardoor 604 van de 907 "namen"
    // door die in werkelijkheid collectielabels waren, zoals
    // "(4041 Color Concept)".
    if (!code) continue;
    if (!naam || isCode(naam)) continue;
    if (!/[A-Za-zÀ-ÿ]{3}/.test(naam)) continue;

    // Een naam die met "RAL <nummer>" begint is een verwijzing naar een
    // RAL-kleur, geen Sikkens-kleurnaam. Die kleuren hebben al een eigen
    // landingspagina (/kleuren/ral), dus hier zouden ze alleen met zichzelf
    // concurreren.
    //
    // In de waaier "Muurverf DHZ (web)" staan naam en code bovendien
    // omgewisseld: naam="RAL 9001 (Sikkens Muurv DHZ)", code="Crème". Dezelfde
    // regel vangt die af.
    if (/^ral\s*\d/i.test(naam)) continue;
    // Haakjes hóren niet in een kleurnaam; ze markeren een collectielabel dat
    // in het naamveld beland is.
    if (/[([]/.test(naam)) continue;

    const hex = String(c.hex ?? "").trim();
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) continue;

    const sleutel = naam.toLowerCase();
    if (uniek.has(sleutel)) continue;
    uniek.set(sleutel, { naam, code, hex: hex.toLowerCase(), collectie });
  }

  const kleuren = [...uniek.values()].sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  if (kleuren.length < 50) {
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
