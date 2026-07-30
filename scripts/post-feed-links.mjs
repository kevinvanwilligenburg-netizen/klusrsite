// @ts-nocheck
/**
 * Stuurt de productlinks van KLUSR naar het VDM-dashboard, dat daarmee onze
 * Google Shopping-feed bouwt (Channable vervalt).
 *
 * Waarom dit nodig is: het dashboard kent onze URL's niet. Onze slug wordt bij
 * het aanmaken van een product bepaald en daarna bevroren, dus reconstrueren uit
 * naam + code lukt niet betrouwbaar — bij De Voordeelmarkt haalde dat 93,2% en
 * gaf de rest een harde 404. Een item met een landingspagina die het product
 * niet toont, keurt Google af, dus artikelen zonder link laat het dashboard weg.
 *
 * Sleutel is het Tilroy-sku-id (zonder onze `tilroy-`-prefix) — dezelfde die in
 * `g:id` en in onze orderregels staat. Bij producten met meerdere varianten
 * hangen we `?v=<variant-id>` aan de URL, zodat de klant op de juiste maat
 * uitkomt in plaats van op de standaardvariant.
 *
 *   SITE_API_KEY=… node scripts/post-feed-links.mjs
 *   SITE_API_KEY=… node scripts/post-feed-links.mjs --dry
 *
 * In de build draait 'ie met `--soft`: dan is een ontbrekende sleutel of een
 * hikkend dashboard een waarschuwing en geen gebroken deploy. Alleen op
 * productie (VERCEL_ENV) — previews zouden anders de links van de live site
 * overschrijven met die van een testdeploy.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAP = join(__dirname, "..", "src", "lib", "data", "feed-products.generated.json");

const API =
  process.env.VDM_FEED_LINKS_URL || "https://dashboardvdm.vercel.app/api/feed-links";
const KEY = process.env.SITE_API_KEY;
const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");
const DRY = process.argv.includes("--dry");
/** Build-modus: nooit de deploy breken, alleen melden. */
const SOFT = process.argv.includes("--soft");

/** Stop zonder fout in soft-modus, met fout bij een expliciete aanroep. */
function stop(bericht) {
  if (SOFT) {
    console.warn(`⚠ ${bericht} — links niet verstuurd, deploy gaat door.`);
    process.exit(0);
  }
  console.error(`✗ ${bericht}`);
  process.exit(1);
}

function bouwLinks() {
  const snap = JSON.parse(readFileSync(SNAP, "utf8"));
  const links = {};
  for (const p of snap.products ?? []) {
    const varianten = p.variants ?? [];
    const meerdere = varianten.length > 1;
    for (const v of varianten) {
      const sku = String(v.id ?? "").replace(/^(?:tilroy|channable|feed)-/, "");
      if (!sku || !p.slug) continue;
      links[sku] = `${BASE}/product/${p.slug}${meerdere ? `?v=${encodeURIComponent(v.id)}` : ""}`;
    }
  }
  return links;
}

async function main() {
  // In de build alleen op productie: een preview-deploy mag de links van de
  // live site niet overschrijven met die van een testomgeving.
  if (SOFT && process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    console.log(`→ Productlinks overslaan (VERCEL_ENV=${process.env.VERCEL_ENV}).`);
    return;
  }

  const links = bouwLinks();
  const aantal = Object.keys(links).length;
  console.log(`→ ${aantal} productlinks opgebouwd (basis: ${BASE})`);

  // Gezondheidscheck: een lege of halve lijst zou het dashboard laten denken
  // dat ons assortiment is gekrompen, en dan verdwijnen items uit de feed.
  if (aantal < 1000) {
    stop(`Verdacht weinig links (${aantal}) — niets verstuurd`);
  }

  if (DRY) {
    const [sku, url] = Object.entries(links)[0];
    console.log(`  voorbeeld: ${sku} → ${url}`);
    console.log("✓ Dry run — niets verstuurd.");
    return;
  }

  if (!KEY) {
    stop("SITE_API_KEY ontbreekt (zet 'm in Vercel of als GitHub-secret)");
  }

  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ site: "klusr", links }),
    signal: AbortSignal.timeout(60_000),
  });
  const tekst = await res.text();
  if (!res.ok) {
    stop(`Dashboard gaf HTTP ${res.status}: ${tekst.slice(0, 200)}`);
  }
  console.log(`✓ Verstuurd. Antwoord: ${tekst.slice(0, 300)}`);
}

main().catch((err) => {
  stop(`Versturen van productlinks mislukt: ${err instanceof Error ? err.message : err}`);
});
