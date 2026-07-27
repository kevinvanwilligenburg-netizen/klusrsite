// @ts-nocheck
/**
 * Gedeelde mapping: normaliseert feed-/Channable-items naar KLUSR Product[].
 * Gebruikt door build-tilroy-catalog.mjs én build-channable-catalog.mjs.
 *
 * Verwacht "items" in een genormaliseerde vorm:
 *   { id, title, description, link, image, additionalImage, availability,
 *     price (number), productType ('Home > X > Y'), brand, gtin, color, size, groupId }
 * en een stockMap: Map<id, { total:number, perStore:number[] }>.
 */

export const KLUSR_STORES = ["nijverdal", "emmen", "zutphen", "apeldoorn", "deventer"];

const PRO_BRANDS = new Set([
  "Sikkens", "Hammerite", "Histor", "Anza", "Fischer", "Alabastine", "Bosch",
  "Makita", "Sigma", "Wijzonol",
]);

export function decodeEntities(s = "") {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function stripHtml(html = "") {
  return decodeEntities(
    html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

export function slugify(input = "") {
  return input
    .toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

const round2 = (n) => Math.round(n * 100) / 100;

function stockByStore(perStore = []) {
  const get = (i) => perStore[i] ?? 0;
  const mapped = {
    nijverdal: get(0) + get(5),
    emmen: get(1),
    zutphen: get(2),
    apeldoorn: get(3),
    deventer: get(4),
  };
  return KLUSR_STORES.map((storeId) => ({ storeId, quantity: mapped[storeId] ?? 0 }));
}

/** Subsegmenten die écht "reiniging & onderhoud" zijn (volledig segment). */
const CLEANING_SEGMENT_RE =
  /^(huishoudelijk|huishouden|reiniging(smiddelen)?|reinigers|schoonmaak(middelen)?|ongediertebestrijding)$/i;

function mapCategory(productType = "") {
  const segs = productType.split(">").map((s) => s.trim());
  const top = (segs[1] || segs[0] || "").toLowerCase();
  const full = productType.toLowerCase();
  // Aanhangwagen-/auto-onderdelen (neuswielen, disselsloten, bagagespin) horen
  // niet in een verf-/klusshop.
  if (full.includes("aanhangw") || full.includes("neuswiel")) return null;
  if (top.includes("ijzerwaren")) return "ijzerwaren";
  // Reiniging kan op elk niveau zitten: de feed verhuisde "Huishoudelijk" van
  // het topsegment naar een subsegment onder Verfbenodigdheden (2026-07) —
  // check daarom óók de diepere segmenten, vóór de verf-benodigdheden-regel.
  // Op diep niveau matchen we het hele segment (geen losse woorddelen), anders
  // kapen we producten als "Kwastreiniger" of "Schoonmaakgereedschap" die bij
  // verf respectievelijk gereedschap horen.
  if (top.includes("huishoud") || top.includes("reinig") || top.includes("schoonmaak"))
    return "reiniging";
  if (segs.slice(2).some((s) => CLEANING_SEGMENT_RE.test(s.trim()))) return "reiniging";
  if (top.startsWith("verf") && top.includes("benodigd")) return "gereedschap";
  if (top.startsWith("verf") || top.includes("beits")) return "verf";
  if (top.includes("gereedschap")) return "gereedschap";
  if (top.includes("verlichting")) return "verlichting";
  if (top.includes("elektra")) return "elektra";
  if (top.includes("vloer")) return "vloeren-raam";
  if (top.includes("tuin")) return "tuin";
  if (top.includes("behang") || top.includes("wandbekleding")) return "behang";
  if (top.includes("lijm") || top.includes("kit")) return "afbouw-fijnbouw";
  if (top.includes("deuren") || top.includes("kozijn")) return "afbouw-fijnbouw";
  if (top.includes("bouwmaterial")) return "afbouw-fijnbouw";
  if (top.includes("toebehoren")) {
    if (full.includes("plamuur") || full.includes("kit") || full.includes("lijm"))
      return "afbouw-fijnbouw";
    return "gereedschap";
  }
  if (top.includes("auto") || top.includes("fiets") || top.includes("hobby")) return null;
  return "gereedschap";
}

export function mapVerfSub(title, productType) {
  const t = `${title || ""} ${productType || ""}`.toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  // --- Speciale verf (zeer specifiek → eerst) ---
  if (has("magneet")) return "magneetverf";
  if (has("schoolbord", "krijtbord")) return "schoolbordverf";
  if (has("radiator")) return "radiatorverf";
  if (has("hittebestendig", "hittebest", "kachellak", "uitlaat")) return "hittebestendige-verf";
  if (has("tegelverf", "tegellak") || (has("tegel") && has("verf"))) return "tegelverf";
  if (has("spuitbus", "spuitverf", "spuitlak", "sprayverf", "spray", "aerosol")) return "spuitverf";

  // --- Beton- & vloerverf ---
  if (has("2-comp", "2 comp", "twee comp", "2k ", "epoxy", "vloercoating")) return "vloercoating-2k";
  if (has("garage")) return "garageverf";
  // Echte betonverf, maar niet de muur-/structuurverf die "beton" in de
  // feed-categorie heeft (die hoort bij muurverf, zie blok hieronder).
  if (has("beton") && !has("muurverf", "spacktex", "isotex")) return "betonverf";

  // --- Beits & olie ---
  if (has("beits")) {
    if (has("dekkend")) return "dekkende-beits";
    return "transparante-beits";
  }
  if (has("houtolie", "teakolie", "hardwaxolie", "vloerolie", "onderhoudsolie", "lijnolie", "decking"))
    return "transparante-beits";

  // --- Voorstrijk & grondering (vóór primer/grond) ---
  if (has("fixeer")) return "fixeergrond";
  if (has("diepgrond", "diepprimer", "dieptegrond")) return "diepgrond";
  if (has("voorstrijk")) return "voorstrijk";

  // --- Grondverf & primers ---
  if (has("primer", "grondverf", "grondlak", "grondlaag", "hechtgrond", "roestwerend", "grond ")) {
    if (has("metaal", "metal", "roest", "ijzer", "staal", "zink")) return "grondverf-metaal";
    if (has("isoleer", "isolerend", "vlekken", "nicotine", "anti-vlek", "aanslag")) return "isolerende-primer";
    if (has("hecht")) return "hechtprimer";
    if (has("hout", "mdf")) return "grondverf-hout";
    return "multiprimer";
  }

  // --- Muurverf (vóór lak; "buiten" overlapt met lak) ---
  if (has("plafond")) return "plafondverf";
  if (has("muurverf", "muur", "latex", "sausverf", "saus", "wandverf", "muurlatex")) {
    if (has("schrobvast", "reinigbaar", "afwasbaar", "wasbaar")) return "schrobvaste-verf";
    if (has("buiten", "gevel", "exterior")) return "buitenmuurverf";
    return "binnenmuurverf";
  }
  if (has("gevelverf", "gevel")) return "buitenmuurverf";
  if (has("schrobvast", "reinigbaar")) return "schrobvaste-verf";

  // --- Lakken ---
  if (has("traplak")) return "traplak";
  if (has("trapverf")) return "trapverf";
  if (has("meubellak", "meubel")) return "meubellak";
  if (has("deur", "kozijn")) return "deur-kozijnlak";
  if (has("lak", "aqua", "hoogglans", "zijdeglans", "zijdemat", "halfmat", "grondlak", "watergedragen lak")) {
    if (has("buiten", "exterior")) return "buitenlak";
    return "binnenlak";
  }

  // --- Vloer/trap (na lak) ---
  if (has("vloer")) return "vloerverf";
  if (has("trap")) return "trapverf";

  // --- Buiten/binnen fallback ---
  const deep = (productType || "").split(">").slice(2).join(" ").toLowerCase();
  if (deep.includes("lak")) return "binnenlak";
  if (has("buiten", "gevel", "exterior")) return "buitenmuurverf";
  return "binnenmuurverf";
}

// Onderhouds-/smeermiddelen die de feed soms onder verf zet — horen bij gereedschap.
const MAINT_RE =
  /\b(contactspray|kruipolie|slotspray|siliconenspray|smeerspray|droogsmeer|kettingspray|multi-?spray|onderhoudsspray|smeermiddel|smeerolie|smeervet|remmenreiniger|montagespray)\b/i;

function isMaintenanceItem(item) {
  return /wd-?40/i.test(item.brand || "") || MAINT_RE.test(item.title || "");
}

// Schuurmateriaal vs. schildersgereedschap: schuur-/korrelgerelateerde artikelen
// (schuurpapier, schuurblok, glaspapier, grit…) vs. kwasten/rollers/tape/bakjes.
const SCHUUR_RE =
  /schuur|korrel|glaspapier|schuurpapier|schuurblok|schuurspons|schuurvel|schuurband|schuurschijf|schuurrol|schuurgaas|grit|schuurmiddel/i;

// Reiniging & onderhoud: ongediertebestrijding → schimmel/aanslag → reinigers.
const ONGEDIERTE_RE = /ongedierte|insect|mug|vlieg|slak|muiz|ratt|mier|wesp|gif/i;
const SCHIMMEL_RE = /schimmel|aanslag|groene aanslag/i;

/** Splits het gecombineerde schilders-/schuurbucket op basis van de titel. */
function paintToolSub(title = "") {
  return SCHUUR_RE.test(title) ? "schuurmateriaal" : "schildersgereedschap";
}

/** Subcategorie binnen "Reiniging & onderhoud" op basis van de titel. */
function reinigingSub(title = "") {
  if (ONGEDIERTE_RE.test(title)) return "ongediertebestrijding";
  if (SCHIMMEL_RE.test(title)) return "schimmel-aanslag";
  return "reinigers";
}

function subCategoryFor(category, title, productType) {
  if (category === "verf") return mapVerfSub(title, productType);
  if (category === "reiniging") return reinigingSub(title);
  if (category === "behang") return /glasweefsel/i.test(title) ? "glasweefselbehang" : "behang";
  const segs = productType.split(">").map((s) => s.trim());
  const seg = segs[2] || segs[1];
  if (!seg) return undefined;
  const slug = slugify(seg);
  // Het gecombineerde "schildersgereedschap & schuurpapier"-bucket splitsen we
  // in schuurmateriaal vs. schildersgereedschap (op titel).
  if (slug === "schildersger-en-schuurpapier") return paintToolSub(title);
  return slug;
}

const cleanTitle = (t = "") => t.replace(/\s+/g, " ").trim();

/**
 * Groothandel-ruis. "Partijhandel" (en het losse "Partij" dat er soms voor
 * staat) is geen merk maar een inkoopkanaal en hoort niet in de klanttitel:
 * "Partijhandel Partij kwast groot" → "Kwast groot". Alleen titels die de ruis
 * bevatten worden aangepast (eerste letter weer als hoofdletter); alle andere
 * titels blijven byte-identiek.
 */
export function stripWholesaleNoise(title = "") {
  const cleaned = title.replace(/\bpartij(?:handel)?\b/gi, " ").replace(/\s+/g, " ").trim();
  if (cleaned === title.trim()) return title;
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : cleaned;
}

const WHOLESALE_BRANDS = new Set(["partijhandel", "partij"]);

/** Normaliseer niet-echte "merken" (groothandelskanalen) naar Onbekend. */
export function cleanBrand(brand = "") {
  const b = (brand || "").trim();
  if (!b || WHOLESALE_BRANDS.has(b.toLowerCase())) return "Onbekend";
  return b;
}

/**
 * Verwijder feed-template-ruis uit titels: sterren-ratings ("5*") en alles na
 * de eerste pipe ("… 5* | 20 | FSC Houten Steel 20" → "…"). De maat-/attribuut-
 * tokens achter de pipe zitten al in de variant-labels.
 */
function stripTemplateNoise(title = "") {
  let s = stripWholesaleNoise(title).replace(/\s*\d\s*[\*★]/g, " ");
  const pipe = s.indexOf("|");
  if (pipe > 0) s = s.slice(0, pipe);
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Collapse een leidende merk-echo: "DEN BRAVEN Den Braven Zwaluw" → "Den Braven
 * Zwaluw", "St. marc St Marc Verfreiniger" → "St Marc Verfreiniger". Het merk
 * staat al apart bij het product.
 */
function dropBrandEcho(title = "", brand = "") {
  if (!brand || brand === "Onbekend") return title;
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const bn = norm(brand);
  if (!bn) return title;
  const words = title.split(/\s+/);
  for (let k = Math.min(3, words.length - 1); k >= 1; k--) {
    if (norm(words.slice(0, k).join("")) !== bn) continue;
    for (let j = 1; j <= 3 && k + j <= words.length; j++) {
      if (norm(words.slice(k, k + j).join("")) === bn) return words.slice(k).join(" ");
    }
  }
  return title;
}

/**
 * Productnaam zonder maat-/aantal-tokens (case-behoudend), voor gegroepeerde
 * producten. Losse model-/voltage-nummers (bv. "18V-55") blijven staan.
 */
function cleanProductTitle(title = "") {
  return cleanTitle(
    stripTemplateNoise(title)
      .replace(/\b\d+([.,]\d+)?\s*(mm|cm|m)?\s*[xX×]\s*\d+([.,]\d+)?(\/\d+)?\s*(mm|cm|m)?\b/gi, " ")
      .replace(/Ø\s*\d+([.,]\d+)?\s*(mm|cm)?/gi, " ")
      .replace(/\b\d+([.,]\d+)?\s*(ml|cl|l|liter|kg|gr|gram|mm|cm|watt)\b/gi, " ")
      .replace(/\b\d+\s*-?\s*(delig|stuks?|stk?|pcs|pack)\b/gi, " "),
  );
}

/**
 * Laatste cosmetische opschoning voor de getoonde titel (NIET voor de
 * groepssleutel, zodat verschillende dessins/codes aparte producten blijven):
 * verwijder losse maat-"x" en achterliggende artikelcodes.
 */
function tidyDisplayTitle(title = "") {
  return title
    .replace(/\s+[xX×]\s+/g, " ")
    .replace(/\s+[xX×]\s*$/g, "")
    .replace(/(\s+\b\d{2,6}(?:[-/]\d+)?\b)+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Finish-woorden waarna in verf-titels alleen nog kleur/code/basis volgt.
const PAINT_FINISHES = new Set([
  "hoogglans", "zijdeglans", "zijdemat", "halfmat", "mat", "glans", "satin",
  "zijdesatin", "metallic", "structuur", "fluweelmat", "zijdezacht",
]);
// Basis-/tint-codes die niet in de titel horen (kleur bepaalt de basis).
const BASE_CODE_RE =
  /\b(zn|ln|sb|wn|dn|tr|ac|w0?\d|n0?\d|p0?\d|deep|medium|transparant|basis|base)\b/gi;

function dedupeWords(s = "") {
  const out = [];
  for (const w of s.split(/\s+/)) {
    if (!w) continue;
    if (out.length && out[out.length - 1].toLowerCase() === w.toLowerCase()) continue;
    out.push(w);
  }
  return out.join(" ");
}

function isColorWord(w = "") {
  return /(wit|grijs|groen|blauw|rood|geel|zwart|bruin|beige|paars|roze|oranje|creme|crème|ivoor|antraciet|taupe|zand|oker|terra)$/i.test(
    w,
  );
}

// Histor-afkortingen voltooien zodat varianten samenvallen en titels leesbaar zijn.
function expandPaintAbbrev(s = "") {
  return s
    .replace(/\bP\.?\s?F\.?\b/gi, "Perfect Finish")
    .replace(/\bZG\b/gi, "Zijdeglans")
    .replace(/\bHG\b/gi, "Hoogglans")
    .replace(/\bZM\b/gi, "Zijdemat")
    .replace(/\bHM\b/gi, "Halfmat");
}

/** Schone, klantvriendelijke verf-titel: zonder kleur, kleurcode, basis of maat. */
function paintCoreTitle(title = "") {
  const tokens = cleanProductTitle(expandPaintAbbrev(title)).split(/\s+/).filter(Boolean);
  let cut = -1;
  tokens.forEach((w, i) => {
    if (PAINT_FINISHES.has(w.toLowerCase().replace(/[^a-zà-ÿ]/gi, ""))) cut = i;
  });
  const core = cut >= 0 ? tokens.slice(0, cut + 1) : tokens.slice();
  let s = dedupeWords(core.join(" ").replace(/\b\d{2,5}\b/g, " ").replace(BASE_CODE_RE, " "))
    .replace(/\s{2,}/g, " ")
    .trim();
  if (cut < 0) {
    const parts = s.split(/\s+/);
    while (parts.length > 2 && isColorWord(parts[parts.length - 1])) parts.pop();
    s = parts.join(" ");
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

function isPaintItem(item) {
  return mapCategory(item.productType) === "verf";
}

function variantLabel(item) {
  if (item.size) return item.size.replace(/\s+/g, " ").trim();
  if (item.color) return item.color;
  return "Standaard";
}

function unitFor(label = "") {
  const l = label.toLowerCase();
  if (/\b(l|liter|ml)\b/.test(l)) return "L";
  if (/\b(kg|gram|g)\b/.test(l)) return "kg";
  if (/\b(m|meter|cm|mm)\b/.test(l)) return "m";
  return "st";
}

// ---- Feature-feed helpers (rijke Tilroy-productattributen) ------------------
const cap = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Interne / lege / "niet van toepassing"-waarden die we nooit tonen.
const FEAT_SKIP_RE =
  /^(nvt|n\.?\s?v\.?\s?t\.?|niet van toepassing|geen( keurmerk)?|onbekend|n\.?b\.?|niettonenweb|unisex\|?|0)$/i;

function cleanFeat(v) {
  if (v == null) return undefined;
  const s = String(v).replace(/\s+/g, " ").trim();
  if (!s || FEAT_SKIP_RE.test(s)) return undefined;
  return s;
}

/** Eerste bruikbare feature-waarde (geen NVT/leeg) over de opgegeven keys. */
function featVal(feat, ...keys) {
  for (const k of keys) {
    const v = cleanFeat(feat && feat[k]);
    if (v) return v;
  }
  return undefined;
}

// Niet-informatieve "kleuren" die de feed als default invult (geen echte kleur).
const KLEUR_SKIP_RE = /^(transparant|blank|kleurloos|neutraal|diversen|assorti|meerkleurig|gemengd)$/i;

/** Echte kleur uit de feature-feed (filtert default/niet-informatieve waarden). */
function featKleur(feat, fallback) {
  const v = featVal(feat, "kleur", "kleurcode", "kleurfamilie");
  if (v && !KLEUR_SKIP_RE.test(v)) return v;
  if (fallback && !KLEUR_SKIP_RE.test(fallback)) return fallback;
  return undefined;
}

/**
 * Is deze verflijn een mengverf (op kleur te laten mengen)? De `kleurkiezer`-vlag
 * uit de feature-feed is leidend; we kijken naar álle SKU's in de groep (kleur-/
 * basisvarianten), want de mengvlag staat vaak alleen op de gekleurde basissen.
 * - Eén variant met j/ja  → mengverf
 * - Wel vlaggen, maar alleen n → niet mengen (bv. wit-only, trapverf, primer)
 * - Geen join met de feature-feed → val terug op de heuristiek
 */
function groupIsMengverf(group, featuresById, fallback) {
  if (!featuresById || featuresById.size === 0) return fallback;
  let joined = false;
  let sawFlag = false;
  for (const sku of group) {
    const feat = featuresById.get(String(sku.id));
    if (!feat) continue;
    joined = true;
    const raw = feat.kleurkiezer;
    if (raw == null) continue;
    sawFlag = true;
    if (/^(j|ja)/i.test(String(raw).trim())) return true;
  }
  if (sawFlag || joined) return false; // betrouwbare data: niet mengen
  return fallback; // geen join (andere id's) → heuristiek
}

function buildHighlights(item, category, meng, feat = {}) {
  const out = [];
  if (item.brand && item.brand !== "Onbekend") out.push(`Merk: ${item.brand}`);
  if (category === "verf") {
    if (meng) {
      out.push("Op elke kleur te laten mengen");
      out.push("Exacte kleurmatch, klaar voor gebruik");
    } else {
      const kleur = featKleur(feat, item.color);
      if (kleur) out.push(`Kleur: ${kleur}`);
    }
    const glans = featVal(feat, "glansgraad") || paintGlansOf(item.title);
    if (glans) out.push(`Glansgraad: ${glans}`);
    const droog = featVal(feat, "pfc_droogtijd");
    if (droog) out.push(`Droog na ${droog}`);
  } else {
    const kleur = featKleur(feat, item.color);
    if (kleur) out.push(`Kleur: ${kleur}`);
    const mat = featVal(feat, "materiaal");
    if (mat) out.push(`Materiaal: ${mat}`);
    else if (item.size) out.push(`Inhoud: ${item.size}`);
  }
  out.push("Professionele kwaliteit");
  return [...new Set(out)].slice(0, 4);
}

function paintBasisOf(text = "") {
  const t = text.toLowerCase();
  if (/\b(acryl|aqua|aquamat|watergedragen|water\s?gedragen|op\s?water|wb)\b/.test(t))
    return "Op waterbasis (acryl)";
  if (/\b(alkyd|terpentine|high\s?solid|\bhs\b|oplosmiddel|whitespirit|white\s?spirit|sb)\b/.test(t))
    return "Op terpentinebasis (alkyd)";
  return null;
}
/** Binnen/buiten + vochtige ruimtes (badkamer/keuken). */
function paintToepassing(text = "") {
  const t = text.toLowerCase();
  const buiten = /\b(buiten|gevel|exterieur|exterior|weerbestendig|buitenhout|buitenwerk|tuin)\b/.test(t);
  const binnen = /\b(binnen|interieur|interior|muur|wand|plafond|latex|sausverf|binnenhout|binnenwerk)\b/.test(t);
  const vocht = /\b(badkamer|keuken|vochtige?\s?ruimten?|vochtbestendig|vocht|douche|natte?\s?ruimten?|schimmelwerend|anti-?schimmel)\b/.test(t);
  let base;
  if (buiten && binnen) base = "Binnen en buiten";
  else if (buiten) base = "Buiten";
  else if (binnen) base = "Binnen";
  if (vocht) base = base ? `${base}, ook vochtige ruimtes (badkamer/keuken)` : "Ook vochtige ruimtes (badkamer/keuken)";
  return base || null;
}
/** Geschikte ondergrond(en) — uit feature-data of de titel afgeleid. */
function paintOndergrond(text = "", feat = {}) {
  const real = featVal(feat, "materiaalvandoeloppervlak");
  if (real) return real;
  const t = text.toLowerCase();
  const subs = [];
  if (/\b(hout|mdf|multiplex|hardhout|plaatmateriaal|board)\b/.test(t)) subs.push("hout");
  if (/\b(metaal|staal|ijzer|zink|gegalvaniseerd|aluminium|gietijzer)\b/.test(t)) subs.push("metaal");
  if (/\b(muur|muren|wand|beton|pleister|stuc|stucwerk|gips|gipsplaat|steen|metsel)\b/.test(t)) subs.push("muren");
  if (/\b(kunststof|pvc|hpl|polyester)\b/.test(t)) subs.push("kunststof");
  if (/\b(tegel|tegels)\b/.test(t)) subs.push("tegels");
  if (!subs.length) return null;
  return subs.map(cap).join(", ");
}
function paintGlansOf(title = "") {
  const t = title.toLowerCase();
  // Nederlandse glansaanduidingen → Nederlands label.
  if (/hoogglans/.test(t)) return "Hoogglans";
  if (/zijdeglans/.test(t)) return "Zijdeglans";
  if (/zijdemat/.test(t)) return "Zijdemat";
  if (/halfmat/.test(t)) return "Halfmat";
  // Engelse glansaanduidingen (o.a. Sikkens) blijven Engels, zodat ze als
  // glans-variant kiesbaar zijn op de productpagina.
  if (/high[\s-]*gloss/.test(t)) return "High Gloss";
  if (/semi[\s-]*gloss/.test(t)) return "Semi-gloss";
  if (/\beggshell\b/.test(t)) return "Eggshell";
  if (/\bsatin\b/.test(t)) return "Satin";
  if (/\bsilk\b/.test(t)) return "Silk";
  if (/\bmatte?\b/.test(t)) return "Matt";
  if (/\bgloss\b/.test(t)) return "Gloss";
  if (/\bmat\b/.test(t)) return "Mat";
  return null;
}
const VERF_SOORT = {
  lak: "Lakverf",
  binnenverf: "Muurverf",
  buitenverf: "Buitenverf",
  beits: "Beits",
  primer: "Grondverf",
  houtolie: "Houtolie",
};

// Specificatie-secties in vaste volgorde — lege secties vallen weg.
const SPEC_GROUP_LABEL = {
  algemeen: "Algemeen",
  eigenschappen: "Eigenschappen",
  verwerking: "Verwerking & droogtijd",
  verpakking: "Verpakking",
};
const SPEC_GROUP_ORDER = ["algemeen", "eigenschappen", "verwerking", "verpakking"];

/**
 * Gestructureerde productgegevens, gevoed door de echte feature-feed en
 * aangevuld met domeinkennis. Verdeeld over secties (Algemeen / Eigenschappen /
 * Verwerking & droogtijd / Verpakking) zodat de PDP overzicht houdt.
 */
function buildSpecs(item, category, feat = {}, meng = false, extra = {}) {
  const t = item.title || "";
  const text = `${t} ${stripHtml(item.description || "")}`;
  const sections = new Map();
  const add = (group, label, value) => {
    const v = cleanFeat(value);
    if (!v) return;
    if (!sections.has(group)) sections.set(group, []);
    const arr = sections.get(group);
    if (arr.some((x) => x.label === label)) return;
    arr.push({ label, value: v });
  };

  // ---- Algemeen ----
  if (category === "verf") {
    add("algemeen", "Soort", VERF_SOORT[mapVerfSub(t, item.productType)]);
  }
  if (item.brand && item.brand !== "Onbekend") add("algemeen", "Merk", item.brand);
  if (category === "verf" && meng) add("algemeen", "Kleur", "Op elke gewenste kleur te laten mengen");
  else add("algemeen", "Kleur", featKleur(feat, item.color));
  add("algemeen", "Glansgraad", featVal(feat, "glansgraad") || paintGlansOf(t));

  // ---- Eigenschappen ----
  if (category === "verf") {
    add("eigenschappen", "Basis", paintBasisOf(text));
    add("eigenschappen", "Geschikt voor", paintToepassing(text));
    add("eigenschappen", "Geschikt voor ondergrond", paintOndergrond(text, feat));
  }
  add("eigenschappen", "Materiaal", featVal(feat, "materiaal"));
  add("eigenschappen", "Materiaal handgreep", featVal(feat, "materiaalhandgreep"));
  add("eigenschappen", "Materiaal steel", featVal(feat, "materiaalsteel"));
  add("eigenschappen", "Kwasthaar", featVal(feat, "typekwasthaar"));
  add("eigenschappen", "Type kwast", featVal(feat, "typekwast-penseel"));
  add("eigenschappen", "Korrel", featVal(feat, "korrel") || (t.match(/\bkorrel\s*[:.-]?\s*(\d{2,4})\b/i) || [])[1]);
  add("eigenschappen", "Krasvast", featVal(feat, "krasvast"));
  add("eigenschappen", "Hittebestendig", featVal(feat, "hittebestendig"));
  add("eigenschappen", "Geurloos", featVal(feat, "geurloos"));
  add("eigenschappen", "Kopvorm", featVal(feat, "kopvorm"));
  add("eigenschappen", "Draadmaat", featVal(feat, "pfc_draadmaat"));
  add("eigenschappen", "Maatsysteem", featVal(feat, "maatsysteem"));
  // Verlichting
  add("eigenschappen", "Lichtbron", featVal(feat, "lichtbron"));
  add("eigenschappen", "Lichtkleur", featVal(feat, "kleurlicht"));
  add("eigenschappen", "Kleurtemperatuur", featVal(feat, "kleurtemperatuur"));
  add("eigenschappen", "IP-waarde", featVal(feat, "ipwaarde"));
  add("eigenschappen", "Max. aansluitvermogen", featVal(feat, "maximaalaansluitvermogen"));
  add("eigenschappen", "Lichtbron inbegrepen", featVal(feat, "inclusieflichtbron"));
  // Verlichting-heuristiek wanneer de feed niets levert
  if (category === "verlichting") {
    const fit = (t.match(/\b(e27|e14|gu10|g9|b22)\b/i) || [])[0];
    if (fit) add("eigenschappen", "Fitting", fit.toUpperCase());
    if (!featVal(feat, "lichtbron") && /\bled\b/i.test(t)) add("eigenschappen", "Lichtbron", "LED");
    const w = (t.match(/\b(\d+(?:[.,]\d+)?)\s*w(att)?\b/i) || [])[1];
    if (w) add("eigenschappen", "Vermogen", `${w} W`);
  }
  add("eigenschappen", "Keurmerk", featVal(feat, "keurmerk"));

  // ---- Verwerking & droogtijd ----
  const droog = featVal(feat, "pfc_droogtijd");
  add("verwerking", "Droogtijd", droog);
  add("verwerking", "Kleefvrij na", featVal(feat, "kleefvrij"));
  add("verwerking", "Huidvormingstijd", featVal(feat, "huidvormingstijd"));
  if (category === "verf") {
    const basis = paintBasisOf(text);
    add("verwerking", "Verwerking", "Kwast, roller of spuit");
    add(
      "verwerking",
      "Verdunnen / reinigen",
      basis && basis.includes("water")
        ? "Met water"
        : basis
          ? "Met white spirit / terpentine"
          : "Met water of white spirit",
    );
    add("verwerking", "Dekkend vermogen", "ca. 8–12 m² per liter (indicatief)");
    if (!droog) {
      add(
        "verwerking",
        "Overschilderbaar",
        basis && basis.includes("water") ? "Na ca. 4–6 uur (indicatief)" : "Na ca. 16–24 uur (indicatief)",
      );
    }
  }

  // ---- Verpakking ----
  // Meerdere inhoudsmaten → "Verkrijgbaar in"; één maat alleen tonen bij verf
  // (een echte inhoud); bij niet-verf staat de maat al in de variantkiezer.
  if (extra.sizes && extra.sizes.length > 1) {
    add("verpakking", "Verkrijgbaar in", extra.sizes.join(" · "));
  } else if (category === "verf") {
    const inh = cleanSizeLabel(item.size || "");
    if (inh && inh !== "Standaard") add("verpakking", "Inhoud", inh);
  }
  const gewicht = featVal(feat, "gewicht");
  if (gewicht && /[a-z]/i.test(gewicht)) add("verpakking", "Gewicht", gewicht);
  const aantal = featVal(feat, "pfc_aantalstuksinverpakking");
  if (aantal && aantal !== "1" && aantal !== "1 stuk") add("verpakking", "Aantal per verpakking", aantal);
  add("verpakking", "Lengte op rol", featVal(feat, "lengteoprol"));
  if (item.gtin) add("verpakking", "EAN", item.gtin);
  add("verpakking", "Conditie", "Nieuw");

  const out = [];
  for (const key of SPEC_GROUP_ORDER) {
    const items = sections.get(key);
    if (items && items.length) out.push({ group: SPEC_GROUP_LABEL[key], items });
  }
  return out.length ? out : [{ group: "Productgegevens", items: [{ label: "Conditie", value: "Nieuw" }] }];
}

function synthReviews(seed, count, avg) {
  const samples = [
    { author: "Mark V.", body: "Goede kwaliteit en snel geleverd. Advies in de winkel was top.", rating: 5 },
    { author: "Sanne K.", body: "Precies wat ik nodig had voor mijn klus. Fijne service.", rating: 5 },
    { author: "Joost B.", body: "Prima product, doet wat het moet doen.", rating: 4 },
    { author: "Petra D.", body: "Tevreden! Goede prijs-kwaliteitverhouding.", rating: 4 },
  ];
  return Array.from({ length: Math.min(count, 4) }, (_, i) => ({
    id: `${seed}-r${i}`,
    author: samples[i % samples.length].author,
    rating: i === 0 ? Math.round(avg) : samples[i % samples.length].rating,
    body: samples[i % samples.length].body,
    date: new Date(2026, 4 - (i % 5), 20 - i * 4).toISOString(),
    verified: true,
  }));
}

/** Verwijder maat-/aantal-tokens uit een titel zodat formaten samenvallen. */
function stripSizeTokens(title = "") {
  return title
    .toLowerCase()
    .replace(/\b\d+([.,]\d+)?\s*[x×]\s*\d+([.,]\d+)?(\/\d+)?\s*(mm|cm|m)?\b/g, " ")
    .replace(/ø\s*\d+([.,]\d+)?\s*(mm|cm)?/g, " ")
    .replace(/\b\d+([.,]\d+)?\s*(ml|cl|l|liter|kg|gr|gram|g|mm|cm|m)\b/g, " ")
    .replace(/\b\d+\s*-?\s*(delig|stuks?|stk?|pcs|pack)\b/g, " ")
    .replace(/\b1?size\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Topsegment van product_type — houdt groeperen binnen één categorie. */
function topType(productType = "") {
  const segs = productType.split(">").map((s) => s.trim());
  return (segs[1] || segs[0] || "").toLowerCase();
}

/**
 * Groepssleutel om hetzelfde product in verschillende maten samen te voegen.
 * Merk + categorie + titel-zonder-maat. Verschillende typen (PZ1/PZ2/Torx/RVS)
 * houden een andere titel en blijven dus aparte producten.
 */
function normTitleKey(s = "") {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b1?size\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function groupKey(item) {
  // Verf: voeg alle kleur-/basis-/maatvarianten van dezelfde lijn samen tot één
  // product (de kleur bepaalt de basis; consument kiest alleen de kleur).
  if (isPaintItem(item)) {
    const core = paintCoreTitle(item.title);
    if (core) return `${(item.brand || "?").toLowerCase()}|verf|${normTitleKey(core)}`;
  }
  // Niet-verf: groepeer op merk + schone (zichtbare) titel, zodat producten met
  // dezelfde titel en alleen een andere inhoud samenvallen tot één product —
  // ook als de feed ze onder een iets andere product_type plaatst.
  const base = normTitleKey(dedupeWords(cleanProductTitle(dropBrandEcho(item.title, item.brand))));
  if (!base) return `${item.brand}|${item.groupId || item.id}`;
  return `${(item.brand || "?").toLowerCase()}|${base}`;
}

/** Sorteersleutel op eerste maat (Ø×lengte) zodat varianten oplopend staan. */
function sizeSortKey(item) {
  const m = (item.size || item.title || "").match(/(\d+([.,]\d+)?)\s*[x×]\s*(\d+([.,]\d+)?)/);
  if (m) return parseFloat(m[1].replace(",", ".")) * 1000 + parseFloat(m[3].replace(",", "."));
  const v = (item.size || "").match(/(\d+([.,]\d+)?)/);
  return v ? parseFloat(v[1].replace(",", ".")) : 0;
}

/** Rangschik maatlabels oplopend op echte grootte (ml/L, gewicht, dan afmeting). */
function sizeRank(label = "") {
  const l = label.toLowerCase();
  let m = l.match(/(\d+([.,]\d+)?)\s*(ml|cl|l|liter)\b/);
  if (m) {
    let v = parseFloat(m[1].replace(",", "."));
    if (m[3] === "l" || m[3] === "liter") v *= 1000;
    else if (m[3] === "cl") v *= 10;
    return v;
  }
  m = l.match(/(\d+([.,]\d+)?)\s*(kg|gram|gr|g)\b/);
  if (m) {
    let v = parseFloat(m[1].replace(",", "."));
    if (m[3] === "kg") v *= 1000;
    return 1e6 + v;
  }
  m = l.match(/(\d+([.,]\d+)?)/);
  return m ? 2e6 + parseFloat(m[1].replace(",", ".")) : 9e9;
}

/** Maak een maatlabel leesbaar: "4,0 X 16 MM 200 ST" → "4,0 x 16 mm · 200 st". */
function cleanSizeLabel(label = "") {
  let s = label.replace(/\s+/g, " ").trim();
  if (/^1?size$/i.test(s) || !s) return "Standaard";
  s = s.replace(/(\d)[.,](\d)/g, "$1,$2"); // 1.25 → 1,25 (dedupe decimaal)
  s = s
    .replace(/\bMM\b/gi, "mm").replace(/\bCM\b/gi, "cm")
    .replace(/\bX\b/g, "x").replace(/\b(ST|STK)\b/gi, "st")
    .replace(/\b(GR|GRAM)\b/gi, "gr").replace(/\bML\b/gi, "ml");
  return s.replace(/(mm|cm|gr)\s+(\d)/g, "$1 · $2");
}

/**
 * Bouw de KLUSR-catalogus uit genormaliseerde items + stockMap.
 * @returns snapshot-object { generatedAt, source, count, countsByCategory, products }
 */
export function buildCatalog(items, stockMap, opts = {}) {
  const { source = "feed", maxPerCategory = 100000, maxTotal = 100000, featuresById = null } = opts;

  // Groepeer items die hetzelfde product in een ander formaat zijn (bv.
  // schroeven in tientallen maten) tot één product met maatvarianten.
  const groups = new Map();
  for (const item of items) {
    item.brand = cleanBrand(item.brand); // groothandelskanaal ("Partijhandel") is geen merk
    const key = groupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const products = [];
  for (const [groupId, group] of groups) {
    const lead =
      group.find((i) => i.availability === "in stock" && i.image) ||
      group.find((i) => i.image) ||
      group[0];
    if (!lead || !lead.image || !(lead.price > 0)) continue;

    let category = mapCategory(lead.productType);
    let subOverride;
    if (isMaintenanceItem(lead)) {
      category = "gereedschap";
      subOverride = "onderhoud-smeermiddelen";
    }
    if (!category) continue;

    const title = cleanTitle(lead.title);
    if (!title) continue;

    // Mengverf-vlag over de hele groep + "vaste-kleur-variant"-modus: een
    // niet-mengverf verflijn die in meerdere vaste kleuren bestaat, toont die
    // kleuren als varianten i.p.v. ze stil te laten samenvallen op maat.
    const meng = category === "verf" && groupIsMengverf(group, featuresById, true);
    const colorOf = (it) =>
      featKleur(featuresById && featuresById.get(String(it.id)), it.color);
    const colorVariant =
      category === "verf" && !meng && new Set(group.map(colorOf).filter(Boolean)).size > 1;
    const multiSize =
      new Set(group.map((it) => cleanSizeLabel(variantLabel(it)))).size > 1;

    const seenLabels = new Set();
    const variants = [];
    const sortedGroup = [...group].sort((a, b) => sizeSortKey(a) - sizeSortKey(b));
    for (const it of sortedGroup) {
      const sizeLabel = cleanSizeLabel(variantLabel(it));
      let label = sizeLabel;
      if (colorVariant) {
        const kleur = colorOf(it);
        if (kleur) {
          label =
            multiSize && sizeLabel !== "Standaard" ? `${cap(kleur)} · ${sizeLabel}` : cap(kleur);
        }
      }
      if (seenLabels.has(label)) continue;
      seenLabels.add(label);
      const st = stockMap.get(it.id);
      const discount = 0.9 + seeded(it.id) * 0.08;
      const price = round2(it.price);
      variants.push({
        id: `tilroy-${it.id}`,
        label,
        unit: unitFor(label),
        price,
        kluspasPrice: round2(price * discount),
        stockByStore: stockByStore(st?.perStore),
      });
      if (variants.length >= 60) break;
    }
    if (variants.length === 0) continue;

    const base = variants.reduce((a, b) => (b.price < a.price ? b : a), variants[0]);
    // Adviesprijs (RRP) hoort bij de goedkoopste variant; alleen tonen als die
    // écht boven de verkoopprijs ligt.
    const baseSrc = group.reduce((a, b) => (b.price < a.price ? b : a), group[0]);
    const adviesprijs = baseSrc.adviesprijs ? round2(baseSrc.adviesprijs) : 0;
    const leadStock = stockMap.get(lead.id);
    const totalStock =
      leadStock?.total ?? variants[0].stockByStore.reduce((s, x) => s + x.quantity, 0);

    const rng = seeded(groupId);
    const rating = round2(4.1 + seeded(`${groupId}-r`) * 0.8);
    const reviewCount = 8 + Math.floor(seeded(`${groupId}-c`) * 240);

    const badges = [];
    const saving = base.price > 0 ? 1 - base.kluspasPrice / base.price : 0;
    if (PRO_BRANDS.has(lead.brand)) badges.push("PRO KEUZE");
    // Bestseller alleen voor écht uitschietende producten (geloofwaardig houden):
    // hoge voorraad + topbeoordeling + veel reviews + zeldzaam.
    if (totalStock > 20 && rating >= 4.6 && reviewCount >= 170 && rng > 0.55)
      badges.push("BESTSELLER");
    if (saving >= 0.07) badges.push("ACTIE");
    if (group.length > 1 && rng > 0.85) badges.push("NIEUW");

    const desc = stripHtml(lead.description).slice(0, 700);
    const hasDesc = desc.length > 120;
    const subCategory = subOverride ?? subCategoryFor(category, title, lead.productType);
    // Rijke productattributen uit de feature-feed (per lead-SKU).
    const feat = (featuresById && featuresById.get(String(lead.id))) || {};
    let displayTitle =
      tidyDisplayTitle(
        category === "verf"
          ? paintCoreTitle(lead.title) || cleanProductTitle(lead.title) || title
          : dedupeWords(cleanProductTitle(dropBrandEcho(lead.title, lead.brand))) || title,
      ) || title;
    if (category === "verf") {
      // Trailing "Ral"/"Ral 9001"-ruis weg en glansgraad toevoegen als die mist.
      displayTitle = displayTitle.replace(/\s+ral(\s+\d{3,4})?\s*$/i, "").trim();
      const glans = featVal(feat, "glansgraad") || paintGlansOf(lead.title);
      if (glans && !displayTitle.toLowerCase().includes(glans.toLowerCase())) {
        displayTitle = `${displayTitle} ${cap(glans)}`.trim();
      }
    }
    const sizeLabels = (
      colorVariant
        ? [
            ...new Set(
              group
                .map((it) => cleanSizeLabel(variantLabel(it)))
                .filter((l) => l && l !== "Standaard"),
            ),
          ]
        : [...new Set(variants.map((v) => v.label).filter((l) => l && l !== "Standaard"))]
    ).sort((a, b) => sizeRank(a) - sizeRank(b));

    products.push({
      id: `tilroy-${lead.id}`,
      title: displayTitle,
      slug: `${slugify(displayTitle)}-${lead.id}`,
      brand: lead.brand || "Onbekend",
      highlights: buildHighlights(lead, category, meng, feat),
      description:
        desc ||
        `${title} van ${lead.brand}. Professionele kwaliteit, verkrijgbaar bij KLUSR. Vraag in de winkel naar advies van onze ex-schilders.`,
      images: [lead.image, lead.additionalImage].filter(Boolean),
      price: round2(base.price),
      kluspasPrice: round2(base.kluspasPrice),
      compareAtPrice: adviesprijs > round2(base.price) ? adviesprijs : undefined,
      gtin: lead.gtin || undefined,
      category,
      subCategory,
      badges: badges.length ? [...new Set(badges)].slice(0, 3) : undefined,
      rating,
      reviewCount,
      reviews: synthReviews(groupId, 4, rating),
      specifications: buildSpecs(lead, category, feat, meng, { sizes: sizeLabels }),
      variants,
      stockByStore: stockByStore(leadStock?.perStore),
      frequentlyBoughtTogether: [],
      colorMatchable: meng,
      aiGeneratedContentStatus: hasDesc ? "complete" : "missing",
      contentFlags: {
        description: hasDesc ? "complete" : "missing",
        specifications: "complete",
        faqs: "missing",
        seo: hasDesc ? "suggested" : "missing",
      },
      _sortStock: totalStock,
    });
  }

  const byCat = new Map();
  for (const p of products) {
    if (!byCat.has(p.category)) byCat.set(p.category, []);
    byCat.get(p.category).push(p);
  }
  const selected = [];
  for (const [, list] of byCat) {
    list.sort((a, b) => b._sortStock - a._sortStock);
    selected.push(...list.slice(0, maxPerCategory));
  }
  selected.sort((a, b) => b._sortStock - a._sortStock);
  const final = selected.slice(0, maxTotal).map(({ _sortStock, ...p }) => p);

  const counts = {};
  for (const p of final) counts[p.category] = (counts[p.category] || 0) + 1;

  return {
    generatedAt: new Date().toISOString(),
    source,
    count: final.length,
    countsByCategory: counts,
    products: final,
  };
}
