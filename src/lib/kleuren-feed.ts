import { createHash } from "node:crypto";
import { products } from "@/lib/data";
import { onlineStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import { shippingForCountry } from "@/lib/shipping";
import SIKKENS from "@/lib/data/sikkens-kleuren.generated.json";
import type { Product } from "@/types";

/**
 * Shopping-feed met kleurvarianten — één regel per mengbaar product per kleur.
 *
 * Waarom naast de gewone feed: wie "sikkens monumentengroen" zoekt, zoekt een
 * kleur en niet een productlijn. De hoofdfeed heeft één regel per maat en dus
 * geen enkele kleurnaam erin; die zoekopdracht gaat nu naar een concurrent die
 * wél per kleur adverteert.
 *
 * **Een aparte feed, bewust.** De hoofdfeed doet 24.850 klikken per 28 dagen en
 * staat op 4.111 van de 4.119 producten goedgekeurd. Die zetten we niet op het
 * spel voor een proef: dit is een tweede bron die je los kunt toevoegen en net
 * zo makkelijk weer weghaalt.
 *
 * Drie keuzes die het verschil maken tussen bruikbaar en onwerkbaar:
 *
 * 1. **Alleen kleuren met een échte naam.** De Sikkens-waaiers bevatten 6.917
 *    kleuren, waarvan er 4.287 alleen een code hebben (F8.41.80, 4051). Daar
 *    wordt niet op gezocht, en ze zouden het budget opeten vóór de benoemde
 *    kleuren aan de beurt zijn. Blijft over: 907 unieke namen.
 *
 * 2. **Eén regel per product, niet per maat.** 91 maten × 907 kleuren is 82.537
 *    regels; per product is het 31.745. De maat kiest de klant op de pagina.
 *
 * 3. **De prijs van `variants[0]`, en géén `?v=` in de link.** Dat is precies
 *    de prijs die een crawler op de landingspagina ziet. De hoofdfeed linkt met
 *    `?v=` naar een specifieke maat, maar die parameter wordt pas door
 *    JavaScript verwerkt — Google leest de standaardvariant en meldt
 *    "niet-overeenkomende productprijs". Dat gebeurt daar nu bij 3 producten;
 *    hier zouden het er 31.745 worden.
 */

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");
const SAFETY_STOCK = Number(process.env.SAFETY_STOCK) || DEFAULT_SAFETY_STOCK;

interface Kleur {
  naam: string;
  code: string;
  hex: string;
  collectie: string;
}

function xml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clean(s: string): string {
  return s.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim();
}

/**
 * Uniek en stabiel id per product+kleur.
 *
 * De volledige hash, niet afgekapt: de VDM-webshop kapte 'm af en kreeg 52
 * dubbelen op 13.000 regels, doordat kleuren die alleen achteraan verschillen
 * (d5-05-45 en d5-05-75) op dezelfde prefix uitkwamen. Google gooit bij een
 * dubbel id béíde regels weg, dus dan verlies je ook de goede.
 */
function feedId(productId: string, kleur: Kleur): string {
  const h = createHash("sha1").update(`${productId}|${kleur.code}|${kleur.naam}`).digest("hex");
  return `kl-${h}`;
}

/** Merk vooraan zonder het te verdubbelen; de titels bevatten het merk al. */
function productNaam(p: Product): string {
  const merk = (p.brand ?? "").trim();
  const titel = (p.title ?? "").trim();
  if (!merk) return titel;
  const esc = merk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `${merk} ${titel.replace(new RegExp(`^${esc}\\s+`, "i"), "")}`.trim();
}

/**
 * In hoeveel bestanden de feed wordt opgeknipt.
 *
 * Moet: Vercel weigert een voorgerenderde pagina boven **19,07 MB**, en dat is
 * precies waar de eerste versie op klapte — 47,6 MB, waardoor niet alleen deze
 * feed maar de hele productie-deploy faalde (inclusief de wekelijkse
 * catalogus-import die er toevallig achteraan kwam).
 *
 * Alleen de beschrijving inkorten was niet genoeg: die kost 730 van de 1.573
 * bytes per regel, maar de XML-opmaak zelf kost de rest, dus zelfs met een
 * korte tekst bleef het rond de 30 MB. Vandaar drie delen van ~11 MB, met
 * ruimte voor groei. Merchant Center neemt gerust meerdere bronnen.
 */
export const AANTAL_DELEN = 3;

export function buildKleurenFeed(deel = 1): string {
  const alle = SIKKENS.kleuren as Kleur[];
  // Om de N: dan blijft elk deel een dwarsdoorsnede van het alfabet, zodat een
  // deel dat wegvalt niet toevallig alle groentinten meeneemt.
  const kleuren = alle.filter((_, i) => i % AANTAL_DELEN === (deel - 1) % AANTAL_DELEN);
  const mengbaar = products.filter(
    (p) => p.colorMatchable && /sikkens/i.test(p.brand) && (p.images ?? []).length > 0,
  );

  const out: string[] = [];
  for (const p of mengbaar) {
    const v = p.variants[0];
    if (!v || !(v.price > 0)) continue;

    const image = (p.images ?? []).find((u) => /^https?:\/\//.test(u));
    if (!image) continue;

    // Voorraad op productniveau: de klant kiest de maat op de pagina, dus
    // "leverbaar" betekent hier dat er íets van deze lijn te krijgen is.
    const voorraad = p.variants.some((x) => onlineStock(x.stockByStore, SAFETY_STOCK) > 0);
    const naam = productNaam(p);
    // Kort: de volledige productomschrijving is 730 bytes en zou 907 keer per
    // product herhaald worden. Voor een kleurvariant is de kleur zelf het
    // nieuws; de rest staat op de landingspagina.
    const kern = clean(p.description || naam).slice(0, 160);
    const verzend = shippingForCountry(v.price, "NL", {});
    const pasPrijs = v.kluspasPrice > 0 && v.kluspasPrice < v.price ? v.kluspasPrice : null;

    for (const k of kleuren) {
      const titel = clean(`${naam} — ${k.naam}`).slice(0, 150);
      const velden = [
        `<g:id>${xml(feedId(p.id, k))}</g:id>`,
        // Alle kleuren van één product horen bij elkaar; zo toont Google ze als
        // varianten in plaats van als losse producten.
        `<g:item_group_id>${xml(p.id)}</g:item_group_id>`,
        `<title>${xml(titel)}</title>`,
        `<description>${xml(`${naam} in de kleur ${k.naam}${k.code ? ` (${k.code})` : ""} uit ${k.collectie}. Wij mengen deze kleur op maat. ${kern}`)}</description>`,
        // Bewust zonder ?v=: zie de toelichting bovenaan.
        `<link>${xml(`${BASE}/product/${p.slug}?kleur=${encodeURIComponent(k.code || k.naam)}`)}</link>`,
        `<g:image_link>${xml(image)}</g:image_link>`,
        `<g:availability>${voorraad ? "in_stock" : "out_of_stock"}</g:availability>`,
        pasPrijs
          ? `<g:price>${v.price.toFixed(2)} EUR</g:price><g:sale_price>${pasPrijs.toFixed(2)} EUR</g:sale_price>`
          : `<g:price>${v.price.toFixed(2)} EUR</g:price>`,
        `<g:brand>${xml(p.brand)}</g:brand>`,
        // Een gemengde kleur heeft geen eigen EAN — dat is één pot met een
        // kleur erin, geen apart fabrieksartikel.
        `<g:identifier_exists>no</g:identifier_exists>`,
        `<g:condition>new</g:condition>`,
        `<g:color>${xml(k.naam)}</g:color>`,
        `<g:google_product_category>1361</g:google_product_category>`,
        `<g:shipping><g:country>NL</g:country><g:service>Standaard</g:service><g:price>${verzend.toFixed(2)} EUR</g:price></g:shipping>`,
      ];
      out.push(`<item>${velden.join("")}</item>`);
    }
  }
  return out.join("\n");
}

export function kleurenFeedResponse(deel = 1): Response {
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n` +
    `<title>KLUSR kleurenfeed (Sikkens) deel ${deel} van ${AANTAL_DELEN}</title>\n` +
    `<link>${BASE}</link>\n` +
    `<description>Mengbare Sikkens-verf, per kleur.</description>\n` +
    buildKleurenFeed(deel) +
    `\n</channel>\n</rss>\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
