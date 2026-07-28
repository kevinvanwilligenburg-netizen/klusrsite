import { NextResponse } from "next/server";
import { chat, type ChatMessage } from "@/lib/ai/client";
import { logEvent } from "@/lib/store/analytics";
import { appendTurn } from "@/lib/store/conversations";
import { getProduct, getProductsByCategory } from "@/lib/data/products";
import type { Product } from "@/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Je bent de KLUSR Klushulp: een ervaren, vriendelijke ex-schilder die klussers helpt bij een Nederlandse verfspeciaalzaak en lichte bouwmarkt (KLUSR).

Richtlijnen:
- Presenteer je als "de Klushulp" / de ex-schilders van KLUSR. Gebruik het woord "AI" niet.
- Antwoord altijd in het Nederlands, kort en concreet (max ~120 woorden), praktisch en behulpzaam.
- Geef productadvies passend bij verf, gereedschap, ijzerwaren, elektra, tuin, verlichting en vloeren.
- Adviseer waar logisch ook benodigdheden (roller, kwast, tape, primer, schuurpapier).
- Noem KLUSR-troeven waar relevant: advies van ex-schilders, op kleur gemengde verf, voor 09:00 besteld vanavond in huis, gratis verzending vanaf €50.
- Wees eerlijk over veiligheid (bijv. elektra: groep spanningsvrij maken, bij twijfel erkend installateur).
- Verzin geen exacte prijzen of voorraad; verwijs voor actuele prijs/voorraad naar de productpagina. KLUSR is volledig online (geen fysieke winkels); verwijs voor persoonlijk advies naar de klantenservice.
- Sluit je antwoord ALTIJD af met een aparte laatste regel: "[[SUGGESTIES]]" gevolgd door 2 à 3 korte vervolgvragen die de klant zélf zou kunnen stellen, gescheiden door " | ". Voorbeeld: [[SUGGESTIES]] Welk gereedschap heb ik nodig? | Hoeveel liter heb ik nodig? | Welke primer gebruik ik?`;

/** Haal de [[SUGGESTIES]]-regel uit het antwoord en geef ze los terug. */
function extractSuggestions(text: string): { reply: string; suggestions: string[] } {
  const m = text.match(/\[\[SUGGESTIES\]\]([\s\S]+)$/i);
  if (!m) return { reply: text.trim(), suggestions: [] };
  const suggestions = m[1]
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { reply: text.slice(0, m.index).trim(), suggestions };
}

const TOPIC_LINKS: { re: RegExp; href: string; label: string }[] = [
  { re: /stopcontact|elektra|schakelaar|spanning|\bgroep\b|bekabel|kabel/, href: "/categorie/elektra", label: "Bekijk elektra-producten" },
  { re: /verlichting|\blamp|\bled\b|spot|armatuur/, href: "/categorie/verlichting", label: "Bekijk verlichting" },
  { re: /vloer|laminaat|\bpvc\b|parket|ondervloer|gordijn|raamdecoratie/, href: "/categorie/vloeren-raam", label: "Bekijk vloeren & raam" },
  { re: /\btuin\b|terras|schutting|tuinhout|gazon|buitenhout/, href: "/categorie/tuin", label: "Bekijk tuin-producten" },
  { re: /schroef|\bplug|\bbout|beslag|scharnier|ijzerwaren|\bslot\b/, href: "/categorie/ijzerwaren", label: "Bekijk ijzerwaren" },
  { re: /rol(?:ler)?|kwast|\btape\b|schuur|gereedschap|\bboor|\bzaag|plamuurmes|verfbak/, href: "/categorie/gereedschap", label: "Bekijk het gereedschap" },
  { re: /muur|latex|plafond|\blak\b|kozijn|\bhout\b|beits|primer|grondverf|\bverf\b|sausen|saus\b/, href: "/categorie/verf", label: "Bekijk de aanbevolen verf" },
];

/** Leid een passende categorie-CTA af uit de vraag + het antwoord. */
function deriveProductLink(userMsg: string, reply: string): { productHref: string; productLabel: string } {
  const hay = `${userMsg} ${reply}`.toLowerCase();
  for (const l of TOPIC_LINKS) if (l.re.test(hay)) return { productHref: l.href, productLabel: l.label };
  return { productHref: "/categorie/verf", productLabel: "Bekijk ons assortiment" };
}

/** Het product van de huidige productpagina (uit `page`), of undefined. */
function productFromPage(page?: string): Product | undefined {
  if (!page) return undefined;
  const path = page.replace(/^\/(en|fr|de)(?=\/|$)/, "");
  const m = path.match(/^\/product\/([^/?#]+)/);
  return m ? getProduct(decodeURIComponent(m[1])) : undefined;
}

/** Contextregel zodat de Klushulp "dit product"-vragen op de juiste PDP begrijpt. */
function productContextLine(p: Product): string {
  return `De klant bekijkt NU deze productpagina: "${p.title}" van ${p.brand} (categorie: ${p.category}, vanaf €${p.kluspasPrice.toFixed(2)} met KLUSRPAS). Vragen met "dit product", "deze verf", "dit middel" en dergelijke gaan hierover — vraag dus NIET om een productnaam of foto, maar beantwoord de vraag meteen voor dít product.`;
}

/**
 * Kies 2-3 concrete producten om als suggestie terug te geven: eerst de categorie
 * uit de vraag (zelfde regels als de CTA-link), anders die van het bekeken
 * product. Binnen die categorie sorteren we op trefwoord-overlap met de vraag.
 */
function suggestProducts(userMsg: string, reply: string, current?: Product, limit = 3): Product[] {
  const hay = `${userMsg} ${reply}`.toLowerCase();
  let categorySlug: string | undefined;
  for (const l of TOPIC_LINKS) {
    if (l.re.test(hay)) {
      categorySlug = l.href.split("/").pop();
      break;
    }
  }
  if (!categorySlug) categorySlug = current?.category ?? "verf";

  const words = userMsg.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  return getProductsByCategory(categorySlug)
    .filter((p) => p.id !== current?.id)
    .map((p) => {
      const text = `${p.title} ${p.brand}`.toLowerCase();
      let score = 0;
      for (const w of words) if (text.includes(w)) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incoming: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const context: string | undefined = body.context;

    // Sanitise + clamp history length.
    const messages: ChatMessage[] = incoming
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
      .slice(-10);

    if (messages.length === 0) {
      return NextResponse.json({ error: "Geen bericht ontvangen" }, { status: 400 });
    }

    // Registreer de laatste klantvraag (analytics — best-effort).
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser?.content) {
      void logEvent("chat", { question: lastUser.content.slice(0, 300) }).catch(() => {});
    }

    // Productpagina-context: zit de klant op /product/<slug>, geef dat product mee
    // zodat "dit product"-vragen kloppen (i.p.v. om een naam/foto te vragen).
    const page = typeof body.page === "string" ? body.page : undefined;
    const currentProduct = productFromPage(page);
    const contextParts: string[] = [];
    if (currentProduct) contextParts.push(productContextLine(currentProduct));
    if (context) contextParts.push(context);
    const system = contextParts.length
      ? `${SYSTEM_PROMPT}\n\nContext: ${contextParts.join(" ")}`
      : SYSTEM_PROMPT;

    const { text, source } = await chat({ system, messages });

    const { reply, suggestions } = extractSuggestions(text);
    const { productHref, productLabel } = deriveProductLink(lastUser?.content ?? "", reply);

    // Concrete productsuggesties (echte artikelen) bij het antwoord — klikbaar in de chat.
    const products = suggestProducts(lastUser?.content ?? "", reply, currentProduct).map((p) => ({
      title: p.title,
      slug: p.slug,
      brand: p.brand,
      image: p.images?.[0],
      price: p.kluspasPrice,
    }));

    // Bewaar de beurt zodat de admin het gesprek kan teruglezen — best-effort en
    // volledig afgeschermd zodat opslag de chatrespons NOOIT kan breken.
    const conversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
    if (conversationId) {
      void appendTurn(conversationId, {
        userMessage: lastUser?.content ?? "",
        assistantReply: reply,
        page,
      }).catch(() => {});
    }

    return NextResponse.json({ reply, suggestions, productHref, productLabel, products, source });
  } catch (err) {
    console.error("[api/ai/chat]", err);
    return NextResponse.json(
      { error: "Er ging iets mis bij het beantwoorden van je vraag." },
      { status: 500 },
    );
  }
}
