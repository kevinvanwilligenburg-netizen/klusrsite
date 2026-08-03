// @ts-nocheck
/**
 * Zoekt de hex op bij het kleurveld van voorgemengde verf, en legt alleen de
 * ondubbelzinnige treffers vast.
 *
 *   node scripts/sync-voorgemengde-kleuren.mjs
 *
 * Waarom dit een apart bestand is en geen opzoeking op het moment zelf: de
 * kleurenbron van het dashboard telt 54.222 kleuren en die bundelen we niet.
 * Belangrijker nog — de toets die dit script doet kán alleen hier, met de
 * volledige bron ernaast.
 *
 * **De toets: een kleurwaarde telt alleen als álle treffers dezelfde hex
 * geven.** Het kassaveld bevat bij ons meestal een kaal kleurwoord ("Wit" staat
 * bij 77 producten), en de bron bevat negen verschillende kleuren die "Wit"
 * heten, zes die "Zwart" heten en vier die "Groen" heten — van dennengroen
 * #294e29 tot olijfbruin #6e5d33. Een gewone opzoeking pakt daar willekeurig
 * één van. Zo kwam "Geel" uit op #eb8d24, en dat is oranje.
 *
 * Met deze toets vervalt de behoefte aan een lijstje verboden woorden: vaag is
 * per definitie meervoudig, en meervoudig valt af. "Leliewit" hoort bij precies
 * één hex en blijft dus staan.
 *
 * Bij verf is dit geen detail. Iemand koopt op wat hij ziet; een benaderde
 * kleur is erger dan geen kleur.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, "..", "src", "lib", "data");
const OUT = join(DATA, "voorgemengde-kleuren.generated.json");

const FEED =
  process.env.VDM_KLEUREN_FEED ||
  "https://dashboardvdm-k-evin-s-projects.vercel.app/api/kleurenkiezer/feed";

/**
 * Waarden die geen kleur zijn.
 *
 * "Transprant" en "Toepassing" staan letterlijk zo in het kleurveld van de
 * kassa — een tikfout en een verkeerd ingevuld veld. "Toepassing" komt zelfs
 * als kleurnaam in de bron voor, dus de opzoeking vindt er gewoon een hex bij;
 * die moet je er hier uit halen.
 */
