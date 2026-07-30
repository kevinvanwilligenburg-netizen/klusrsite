// @ts-nocheck
/**
 * Haalt de gedeelde Google-taxonomie op bij het VDM-dashboard en legt 'm lokaal
 * vast, zodat beide webshops dezelfde categorieën gebruiken zonder dat onze
 * feed van een externe dienst afhangt.
 *
 * Bewust bij de IMPORT en niet bij het serveren: de Google-feed moet blijven
 * werken als het dashboard hapert. Het gegenereerde bestand wordt meegecommit.
 *
 *   node scripts/sync-google-categories.mjs
 *
 * De mapping vult alleen categorieën aan die wij zélf nog niet kennen — onze
 * eigen tabel wint. Reden: de gedeelde mapping zet "elektra" onder Lighting
 * (patroon `verlichting|elektra`), terwijl stopcontacten en kabel bij ons onder
 * Power & Electrical Supplies horen. Blind overnemen zou dat verslechteren.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "lib", "data", "google-categories.generated.json");

// Canoniek projectdomein: de kale alias dashboardvdm.vercel.app bleef vandaag
// twee keer op een oudere build hangen, waardoor nieuwe endpoints 404 gaven.
const URL_MAPPING =
  process.env.VDM_GPC_URL ||
  "https://dashboardvdm-k-evin-s-projects.vercel.app/api/google/categorie-mapping";

async function main() {
  console.log(`→ Google-taxonomie ophalen: ${URL_MAPPING}`);
  const res = await fetch(URL_MAPPING, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const mapping = Array.isArray(body?.mapping) ? body.mapping : [];

  const regels = mapping
    .filter((m) => m?.patroon && (m.pad || m.id))
    .map((m) => ({ patroon: String(m.patroon), pad: String(m.pad ?? ""), id: String(m.id ?? "") }));

  if (regels.length < 3) {
    console.error(`✗ Verdacht weinig regels (${regels.length}) — bestand niet vervangen.`);
    process.exit(1);
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ opgehaald: new Date().toISOString(), regels }, null, 2)}\n`,
  );
  console.log(`✓ ${regels.length} regels → ${OUT}`);
}

main().catch((err) => {
  console.error("✗ Ophalen van de Google-taxonomie mislukt:", err.message ?? err);
  process.exit(1);
});
