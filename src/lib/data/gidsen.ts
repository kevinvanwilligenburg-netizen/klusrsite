import { products } from "@/lib/data/products";
import { onlineStock, bestVariantStock } from "@/lib/stock";
import type { Product } from "@/types";

/**
 * Koopgidsen ("beste muurverf", "beste buitenverf").
 *
 * Waarom: op dat soort zoektermen ranken vergelijkingssites en concurrenten,
 * niet productpagina's. Een gids die eerlijk uitlegt wélke verf waarvoor deugt,
 * vangt die zoekopdracht op en stuurt door naar het assortiment.
 *
 * De ranglijst komt **live uit de eigen catalogus** en wordt niet met de hand
 * bijgehouden. Dat is geen luiheid maar de kern: een handmatige top 10 klopt na
 * twee importrondes niet meer, en dan staat er een aanbeveling voor een product
 * dat niet meer leverbaar is. Nu schuift hij vanzelf mee.
 *
 * De score gebruikt alleen signalen die we écht hebben — waardering, aantal
 * beoordelingen en leverbaarheid. Geen verzonnen testresultaten of
 * "redactiekeuze": wij hebben deze verf niet getest, en dat gaan we ook niet
 * suggereren.
 */

export interface Gids {
  slug: string;
  titel: string;
  h1: string;
  intro: string;
  /** Waar de gids over gaat, voor de metadata. */
  omschrijving: string;
  /** Past dit product in deze gids? */
  past: (p: Product) => boolean;
  /** Uitleg bovenaan: waar moet je op letten. */
  waaropLetten: { kop: string; tekst: string }[];
  vragen: { v: string; a: string }[];
}

const titel = (p: Product) => `${p.brand} ${p.title}`.toLowerCase();

/** Waarde van een specificatie, bv. "Geschikt voor" → "Binnen en buiten". */
function spec(p: Product, label: string): string {
  for (const g of p.specifications ?? []) {
    for (const it of g.items ?? []) {
      if ((it.label ?? "").trim().toLowerCase() === label) return String(it.value ?? "");
    }
  }
  return "";
}

/**
 * Voorbereidingsproducten en gereedschap horen niet in een verfgids.
 *
 * Dit is geen overdreven voorzichtigheid: de eerste versie filterde op de
 * losse tekst "muur", en die zit óók in **pla·muur**mes. De top 10 van "beste
 * muurverf" begon daardoor met drie plamuurmessen, een verfroller en een rol
 * behang. Woordgrenzen dus, plus een expliciete uitsluiting.
 */
const VOORBEREIDING = /\b(voorstrijk|primer|grondverf|grondlak|plamuur|vulmiddel|reiniger)\b/;
const GEREEDSCHAP =
  /\b(roller|kwast|kwasten|mes|tape|afplak|emmer|bak|spuit|verlengstok|schuur)\b/;

const bruikbaar = (p: Product) =>
  p.category === "verf" && !VOORBEREIDING.test(titel(p)) && !GEREEDSCHAP.test(titel(p));