const GEEN_KLEUR =
  /^(nocolour|no colour|transparant|transprant|blank|blanco|kleurloos|toepassing|divers|n\.?v\.?t\.?|-|)$/i;

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Kale kleurwoorden. Die wijzen geen kleur aan, hoeveel treffers de bron ook
 * heeft.
 *
 * De hex-toets hieronder vangt de meeste af — "Wit" heeft er negen, "Zwart"
 * zes. Maar niet allemaal: van "Rood" staat er toevallig precies één in de
 * bron (#b32724), en die zou dan op *Rambo Pantserlak Warm Mahonie* belanden.
 * Eén treffer is hier dus geen bewijs van zekerheid, alleen van een dunne bron.
 *
 * Samenstellingen blijven staan: "Zuiverwit" en "Ivoorbruin" zeggen wél welke.
 */
const KAAL_KLEURWOORD = new Set([
  "wit", "zwart", "grijs", "groen", "blauw", "rood", "geel", "bruin",
  "beige", "creme", "oranje", "paars", "roze", "zilver", "goud", "brons",
  "naturel", "kleur", "gekleurd", "bont",
]);

function specWaarde(p, label) {
  for (const groep of p.specifications ?? []) {
    for (const item of groep.items ?? []) {
      if (String(item.label ?? "").trim().toLowerCase() === label) {
        return String(item.value ?? "").trim();
      }
    }
  }
  return "";
}

/** Onze eigen RAL-tabel: nummer → kleur. Eén vastgelegde hex per nummer. */
const RAL_TABEL = new Map(
  (JSON.parse(readFileSync(join(DATA, "ral-kleuren.generated.json"), "utf8")).kleuren ?? []).map(
    (k) => [Number(k.nummer), k],
  ),
);

async function main() {
  const catalogus = JSON.parse(readFileSync(join(DATA, "feed-products.generated.json"), "utf8"));
  const producten = Array.isArray(catalogus)
    ? catalogus
    : Object.values(catalogus).find(Array.isArray) ?? [];

  // Alleen voorgemengd: mengverf heeft een kleurkiezer op de pagina.
  const perWaarde = new Map();
  for (const p of producten) {
    if (p.category !== "verf" || p.colorMatchable) continue;
    const kleur = specWaarde(p, "kleur");
    if (kleur && !GEEN_KLEUR.test(kleur)) {
      perWaarde.set(kleur, (perWaarde.get(kleur) ?? 0) + 1);
    }
  }
  const waarden = new Set(perWaarde.keys());
  console.log(`→ ${waarden.size} verschillende kleurwaarden bij voorgemengde verf`);

  console.log(`→ kleurenbron ophalen: ${FEED}`);
  const res = await fetch(FEED, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const bron = ((await res.json()).colors ?? []).filter((c) =>
    /^#[0-9a-fA-F]{6}$/.test(String(c.hex ?? "")),
  );
  console.log(`  ${bron.length} kleuren met een hex`);

  // Sleutel → alle kleuren die eronder vallen. Zowel op code als op naam, want
  // het kassaveld gebruikt ze door elkaar ("Ral 9001", "Leliewit").
  const index = new Map();
  for (const c of bron) {
    for (const sleutel of [c.code, c.name]) {
      const k = norm(sleutel);
      if (!k) continue;
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(c);
    }
  }

  const kaart = {};
  const dubbelzinnig = [];
  const onbekend = [];
  const teVaag = [];

  for (const waarde of [...waarden].sort((a, b) => a.localeCompare(b, "nl"))) {
    if (KAAL_KLEURWOORD.has(norm(waarde))) {
      teVaag.push(waarde);
      continue;
    }

    // Alleen een nummer waar "RAL" bij staat telt als RAL-nummer.
    //
    // Een kaal viercijferig getal uit de waarde vissen ging faliekant mis: het
    // kassaveld bevat óók fabrikantcodes, en die botsen met de RAL-reeks.
    // "1214 Berken" — een lichte houttint — kwam zo uit op ultramarijnblauw,
    // en "1216 Antraciet" op appelgroen. Een cijfer is pas een RAL-nummer als
    // er RAL bij staat.
    const ral = waarde.match(/\bral\s*(\d{4})\b/i);

    // Voor RAL gaat onze eigen tabel vóór. RAL is een norm met één vastgelegde
    // kleur per nummer; de kleurenbron bevat 'm meerdere keren omdat elke
    // waaierfabrikant zijn eigen benadering opgeeft — RAL 9010 staat er met
    // twee verschillende hexes in. Dat zou de hex-toets hieronder als
    // "dubbelzinnig" afwijzen, terwijl er juist geen twijfel is.
    if (ral) {
      const norm9 = RAL_TABEL.get(Number(ral[1]));
      if (norm9) {
        kaart[waarde] = { hex: norm9.hex.toLowerCase(), naam: norm9.naam, code: `RAL ${ral[1]}` };
        continue;
      }
    }

    const kandidaten = ral
      ? index.get(norm(`RAL ${ral[1]}`))
      : index.get(norm(waarde));

    if (!kandidaten?.length) {
      onbekend.push(waarde);
      continue;
    }

    const hexes = new Set(kandidaten.map((c) => c.hex.toLowerCase()));
    if (hexes.size > 1) {
      dubbelzinnig.push({ waarde, aantal: hexes.size, hexes: [...hexes].slice(0, 4) });
      continue;
    }

    const treffer = kandidaten[0];
    kaart[waarde] = {
      hex: treffer.hex.toLowerCase(),
      naam: String(treffer.name ?? "").trim() || waarde,
      code: String(treffer.code ?? "").trim(),
    };
  }

  writeFileSync(
    OUT,
    `${JSON.stringify({ opgehaald: new Date().toISOString(), kleuren: kaart }, null, 2)}\n`,
  );

  const zeker = Object.keys(kaart).length;
  console.log(`\n  ondubbelzinnig : ${zeker}`);
  console.log(`  kaal kleurwoord: ${teVaag.length}  (geen vlak — zegt niet wélke)`);
  console.log(`  meerdere hexes : ${dubbelzinnig.length}  (geen vlak — te vaag)`);
  console.log(`  onbekend       : ${onbekend.length}  (geen vlak — niet in de bron)`);
  // Werklijst voor de kassa. Hier zit de winst: niet in beter gokken, maar in
  // een kleurveld dat wél zegt wélke kleur het is. Gesorteerd op hoeveel
  // producten je met één correctie helpt.
  const teRepareren = [
    ...teVaag.map((w) => ({ w, reden: "kaal kleurwoord" })),
    ...dubbelzinnig.map((d) => ({ w: d.waarde, reden: `${d.aantal} mogelijke kleuren` })),
    ...onbekend.map((w) => ({ w, reden: "niet in de kleurenbron" })),
  ]
    .map((x) => ({ ...x, aantal: perWaarde.get(x.w) ?? 0 }))
    .sort((a, b) => b.aantal - a.aantal);

  const totaalZonder = teRepareren.reduce((n, x) => n + x.aantal, 0);
  console.log(`\nzonder vlak: ${totaalZonder} producten. Wat in de kassa aangepast moet worden:\n`);
  console.log(`   producten  kleurveld          waarom geen vlak`);
  for (const x of teRepareren.slice(0, 20)) {
    console.log(`   ${String(x.aantal).padStart(9)}  ${x.w.padEnd(18).slice(0, 18)} ${x.reden}`);
  }
  if (teRepareren.length > 20) console.log(`   … en nog ${teRepareren.length - 20} andere waarden`);
  console.log(`\n✓ → ${OUT}`);
}

main().catch((err) => {
  console.error("✗ Mislukt:", err.message ?? err);
  process.exit(1);
});
