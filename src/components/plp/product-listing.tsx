"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, SlidersHorizontal, Star, X } from "lucide-react";
import type { Product, ProductBadge } from "@/types";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductListRow } from "@/components/product/product-list-row";
import { AiFinder, type AiSelections } from "@/components/plp/ai-finder";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import { onlineStock } from "@/lib/stock";
import { useViewMode } from "@/lib/store/view-mode";
import { useMounted } from "@/lib/hooks/use-mounted";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

/* ----------------------------------------------------------------- config */

type SortKey = "populair" | "prijs-op" | "prijs-af" | "beoordeling" | "nieuwste";

const SORT_OPTIONS: { value: SortKey; labelKey: MessageKey }[] = [
  { value: "populair", labelKey: "plp.sort.populair" },
  { value: "prijs-op", labelKey: "plp.sort.priceAsc" },
  { value: "prijs-af", labelKey: "plp.sort.priceDesc" },
  { value: "beoordeling", labelKey: "plp.sort.rating" },
  { value: "nieuwste", labelKey: "plp.sort.newest" },
];

interface PriceBucket {
  id: string;
  labelKey: MessageKey;
  min: number;
  max: number; // Infinity for open-ended
}

const PRICE_BUCKETS: PriceBucket[] = [
  { id: "lt25", labelKey: "plp.priceBucket.lt25", min: 0, max: 25 },
  { id: "25-50", labelKey: "plp.priceBucket.mid", min: 25, max: 50 },
  { id: "50-100", labelKey: "plp.priceBucket.high", min: 50, max: 100 },
  { id: "gt100", labelKey: "plp.priceBucket.top", min: 100, max: Infinity },
];

// Badges exposed as facets (NIEUW omitted — not used as a filter here).
const BADGE_FILTERS: ProductBadge[] = ["ACTIE", "BESTSELLER", "PRO KEUZE", "BUNDEL"];

const BADGE_LABEL_KEYS: Record<ProductBadge, MessageKey> = {
  ACTIE: "plp.badge.actie",
  BESTSELLER: "plp.badge.bestseller",
  "PRO KEUZE": "plp.badge.proKeuze",
  NIEUW: "plp.badge.nieuw",
  BUNDEL: "plp.badge.bundel",
};

const RATING_BUCKETS: { min: number; labelKey: MessageKey }[] = [
  { min: 4, labelKey: "plp.rating.min4" },
  { min: 4.5, labelKey: "plp.rating.min45" },
];

/**
 * De attribuut-facetten houden hun NL-titel als canonieke naam (gebruikt voor de
 * AI-zoeker), maar voor de zichtbare filtergroep-kop mappen we die titel naar een
 * vertaalsleutel. Facet-WAARDEN (defs[].label) blijven productafgeleid → NL.
 */
const FACET_TITLE_KEY: Record<string, MessageKey> = {
  Glansgraad: "plp.facet.glans",
  Materiaal: "plp.facet.materiaal",
  Fitting: "plp.facet.fitting",
  Dessin: "plp.facet.dessin",
  Toepassing: "plp.facet.toepassing",
  Korrel: "plp.facet.korrel",
  Lichtkleur: "plp.facet.lichtkleur",
  Type: "plp.facet.type",
};

// Merk-waarden die geen echt merk zijn → niet als facet tonen.
const JUNK_BRANDS = new Set([
  "", "onbekend", "merk", "overig", "overige", "partijhandel", "partij",
]);


function prettySub(slug: string): string {
  const s = slug.replace(/-/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : slug;
}

/** Genormaliseerd inhoud-label (alleen volume: ml/cl/l) of null. */
function volumeLabel(label: string): string | null {
  const m = label.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l|liter)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  const ml = m[2] === "ml" ? n : m[2] === "cl" ? n * 10 : n * 1000;
  if (ml < 1000) return `${Math.round(ml)} ml`;
  const l = ml / 1000;
  return `${(Number.isInteger(l) ? String(l) : l.toFixed(1)).replace(".", ",")} L`;
}

function volumeMl(sizeLabel: string): number {
  const m = sizeLabel.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(ml|l)/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2] === "ml" ? n : n * 1000;
}

function productVolumes(p: Product): string[] {
  const out = new Set<string>();
  for (const v of p.variants) {
    const vl = volumeLabel(v.label);
    if (vl) out.add(vl);
  }
  return [...out];
}

