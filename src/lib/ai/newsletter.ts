import type { Product } from "@/types";
import { complete } from "./client";
import { CONTENT_SYSTEM_PROMPT } from "./content";

/**
 * AI-concept voor de promotionele KLUSR-nieuwsbrief.
 *
 * GOVERNANCE: net als bij de overige AI-content krijgt het model NOOIT prijzen,
 * voorraad of kortingen mee en vragen we er ook niet om — alleen product- en
 * merknamen voor inspiratie. De prijzen in de mail komen uitsluitend uit de
 * catalogus, niet uit de AI.
 *
 * Best-effort: zonder ANTHROPIC_API_KEY (of bij een fout) valt het terug op een
 * deterministische Nederlandse mock in exact hetzelfde formaat.
 */

export interface NewsletterDraft {
  subject: string;
  preheader: string;
  intro: string;
  source: "ai" | "mock";
}

/** Korte, prijsloze productlabels ("Merk Titel") voor in de prompt. */
function productLabels(products: Product[]): string[] {
  return products
    .map((p) => [p.brand?.trim(), p.title?.trim()].filter(Boolean).join(" ").trim())
    .filter(Boolean);
}

/** Parse "Onderwerp:/Preheader:/Intro:" — robuust, ook als labels ontbreken. */
function parseDraft(text: string): { subject: string; preheader: string; intro: string } {
  const grab = (label: string): string => {
    const re = new RegExp(`^\\s*${label}\\s*:\\s*(.*)$`, "im");
    const m = text.match(re);
    return m ? m[1].trim() : "";
  };

  const subject = grab("Onderwerp");
  const preheader = grab("Preheader");

  // Intro = alles na "Intro:" (kan meerdere regels/alinea's beslaan).
  let intro = "";
  const introMatch = text.match(/Intro\s*:\s*([\s\S]*)$/i);
  if (introMatch) {
    intro = introMatch[1].trim();
  }

  return { subject, preheader, intro };
}

const DEFAULTS = {
  subject: "Scherpe KLUSRPAS-deals voor je volgende klus",
  preheader: "Profiteer deze week van extra voordeel op topproducten — zolang de voorraad strekt.",
  intro:
    "Hoi klusser, we hebben weer een paar mooie deals voor je klaargezet. Pak je voordeel met de KLUSRPAS en bestel voor 09:00 — dan ligt het vanavond op de mat.\n\nKlaar voor je volgende project? Onze ex-schilders kozen de scherpste aanbiedingen van deze week voor je uit.",
};

/**
 * Genereer (of mock) een nieuwsbrief-concept op basis van de geselecteerde
 * producten. `opts.theme` stuurt de toon/aanleiding (bijv. "Black Friday").
 */
export async function generateNewsletterDraft(
  products: Product[],
  opts?: { theme?: string },
): Promise<NewsletterDraft> {
  const labels = productLabels(products).slice(0, 8);
  const theme = (opts?.theme || "").trim();

  const productLines = labels.length
    ? labels.map((l) => `- ${l}`).join("\n")
    : "- (gebruik een algemene voordeel-toon zonder specifieke producten)";

  const themeLine = theme ? `\nAanleiding/thema: ${theme}` : "";

  const prompt =
    `Schrijf een promotionele e-mail-nieuwsbrief voor de webshop KLUSR (verf & klusspullen, advies van ex-schilders).` +
    `${themeLine}\n\n` +
    `Uitgelichte producten (alleen ter inspiratie — NOEM GEEN prijzen, kortingen of percentages, die staan al in de mail):\n` +
    `${productLines}\n\n` +
    `Toon: enthousiast en voordeelgericht maar eerlijk, je-vorm, Nederlands. Geen overdreven uitroeptekens.\n\n` +
    `Lever EXACT dit formaat (en niets anders):\n` +
    `Onderwerp: <pakkende onderwerpregel, max 60 tekens>\n` +
    `Preheader: <korte preview-tekst, max 90 tekens>\n` +
    `Intro: <warme intro van 2-3 zinnen die de lezer naar de aanbiedingen leidt>`;

  // Deterministische mock in exact hetzelfde formaat.
  const topTwo = labels.slice(0, 2).join(" en ");
  const mockIntro = labels.length
    ? `Hoi klusser, deze week zetten we extra scherpe deals voor je klaar${topTwo ? ` — onder andere op ${topTwo}` : ""}. Pak je voordeel met de KLUSRPAS en bestel voor 09:00, dan ligt het vanavond op de mat.\n\nKlaar voor je volgende project? Onze ex-schilders kozen de mooiste aanbiedingen voor je uit.`
    : DEFAULTS.intro;
  const mock =
    `Onderwerp: ${theme ? `${theme}: scherpe KLUSR-deals` : DEFAULTS.subject}\n` +
    `Preheader: ${DEFAULTS.preheader}\n` +
    `Intro: ${mockIntro}`;

  const { text, source } = await complete({
    system: CONTENT_SYSTEM_PROMPT,
    prompt,
    maxTokens: 400,
    temperature: 0.8,
    mock,
  });

  const parsed = parseDraft(text);
  return {
    subject: parsed.subject || DEFAULTS.subject,
    preheader: parsed.preheader || DEFAULTS.preheader,
    intro: parsed.intro || DEFAULTS.intro,
    source,
  };
}
