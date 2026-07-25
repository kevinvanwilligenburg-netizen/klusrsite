import { products, categories } from "@/lib/data";
import type { Product, ProductVariant } from "@/types";
import { localePrefix, type Locale } from "@/lib/i18n/config";
import { onlineStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import enOverlay from "@/lib/data/i18n/products.en.json";
import frOverlay from "@/lib/data/i18n/products.fr.json";
import deOverlay from "@/lib/data/i18n/products.de.json";

/**
 * Google Merchant Center productfeed (RSS 2.0 met g:-namespace) — herbruikbaar
 * per taal/land. De Nederlandse feed (/google-merchant.xml) en de meertalige
 * varianten (/google-merchant.<land>.xml) gebruiken allemaal deze builder.
 *
 * Per taal:
 *  - titel/omschrijving/highlights komen uit de vertaal-overlay
 *    (src/lib/data/i18n/products.<locale>.json) — dezelfde bron als de webshop;
 *  - de product-`link` wijst naar de taalpagina (bv. /fr/product/...), zodat
 *    Google op de juiste, gelokaliseerde landingspagina uitkomt.
 *
 * Prijzen staan in EUR (NL/BE/FR/DE delen die munt). De verzendregel krijgt het
 * doelland mee met het standaardtarief (gratis vanaf €50, anders €4,95). Stel
 * échte cross-border tarieven en btw in Merchant Center in, en koppel een feed
 * alleen aan landen waar je daadwerkelijk naartoe verzendt.
 *
 * LET OP: de taalpagina's (/fr, /de, ...) renderen alleen wanneer de i18n-laag
 * aanstaat (NEXT_PUBLIC_I18N_ENABLED=true). Zonder die vlag wijzen de links naar
 * pagina's die nog niet bestaan — zet 'm aan vóór je een taalfeed indient.
 */

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

// Veiligheidsvoorraad voor de (statische) feed: onder dit aantal markeren we
// out_of_stock. Instelbaar via env SAFETY_STOCK; default = de app-default.
const SAFETY_STOCK = Number(process.env.SAFETY_STOCK) || DEFAULT_SAFETY_STOCK;

const JUNK_BRANDS = new Set(["", "onbekend", "merk", "overig", "overige"]);

// Verzendkosten (gespiegeld vanuit de winkelwagen): gratis vanaf €50, anders €4,95.
const shippingFor = (subtotal: number): number =>
  subtotal <= 0 || subtotal >= 50 ? 0 : 4.95;

// Categorie → officiële Google-producttaxonomie (verbetert matching/zichtbaarheid).
const GOOGLE_CATEGORY: Record<string, string> = {
  verf: "Hardware > Paint & Wall Covering > Paint",
  "afbouw-fijnbouw": "Hardware > Building Materials",
  ijzerwaren: "Hardware > Fasteners",
  elektra: "Hardware > Power & Electrical Supplies",
  gereedschap: "Hardware > Tools",
  tuin: "Home & Garden > Lawn & Garden",
  verlichting: "Home & Garden > Lighting",
  "vloeren-raam": "Hardware > Building Materials > Flooring & Carpet",
};

// slug → titel, voor het product_type-pad (bv. "Verf > Binnenlak").
const catTitle = new Map<string, string>();
const subTitle = new Map<string, string>();
for (const c of categories) {
  catTitle.set(c.slug, c.title);
  for (const s of c.subCategories ?? []) subTitle.set(`${c.slug}/${s.slug}`, s.title);
}

// Vertaal-overlays (productId → vertaalde velden). Dezelfde bestanden die de
// webshop gebruikt; hier expliciet per locale toegepast (static-safe, géén
// next/headers — anders breekt de statische generatie van de feed).
type Overlay = Record<string, { title?: string; description?: string; highlights?: string[] }>;
const OVERLAYS: Partial<Record<Locale, Overlay>> = {
  en: enOverlay as Overlay,
  fr: frOverlay as Overlay,
  de: deOverlay as Overlay,
};

/** Pas de vertaal-overlay van een expliciete locale toe; val terug op NL. */
function localizeFor(p: Product, locale: Locale): Product {
  const tr = OVERLAYS[locale]?.[p.id];
  if (!tr) return p;
  return {
    ...p,
    title: tr.title || p.title,
    description: tr.description || p.description,
    highlights: tr.highlights?.length ? tr.highlights : p.highlights,
  };
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
  return s
    .replace(/\p{Cc}+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function variantStock(v: ProductVariant): number {
  // Alleen Nijverdal-voorraad, gegate op de veiligheidsvoorraad.
  return onlineStock(v.stockByStore, SAFETY_STOCK);
}

function productType(p: Product): string {
  const parts: string[] = [];
  const ct = catTitle.get(p.category);
  if (ct) parts.push(ct);
  if (p.subCategory) parts.push(subTitle.get(`${p.category}/${p.subCategory}`) ?? p.subCategory);
  return parts.join(" > ");
}

/** Waarde van een specificatie (bv. "Glansgraad", "Kleur"). */
function specVal(p: Product, label: string): string {
  for (const g of p.specifications ?? []) {
    for (const it of g.items ?? []) {
      if ((it.label ?? "").trim().toLowerCase() === label.toLowerCase()) return (it.value ?? "").trim();
    }
  }
  return "";
}

/** EAN/GTIN uit het product of (terugval) uit de specificaties. */
function gtinFor(p: Product): string {
  if (p.gtin && /^\d{8,14}$/.test(p.gtin)) return p.gtin;
  for (const g of p.specifications ?? []) {
    for (const it of g.items ?? []) {
      const v = (it.value ?? "").trim();
      if (/^(ean|gtin|barcode)$/i.test(it.label) && /^\d{8,14}$/.test(v)) return v;
    }
  }
  return "";
}

function buildItems(locale: Locale, country: string): string {
  const prefix = localePrefix(locale);
  const out: string[] = [];
  for (const raw of products) {
    const p = locale === "nl" ? raw : localizeFor(raw, locale);
    const images = (p.images ?? []).filter((u) => /^https?:\/\//.test(u));
    const image = images[0];
    if (!image) continue; // Google vereist een afbeelding.
    const brand = p.brand && !JUNK_BRANDS.has(p.brand.toLowerCase()) ? p.brand : "";
    // Link naar de taalpagina (NL = geen prefix), zodat de landingspagina in
    // dezelfde taal als de feed is.
    const link = `${BASE}${prefix}/product/${p.slug}`;
    const description = clean(p.description || p.title).slice(0, 4900);
    const pType = productType(p);
    const googleCat = GOOGLE_CATEGORY[p.category];
    const gtin = gtinFor(p);
    const glans = specVal(p, "Glansgraad");
    const colorAttr = specVal(p, "Kleur");
    const multi = p.variants.length > 1;

    const extraImages = images
      .slice(1, 11)
      .map((u) => `<g:additional_image_link>${xml(u)}</g:additional_image_link>`)
      .join("");
    const highlights = (p.highlights ?? [])
      .slice(0, 6)
      .map((h) => `<g:product_highlight>${xml(clean(h).slice(0, 150))}</g:product_highlight>`)
      .join("");

    for (const v of p.variants) {
      // De feed-prijs = de KLUSRPAS-prijs (de pasprijs). Bewuste keuze: hiermee
      // adverteren we de scherpste prijs in Google Shopping, óók al betaalt een
      // niet-ingelogde bezoeker op de site nog de normale prijs. Dit kan een
      // "niet-overeenkomende productprijs"-afwijzing opleveren, omdat de landings-
      // pagina (en haar structured data) voor een gast de normale prijs toont —
      // dat risico is welbewust geaccepteerd. Terugval op de normale prijs alleen
      // als er geen pasprijs is. Géén adviesprijs als g:price.
      const feedPrice = v.kluspasPrice > 0 ? v.kluspasPrice : v.price;
      if (!(feedPrice > 0)) continue;
      const id = multi ? `${p.id}-${v.id}` : p.id;
      // Verrijkte titel: merk vooraan + glans/kleur/maat als die er nog niet in
      // staan (beter voor Shopping). Zonder dubbeling.
      const has = (s: string) => p.title.toLowerCase().includes(s.toLowerCase());
      const title = clean(
        [
          brand && !has(brand) ? brand : "",
          p.title,
          glans && !has(glans) ? glans : "",
          colorAttr && colorAttr.length <= 24 && !/mengen|gewenste/i.test(colorAttr) && !has(colorAttr)
            ? colorAttr
            : "",
          multi && v.label && v.label !== "Standaard" ? v.label : "",
        ]
          .filter(Boolean)
          .join(" "),
      ).slice(0, 150);
      const inStock = variantStock(v) > 0;
      const shipCost = shippingFor(feedPrice);

      const fields = [
        `<g:id>${xml(id)}</g:id>`,
        multi ? `<g:item_group_id>${xml(p.id)}</g:item_group_id>` : "",
        `<g:title>${xml(title)}</g:title>`,
        `<g:description>${xml(description)}</g:description>`,
        `<g:link>${xml(multi ? `${link}?v=${encodeURIComponent(v.id)}` : link)}</g:link>`,
        `<g:image_link>${xml(image)}</g:image_link>`,
        extraImages,
        `<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
        `<g:price>${feedPrice.toFixed(2)} EUR</g:price>`,
        brand ? `<g:brand>${xml(brand)}</g:brand>` : "",
        gtin ? `<g:gtin>${xml(gtin)}</g:gtin>` : "",
        // identifier_exists alleen "no" als er écht geen merk/GTIN is.
        !gtin && !brand ? `<g:identifier_exists>no</g:identifier_exists>` : "",
        `<g:condition>new</g:condition>`,
        googleCat ? `<g:google_product_category>${xml(googleCat)}</g:google_product_category>` : "",
        pType ? `<g:product_type>${xml(pType)}</g:product_type>` : "",
        multi && v.label && v.label !== "Standaard" ? `<g:size>${xml(v.label)}</g:size>` : "",
        highlights,
        `<g:shipping><g:country>${xml(country)}</g:country><g:service>Standaard</g:service><g:price>${shipCost.toFixed(2)} EUR</g:price></g:shipping>`,
      ];
      out.push(`<item>${fields.filter(Boolean).join("")}</item>`);
    }
  }
  return out.join("\n");
}

export interface MerchantFeedOptions {
  /** Taal van de feed (bepaalt vertaalde teksten + URL-prefix van de link). */
  locale: Locale;
  /** Doelland (ISO-2) voor de verzendregel, bv. "NL", "BE", "FR", "DE". */
  country: string;
}

/** Bouw de volledige RSS-feed-string voor één taal/land. */
export function buildMerchantFeed({ locale, country }: MerchantFeedOptions): string {
  const homeLink = `${BASE}${localePrefix(locale)}`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n` +
    `<channel>\n` +
    `<title>KLUSR productfeed (${xml(country.toUpperCase())})</title>\n` +
    `<link>${xml(homeLink)}</link>\n` +
    `<description>KLUSR — verf, ijzerwaren, gereedschap en meer. Google Merchant Center feed.</description>\n` +
    buildItems(locale, country) +
    `\n</channel>\n</rss>\n`
  );
}

/** Kant-en-klare HTTP-respons (XML + cache-headers) voor een feed-route. */
export function merchantFeedResponse(opts: MerchantFeedOptions): Response {
  return new Response(buildMerchantFeed(opts), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
