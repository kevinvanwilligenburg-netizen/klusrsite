import type { Product } from "@/types";
import { complete } from "./client";

/**
 * Gedeelde AI-content-generatie voor KLUSR-producten.
 *
 * Hier leeft de prompt-bouw + de Anthropic-aanroep per (product, type). Zowel de
 * interactieve admin-route (`/api/ai/generate-content`) als de achtergrond-worker
 * (`/api/cron/generate-content`) gebruiken dezelfde logica, zodat de teksten
 * consistent zijn.
 *
 * GOVERNANCE: AI mag ALLEEN content suggereren (beschrijving, specs, FAQ, SEO).
 * Gevoelige velden zoals prijs, voorraad en betaalinformatie worden hier nooit
 * gegenereerd of aangepast — de prompts vragen er expliciet niet om.
 *
 * Best-effort: valt terug op een deterministische mock-tekst wanneer AI niet is
 * geconfigureerd (geen ANTHROPIC_API_KEY) of de call faalt.
 */

export type ContentType = "description" | "specifications" | "faqs" | "seo";

export const VALID_CONTENT_TYPES: ContentType[] = [
  "description",
  "specifications",
  "faqs",
  "seo",
];

export const CONTENT_SYSTEM_PROMPT = `Je bent een ervaren Nederlandstalige webshop-copywriter voor KLUSR, een verfspeciaalzaak en lichte bouwmarkt met advies van ex-schilders. Schrijf in helder, wervend maar eerlijk Nederlands (je-vorm). Wees concreet en praktisch, gericht op doe-het-zelvers en klussers. Verzin GEEN prijzen, voorraad, kortingen of betaalinformatie — die velden worden nooit door AI ingevuld. Verzin geen exacte technische claims die je niet kunt onderbouwen; blijf bij plausibele, gangbare eigenschappen voor dit type product.`;

/** Losse contextvelden waaruit een prompt wordt opgebouwd. */
export interface ContentContext {
  title: string;
  brand: string;
  category: string;
  highlights?: string[];
}

/** Bouw de contextvelden op uit een product (of losse velden). */
export function toContentContext(
  source: Pick<Product, "title" | "brand" | "category" | "highlights"> | ContentContext,
): ContentContext {
  return {
    title: (source.title ?? "dit product").trim(),
    brand: (source.brand ?? "").trim(),
    category: (source.category ?? "").trim(),
    highlights: source.highlights,
  };
}

interface PromptCtx {
  productLabel: string;
  title: string;
  brand: string;
  context: string;
}

