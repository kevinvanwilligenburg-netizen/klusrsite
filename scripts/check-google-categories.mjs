// @ts-nocheck
/**
 * Toetst élke Google-categorie die de feed kan uitsturen aan het officiële
 * taxonomiebestand van Google.
 *
 *   node scripts/check-google-categories.mjs
 *
 * Aanleiding: een google_product_category die Google niet kent wordt
 * stilzwijgend genegeerd. Merchant Center gaat dan alsnog zelf raden en je ziet
 * nergens dat je waarde is weggegooid. Zo stonden er maandenlang drie paden in
 * die niet bestaan — waaronder die voor verf, onze grootste categorie:
 *
 *   Hardware > Paint & Wall Covering > Paint      (bestaat niet)
 *   Hardware > Paint & Wall Covering > Wallpaper  (bestaat niet)
 *   Hardware > Fasteners                          (bestaat niet)
 *
 * Sindsdien sturen we nummers. Dit script controleert dat elk nummer bestaat en
 * dat het commentaar-pad erboven klopt met wat Google eronder verstaat, zodat
 * de tabel leesbaar blijft zonder uit de pas te lopen.
 *
 * Exit 1 bij een fout, zodat dit in CI kan.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEED = join(__dirname, "..", "src", "lib", "google-feed.ts");
const GEDEELD = join(__dirname, "..", "src", "lib", "data", "google-categories.generated.json");

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

/** De regels uit GOOGLE_CATEGORY, mét het pad uit het commentaar erboven. */
function leesEigenTabel() {
  const bron = readFileSync(FEED, "utf8");
  const blok = bron.match(/const GOOGLE_CATEGORY[^{]*\{([\s\S]*?)\n\};/);
  if (!blok) throw new Error("GOOGLE_CATEGORY niet gevonden in google-feed.ts");

  const uit = [];
  let laatstePad = null;
  for (const regel of blok[1].split(/\r?\n/)) {
    const commentaar = regel.match(/^\s*\/\/\s*(\d+)\s*=\s*(.+?)\s*$/);
    if (commentaar) {
      laatstePad = { id: commentaar[1], pad: commentaar[2] };
      continue;
    }
    const paar = regel.match(/^\s*"?([a-z-]+)"?:\s*"(\d+)"/);
    if (paar) {
      uit.push({ slug: paar[1], id: paar[2], verwachtPad: laatstePad?.id === paar[2] ? laatstePad.pad : null });
      laatstePad = null;
    }
  }
  return uit;
}

async function main() {
  const idNaarPad = await haalTaxonomie();
  console.log(`officiële taxonomie: ${idNaarPad.size} categorieën\n`);

  let fouten = 0;

  console.log("— eigen tabel (src/lib/google-feed.ts) —");
  const eigen = leesEigenTabel();
  if (!eigen.length) {
    console.error("✗ geen enkele regel gelezen — is het formaat gewijzigd?");
    process.exit(1);
  }
  for (const r of eigen) {
    const pad = idNaarPad.get(r.id);
    if (!pad) {
      console.error(`✗ ${r.slug}: nummer ${r.id} bestaat niet in de taxonomie`);
      fouten++;
    } else if (r.verwachtPad && r.verwachtPad !== pad) {
      console.error(`✗ ${r.slug}: commentaar zegt "${r.verwachtPad}", Google zegt "${pad}"`);
      fouten++;
    } else if (!r.verwachtPad) {
      console.error(`✗ ${r.slug}: geen "// <nummer> = <pad>"-commentaar boven de regel`);
      fouten++;
    } else {
      console.log(`✓ ${r.slug.padEnd(16)} ${r.id.padEnd(7)} ${pad}`);
    }
  }

  console.log("\n— gedeelde mapping (dashboard) —");
  const gedeeld = JSON.parse(readFileSync(GEDEELD, "utf8"));
  for (const r of gedeeld.regels ?? []) {
    if (!r.id) {
      console.log(`· ${r.patroon}: geen nummer — feed slaat 'm over ("${r.pad}")`);
      continue;
    }
    const pad = idNaarPad.get(r.id);
    if (!pad) {
      console.error(`✗ ${r.patroon}: nummer ${r.id} bestaat niet`);
      fouten++;
    } else if (pad !== r.pad) {
      console.error(`✗ ${r.patroon}: nummer ${r.id} is "${pad}", niet "${r.pad}"`);
      fouten++;
    } else {
      console.log(`✓ ${r.patroon.padEnd(34)} ${r.id.padEnd(7)} ${pad}`);
    }
  }

  console.log(fouten ? `\n✗ ${fouten} fout(en)` : "\n✓ alle categorieën bestaan");
  // exitCode in plaats van process.exit(): met een net afgeronde fetch nog open
  // klapt Node op Windows af met een libuv-assertie, en dan is de exitcode niet
  // meer te vertrouwen — precies wat je in CI niet wil.
  process.exitCode = fouten ? 1 : 0;
}

main().catch((err) => {
  console.error("✗ Controle mislukt:", err.message ?? err);
  process.exitCode = 1;
});
