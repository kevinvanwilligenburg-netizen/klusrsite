import type { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { productNaam } from "@/lib/product-naam";

/**
 * Veelgestelde vragen die uit de catalogus komen.
 *
 * Het idee: iemand die "hoeveel m² met 1 liter Histor" zoekt, stelt een vraag
 * die letterlijk in onze specificaties staat. Door die vraag als vraag op de
 * pagina te zetten, vangen we die zoekopdracht op — zonder iets te verzinnen.
 *
 * **De regel: een vraag verschijnt alleen als de catalogus het antwoord
 * levert.** Geen algemene verfpraat als vulling, geen "meestal is dat…" waar we
 * het niet weten. Levert de specificatie niets, dan staat de vraag er niet.
 * Dat scheelt de bezoeker een antwoord waar hij niets aan heeft, en het scheelt
 * ons een FAQ-schema vol beweringen die we niet kunnen onderbouwen.
 */

export interface FaqItem {
  vraag: string;
  antwoord: string;
}

/** Waarde van een specificatie (hoofdletterongevoelig), leeg als hij ontbreekt. */
function spec(p: Product, label: string): string {
  for (const g of p.specifications ?? []) {
    for (const it of g.items ?? []) {
      if ((it.label ?? "").trim().toLowerCase() === label.toLowerCase()) {
        return String(it.value ?? "").trim();
      }
    }
  }
  return "";
}

export function productFaq(p: Product): FaqItem[] {
  const uit: FaqItem[] = [];
  const naam = productNaam(p);

  const rendement = spec(p, "Dekkend vermogen");
  if (rendement) {
    uit.push({
      vraag: `Hoeveel m² dek ik met ${naam}?`,
      antwoord: `${rendement}. Hoeveel je daadwerkelijk haalt hangt af van de ondergrond: een gladde, eerder geverfde muur vraagt minder verf dan kaal of zuigend materiaal. Reken bij een kleurwissel altijd op twee lagen.`,
    });
  }

  const droog = spec(p, "Droogtijd");
  if (droog) {
    uit.push({
      vraag: `Hoe lang moet ${naam} drogen?`,
      antwoord: `${droog} — dat is de tijd tot stofdroog. Wachten met de tweede laag doe je langer; houd de aanwijzing op het blik aan. Bij lage temperatuur en hoge luchtvochtigheid duurt het altijd langer dan opgegeven.`,
    });
  }

  const ondergrond = spec(p, "Geschikt voor ondergrond");
  if (ondergrond) {
    uit.push({
      vraag: `Op welke ondergrond kan ik ${naam} gebruiken?`,
      antwoord: `${ondergrond}. Zorg dat de ondergrond schoon, droog en vetvrij is. Op een glanzende laag hecht geen verf: even schuren tot de glans eraf is, dan pakt hij wel.`,
    });
  }

  const binnenBuiten = spec(p, "Geschikt voor");
  if (binnenBuiten) {
    uit.push({
      vraag: `Kan ik ${naam} binnen én buiten gebruiken?`,
      antwoord: `Volgens de fabrikant: ${binnenBuiten.toLowerCase()}. Buitenverf binnen gebruiken kan meestal wel maar is zelden nodig; binnenverf buiten gebruiken gaat wél mis — die is niet gemaakt voor vorst en uv.`,
    });
  }

  const verwerking = spec(p, "Verwerking");
  const verdunnen = spec(p, "Verdunnen / reinigen");
  if (verwerking) {
    uit.push({
      vraag: `Hoe breng ik ${naam} aan?`,
      antwoord:
        `${verwerking}.` +
        (verdunnen ? ` Verdunnen en gereedschap schoonmaken: ${verdunnen.toLowerCase()}.` : ""),
    });
  }

  // Maten: alleen als er écht meerdere zijn.
  if (p.variants.length > 1) {
    const maten = p.variants.map((v) => v.label).filter(Boolean);
    const goedkoopste = Math.min(...p.variants.map((v) => v.price).filter((x) => x > 0));
    uit.push({
      vraag: `In welke maten is ${naam} verkrijgbaar?`,
      antwoord: `In ${maten.length} maten: ${maten.join(", ")}. De kleinste begint bij ${formatPrice(goedkoopste)}.`,
    });
  }

  // De kleur is bij mengverf het belangrijkste dat mensen willen weten.
  if (p.colorMatchable) {
    uit.push({
      vraag: `Kan ik ${naam} in elke kleur krijgen?`,
      antwoord: `Ja. Wij mengen deze verf op maat in elke RAL-kleur en in de kleuren van de grote waaiers. Kies je kleur op de productpagina; wij mengen 'm pas als je bestelt, dus hij is altijd vers.`,
    });
  }

  return uit;
}
