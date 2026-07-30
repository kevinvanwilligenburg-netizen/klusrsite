// @ts-nocheck
/**
 * Haalt de gedeelde Google-taxonomie op bij het VDM-dashboard, toetst 'm aan
 * het officiële taxonomiebestand van Google, en legt het resultaat lokaal vast.
 *
 * Bewust bij de IMPORT en niet bij het serveren: de Google-feed moet blijven
 * werken als het dashboard hapert. Het gegenereerde bestand wordt meegecommit.
 *
 *   node scripts/sync-google-categories.mjs
 *
 * WAAROM DE TOETSING. Een google_product_category die Google niet kent, wordt
 * stilzwijgend genegeerd — Merchant Center gaat dan alsnog zelf raden, en je
 * ziet nergens dat je categorie is weggegooid. Dat gebeurde hier: zowel onze
 * eigen tabel als de gedeelde mapping bevatte paden die niet bestaan
 * ("Hardware > Paint & Wall Covering > Paint", "Hardware > Fasteners",
 * "Hardware > Lighting"). Sindsdien sturen we nummers in plaats van paden, en
 * controleert dit script ze allemaal.
 *
 * Regels die we niet kunnen thuisbrengen komen zónder nummer in het bestand;
 * de feed slaat die over. Liever geen categorie dan een verkeerde.
 *
 * Onze eigen tabel in src/lib/google-feed.ts blijft leidend; deze mapping is
 * het vangnet voor hoofdgroepen die wij nog niet kennen.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "google-categories.generated.json");

// Canoniek projectdomein: de kale alias dashboardvdm.vercel.app hangt vast op
// een deployment van elf versies terug, waardoor nieuwe endpoints 404 geven.
const URL_MAPPING =
  process.env.VDM_GPC_URL ||
  "https://dashboardvdm-k-evin-s-projects.vercel.app/api/google/categorie-mapping";

const URL_TAXONOMIE =
  process.env.GOOGLE_TAXONOMIE_URL ||
  "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt";

/** Officiële taxonomie: pad → nummer en nummer → pad. */
async function haalTaxonomie() {
  const res = await fetch(URL_TAXONOMIE, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`taxonomie HTTP ${res.status}`);
  const tekst = await res.text();
  const padNaarId = new Map();
  const idNaarPad = new Map();
  for (const regel of tekst.split(/\r?\n/)) {
    const m = regel.match(/^(\d+)\s*-\s*(.+)$/);
    if (!m) continue;
    padNaarId.set(m[2].trim(), m[1]);
    idNaarPad.set(m[1], m[2].trim());
  }
  if (padNaarId.size < 1000) throw new Error(`taxonomie te klein (${padNaarId.size})`);
  return { padNaarId, idNaarPad };
}

async function main() {
  console.log(`→ Google-taxonomie ophalen: ${URL_TAXONOMIE}`);
  const { padNaarId, idNaarPad } = await haalTaxonomie();
  console.log(`  ${padNaarId.size} officiële categorieën`);

  console.log(`→ Gedeelde mapping ophalen: ${URL_MAPPING}`);
  const res = await fetch(URL_MAPPING, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const mapping = Array.isArray(body?.mapping) ? body.mapping : [];

  const regels = [];
  let goed = 0;
  let afgekeurd = 0;
  for (const m of mapping) {
    if (!m?.patroon) continue;
    const pad = String(m.pad ?? "").trim();
    const opgegevenId = String(m.id ?? "").trim();

    // Het pad is leidend: dat is wat een mens heeft bedoeld. Het nummer erbij
    // zoeken we zelf op, want de meegeleverde nummers bleken niet te kloppen
    // (ijzerwaren kwam binnen als 1974 = Locks & Keys).
    const echtId = padNaarId.get(pad) ?? null;

    if (echtId) {
      goed++;
      if (opgegevenId && opgegevenId !== echtId) {
        console.log(
          `  ~ ${m.patroon}: nummer ${opgegevenId} → ${echtId} (${opgegevenId && idNaarPad.get(opgegevenId) ? `${opgegevenId} is "${idNaarPad.get(opgegevenId)}"` : "onbekend nummer"})`,
        );
      }
    } else {
      afgekeurd++;
      console.log(`  ✗ ${m.patroon}: pad "${pad}" bestaat niet — zonder nummer opgeslagen`);
    }
    regels.push({ patroon: String(m.patroon), pad, id: echtId ?? "" });
  }

  if (goed < 3) {
    console.error(`✗ Slechts ${goed} bruikbare regels — bestand niet vervangen.`);
    process.exit(1);
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ opgehaald: new Date().toISOString(), regels }, null, 2)}\n`,
  );
  console.log(`✓ ${regels.length} regels (${goed} met nummer, ${afgekeurd} zonder) → ${OUT}`);
}

main().catch((err) => {
  console.error("✗ Ophalen van de Google-taxonomie mislukt:", err.message ?? err);
  process.exit(1);
});