/* ---- Attribuut-facetten: verschijnen alleen waar de data ze heeft ---- */
interface AttrDef {
  id: string;
  label: string;
  re: RegExp;
}
interface AttrFacet {
  key: string;
  title: string;
  defs: AttrDef[];
  /** Specificatie-labels waarvan de waarde meetelt voor dit facet (naast de titel). */
  specKeys?: string[];
  /** Categorie-slugs waar dit facet relevant is. Weglaten = overal toegestaan. */
  categories?: string[];
}

const ATTRIBUTE_FACETS: AttrFacet[] = [
  {
    key: "glans",
    title: "Glansgraad",
    specKeys: ["Glansgraad"],
    categories: ["verf", "tuin"],
    defs: [
      { id: "hoogglans", label: "Hoogglans", re: /hoogglans/i },
      { id: "zijdeglans", label: "Zijdeglans", re: /zijdeglans/i },
      { id: "zijdemat", label: "Zijdemat", re: /zijdemat/i },
      { id: "halfmat", label: "Halfmat", re: /halfmat/i },
      { id: "satin", label: "Satin", re: /\bsatin\b/i },
      { id: "mat", label: "Mat", re: /\bmat\b/i },
      { id: "glans", label: "Glans", re: /\bglans\b/i },
    ],
  },
  {
    key: "materiaal",
    title: "Materiaal",
    specKeys: ["Materiaal"],
    categories: ["ijzerwaren", "gereedschap"],
    defs: [
      { id: "rvs", label: "RVS", re: /\b(rvs|inox)\b/i },
      { id: "verzinkt", label: "Verzinkt", re: /verzinkt|gegalvaniseerd|galva/i },
      { id: "messing", label: "Messing", re: /messing/i },
      { id: "vernikkeld", label: "Vernikkeld", re: /vernikkeld/i },
      { id: "staal", label: "Staal", re: /\bstaal\b/i },
    ],
  },
  {
    key: "fitting",
    title: "Fitting",
    specKeys: ["Fitting"],
    categories: ["verlichting"],
    defs: [
      { id: "e27", label: "E27", re: /\be27\b/i },
      { id: "e14", label: "E14", re: /\be14\b/i },
      { id: "gu10", label: "GU10", re: /\bgu10\b/i },
      { id: "gu5", label: "GU5.3", re: /gu\s?5[.,]?3/i },
      { id: "g9", label: "G9", re: /\bg9\b/i },
      { id: "b22", label: "B22", re: /\bb22\b/i },
    ],
  },
  {
    key: "print",
    title: "Dessin",
    categories: ["afbouw-fijnbouw", "vloeren-raam"],
    defs: [
      { id: "uni", label: "Uni / effen", re: /\buni\b|effen/i },
      { id: "streep", label: "Streep", re: /streep/i },
      { id: "ruit", label: "Ruit", re: /\bruit\b/i },
      { id: "visgraat", label: "Visgraat", re: /visgraat/i },
      { id: "bloem", label: "Bloemen", re: /bloem/i },
      { id: "grafisch", label: "Grafisch", re: /grafisch|driehoek|geometr/i },
      { id: "hout", label: "Houtlook", re: /\bhout/i },
      { id: "beton", label: "Betonlook", re: /beton/i },
      { id: "marmer", label: "Marmerlook", re: /marmer/i },
      { id: "structuur", label: "Structuur", re: /structuur/i },
    ],
  },
  {
    key: "toepassing",
    title: "Toepassing",
    specKeys: ["Geschikt voor"],
    categories: ["verf", "tuin"],
    defs: [
      { id: "binnen", label: "Binnen", re: /\bbinnen\b|interior|muurverf|latex|sausverf/i },
      { id: "buiten", label: "Buiten", re: /\bbuiten\b|gevel|exterior/i },
    ],
  },
  {
    key: "korrel",
    title: "Korrel",
    specKeys: ["Korrel"],
    categories: ["afbouw-fijnbouw", "gereedschap"],
    defs: [
      { id: "k40", label: "K40", re: /\bk\s?40\b|\bp40\b|korrel\s?40/i },
      { id: "k60", label: "K60", re: /\bk\s?60\b|\bp60\b|korrel\s?60/i },
      { id: "k80", label: "K80", re: /\bk\s?80\b|\bp80\b|korrel\s?80/i },
      { id: "k100", label: "K100", re: /\bk\s?100\b|\bp100\b|korrel\s?100/i },
      { id: "k120", label: "K120", re: /\bk\s?120\b|\bp120\b|korrel\s?120/i },
      { id: "k150", label: "K150", re: /\bk\s?150\b|\bp150\b|korrel\s?150/i },
      { id: "k180", label: "K180", re: /\bk\s?180\b|\bp180\b|korrel\s?180/i },
      { id: "k240", label: "K240", re: /\bk\s?240\b|\bp240\b|korrel\s?240/i },
      { id: "k320", label: "K320", re: /\bk\s?320\b|\bp320\b|korrel\s?320/i },
    ],
  },
  {
    key: "lichtkleur",
    title: "Lichtkleur",
    specKeys: ["Lichtkleur", "Kleurtemperatuur"],
    categories: ["verlichting"],
    defs: [
      { id: "warmwit", label: "Warmwit", re: /warm\s*wit|2[678]00\s*k|extra\s*warm/i },
      { id: "koelwit", label: "Koelwit", re: /koel\s*wit|4000\s*k|neutraal\s*wit/i },
      { id: "daglicht", label: "Daglicht", re: /daglicht|6[45]00\s*k/i },
    ],
  },
  // Productsoort/Type — afgeleid uit de titel, per categorie. Geeft een fijne
  // filter waar de subcategorie te grof is (bv. ijzerwaren: bouten/moeren/…).
  {
    key: "type-ijzer",
    title: "Type",
    categories: ["ijzerwaren"],
    defs: [
      { id: "schroeven", label: "Schroeven", re: /schroef|schroeven|spaanplaat|houtschroef|plaatschroef|spax|parker|luikschroef|vijs/i },
      { id: "bouten", label: "Bouten", re: /\bbout|tapbout|slotbout|draadeind|draadstang|keilbout|binnenzeskant/i },
      { id: "pluggen", label: "Pluggen", re: /\bplug|kozijnplug|hollewand|nagelplug/i },
      { id: "moeren", label: "Moeren", re: /\bmoer|borgmoer|dopmoer|vleugelmoer|oogmoer/i },
      { id: "haken", label: "Haken & ophang", re: /\bhaak|schroefoog|oogschroef|wandhaak|kaderhanger|katrol|spiegel.?bevest/i },
      { id: "nagels", label: "Nagels & spijkers", re: /nagel|spijker|puntduim/i },
      { id: "touw", label: "Touw & koord", re: /\btouw|koord|sisal|waslijn|streng/i },
      { id: "kabel", label: "Kabel & ketting", re: /ketting|staalkabel|staaldraad|spankabel|draadklem|klinknagel|binddraad/i },
      { id: "ringen", label: "Ringen", re: /\bring\b|sluitring|carrosserie|veerring|tandveer|kuipring|onderleg/i },
      { id: "wielen", label: "Wielen", re: /\bwiel|zwenkwiel|bokwiel|luchtband/i },
      { id: "spanbanden", label: "Spanbanden & klemmen", re: /spanband|spangordel|ratelspanner|slangklem|slangenklem|uitlaatklem/i },
      { id: "ankers", label: "Ankers", re: /\banker|hulsanker|keilanker|slaganker|inslag/i },
      { id: "sloten", label: "Sloten & sluitwerk", re: /\bslot|hangslot|cilinder|grendel|harpsluit|d-sluiting|scharnier|\bbeslag/i },
    ],
  },
  {
    key: "type-gereedschap",
    title: "Type",
    categories: ["gereedschap"],
    defs: [
      { id: "kwasten", label: "Kwasten", re: /kwast|penseel|patentpunt|bokkenpoot|blokkwast/i },
      { id: "rollers", label: "Rollers & verfbakjes", re: /roller|verfrol|schuimroller|vachtrol|verfbak|inzetbak|inzetpot|cuvet|verfcassette/i },
      { id: "schuur", label: "Schuurmateriaal", re: /schuur|glaspapier|schuurpapier|schuurblok|schuurspons|\bgrit\b|doorslijp|slijpschijf|lamellenwiel/i },
      { id: "boren", label: "Boren & bits", re: /\bboor|borenset|\bbit\b|bitset|bithouder|gatzaag/i },
      { id: "messen", label: "Messen & snijden", re: /\bmes\b|mesjes|stanleymes|afbreekmes|cutter|reservemes|stucadoorsmes/i },
      { id: "sleutels", label: "Sleutels & ratels", re: /sleutel|ratel|steeksleutel|inbus|dopsleutel/i },
      { id: "tangen", label: "Tangen", re: /\btang\b|combinatietang|waterpomptang|kniptang/i },
      { id: "hamers", label: "Hamers & beitels", re: /hamer|moker|\bbijl\b|beitel/i },
      { id: "zagen", label: "Zagen", re: /\bzaag|handzaag|figuurzaag|ijzerzaag/i },
      { id: "meten", label: "Meten & aftekenen", re: /\bmeet|waterpas|rolmaat|duimstok|schietlood|winkelhaak/i },
      { id: "tape", label: "Afplaktape & folie", re: /afplaktape|afplak|schilderstape|maskeer|afdekfolie|\btape\b/i },
    ],
  },
  {
    key: "type-behang",
    title: "Type",
    categories: ["behang"],
    defs: [
      { id: "vlies", label: "Vliesbehang", re: /vlies/i },
      { id: "vinyl", label: "Vinylbehang", re: /vinyl/i },
      { id: "glasweefsel", label: "Glasweefsel", re: /glasweefsel|glasvezel/i },
      { id: "benodigdheden", label: "Behangbenodigdheden", re: /behanglijm|behangplaksel|naadroller|behangschaar|perfax|behangtafel|loodlijn|kwast|roller/i },
      { id: "papier", label: "Papierbehang", re: /\bpapier/i },
    ],
  },
  {
    key: "type-elektra",
    title: "Type",
    categories: ["elektra"],
    defs: [
      { id: "verleng", label: "Verlengkabels & contactdozen", re: /verleng|haspel|contactdoos|stekkerdoos|verdeeldoos/i },
      { id: "melders", label: "Rook- & CO-melders", re: /rookmelder|koolmonoxide|\bco-?melder|hittemelder|brandblusser|branddeken/i },
      { id: "binders", label: "Kabelbinders & -goten", re: /kabelbinder|kabelschoen|tie-?wrap|kabelclip|kabelgoot/i },
      { id: "stekkers", label: "Stekkers & adapters", re: /stekker|adapter|verloop|contrastekker/i },
      { id: "batterijen", label: "Batterijen", re: /batterij|alkaline|knoopcel|oplaadbaar|\baccu\b/i },
    ],
  },
];

