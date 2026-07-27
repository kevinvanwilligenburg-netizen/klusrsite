"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Palette,
  Check,
  ArrowRight,
  ArrowLeft,
  Home,
  Building2,
  DoorOpen,
  Layers,
  PanelTop,
  Sparkles,
  Info,
  SlidersHorizontal,
  Plus,
  Search,
  ShoppingCart,
  Heart,
  CreditCard,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import type { Product, ProductVariant, SelectedColor } from "@/types";
import { colorCollections, popularColors2026, isLightColor } from "@/lib/data/colors";
import type { ColorCollection } from "@/lib/data/colors";
import { fetchPortalColors } from "@/lib/portal-colors";
import { withBase } from "@/lib/paint-bases";
import { useCart } from "@/lib/store/cart";
import { useFavorites } from "@/lib/store/favorites";
import { useUI } from "@/lib/store/ui";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking";

interface Klus {
  id: string;
  label: string;
  sub: string;
  icon: typeof Home;
  include: string[];
  exclude?: string[];
  /** Optioneel: verbreed naar een ruimere set (bv. plafond → alle muurverf). */
  broaden?: { label: string; include: string[] };
}

const KLUSSEN: Klus[] = [
  { id: "binnenmuur", label: "Binnenmuur", sub: "Woonkamer, slaapkamer, gang", icon: Home, include: ["binnenmuur", "binnen", "muurverf", "muur", "latex"], exclude: ["buiten", "gevel"] },
  { id: "buitenmuur", label: "Buitenmuur & gevel", sub: "Buitenwerk dat tegen weer moet", icon: Building2, include: ["buitenmuur", "buiten", "gevel"] },
  { id: "hout", label: "Hout, kozijn & deur", sub: "Lak en beits voor houtwerk", icon: DoorOpen, include: ["lak", "beits", "hout", "kozijn", "deur", "meubel", "grondverf", "primer"] },
  { id: "vloer", label: "Vloer & beton", sub: "Vloeren, trappen en garage", icon: Layers, include: ["vloer", "beton", "garage", "trap"] },
  { id: "plafond", label: "Plafond", sub: "Strak en mat naar boven", icon: PanelTop, include: ["plafond"], broaden: { label: "Ook alle muurverf tonen", include: ["muurverf", "muur", "binnen", "latex"] } },
];

const hay = (p: Product) => `${p.category} ${p.subCategory ?? ""} ${p.title}`.toLowerCase();
const matchesKlus = (p: Product, klus: Klus) => {
  const h = hay(p);
  if (klus.exclude?.some((k) => h.includes(k))) return false;
  return klus.include.some((k) => h.includes(k));
};
const appliesOutside = (p: Product) => /buiten|gevel|tuin/.test(hay(p));
const appliesInside = (p: Product) => /binnen|plafond|latex|muurverf/.test(hay(p)) || !appliesOutside(p);

type Toepassing = "alle" | "binnen" | "buiten";

const cheapestKluspas = (p: Product) => Math.min(...p.variants.map((v) => v.kluspasPrice));
const variantPrice = (v: ProductVariant, color: SelectedColor | null) =>
  v.kluspasPrice + (color?.base?.surcharge ?? 0);

interface Props {
  colorProducts: Product[];
  accessories?: Product[];
}

const STEPS = [
  { n: 1, label: "Kleur" },
  { n: 2, label: "Klus" },
  { n: 3, label: "Verf" },
  { n: 4, label: "Erbij" },
  { n: 5, label: "Overzicht" },
] as const;

/**
 * Doorzoekbare multi-select dropdown met *alle* collecties.
 * Werkt volledig op de bestaande selectie-state van de funnel (geen eigen
 * selectie-state): `selected` is dezelfde `activeCollections`-Set, en
 * aan/uitvinken roept dezelfde `onToggle` (= toggleCollection) aan. Zo blijven
 * de chip-rij en deze lijst altijd gesynchroniseerd.
 */
