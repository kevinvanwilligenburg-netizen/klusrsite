/**
 * Pre-build catalogus-bron.
 *
 * SINDS DE TILROY-ONTKOPPELING is de gecommitte snapshot
 * (`src/lib/data/feed-products.generated.json`) de EIGEN master. De build pakt
 * 'm standaard zoals hij is en haalt NIETS bij Tilroy/Channable op — de webshop
 * is daarmee onafhankelijk van die systemen. Prijzen, eigen producten en
 * voorraad beheer je in /admin (overlay + grootboek), niet via een externe feed.
 *
 * Wil je tóch (handmatig, of in een aparte importjob) verversen uit een externe
 * bron, zet dan CATALOG_SOURCE:
 *   - (leeg) | owned | frozen  → standaard: eigen snapshot, géén externe import.
 *   - channable                → import uit de publieke Channable Google-feed (XML).
 *   - channable-api            → import via de Channable items-API (token nodig).
 *   - tilroy                   → import rechtstreeks uit de Tilroy S3-feeds.
 *
 * Veilig by design: een import mag de deploy nooit breken. Mislukt 'ie (netwerk,
 * lege/ongezonde bron), dan blijft de bestaande snapshot staan en bouwt de
 * deploy gewoon door. Los importeren kan ook via `npm run feed:channable` /
 * `npm run feed:tilroy`.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SOURCE = (process.env.CATALOG_SOURCE || "owned").trim().toLowerCase();

/** Externe-bron → importscript. Alleen gebruikt als CATALOG_SOURCE dit kiest. */
const IMPORTERS = {
  channable: "build-channable-feed.mjs",
  "channable-api": "build-channable-catalog.mjs",
  tilroy: "build-tilroy-catalog.mjs",
};

if (SOURCE === "" || SOURCE === "owned" || SOURCE === "frozen") {
  console.log(
    "→ Catalogus: de eigen snapshot is de master (CATALOG_SOURCE niet gezet) — " +
      "geen import uit Tilroy/Channable. Zet CATALOG_SOURCE=channable|channable-api|tilroy om te verversen.",
  );
  process.exit(0);
}

// Speciale modus: alleen productbarcodes (EAN) bijvullen uit Channable —
// NON-DESTRUCTIEF (vult enkel ontbrekende product.gtin). Gebruikt dezelfde
// CHANNABLE_*-keys als de rest (incl. CHANNABLE_API_TOKEN). Handig om vanuit
// Vercel de barcodes binnen te halen zonder de hele catalogus te herimporteren.
if (SOURCE === "barcodes") {
  console.log("→ Catalogus: productbarcodes bijvullen uit Channable (non-destructief)…");
  const r = spawnSync(process.execPath, [join(__dirname, "backfill-barcodes.mjs")], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn("⚠ Barcode-backfill mislukt — build gaat verder met de bestaande snapshot.");
  }
  process.exit(0);
}

const script = IMPORTERS[SOURCE];
if (!script) {
  console.warn(
    `⚠ Onbekende CATALOG_SOURCE="${SOURCE}". Geldig: owned (standaard), channable, channable-api, tilroy. ` +
      "Build gaat verder met de bestaande snapshot.",
  );
  process.exit(0);
}

console.log(`→ Catalogus importeren uit externe bron: ${SOURCE} (${script})…`);
const res = spawnSync(process.execPath, [join(__dirname, script)], { stdio: "inherit" });

if (res.status !== 0) {
  console.warn(
    "⚠ Import mislukt of bron ongezond — build gaat verder met de bestaande " +
      "snapshot (geen onderbreking van de deploy).",
  );
}

// Een import mag de build nooit breken: altijd succesvol afsluiten.
process.exit(0);
