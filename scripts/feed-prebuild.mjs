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
 *   - barcodes | prices | stock→ non-destructieve backfills (EAN's / prijzen /
 *                                Nijverdal-voorraad) zonder herimport.
 *   - vdm                      → gecombineerd: barcodes → prijzen → voorraad,
 *                                met het VDM-dashboard als primaire bron
 *                                (zie docs/vdm-dashboard-koppeling.md).
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

// Speciale modus: alleen productbarcodes (EAN) bijvullen — NON-DESTRUCTIEF
// (vult enkel product.gtin). Bron: de VDM-dashboard prijsfeed (publiek, geen
// secrets nodig); de Channable items-API alleen nog als terugval.
if (SOURCE === "barcodes") {
  console.log("→ Catalogus: productbarcodes bijvullen (non-destructief)…");
  const r = spawnSync(process.execPath, [join(__dirname, "backfill-barcodes.mjs")], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn("⚠ Barcode-backfill mislukt — build gaat verder met de bestaande snapshot.");
  }
  process.exit(0);
}

// Speciale modus: alleen verkoopprijzen verversen — NON-DESTRUCTIEF (raakt
// uitsluitend price/kluspasPrice/compareAtPrice aan). Bron: VDM-dashboard
// prijsfeed, anders Channable items-API, anders de publieke Tilroy-feed.
// Admin-prijzen (overlay) winnen runtime altijd.
if (SOURCE === "prices") {
  console.log("→ Catalogus: verkoopprijzen verversen (non-destructief)…");
  const r = spawnSync(process.execPath, [join(__dirname, "backfill-prices.mjs")], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn("⚠ Prijs-backfill mislukt — build gaat verder met de bestaande snapshot.");
  }
  process.exit(0);
}

// Speciale modus: alleen de Nijverdal-voorraad verversen uit de VDM-dashboard
// stock-API — NON-DESTRUCTIEF (alleen de nijverdal-regel van stockByStore).
if (SOURCE === "stock") {
  console.log("→ Catalogus: voorraad (Nijverdal) verversen uit het VDM-dashboard…");
  const r = spawnSync(process.execPath, [join(__dirname, "backfill-stock.mjs")], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.warn("⚠ Voorraad-backfill mislukt — build gaat verder met de bestaande snapshot.");
  }
  process.exit(0);
}

// Gecombineerde modus: alle non-destructieve backfills in één build, met het
// VDM-dashboard als primaire bron. Volgorde is bewust: eerst barcodes (EAN's,
// nodig voor de voorraad-match), dan prijzen, dan voorraad. Elke stap is
// fail-soft — een haperende bron breekt de deploy nooit.
if (SOURCE === "vdm") {
  const steps = [
    ["barcodes", "backfill-barcodes.mjs"],
    ["prijzen", "backfill-prices.mjs"],
    ["voorraad", "backfill-stock.mjs"],
  ];
  for (const [label, script] of steps) {
    console.log(`→ Catalogus (vdm): ${label} verversen…`);
    const r = spawnSync(process.execPath, [join(__dirname, script)], { stdio: "inherit" });
    if (r.status !== 0) {
      console.warn(`⚠ ${label}-backfill mislukt — volgende stap gaat gewoon door.`);
    }
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