/** Stel de productcontext-regels en het label samen voor de prompts. */
function buildPromptCtx(ctx: ContentContext): PromptCtx {
  const title = ctx.title || "dit product";
  const brand = ctx.brand;
  const category = ctx.category;
  const productLabel = [brand, title].filter(Boolean).join(" ");
  const context = [
    `Productnaam: ${title}`,
    brand ? `Merk: ${brand}` : null,
    category ? `Categorie: ${category}` : null,
    ctx.highlights?.length ? `Bestaande pluspunten: ${ctx.highlights.join("; ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return { productLabel, title, brand, context };
}

/**
 * Bouw de prompt (+ deterministische mock) voor één content-type. Wordt door de
 * admin-route hergebruikt zodat het mock-gedrag identiek blijft.
 */
export function buildContentPrompt(
  type: ContentType,
  ctx: ContentContext,
): { system: string; prompt: string; mock: string } {
  const { productLabel, title, brand, context } = buildPromptCtx(ctx);
  const label = productLabel || title;

  switch (type) {
    case "description":
      return {
        system: CONTENT_SYSTEM_PROMPT,
        prompt: `${context}\n\nSchrijf een wervende productbeschrijving voor de webshop van 2 korte alinea's (samen 60-110 woorden) voor "${label}". Benoem waarvoor het product geschikt is, de belangrijkste voordelen en een praktische verwerkingstip. Geen koppen, geen opsommingstekens, geen prijzen.`,
        mock: `${label} is een betrouwbare keuze voor klussers die een professioneel resultaat willen. Het product is eenvoudig te verwerken, gaat lang mee en levert een strak, duurzaam eindresultaat — precies wat je van KLUSR mag verwachten.\n\nDankzij de fijne verwerking werk je snel en netjes, ook als je minder ervaring hebt. Twijfel je over de aanpak of het juiste gereedschap? Onze ex-schilders helpen je graag via de klushulp of klantenservice.`,
      };

    case "specifications":
      return {
        system: CONTENT_SYSTEM_PROMPT,
        prompt: `${context}\n\nGenereer een overzichtelijke lijst met plausibele technische specificaties voor "${label}". Geef 6-9 regels in het formaat "Label: Waarde" (elk op een nieuwe regel). Denk aan eigenschappen als toepassing, ondergrond, glansgraad of materiaal, rendement/verbruik, droogtijd, verdunnen, gereedschap en inhoud-eenheid. Geen prijzen of voorraad.`,
        mock: `Toepassing: Binnen en buiten, voor de geschikte ondergrond\nOndergrond: Schoon, droog en stofvrij\nVerwerkingstemperatuur: 10 - 25 °C\nRendement: Circa 8 - 10 m² per liter per laag\nDroogtijd stofdroog: 30 - 60 minuten\nOverschilderbaar: Na 4 - 6 uur\nVerdunnen: Met water, indien nodig max. 5%\nGereedschap: Roller, kwast of spuit\nReiniging gereedschap: Direct met water`,
      };

    case "faqs":
      return {
        system: CONTENT_SYSTEM_PROMPT,
        prompt: `${context}\n\nSchrijf 3 tot 4 veelgestelde vragen met antwoord voor "${label}". Formatteer elke vraag op een regel beginnend met "V:" en het antwoord op de volgende regel beginnend met "A:". Houd antwoorden kort (1-3 zinnen), praktisch en eerlijk. Geen prijzen, voorraad of betaalinformatie.`,
        mock: `V: Hoeveel lagen heb ik nodig?\nA: Op een egale, voorbehandelde ondergrond zijn meestal twee lagen voldoende. Bij een sterke kleurovergang of poreuze ondergrond kan een extra laag nodig zijn.\n\nV: Hoe bereid ik de ondergrond voor?\nA: Zorg dat de ondergrond schoon, droog, vet- en stofvrij is. Schuur glanzende delen licht op en gebruik bij twijfel een geschikte primer.\n\nV: Welk gereedschap kan ik het beste gebruiken?\nA: Voor grote vlakken werk je het snelst met een roller; voor randen en hoeken gebruik je een kwast. Reinig je gereedschap direct na gebruik.\n\nV: Kan ik het product binnen gebruiken?\nA: Ja, mits je voor voldoende ventilatie zorgt. Houd ramen open tijdens en na het aanbrengen tot de geur volledig is verdwenen.`,
      };

    case "seo":
    default:
      return {
        system: CONTENT_SYSTEM_PROMPT,
        prompt: `${context}\n\nGenereer SEO-content voor de productpagina van "${label}". Lever exact dit formaat:\nMeta titel: <max 60 tekens, met merk indien beschikbaar>\nMeta beschrijving: <140-155 tekens, wervend, met een reden om bij KLUSR te kopen>\nSEO-tekst: <1 alinea van 40-70 woorden met relevante zoekwoorden, natuurlijk geschreven>\nGeen prijzen of voorraadinformatie.`,
        mock: `Meta titel: ${truncate(`${label} kopen`, 57)} | KLUSR\nMeta beschrijving: ${label} eenvoudig online kopen bij KLUSR. Professionele kwaliteit, advies van ex-schilders en voor 10:00 besteld is vanavond in huis.\nSEO-tekst: Op zoek naar ${label}? Bij KLUSR vind je een ruim assortiment${brand ? ` van ${brand}` : ""} voor een professioneel klusresultaat. Profiteer van deskundig advies van ex-schilders, scherpe KLUSRPAS-voordelen en snelle levering. Bestel vandaag en klus als een pro.`,
      };
  }
}

/**
 * Genereer (of mock) de content voor één product en type. Geeft alleen de tekst
 * terug; de aanroeper bepaalt zelf of/waar die wordt opgeslagen.
 */
export async function generateProductContent(
  product: Pick<Product, "title" | "brand" | "category" | "highlights">,
  type: ContentType,
): Promise<{ text: string; source: "ai" | "mock" }> {
  const ctx = toContentContext(product);
  const { system, prompt, mock } = buildContentPrompt(type, ctx);
  return complete({
    system,
    prompt,
    maxTokens: 900,
    temperature: 0.7,
    mock,
  });
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}
