// @ts-nocheck
/**
 * Toetst nummer/pad-paren aan de officiële Google-producttaxonomie.
 *
 *   node scripts/check-google-taxonomie.mjs <bestand> [<bestand> ...]
 *   node scripts/check-google-taxonomie.mjs 1361 2334 2878
 *
 * Repo-onafhankelijk: het leest élk meegegeven tekstbestand en pikt daar
 * `<nummer> = <pad>`-paren uit, in welke vorm dan ook — een JS-commentaar
 * (`// 1361 = Hardware > …`), een JSON-veld, een tabel in markdown. Losse
 * nummers op de opdrachtregel worden opgezocht en getoond.
 *
 * WAAROM. Een google_product_category die Google niet kent, wordt stilzwijgend
 * genegeerd: Merchant Center gaat dan alsnog zelf raden en er komt geen enkele
 * foutmelding. Zo stonden er bij zowel KLUSR als het VDM-dashboard maandenlang
 * paden in die niet bestaan, en nummers die naar iets heel anders wezen dan het
 * pad ernaast (elektra → espressomachines, vloeren → zwembadfolie). Dat is niet
 * op te lossen met beter opletten; het hoort in CI.
 *
 * Exit 1 zodra één paar niet klopt.
 *
 * (De KLUSR-specifieke variant die óók de eigen tabel en de gedeelde mapping
 * uitleest, staat in scripts/check-google-categories.mjs.)
 */

import { readFileSync } from "node:fs";

const URL_TAXONOMIE =
  process.env.GOOGLE_TAXONOMIE_URL ||
  "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt";

async function haalTaxonomie() {
  const res = await fetch(URL_TAXONOMIE, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`taxonomie HTTP ${res.status}`);
  const idNaarPad = new Map();
  for (const regel of (await res.text()).split(/\r?\n/)) {
    const m = regel.match(/^(\d+)\s*-\s*(.+)$/);
    if (m) idNaarPad.set(m[1], m[2].trim());
  }
  if (idNaarPad.size < 1000) throw new Error(`taxonomie te klein (${idNaarPad.size})`);
  return idNaarPad;
}

/** Alle `<nummer> = <pad>`-paren uit een tekst, ongeacht het omliggende formaat. */
function leesParen(tekst) {
  const uit = [];
  // Vorm 1: nummer = pad  (JS-commentaar, markdown, kale tekst)
  for (const m of tekst.matchAll(/(\d{2,7})\s*=\s*([A-Z][^\n"',]*?(?: > [^\n"',]+)+)/g)) {
    uit.push({ id: m[1], pad: m[2].trim() });
  }
  // Vorm 2: JSON met "pad" en "id" in HETZELFDE object, in beide volgordes.
  // [^}] is essentieel: zonder die grens koppelt de regex het pad van regel N
  // aan het nummer van regel N+1 zodra er een regel met een leeg id tussen zit,
  // en dan meldt de controle fouten die er niet zijn.
  for (const m of tekst.matchAll(/"pad"\s*:\s*"([^"}]+)"[^}]*?"id"\s*:\s*"(\d+)"/g)) {
    uit.push({ id: m[2], pad: m[1] });
  }
  for (const m of tekst.matchAll(/"id"\s*:\s*"(\d+)"[^}]*?"pad"\s*:\s*"([^"}]+)"/g)) {
    uit.push({ id: m[1], pad: m[2] });
  }
  // Dubbelen eruit.
  const gezien = new Set();
  return uit.filter((p) => {
    const k = `${p.id}|${p.pad}`;
    if (gezien.has(k)) return false;
    gezien.add(k);
    return true;
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error("Gebruik: node scripts/check-google-taxonomie.mjs <bestand|nummer> ...");
    process.exitCode = 2;
    return;
  }

  const idNaarPad = await haalTaxonomie();
  console.log(`officiële taxonomie: ${idNaarPad.size} categorieën\n`);

  let fouten = 0;
  let getoetst = 0;

  for (const arg of args) {
    if (/^\d+$/.test(arg)) {
      const pad = idNaarPad.get(arg);
      console.log(pad ? `✓ ${arg} = ${pad}` : `✗ ${arg} bestaat niet`);
      if (!pad) fouten++;
      getoetst++;
      continue;
    }

    let tekst;
    try {
      tekst = readFileSync(arg, "utf8");
    } catch {
      console.error(`✗ kan ${arg} niet lezen`);
      fouten++;
      continue;
    }

    const paren = leesParen(tekst);
    console.log(`— ${arg}: ${paren.length} paar/paren —`);
    for (const p of paren) {
      getoetst++;
      const echt = idNaarPad.get(p.id);
      if (!echt) {
        console.error(`  ✗ ${p.id}: nummer bestaat niet (stond bij "${p.pad}")`);
        fouten++;
      } else if (echt !== p.pad) {
        console.error(`  ✗ ${p.id} is "${echt}", niet "${p.pad}"`);
        fouten++;
      } else {
        console.log(`  ✓ ${p.id.padEnd(7)} ${echt}`);
      }
    }
    if (!paren.length) console.log("  (geen nummer/pad-paren gevonden)");
  }

  console.log(
    fouten ? `\n✗ ${fouten} fout(en) op ${getoetst} getoetst` : `\n✓ alle ${getoetst} kloppen`,
  );
  // exitCode in plaats van process.exit(): met een net afgeronde fetch nog open
  // klapt Node op Windows af met een libuv-assertie, en dan is de exitcode niet
  // meer te vertrouwen — precies wat je in CI niet wil.
  process.exitCode = fouten ? 1 : 0;
}

main().catch((err) => {
  console.error("✗ Controle mislukt:", err.message ?? err);
  process.exitCode = 1;
});