/** Eerste (meest specifieke) attribuut-waarde voor een product, of null. */
function attrValue(facet: AttrFacet, p: Product): string | null {
  // Categorie-gating: een facet hoort alleen bij de juiste categorieën — zo
  // lekken paint-facetten (Glansgraad, Toepassing) of behang/vloer-facetten
  // (Dessin) niet naar bv. gereedschap of schoonmaak.
  if (facet.categories && !facet.categories.includes(p.category)) return null;
  let hay = `${p.title} ${p.subCategory ?? ""}`;
  // Vul aan met de echte feature-waarden uit de specificaties (Lichtkleur,
  // Korrel, Materiaal, Geschikt voor, …) — die staan vaak niet in de titel.
  if (facet.specKeys?.length) {
    for (const group of p.specifications) {
      for (const item of group.items) {
        if (facet.specKeys.includes(item.label)) hay += ` ${item.label} ${item.value}`;
      }
    }
  }
  for (const d of facet.defs) if (d.re.test(hay)) return d.id;
  return null;
}

interface Filters {
  brands: string[];
  subCategories: string[];
  priceBuckets: string[];
  sizes: string[];
  badges: ProductBadge[];
  minRating: number;
  mengverf: boolean;
  /** Geselecteerde attribuut-waarden per facet-key (glans/materiaal/fitting/…). */
  attrs: Record<string, string[]>;
}