function CollectiesDropdown({
  collections,
  selected,
  onToggle,
  onClear,
}: {
  collections: ColorCollection[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const count = selected.size;

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return collections;
    return collections.filter((c) => c.name.toLowerCase().includes(f));
  }, [filter, collections]);

  // Sluit bij klik buiten de dropdown.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Focus het zoekveld zodra de lijst opent.
  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setFilter("");
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors sm:w-auto",
          open || count > 0
            ? "border-primary/40 bg-primary/5 text-foreground"
            : "border-border bg-card text-foreground hover:border-primary/40",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Alle collecties
          {count > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-white">
              {count}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card-hover sm:right-auto sm:w-80"
          role="dialog"
          aria-label="Collecties kiezen"
        >
          {/* Zoekveld */}
          <div className="shrink-0 border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchRef}
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    if (filter) setFilter("");
                    else setOpen(false);
                  }
                }}
                placeholder="Zoek collectie…"
                aria-label="Zoek collectie"
                className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
              />
            </div>
          </div>

          {/* Lijst met alle collecties (checkboxes, multi-select) */}
          <ul role="listbox" aria-multiselectable className="min-h-0 flex-1 overflow-y-auto p-1">
            {shown.map((c) => {
              const on = selected.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => onToggle(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                      on ? "bg-primary/5" : "hover:bg-secondary/60",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded border-2 transition-colors",
                        on ? "border-primary bg-primary text-white" : "border-input text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-1.5 text-[10px] font-bold leading-4 text-muted-foreground">
                      {c.colors.length}
                    </span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                Geen collectie gevonden voor &ldquo;{filter}&rdquo;.
              </li>
            )}
          </ul>

          {/* Voettekst: tellertje + wis-actie */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-secondary/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              {count} van {collections.length} geselecteerd
            </span>
            <button
              type="button"
              onClick={onClear}
              disabled={count === 0}
              className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
            >
              Wis selectie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function KleurenkiezerFunnel({ colorProducts, accessories = [] }: Props) {
  const router = useRouter();
  const addItem = useCart((s) => s.addItem);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const toggleFavorite = useFavorites((s) => s.toggle);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Stap 1 — kleur
  const [collections, setCollections] = useState(colorCollections);
  const [activeCollections, setActiveCollections] = useState<Set<string>>(
    () => new Set([colorCollections[0].id]),
  );
  const [query, setQuery] = useState("");
  const [color, setColor] = useState<SelectedColor | null>(null);

  // Live kleuren uit de portal (Gamma/AkzoNobel/RAL …); terugval op gecureerde set.
  useEffect(() => {
    let on = true;
    fetchPortalColors().then((cols) => {
      if (!on || !cols.length) return;
      const merged = [popularColors2026, ...cols.filter((c) => c.id !== popularColors2026.id)];
      setCollections(merged);
      setActiveCollections((cur) => {
        const valid = new Set([...cur].filter((id) => merged.some((c) => c.id === id)));
        return valid.size ? valid : new Set([merged[0].id]);
      });
    });
    return () => {
      on = false;
    };
  }, []);

  // Stap 2/3 — klus + filters
  const [klus, setKlus] = useState<Klus | null>(null);
  const [toepassing, setToepassing] = useState<Toepassing>("alle");
  const [brand, setBrand] = useState<string>("alle");
  const [broaden, setBroaden] = useState(false);

  // Stap 3 — gekozen verf + maat
  const [variantChoice, setVariantChoice] = useState<Record<string, string>>({});
  const [paint, setPaint] = useState<{ product: Product; variant: ProductVariant } | null>(null);

  // Stap 4 — bijverkoop
  const [accSelected, setAccSelected] = useState<Set<string>>(new Set());

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();
  // Bladeren toont een venster van kleuren; "meer laden" + infinite scroll breiden
  // het uit (desktop kon eerder niet voorbij de eerste 150 van duizenden).
  const BROWSE_STEP = 150;
  const [visibleCount, setVisibleCount] = useState(BROWSE_STEP);
  const allColorsList = useMemo(() => collections.flatMap((c) => c.colors), [collections]);
  const pickedCollections = useMemo(
    () => collections.filter((c) => activeCollections.has(c.id)),
    [collections, activeCollections],
  );

  // Volledige, ontdubbelde bladerlijst (alle kleuren uit de gekozen bron).
  const browseList = useMemo(() => {
    const source = pickedCollections.length ? pickedCollections : collections;
    const seen = new Set<string>();
    const out: SelectedColor[] = [];
    for (const c of source.flatMap((x) => x.colors)) {
      const k = `${c.code}|${c.hex}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(c);
    }
    return out;
  }, [pickedCollections, collections]);

  const shownColors = useMemo(() => {
    if (searching) {
      return allColorsList
        .filter((c) => `${c.name} ${c.code} ${c.collection ?? ""}`.toLowerCase().includes(q))
        .slice(0, 60);
    }
    return browseList.slice(0, visibleCount);
  }, [searching, q, allColorsList, browseList, visibleCount]);

  const browseTotal = browseList.length;
  const hasMoreColors = !searching && shownColors.length < browseTotal;

  // Reset het venster bij een nieuwe selectie/bron of zoekactie.
  useEffect(() => {
    setVisibleCount(BROWSE_STEP);
  }, [pickedCollections, collections, searching]);

  // Infinite scroll: laad het volgende venster zodra de sentinel in beeld komt.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMoreColors) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((n) => n + BROWSE_STEP);
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMoreColors, shownColors.length]);

  // Suggesties terwijl je typt: collecties waarvan de naam matcht.
  const collectionSuggestions = useMemo(
    () => (searching ? collections.filter((c) => c.name.toLowerCase().includes(q)) : []),
    [searching, q, collections],
  );

  function toggleCollection(id: string) {
    setActiveCollections((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearCollections() {
    setActiveCollections(new Set());
  }

  function pickColor(c: SelectedColor) {
    setColor(withBase(c));
    trackEvent("color_selected", { color: c.name, code: c.code, source: "kleurenkiezer" });
    setStep(2);
  }

  function pickKlus(k: Klus) {
    setKlus(k);
    setToepassing("alle");
    setBrand("alle");
    setBroaden(false);
    trackEvent("kleurenkiezer_klus", { klus: k.id });
    setStep(3);
  }

  const matches = useMemo(() => {
    if (!klus) return [];
    if (broaden && klus.broaden) {
      return colorProducts.filter((p) => klus.broaden!.include.some((k) => hay(p).includes(k)));
    }
    const base = colorProducts.filter((p) => matchesKlus(p, klus));
    return base.length > 0 ? base : colorProducts;
  }, [klus, broaden, colorProducts]);

  const usedFallback = klus
    ? !broaden && colorProducts.filter((p) => matchesKlus(p, klus)).length === 0
    : false;

  const brands = useMemo(
    () => Array.from(new Set(matches.map((p) => p.brand).filter(Boolean))).sort(),
    [matches],
  );

  const filteredMatches = useMemo(
    () =>
      matches.filter((p) => {
        if (toepassing === "binnen" && !appliesInside(p)) return false;
        if (toepassing === "buiten" && !appliesOutside(p)) return false;
        if (brand !== "alle" && p.brand !== brand) return false;
        return true;
      }),
    [matches, toepassing, brand],
  );

  function variantFor(p: Product): ProductVariant {
    return p.variants.find((v) => v.id === variantChoice[p.id]) ?? p.variants[0];
  }

  function selectPaint(p: Product) {
    const variant = variantFor(p);
    setPaint({ product: p, variant });
    trackEvent("select_item", { item_id: p.id, source: "kleurenkiezer" });
    setStep(4);
  }

  function toggleAcc(id: string) {
    setAccSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const chosenAccessories = accessories.filter((a) => accSelected.has(a.id));
  const paintPrice = paint ? variantPrice(paint.variant, color) : 0;
  const accTotal = chosenAccessories.reduce((s, a) => s + cheapestKluspas(a), 0);
  const grandTotal = paintPrice + accTotal;

  function addEverythingToCart() {
    if (!paint || !color) return;
    addItem({ product: paint.product, variant: paint.variant, quantity: 1, color });
    for (const a of chosenAccessories) {
      addItem({ product: a, variant: a.variants[0], quantity: 1 });
    }
  }

  function handleCheckout() {
    addEverythingToCart();
    trackEvent("begin_checkout", { value: grandTotal });
    router.push("/checkout");
  }

  function handleAddToCart() {
    addEverythingToCart();
    trackEvent("add_to_cart", { value: grandTotal, source: "kleurenkiezer" });
    toast.success("Toegevoegd aan winkelwagen");
    setCartOpen(true);
  }

  function handleSave() {
    if (!paint) return;
    toggleFavorite(paint.product.id);
    trackEvent("save_for_later", { item_id: paint.product.id, source: "kleurenkiezer" });
    toast.success("Opgeslagen", { description: `${paint.product.title} staat in je favorieten.` });
  }

  const reachable = (n: number) =>
    n <= step ||
    (n === 2 && color) ||
    (n === 3 && color && klus) ||
    (n >= 4 && paint);

  const chip = (active: boolean) =>
    cn(
      "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
      active ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-secondary/70",
    );

  return (
    <div className="flex flex-col gap-8 py-6 sm:py-8">
      {/* Hero */}
      <section className="container-klusr">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
          <Palette className="h-3.5 w-3.5" />
          KLEURENKIEZER
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Eerst je kleur, dan je verf
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Kies je kleur, kies je verf en reken in een paar stappen af — wij mengen
          &apos;m exact op kleur. Voor 10:00 besteld, vanavond in huis.
        </p>
      </section>

      {/* Stepper */}
      <section className="container-klusr">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const current = step === s.n;
            const ok = reachable(s.n);
            return (
              <li key={s.n} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!ok && !current}
                  onClick={() => ok && setStep(s.n as 1 | 2 | 3 | 4 | 5)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                    current && "bg-primary text-white",
                    done && "bg-primary/10 text-primary hover:bg-primary/20",
                    !current && !done && "bg-secondary text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded-full text-xs",
                      current ? "bg-white text-primary" : done ? "bg-primary text-white" : "bg-card",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
              </li>
            );
          })}
        </ol>

        {(color || klus || paint) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {color && (
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-medium hover:border-primary/40">
                <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                {color.name}
                <span className="text-xs text-muted-foreground">wijzig</span>
              </button>
            )}
            {klus && (
              <button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-medium hover:border-primary/40">
                <klus.icon className="h-4 w-4 text-primary" />
                {klus.label}
                <span className="text-xs text-muted-foreground">wijzig</span>
              </button>
            )}
            {paint && (
              <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-medium hover:border-primary/40">
                <Sparkles className="h-4 w-4 text-primary" />
                {paint.product.title} · {paint.variant.label}
                <span className="text-xs text-muted-foreground">wijzig</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* STAP 1 — Kleur (zoekbaar + alle collecties) */}
      {step === 1 && (
        <section className="container-klusr">
          <div className="relative mb-4 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op kleur, code of collectie…"
              className="w-full rounded-full border border-input bg-card py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {!searching && (
            <>
              {/* Volledige, doorzoekbare collectie-keuze — gesynchroniseerd met de chip-rij */}
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <CollectiesDropdown
                  collections={collections}
                  selected={activeCollections}
                  onToggle={toggleCollection}
                  onClear={clearCollections}
                />
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-1 sm:px-0 sm:pb-0">
                  {collections.map((c) => {
                  const on = activeCollections.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCollection(c.id)}
                      aria-pressed={on}
                      className={cn("inline-flex shrink-0 items-center gap-1.5", chip(on))}
                    >
                      {on && <Check className="h-3.5 w-3.5" />}
                      {c.name}
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] font-bold leading-4",
                          on ? "bg-white/25" : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {c.colors.length}
                      </span>
                    </button>
                  );
                  })}
                </div>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Tik meerdere collecties aan om ze samen te bekijken
                {browseTotal > shownColors.length ? ` · ${shownColors.length} van ${browseTotal} kleuren` : ""}
              </p>
            </>
          )}

          {searching && collectionSuggestions.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Collecties
              </p>
              <div className="flex flex-wrap gap-2">
                {collectionSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCollections((cur) => new Set([...cur, c.id]));
                      setQuery("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {c.name}
                    <span className="rounded-full bg-secondary px-1.5 text-[10px] font-bold leading-4 text-muted-foreground">
                      {c.colors.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searching && (
            <p className="mb-3 text-sm text-muted-foreground">
              {shownColors.length} kleur{shownColors.length === 1 ? "" : "en"} gevonden
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shownColors.map((c) => {
              const light = isLightColor(c.hex);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => pickColor(c)}
                  className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl border border-black/5 p-3 text-left shadow-sm ring-primary transition-all hover:scale-[1.02] hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: c.hex }}
                >
                  <span className={cn("rounded-md px-2 py-1 text-xs font-bold backdrop-blur", light ? "bg-black/5 text-black/80" : "bg-white/15 text-white")}>
                    {c.name}
                    <span className="block text-[10px] font-medium opacity-70">{c.code}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {hasMoreColors && (
            <div ref={loadMoreRef} className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + BROWSE_STEP)}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Meer kleuren laden ({browseTotal - shownColors.length} resterend)
              </button>
            </div>
          )}
          {searching && shownColors.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4">
              <p className="text-sm font-semibold">Geen losse kleur gevonden voor &ldquo;{query}&rdquo;</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Kies hieronder een of meer collecties om in te bladeren:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {collections.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCollections((cur) => new Set([...cur, c.id]));
                      setQuery("");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {c.name}
                    <span className="rounded-full bg-secondary px-1.5 text-[10px] font-bold leading-4 text-muted-foreground">
                      {c.colors.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* STAP 2 — Klus */}
      {step === 2 && (
        <section className="container-klusr">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {KLUSSEN.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => pickKlus(k)}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-card-hover"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <k.icon className="h-6 w-6" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">{k.label}</span>
                  <span className="block text-sm text-muted-foreground">{k.sub}</span>
                </span>
                <ArrowRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setStep(1)} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Terug naar kleur
          </button>
        </section>
      )}

      {/* STAP 3 — Verf kiezen (incl. maat) */}
      {step === 3 && color && klus && (
        <section className="container-klusr">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
            <span className="h-12 w-12 shrink-0 rounded-xl border border-black/10 shadow-inner" style={{ backgroundColor: color.hex }} />
            <div className="min-w-0">
              <p className="font-bold">
                {color.name} <span className="font-medium text-muted-foreground">· {color.code}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {filteredMatches.length} verfsoort{filteredMatches.length === 1 ? "" : "en"} voor {klus.label.toLowerCase()} — op kleur gemengd
              </p>
            </div>
          </div>

          {usedFallback && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Geen exacte match voor deze klus — we tonen al onze mengbare verf in jouw kleur.
            </div>
          )}

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" /> Filter
            </span>
            {([
              { id: "alle", label: "Alle" },
              { id: "binnen", label: "Binnen" },
              { id: "buiten", label: "Buiten" },
            ] as const).map((t) => (
              <button key={t.id} type="button" onClick={() => setToepassing(t.id)} className={chip(toepassing === t.id)}>
                {t.label}
              </button>
            ))}
            {brands.length > 1 && (
              <>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                <button type="button" onClick={() => setBrand("alle")} className={cn(brand === "alle" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/70", "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors")}>
                  Alle merken
                </button>
                {brands.map((b) => (
                  <button key={b} type="button" onClick={() => setBrand(b)} className={cn(brand === b ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/70", "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors")}>
                    {b}
                  </button>
                ))}
              </>
            )}
            {klus.broaden && (
              <button
                type="button"
                onClick={() => setBroaden((v) => !v)}
                className={cn("ml-auto rounded-full px-3 py-1.5 text-sm font-semibold transition-colors", broaden ? "bg-primary text-white" : "border border-primary/30 text-primary hover:bg-primary/5")}
              >
                {broaden ? "Toon alleen plafondverf" : klus.broaden.label}
              </button>
            )}
          </div>

          {filteredMatches.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Geen verf gevonden met deze filters.{" "}
              <button type="button" onClick={() => { setToepassing("alle"); setBrand("alle"); }} className="font-semibold text-primary hover:underline">
                Filters wissen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMatches.map((p) => {
                const v = variantFor(p);
                return (
                  <Card key={p.id} className="flex flex-col overflow-hidden">
                    <div className="relative aspect-square bg-secondary/30">
                      {p.images[0] && (
                        <Image src={p.images[0]} alt={p.title} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-contain p-4" />
                      )}
                      <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-neutral-900 shadow-sm backdrop-blur">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                        {color.name}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.brand}</p>
                      <p className="mt-0.5 line-clamp-2 font-bold leading-snug">{p.title}</p>

                      {/* Maat kiezen */}
                      {p.variants.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.variants.map((vr) => (
                            <button
                              key={vr.id}
                              type="button"
                              onClick={() => setVariantChoice((prev) => ({ ...prev, [p.id]: vr.id }))}
                              className={cn(
                                "rounded-md border px-2 py-1 text-xs font-semibold transition-colors",
                                v.id === vr.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40",
                              )}
                            >
                              {vr.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-sm text-muted-foreground">
                          {p.variants.length > 1 ? "" : "vanaf "}
                          <span className="text-base font-black text-foreground">{formatPrice(variantPrice(v, color))}</span>
                        </span>
                      </div>

                      <Button onClick={() => selectPaint(p)} className="mt-3 w-full">
                        Selecteer deze verf
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Link
                        href={`/product/${p.slug}?kleur=${encodeURIComponent(color.code)}`}
                        className="mt-2 text-center text-xs font-medium text-muted-foreground hover:text-primary"
                      >
                        Bekijk productdetails
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <button type="button" onClick={() => setStep(2)} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Andere klus kiezen
          </button>
        </section>
      )}

      {/* STAP 4 — Bijverkoop (overslaanbaar) */}
      {step === 4 && paint && (
        <section className="container-klusr">
          <h2 className="text-xl font-extrabold tracking-tight">Vergeet je gereedschap niet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Met het juiste materiaal verft het sneller en strakker. Selecteer wat je nodig hebt — of sla deze stap over.
          </p>

          {accessories.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {accessories.map((a) => {
                const on = accSelected.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggleAcc(a.id)}
                    className={cn(
                      "flex flex-col rounded-xl border bg-card p-3 text-left transition-colors",
                      on ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-secondary/30">
                      {a.images[0] && <Image src={a.images[0]} alt={a.title} fill sizes="160px" className="object-contain p-2" />}
                      <span className={cn("absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-white transition-colors", on ? "border-primary bg-primary" : "border-border bg-white/80 text-transparent")}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug">{a.title}</p>
                    <span className="mt-1 text-sm font-black">{formatPrice(cheapestKluspas(a))}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Geen extra's beschikbaar.</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => setStep(5)}>
              Verder naar overzicht
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setStep(5)} className="text-sm font-semibold text-muted-foreground hover:text-primary">
              Overslaan
            </button>
          </div>
        </section>
      )}

      {/* STAP 5 — Overzicht + afronden */}
      {step === 5 && paint && color && (
        <section className="container-klusr">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-extrabold tracking-tight">Je samenstelling</h2>

              {/* Verf */}
              <div className="mt-4 flex gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-white">
                  {paint.product.images[0] && <Image src={paint.product.images[0]} alt={paint.product.title} fill sizes="80px" className="object-contain p-2" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{paint.product.brand}</p>
                  <p className="font-bold leading-snug">{paint.product.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {paint.variant.label} ·{" "}
                    <span className="inline-flex items-center gap-1">
                      <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color.hex }} />
                      {color.name} ({color.code})
                    </span>
                  </p>
                </div>
                <span className="font-black">{formatPrice(paintPrice)}</span>
              </div>

              {/* Accessoires */}
              {chosenAccessories.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-border pt-4">
                  {chosenAccessories.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 text-sm">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded border border-border bg-white">
                        {a.images[0] && <Image src={a.images[0]} alt={a.title} fill sizes="40px" className="object-contain p-1" />}
                      </div>
                      <span className="min-w-0 flex-1 truncate">{a.title}</span>
                      <span className="font-semibold">{formatPrice(cheapestKluspas(a))}</span>
                      <button type="button" onClick={() => toggleAcc(a.id)} className="text-xs text-muted-foreground hover:text-primary">
                        verwijder
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" onClick={() => setStep(4)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
                <Plus className="h-4 w-4" /> Gereedschap toevoegen
              </button>
            </div>

            {/* Afronden */}
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-secondary/40 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verf</span>
                <span className="font-semibold">{formatPrice(paintPrice)}</span>
              </div>
              {accTotal > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gereedschap</span>
                  <span className="font-semibold">{formatPrice(accTotal)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-bold">Totaal (KLUSR-prijs)</span>
                <span className="text-xl font-black">{formatPrice(grandTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Incl. btw · op kleur gemengd · voor 10:00 besteld, vanavond in huis.</p>

              <Button size="lg" className="mt-1 w-full" onClick={handleCheckout}>
                <CreditCard className="h-5 w-5" /> Direct afrekenen
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={handleAddToCart}>
                <ShoppingCart className="h-5 w-5" /> In winkelwagen
              </Button>
              <Button size="lg" variant="ghost" className="w-full" onClick={handleSave}>
                <Heart className="h-5 w-5" /> Opslaan voor later
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
