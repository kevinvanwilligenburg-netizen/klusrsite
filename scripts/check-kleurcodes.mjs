// @ts-nocheck
/**
 * Bewaakt dat er geen kleur bestelbaar is die de mengmachine niet kent.
 *
 * Draait vóór elke build (prebuild) en laat de build vallen bij een fout.
 *
 * Aanleiding: op 6 augustus 2026 kwamen er twee bestellingen binnen met kleuren
 * uit collecties die alleen in deze repo bestonden — "Populair 2026",
 * "KLUSR Trendkleuren", "Pastels" en meer, met verzonnen codes als PP-26-03 en
 * KL-001 en alleen een hexwaarde. Mooie namen, geen mengrecept: de winkel kon
 * die bestellingen niet maken. 81 van de 159 kleuren in de kiezer waren zo.
 *
 * De regel is daarom simpel: **elke kleur draagt een code uit een waaier die de
 * machine kent.** Dat zijn er drie, en die staan hieronder met naam en toenaam.
 * Bewust geen patroon zoals /ral|ncs/ — daar matchte "Supralux" op de losse
 * letters r-a-l, en waaiers als "Sikkens ACC to RAL" zijn omzettabellen waarin
 * de naam een RAL-nummer is in plaats van een kleur.
 *
 * Wil je een nieuwe waaier toevoegen: controleer eerst bij de winkel of de
 * mengmachine die kent, zet 'm dan hier neer.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BESTAND = join(__dirname, "..", "src", "lib", "data", "colors.ts");

/** Waaier → hoe een geldige code eruitziet. */
const WAAIERS = {
  "NCS Kleuren": /^S \d{4}-([A-Z]|[A-Z]\d{2}[A-Z])$/,
  "RAL Design": /^\d{3} \d{2} \d{2}$/,
  "RAL kleuren": /^RAL \d{4}$/,
  "RAL Classic": /^RAL \d{4}$/,
};

const src = readFileSync(BESTAND, "utf8");
const regels = [
  ...src.matchAll(
    /name: "([^"]+)", code: "([^"]+)", hex: "([^"]+)"(?:, collection: "([^"]+)")?/g,
  ),
].map((m) => ({ naam: m[1], code: m[2], hex: m[3], waaier: m[4] }));

const fouten = [];
for (const r of regels) {
  // Zonder eigen waaier moet het een RAL-code zijn; die komt uit de
  // RAL Classic-collectie en die kent de machine.
  const patroon = r.waaier ? WAAIERS[r.waaier] : WAAIERS["RAL Classic"];
  if (!patroon) {
    fouten.push(`onbekende waaier "${r.waaier}" bij ${r.naam}`);
    continue;
  }
  if (!patroon.test(r.code)) {
    fouten.push(`code "${r.code}" (${r.naam}) past niet bij waaier "${r.waaier ?? "RAL Classic"}"`);
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(r.hex)) {
    fouten.push(`hex "${r.hex}" (${r.naam}) is geen geldige kleurwaarde`);
  }
}

if (fouten.length) {
  console.error(`\n✗ ${fouten.length} kleur(en) zijn niet mengbaar:\n`);
  for (const f of fouten) console.error(`   ${f}`);
  console.error(
    "\nElke kleur in de kiezer moet een code dragen uit een waaier die de\n" +
      "mengmachine kent. Zie de toelichting boven in dit script.\n",
  );
  process.exit(1);
}

console.log(`✓ ${regels.length} kleuren, allemaal met een mengbare code`);