const EMPTY_FILTERS: Filters = {
  brands: [],
  subCategories: [],
  priceBuckets: [],
  sizes: [],
  badges: [],
  minRating: 0,
  mengverf: false,
  attrs: {},
};

/* --------------------------------------------------------------- component */

interface ProductListingProps {
  products: Product[];
  /** Analytics list context + grid list name. */
  listName?: string;
  className?: string;
}

export function ProductListing({
  products,
  listName,
  className,
}: ProductListingProps) {
  const t = useT();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("populair");
  const [sheetOpen, setSheetOpen] = useState(false);

  const viewMode = useViewMode((s) => s.mode);
  const setViewMode = useViewMode((s) => s.setMode);
  const mounted = useMounted();
  // Tot hydratie tonen we het raster (voorkomt hydration-mismatch op de
  // gepersisteerde voorkeur).
  const showList = mounted && viewMode === "list";

  // Uitverkochte producten tonen we niet. De webshop kijkt uitsluitend naar de
  // online verkoopbare voorraad (Nijverdal, boven de veiligheidsvoorraad) —
  // voorraad van andere vestigingen telt niet mee.
  const visibleProducts = useMemo(
    () => products.filter((p) => onlineStock(p.stockByStore) > 0),
    [products],
  );

  // Merken (junk-waarden eruit), alfabetisch.
  const availableBrands = useMemo(
    () =>
      Array.from(new Set(visibleProducts.map((p) => p.brand)))
        .filter((b) => b && !JUNK_BRANDS.has(b.toLowerCase()))
        .sort((a, b) => a.localeCompare(b)),
    [visibleProducts],
  );

  // Productsoorten (subcategorieën) in deze set.
  const availableSubCategories = useMemo(
    () =>
      Array.from(
        new Set(visibleProducts.map((p) => p.subCategory).filter((s): s is string => !!s)),
      ).sort((a, b) => a.localeCompare(b)),
    [visibleProducts],
  );

  // Inhoud-maten (volume) in deze set, klein → groot.
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of visibleProducts) for (const s of productVolumes(p)) set.add(s);
    return [...set].sort((a, b) => volumeMl(a) - volumeMl(b));
  }, [visibleProducts]);

  // Only show badge facets that actually occur in the set.
  const availableBadges = useMemo(
    () => BADGE_FILTERS.filter((b) => visibleProducts.some((p) => p.badges?.includes(b))),
    [visibleProducts],
  );

  const hasMengverf = useMemo(
    () => visibleProducts.some((p) => p.colorMatchable),
    [visibleProducts],
  );

  // Attribuut-facetten die in deze set voorkomen (≥2 waarden) — categorie-afhankelijk.
  const availableAttrs = useMemo(() => {
    const out: { facet: AttrFacet; values: AttrDef[] }[] = [];
    for (const facet of ATTRIBUTE_FACETS) {
      const present = new Set<string>();
      for (const p of visibleProducts) {
        const v = attrValue(facet, p);
        if (v) present.add(v);
      }
      const values = facet.defs.filter((d) => present.has(d.id));
      if (values.length >= 2) out.push({ facet, values });
    }
    return out;
  }, [visibleProducts]);

  // Opties + voorbeelden voor de AI-productzoeker (bovenaan de lijst).
  const finderOptions = useMemo(
    () => ({
      subCategories: availableSubCategories,
      brands: availableBrands,
      attrs: availableAttrs.map((a) => ({
        key: a.facet.key,
        title: a.facet.title,
        values: a.values.map((v) => ({ id: v.id, label: v.label })),
      })),
    }),
    [availableSubCategories, availableBrands, availableAttrs],
  );
  const finderExamples = useMemo(() => availableSubCategories.slice(0, 4), [availableSubCategories]);

  // AI-keuzes toepassen: vervang de filters door de gevonden selectie.
  const applyAiFilters = (sel: AiSelections) => {
    setFilters({
      ...EMPTY_FILTERS,
      brands: sel.brands.filter((b) => availableBrands.includes(b)),
      subCategories: sel.subCategories.filter((s) => availableSubCategories.includes(s)),
      attrs: sel.attrs,
    });
    setSheetOpen(false);
  };

  const filtered = useMemo(() => {
    return visibleProducts.filter((p) => {
      if (filters.mengverf && !p.colorMatchable) return false;
      if (filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (
        filters.subCategories.length &&
        !(p.subCategory && filters.subCategories.includes(p.subCategory))
      )
        return false;
      if (filters.minRating > 0 && p.rating < filters.minRating) return false;

      if (filters.sizes.length) {
        const vols = productVolumes(p);
        if (!filters.sizes.some((s) => vols.includes(s))) return false;
      }

      if (filters.priceBuckets.length) {
        const inBucket = filters.priceBuckets.some((id) => {
          const bucket = PRICE_BUCKETS.find((b) => b.id === id);
          if (!bucket) return false;
          return p.price >= bucket.min && p.price < bucket.max;
        });
        if (!inBucket) return false;
      }

      if (filters.badges.length) {
        const hasBadge = filters.badges.some((b) => p.badges?.includes(b));
        if (!hasBadge) return false;
      }

      for (const facet of ATTRIBUTE_FACETS) {
        const sel = filters.attrs[facet.key];
        if (sel && sel.length) {
          const v = attrValue(facet, p);
          if (!v || !sel.includes(v)) return false;
        }
      }

      return true;
    });
  }, [visibleProducts, filters]);

  const sorted = useMemo(() => {
    // "populair"/"nieuwste" keep the curated source order (stable).
    if (sort === "populair" || sort === "nieuwste") return filtered;
    const copy = [...filtered];
    switch (sort) {
      case "prijs-op":
        copy.sort((a, b) => a.price - b.price);
        break;
      case "prijs-af":
        copy.sort((a, b) => b.price - a.price);
        break;
      case "beoordeling":
        copy.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
    }
    return copy;
  }, [filtered, sort]);

  const activeFilterCount =
    filters.brands.length +
    filters.subCategories.length +
    filters.priceBuckets.length +
    filters.sizes.length +
    filters.badges.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.mengverf ? 1 : 0) +
    Object.values(filters.attrs).reduce((s, a) => s + a.length, 0);

  function toggleIn<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  const toggleBrand = (brand: string) =>
    setFilters((f) => ({ ...f, brands: toggleIn(f.brands, brand) }));
  const toggleSub = (slug: string) =>
    setFilters((f) => ({ ...f, subCategories: toggleIn(f.subCategories, slug) }));
  const toggleSize = (size: string) =>
    setFilters((f) => ({ ...f, sizes: toggleIn(f.sizes, size) }));
  const toggleBucket = (id: string) =>
    setFilters((f) => ({ ...f, priceBuckets: toggleIn(f.priceBuckets, id) }));
  const toggleBadge = (badge: ProductBadge) =>
    setFilters((f) => ({ ...f, badges: toggleIn(f.badges, badge) }));
  const toggleRating = (min: number) =>
    setFilters((f) => ({ ...f, minRating: f.minRating === min ? 0 : min }));
  const toggleMengverf = () => setFilters((f) => ({ ...f, mengverf: !f.mengverf }));
  const toggleAttr = (key: string, id: string) =>
    setFilters((f) => {
      const cur = f.attrs[key] ?? [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      const attrs = { ...f.attrs };
      if (next.length) attrs[key] = next;
      else delete attrs[key];
      return { ...f, attrs };
    });
  const clearFilters = () => setFilters(EMPTY_FILTERS);

  // Fire view_item_list once on mount (matches the ViewItemListTracker shape).
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || visibleProducts.length === 0) return;
    fired.current = true;
    trackEvent("view_item_list", {
      item_list_name: listName ?? "Productoverzicht",
      items: visibleProducts.slice(0, 12).map((p) =>
        toAnalyticsItem({
          id: p.id,
          title: p.title,
          brand: p.brand,
          category: p.category,
          price: p.kluspasPrice,
        }),
      ),
    });
  }, [visibleProducts, listName]);

  const filterPanel = (
    <FilterControls
      availableBrands={availableBrands}
      availableSubCategories={availableSubCategories}
      availableSizes={availableSizes}
      availableBadges={availableBadges}
      hasMengverf={hasMengverf}
      filters={filters}
      onToggleBrand={toggleBrand}
      onToggleSub={toggleSub}
      onToggleSize={toggleSize}
      onToggleBucket={toggleBucket}
      onToggleBadge={toggleBadge}
      onToggleRating={toggleRating}
      onToggleMengverf={toggleMengverf}
      availableAttrs={availableAttrs}
      onToggleAttr={toggleAttr}
    />
  );

  return (
    <div className={cn("container-klusr", className)}>
      <AiFinder
        category={listName}
        options={finderOptions}
        examples={finderExamples}
        onApply={applyAiFilters}
        className="mb-6"
      />
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">{t("plp.filters")}</h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {t("plp.clearFiltersCount", { count: activeFilterCount })}
                </button>
              )}
            </div>
            {filterPanel}
          </div>
        </aside>

        <div>
          {/* Toolbar: result count + mobile filter trigger + sort */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{sorted.length}</span>{" "}
              {sorted.length === 1 ? t("plp.resultCountOne") : t("plp.resultCount")}
            </p>

            <div className="flex items-center gap-2">
              {/* Mobile filters trigger */}
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    {t("plp.filters")}
                    {activeFilterCount > 0 && (
                      <span className="grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="flex max-h-[85vh] flex-col" hideClose>
                  <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
                    <SheetTitle>{t("plp.filters")}</SheetTitle>
                    <div className="flex items-center gap-3">
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {t("plp.clearFilters")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSheetOpen(false)}
                        aria-label={t("lang.dismiss")}
                        className="rounded-md p-1 text-muted-foreground hover:bg-secondary"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-5 py-4">{filterPanel}</div>
                  <SheetFooter>
                    <Button onClick={() => setSheetOpen(false)} size="lg">
                      {sorted.length === 1
                        ? t("plp.showOne", { count: sorted.length })
                        : t("plp.show", { count: sorted.length })}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>

              {/* Weergave: raster / lijst */}
              <div
                role="group"
                aria-label={t("plp.viewAria")}
                className="hidden items-center rounded-md border border-input bg-card p-0.5 sm:flex"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label={t("plp.viewGrid")}
                  aria-pressed={!showList}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground",
                    !showList && "bg-secondary text-foreground",
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  aria-label={t("plp.viewList")}
                  aria-pressed={showList}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded text-muted-foreground transition-colors hover:text-foreground",
                    showList && "bg-secondary text-foreground",
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Sort */}
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[170px] text-sm" aria-label={t("plp.sortAria")}>
                  <SelectValue placeholder={t("plp.sortAria")} />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {filters.mengverf && (
                <FilterChip onRemove={toggleMengverf}>{t("plp.colorMixable")}</FilterChip>
              )}
              {filters.subCategories.map((slug) => (
                <FilterChip key={`s-${slug}`} onRemove={() => toggleSub(slug)}>
                  {prettySub(slug)}
                </FilterChip>
              ))}
              {filters.brands.map((brand) => (
                <FilterChip key={`b-${brand}`} onRemove={() => toggleBrand(brand)}>
                  {brand}
                </FilterChip>
              ))}
              {filters.sizes.map((size) => (
                <FilterChip key={`sz-${size}`} onRemove={() => toggleSize(size)}>
                  {size}
                </FilterChip>
              ))}
              {filters.priceBuckets.map((id) => {
                const bucket = PRICE_BUCKETS.find((b) => b.id === id);
                return (
                  <FilterChip key={`p-${id}`} onRemove={() => toggleBucket(id)}>
                    {bucket ? t(bucket.labelKey) : id}
                  </FilterChip>
                );
              })}
              {availableAttrs.flatMap(({ facet }) =>
                (filters.attrs[facet.key] ?? []).map((id) => (
                  <FilterChip
                    key={`${facet.key}-${id}`}
                    onRemove={() => toggleAttr(facet.key, id)}
                  >
                    {facet.defs.find((d) => d.id === id)?.label ?? id}
                  </FilterChip>
                )),
              )}
              {filters.minRating > 0 && (
                <FilterChip onRemove={() => toggleRating(filters.minRating)}>
                  {t("plp.ratingChip", { rating: String(filters.minRating).replace(".", ",") })}
                </FilterChip>
              )}
              {filters.badges.map((badge) => (
                <FilterChip key={`bd-${badge}`} onRemove={() => toggleBadge(badge)}>
                  {t(BADGE_LABEL_KEYS[badge])}
                </FilterChip>
              ))}
            </div>
          )}

          {/* Results */}
          {sorted.length > 0 ? (
            showList ? (
              <div className="flex flex-col gap-3">
                {sorted.map((product) => (
                  <ProductListRow
                    key={product.id}
                    product={product}
                    listName={listName}
                  />
                ))}
              </div>
            ) : (
              <ProductGrid products={sorted} listName={listName} />
            )
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-base font-bold">{t("plp.empty.title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("plp.empty.text")}
              </p>
              <Button onClick={clearFilters} variant="outline" className="mt-4">
                {t("plp.clearAll")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------- reusable sub-pieces */

function FilterControls({
  availableBrands,
  availableSubCategories,
  availableSizes,
  availableBadges,
  hasMengverf,
  availableAttrs,
  filters,
  onToggleBrand,
  onToggleSub,
  onToggleSize,
  onToggleBucket,
  onToggleBadge,
  onToggleRating,
  onToggleMengverf,
  onToggleAttr,
}: {
  availableBrands: string[];
  availableSubCategories: string[];
  availableSizes: string[];
  availableBadges: ProductBadge[];
  hasMengverf: boolean;
  availableAttrs: { facet: AttrFacet; values: AttrDef[] }[];
  filters: Filters;
  onToggleBrand: (brand: string) => void;
  onToggleSub: (slug: string) => void;
  onToggleSize: (size: string) => void;
  onToggleBucket: (id: string) => void;
  onToggleBadge: (badge: ProductBadge) => void;
  onToggleRating: (min: number) => void;
  onToggleMengverf: () => void;
  onToggleAttr: (key: string, id: string) => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      {hasMengverf && (
        <>
          <FilterGroup title={t("plp.group.mengverf")}>
            <CheckRow
              id="filter-mengverf"
              checked={filters.mengverf}
              onChange={onToggleMengverf}
              label={t("plp.colorMixable")}
            />
          </FilterGroup>
          <Separator />
        </>
      )}

      {availableSubCategories.length > 1 && (
        <>
          <FilterGroup title={t("plp.group.productType")}>
            {availableSubCategories.map((slug) => (
              <CheckRow
                key={slug}
                id={`filter-sub-${slug}`}
                checked={filters.subCategories.includes(slug)}
                onChange={() => onToggleSub(slug)}
                label={prettySub(slug)}
              />
            ))}
          </FilterGroup>
          <Separator />
        </>
      )}

      {availableAttrs.map(({ facet, values }) => (
        <div key={facet.key} className="flex flex-col gap-5">
          <FilterGroup title={FACET_TITLE_KEY[facet.title] ? t(FACET_TITLE_KEY[facet.title]) : facet.title}>
            {values.map((v) => (
              <CheckRow
                key={v.id}
                id={`filter-${facet.key}-${v.id}`}
                checked={(filters.attrs[facet.key] ?? []).includes(v.id)}
                onChange={() => onToggleAttr(facet.key, v.id)}
                label={v.label}
              />
            ))}
          </FilterGroup>
          <Separator />
        </div>
      ))}

      <FilterGroup title={t("plp.group.price")}>
        {PRICE_BUCKETS.map((bucket) => (
          <CheckRow
            key={bucket.id}
            id={`filter-price-${bucket.id}`}
            checked={filters.priceBuckets.includes(bucket.id)}
            onChange={() => onToggleBucket(bucket.id)}
            label={t(bucket.labelKey)}
          />
        ))}
      </FilterGroup>

      {availableSizes.length > 1 && (
        <>
          <Separator />
          <FilterGroup title={t("plp.group.volume")}>
            {availableSizes.map((size) => (
              <CheckRow
                key={size}
                id={`filter-size-${size}`}
                checked={filters.sizes.includes(size)}
                onChange={() => onToggleSize(size)}
                label={size}
              />
            ))}
          </FilterGroup>
        </>
      )}

      <Separator />
      <FilterGroup title={t("plp.group.rating")}>
        {RATING_BUCKETS.map((bucket) => (
          <CheckRow
            key={bucket.min}
            id={`filter-rating-${bucket.min}`}
            checked={filters.minRating === bucket.min}
            onChange={() => onToggleRating(bucket.min)}
            label={
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-klusr-action text-klusr-action" />
                {t(bucket.labelKey)}
              </span>
            }
          />
        ))}
      </FilterGroup>

      {availableBadges.length > 0 && (
        <>
          <Separator />
          <FilterGroup title={t("plp.group.dealsLabels")}>
            {availableBadges.map((badge) => (
              <CheckRow
                key={badge}
                id={`filter-badge-${badge}`}
                checked={filters.badges.includes(badge)}
                onChange={() => onToggleBadge(badge)}
                label={t(BADGE_LABEL_KEYS[badge])}
              />
            ))}
          </FilterGroup>
        </>
      )}

      {availableBrands.length > 1 && (
        <>
          <Separator />
          <FilterGroup title={t("plp.group.brand")}>
            {availableBrands.map((brand) => (
              <CheckRow
                key={brand}
                id={`filter-brand-${brand}`}
                checked={filters.brands.includes(brand)}
                onChange={() => onToggleBrand(brand)}
                label={brand}
              />
            ))}
          </FilterGroup>
        </>
      )}
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2.5 text-sm font-bold">{title}</h3>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function CheckRow({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Checkbox id={id} checked={checked} onCheckedChange={() => onChange()} />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}

function FilterChip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
    >
      {children}
      <X className="h-3 w-3" />
    </button>
  );
}