export const GIDSEN: Gids[] = [
  {
    slug: "beste-muurverf",
    titel: "Beste muurverf kopen — waar let je op?",
    h1: "De beste muurverf voor binnen",
    intro:
      "Muurverf kiezen gaat om drie dingen: dekking, afwasbaarheid en hoe strak je het opgezet krijgt. Hieronder leggen we uit waar je op let, en daaronder staat welke muurverf bij ons het best beoordeeld wordt door klanten die 'm daadwerkelijk hebben gekocht.",
    omschrijving:
      "Welke muurverf past bij welke ruimte? Uitleg over dekking, glansgraad en afwasbaarheid, plus de best beoordeelde muurverf uit ons assortiment — live uit de voorraad, dus altijd leverbaar.",
    past: (p) =>
      bruikbaar(p) &&
      /\b(muurverf|latexverf|latex|wandverf|muur\/plafond|plafondverf)\b/.test(titel(p)) &&
      !/\b(buiten|gevel)\b/.test(titel(p)),
    waaropLetten: [
      {
        kop: "Dekking telt zwaarder dan de literprijs",
        tekst:
          "Een goedkope verf die drie lagen nodig heeft is duurder dan een dure die er twee vraagt — en kost je een extra dag. Kijk naar het rendement (m² per liter) en niet alleen naar de prijs per blik.",
      },
      {
        kop: "Glansgraad bepaalt of je vlekken ziet",
        tekst:
          "Mat verbergt oneffenheden in de muur maar is minder goed schoon te maken. Zijdeglans is afwasbaar en dus logisch in een keuken, hal of kinderkamer, maar laat elke bobbel zien. In een woonkamer met een strakke muur is zijdemat vaak de tussenweg.",
      },
      {
        kop: "Kleur kies je los van de verf",
        tekst:
          "Wij mengen elke kleur op maat, dus je zit niet vast aan een standaardrijtje. Kies eerst de verf die bij de ruimte past en daarna de kleur.",
      },
    ],
    vragen: [
      {
        v: "Hoeveel muurverf heb ik nodig?",
        a: "Reken met het rendement dat op het blik staat, meestal 8 tot 12 m² per liter per laag. Een gemiddelde kamerwand van 10 m² kost dus ruwweg 1 tot 1,5 liter per laag, en je rekent bijna altijd op twee lagen.",
      },
      {
        v: "Kan ik muurverf op behang gebruiken?",
        a: "Op glasweefsel- en renovlies-behang kan dat prima; dat is er zelfs voor gemaakt. Op vinyl of gestructureerd behang is het risico dat de lijm loslaat of dat de structuur doorslaat.",
      },
      {
        v: "Moet ik voorstrijken?",
        a: "Op nieuw stucwerk, gips of een sterk zuigende ondergrond wel — anders trekt de verf ongelijk in en krijg je vlekken. Op een eerder geverfde, gladde muur in goede staat kun je meestal direct verven.",
      },
    ],
  },
  {
    slug: "beste-buitenverf",
    titel: "Beste buitenverf kopen — waar let je op?",
    h1: "De beste buitenverf voor kozijnen en gevel",
    intro:
      "Buitenverf krijgt regen, vorst en uv te verduren. Dat maakt de keuze anders dan binnen: hechting en levensduur wegen zwaarder dan gemak. Hieronder waar je op let, en daaronder de best beoordeelde buitenverf uit ons assortiment.",
    omschrijving:
      "Welke buitenverf houdt het langst? Uitleg over ondergrond, grondverf en het juiste weer om te schilderen, plus de best beoordeelde buitenverf uit ons assortiment — live uit de voorraad.",
    // De specificatie "Geschikt voor" is hier het betrouwbare signaal (285
    // producten hebben 'm, met waarden als "Buiten" of "Binnen en buiten").
    // Buitenverf heet namelijk vaak naar de productlijn — Rambo Pantserbeits,
    // Histor Exterior — zonder het woord "buiten" in de titel. Alleen op de
    // titel filteren leverde 5 kandidaten; mét de specificatie 67.
    past: (p) =>
      bruikbaar(p) &&
      (/buiten/i.test(spec(p, "geschikt voor")) || /\b(buiten|gevel|kozijn)\b/.test(titel(p))),
    waaropLetten: [
      {
        kop: "De ondergrond bepaalt het systeem",
        tekst:
          "Hout, metaal en steen vragen elk een andere opbouw. Op kaal hout hoort eerst een grondverf; op metaal een roestwerende primer. Sla je die stap over, dan bladdert de mooiste lak er binnen twee jaar af.",
      },
      {
        kop: "Watergedragen of terpentine",
        tekst:
          "Watergedragen verf vergeelt niet en droogt sneller, wat op een dag met wisselend weer scheelt. Terpentinegedragen (alkyd) vloeit strakker uit en is op zwaar belast houtwerk nog altijd sterk. Beide gaan lang mee mits je de ondergrond goed voorbereidt.",
      },
      {
        kop: "Het weer is geen detail",
        tekst:
          "Schilder niet onder de 8 graden en niet in de volle zon. Te koud en de verf hecht niet; te warm en hij droogt sneller dan je kunt uitstrijken. Een bewolkte dag van 15 graden is ideaal.",
      },
    ],
    vragen: [
      {
        v: "Hoe lang gaat buitenverf mee?",
        a: "Op goed voorbereid houtwerk aan de noordkant haal je vaak zes tot acht jaar. Op een zuidgevel in de volle zon is vier tot vijf jaar realistischer — uv is de grootste boosdoener, niet de regen.",
      },
      {
        v: "Moet ik oude verf eerst verwijderen?",
        a: "Alleen waar hij loslaat of bladdert. Zit de oude laag vast en is hij niet glimmend, dan volstaat schuren zodat de nieuwe laag houvast heeft. Volledig afbranden is zelden nodig.",
      },
      {
        v: "Kan ik buitenverf ook binnen gebruiken?",
        a: "Technisch wel, maar het is zelden slim: buitenverf is elastischer en ruikt sterker, en die eigenschappen heb je binnen niet nodig. Andersom — binnenverf buiten — gaat wél mis.",
      },
    ],
  },
];

export function getGids(slug: string): Gids | undefined {
  return GIDSEN.find((g) => g.slug === slug);
}

/**
 * De ranglijst voor een gids.
 *
 * Alleen leverbare producten, gesorteerd op waardering en daarna op het aantal
 * beoordelingen — een 5,0 uit één beoordeling zegt minder dan een 4,6 uit
 * honderd. Producten zonder beoordelingen komen achteraan in plaats van te
 * verdwijnen, zodat de lijst ook vol staat als er weinig reviews zijn.
 */
export function topProducten(g: Gids, safetyStock: number, aantal = 10): Product[] {
  return products
    .filter(g.past)
    .filter((p) => onlineStock(bestVariantStock(p), safetyStock) > 0)
    .sort((a, b) => {
      const scoreA = a.reviewCount > 0 ? a.rating : 0;
      const scoreB = b.reviewCount > 0 ? b.rating : 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return a.price - b.price;
    })
    .slice(0, aantal);
}
