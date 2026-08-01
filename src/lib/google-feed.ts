import { products, categories } from "@/lib/data";
import GEDEELDE_TAXONOMIE from "@/lib/data/google-categories.generated.json";
import type { Product, ProductVariant } from "@/types";
import { localePrefix, type Locale } from "@/lib/i18n/config";
import { onlineStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import { shippingForCountry } from "@/lib/shipping";
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
 * tarief van het doelland uit lib/shipping.ts — dezelfde tabel als het
 * afrekenen. Stel de btw per land in Merchant Center in, en koppel een feed
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

// Verzendkosten: rechtstreeks uit lib/shipping.ts, dezelfde functie als de
// winkelwagen. Stond hier eerder als eigen kopie met een vaste €4,95 en drempel
// €50 — die liep achter (de drempel is €59) én gaf élk land het NL-tarief,
// terwijl de Duitse en Franse feed duurder zijn. Merchant Center rekent je af op
// verzendkosten die lager zijn dan bij het afrekenen.

/**
 * Categorie → officiële Google-producttaxonomie. Laat je dit leeg, dan raadt
 * Merchant Center zelf — en bij een verfzaak gaat dat mis (schuurpapier belandt
 * onder verf).
 *
 * We sturen het **nummer**, niet het pad. Google accepteert allebei, maar een
 * pad is een letterlijke tekst die moet matchen, en dat ging hier drie keer mis:
 * "Hardware > Paint & Wall Covering > Paint", "… > Wallpaper" en
 * "Hardware > Fasteners" bestaan geen van drieën in de taxonomie. Merchant
 * Center negeert zo'n waarde stilzwijgend en gaat alsnog zelf raden — precies
 * wat deze tabel moest voorkomen, en dan ook nog voor verf, onze grootste
 * categorie. Een nummer is niet verkeerd te spellen.
 *
 * `scripts/sync-google-categories.mjs` toetst elk nummer aan het officiële
 * taxonomiebestand van Google en klapt om als er één niet klopt. Het pad staat
 * er alleen bij zodat deze tabel te lezen is.
 */
const GOOGLE_CATEGORY: Record<string, string> = {
  // 1361 = Hardware > Building Consumables > Painting Consumables > Paint
  verf: "1361",
  // 115 = Hardware > Building Materials
  "afbouw-fijnbouw": "115",
  // Bewust de overkoepelende categorie: 428 van de 464 artikelen zijn
  // bevestigingsmateriaal, maar daar zitten staalkabel en ketting tussen
  // (Chain, Wire & Rope), dus "Hardware Fasteners" zou een deel misplaatsen.
  // 2878 = Hardware > Hardware Accessories
  ijzerwaren: "2878",
  // 127 = Hardware > Power & Electrical Supplies
  elektra: "127",
  // 1167 = Hardware > Tools
  gereedschap: "1167",
  // 689 = Home & Garden > Lawn & Garden
  tuin: "689",
  // Niet verfijnd naar Light Bulbs: in "lichtbronnen-en-zaklampen" zitten ook
  // zaklampen, en die horen bij Google onder Tools.
  // 594 = Home & Garden > Lighting
  verlichting: "594",
  // 2826 = Hardware > Building Materials > Flooring & Carpet
  "vloeren-raam": "2826",
  // 2334 = Home & Garden > Decor > Wallpaper
  behang: "2334",
  // 623 = Home & Garden > Household Supplies > Household Cleaning Supplies
  reiniging: "623",
};

/**
 * Google-categorie (nummer) voor een KLUSR-categorie.
 *
 * Onze eigen tabel wint; de gedeelde taxonomie van het dashboard
 * (`scripts/sync-google-categories.mjs`) vult alleen categorieën aan die wij
 * nog niet kennen — een vangnet voor hoofdgroepen die later bijkomen.
 *
 * Het syncscript laat alleen regels door die het aan Google's officiële
 * taxonomie heeft kunnen toetsen, en zet daar het gecontroleerde nummer bij.
 * Regels zonder zo'n nummer slaan we hier over: liever geen categorie dan een
 * verkeerde, want Merchant Center gooit een onbekende waarde toch weg.
 *
 * Het bestand staat lokaal en wordt meegecommit, zodat de feed blijft werken
 * als het dashboard onbereikbaar is.
 */
function googleCategoryFor(slug: string): string | undefined {
  const eigen = GOOGLE_CATEGORY[slug];
  if (eigen) return eigen;
  for (const regel of GEDEELDE_TAXONOMIE.regels ?? []) {
    if (!regel.id) continue;
    try {
      if (new RegExp(regel.patroon, "i").test(slug)) return regel.id;
    } catch {
      /* onbruikbaar patroon overslaan */
    }
  }
  return undefined;
}

/**
 * KLUSRPAS-prijs voor Google, als **loyaliteitsprijs**.
 *
 * De pasprijs is een ingelogd voordeel: een gast ziet 'm wel staan, maar
 * betaalt bij het afrekenen de normale prijs. Daarom mag hij niet als
 * `sale_price` de feed in — dan adverteert Google een bedrag dat een gast op de
 * landingspagina niet krijgt, en dat levert "niet-overeenkomende productprijs"
 * op. Precies die fout is eerder vandaag verholpen.
 *
 * `loyalty_program` is het veld dat Google hiervoor heeft: `price` blijft de
 * gewone prijs (dus de paginacontrole blijft groen), en de pasprijs verschijnt
 * ernaast mét een ledenlabel. Merchant Center suggereert het zelf onder
 * "Show your loyalty program benefits".
 *
 * ⚠️ Werkt alleen als het programma in Merchant Center is aangemaakt en
 * `program_label` + `tier_label` exact overeenkomen met wat daar staat
 * (Instellingen → Loyaliteitsprogramma). Wijken ze af, dan negeert Google het
 * blok stilzwijgend — dezelfde stille faalwijze als bij de categorieën. Beide
 * labels zijn daarom instelbaar via env, zodat ze aan te passen zijn zonder
 * deploy.
 */
const LOYALTY_PROGRAM = (process.env.GOOGLE_LOYALTY_PROGRAM || "KLUSRPAS").trim();
const LOYALTY_TIER = (process.env.GOOGLE_LOYALTY_TIER || "KLUSRPAS").trim();

function loyaltyBlok(normaal: number, pasPrijs: number | undefined): string {
  if (!LOYALTY_PROGRAM || !pasPrijs || !(pasPrijs > 0)) return "";
  // Geen voordeel = geen ledenprijs tonen; een "korting" van € 0 is misleidend.
  if (pasPrijs >= normaal) return "";
  return (
    `<g:loyalty_program>` +
    `<g:program_label>${xml(LOYALTY_PROGRAM)}</g:program_label>` +
    `<g:tier_label>${xml(LOYALTY_TIER)}</g:tier_label>` +
    `<g:price>${pasPrijs.toFixed(2)} EUR</g:price>` +
    `</g:loyalty_program>`
  );
}

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
    const googleCat = googleCategoryFor(p.category);
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
      // De feed-prijs is wat een gewone bezoeker betaalt — dus de normale prijs,
      // niet de KLUSRPAS-prijs. Die pasprijs stond hier eerder bewust in om de
      // scherpste prijs te adverteren, maar Google verwacht dat iedereen de
      // getoonde prijs krijgt: een ledenprijs levert "niet-overeenkomende
      // productprijs"-afwijzingen op, omdat de landingspagina een gast de
      // normale prijs toont.
      //
      // Is er een échte actie (adviesprijs hoger dan wat je nu betaalt), dan
      // hoort dat in het price/sale_price-paar: price = van-prijs,
      // sale_price = wat het nu kost.
      const feedPrice = v.price > 0 ? v.price : v.kluspasPrice;
      if (!(feedPrice > 0)) continue;
      const vanPrijs =
        v.compareAtPrice != null && v.compareAtPrice > feedPrice ? v.compareAtPrice : null;
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
      const shipCost = shippingForCountry(feedPrice, country.toUpperCase());

      const fields = [
        `<g:id>${xml(id)}</g:id>`,
        multi ? `<g:item_group_id>${xml(p.id)}</g:item_group_id>` : "",
        `<g:title>${xml(title)}</g:title>`,
        `<g:description>${xml(description)}</g:description>`,
        `<g:link>${xml(multi ? `${link}?v=${encodeURIComponent(v.id)}` : link)}</g:link>`,
        `<g:image_link>${xml(image)}</g:image_link>`,
        extraImages,
        `<g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>`,
        // Actie? Dan is de adviesprijs de van-prijs en feedPrice de actieprijs.
        vanPrijs
          ? `<g:price>${vanPrijs.toFixed(2)} EUR</g:price><g:sale_price>${feedPrice.toFixed(2)} EUR</g:sale_price>`
          : `<g:price>${feedPrice.toFixed(2)} EUR</g:price>`,
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
        loyaltyBlok(feedPrice, v.kluspasPrice),
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
