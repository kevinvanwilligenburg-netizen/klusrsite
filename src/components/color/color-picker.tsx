"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LayoutGrid, Search, X } from "lucide-react";
import type { SelectedColor } from "@/types";
import { colorCollections, popularColors2026, allColors, isLightColor } from "@/lib/data/colors";
import { fetchPortalColors } from "@/lib/portal-colors";
import { withBase } from "@/lib/paint-bases";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking";
import { formatPrice, cn } from "@/lib/utils";
import { CollectionBrowser } from "./collection-browser";

interface ColorPickerProps {
  value?: SelectedColor;
  onSelect: (color: SelectedColor) => void;
  /** Toon de bevestig-knop in de onderbalk (dialog-modus). */
  onConfirm?: (color: SelectedColor) => void;
  confirmLabel?: string;
  /** Sizing van de ouder; de kiezer vult de hoogte en scrollt intern. */
  className?: string;
}

const GRID_STYLE = { gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))" };

export function ColorPicker({
  value,
  onSelect,
  onConfirm,
  confirmLabel = "Kies deze kleur",
  className,
}: ColorPickerProps) {
  const [collections, setCollections] = useState(colorCollections);
  const [activeCollection, setActiveCollection] = useState(colorCollections[0].id);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SelectedColor | undefined>(value);
  const [browserOpen, setBrowserOpen] = useState(false);

  // Live kleuren uit de portal (Gamma/AkzoNobel/RAL); terugval op gecureerde set.
  useEffect(() => {
    let active = true;
    fetchPortalColors().then((cols) => {
      if (!active || !cols.length) return;
      // "Populair 2026" altijd vooraan houden, ook met live portal-kleuren.
      const merged = [
        popularColors2026,
        ...cols.filter((c) => c.id !== popularColors2026.id),
      ];
      setCollections(merged);
      setActiveCollection((cur) => (merged.some((c) => c.id === cur) ? cur : merged[0].id));
    });
    return () => {
      active = false;
    };
  }, []);

  /**
   * De pillen die in de strip blijven staan: de eerste paar collecties
   * ("Populair 2026" en de grote waaiers) plus de actieve, zodat je altijd ziet
   * waar je bent — ook als die uit het volledige overzicht komt. De rest zit
   * achter de "Alle …"-knop.
   */
  const snelkoppelingen = useMemo(() => {
    const eerste = collections.slice(0, 6);
    const actief = collections.find((c) => c.id === activeCollection);
    return actief && !eerste.some((c) => c.id === actief.id) ? [...eerste, actief] : eerste;
  }, [collections, activeCollection]);

  const allColors = useMemo(() => collections.flatMap((c) => c.colors), [collections]);
  const q = query.trim().toLowerCase();

  const matched = useMemo(() => {
    if (!q) return [];
    return allColors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.collection ?? "").toLowerCase().includes(q) ||
        (c.provider ?? "").toLowerCase().includes(q),
    );
  }, [q, allColors]);

  const searchGroups = useMemo(() => {
    if (!q) return [];
    const map = new Map<
      string,
      { name: string; id: string; colors: SelectedColor[]; total: number }
    >();
    for (const c of matched) {
      const name = c.collection || "Overig";
      let g = map.get(name);
      if (!g) {
        const coll = collections.find((cc) => cc.name === name);
        g = { name, id: coll?.id ?? name, colors: [], total: 0 };
        map.set(name, g);
      }
      g.total++;
      if (g.colors.length < 14) g.colors.push(c);
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 12);
  }, [q, matched, collections]);

  // Collecties waarvan de naam matcht (bv. "gamma") — als snelle filter bovenaan,
  // zodat je niet door honderden losse kleuren hoeft te scrollen.
  const matchedCollections = useMemo(() => {
    if (!q) return [];
    return collections.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12);
  }, [q, collections]);

  const activeColors = useMemo(
    () => collections.find((c) => c.id === activeCollection)?.colors ?? [],
    [collections, activeCollection],
  );

  function pick(color: SelectedColor) {
    const enriched = withBase(color);
    setSelected(enriched);
    onSelect(enriched);
    trackEvent("color_selected", {
      color_code: enriched.code,
      color_name: enriched.name,
      paint_base: enriched.base?.id,
    });
  }

  function openCollection(id: string) {
    setActiveCollection(id);
    setQuery("");
  }

  const renderSwatch = (color: SelectedColor, key: string) => {
    const active = selected?.code === color.code && selected?.hex === color.hex;
    return (
      <button
        key={key}
        type="button"
        onClick={() => pick(color)}
        title={`${color.name}${color.code ? ` · ${color.code}` : ""}`}
        aria-label={color.name}
        aria-pressed={active}
        className={cn(
          "group flex items-center gap-2 rounded-lg border p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
          active
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-secondary/40",
        )}
      >
        <span
          className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md border border-black/10 shadow-sm"
          style={{ backgroundColor: color.hex }}
        >
          {active && (
            <Check
              className={cn(
                "h-4 w-4 drop-shadow",
                isLightColor(color.hex) ? "text-black/80" : "text-white",
              )}
              strokeWidth={3}
            />
          )}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-semibold">{color.name}</span>
          {color.code && color.code !== color.name && (
            <span className="block truncate text-[10px] text-muted-foreground">{color.code}</span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden bg-card", className)}>
      <CollectionBrowser
        collections={collections}
        activeId={activeCollection}
        onPick={openCollection}
        open={browserOpen}
        onOpenChange={setBrowserOpen}
      />
      {/* Sticky: zoeken + collectie-pills */}
      <div className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek op kleur, code of collectie…"
            className="h-11 rounded-full pl-10 pr-9"
            inputMode="search"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Wissen"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!q && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 no-scrollbar">
            {/* Knop naar het volledige overzicht staat vóóraan: met 245
                collecties uit de portalfeed is de strip zelf geen bruikbare
                index meer — daarin swipe je op mobiel eindeloos. Hier staan
                alleen de eerste paar plus de actieve, zodat één tik altijd
                genoeg is om de rest te zien. */}
            <button
              type="button"
              onClick={() => setBrowserOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-2 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Alle {collections.length}
            </button>
            {snelkoppelingen.map((c) => {
              const active = activeCollection === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCollection(c.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {c.name}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold leading-4",
                      active ? "bg-white/25 text-white" : "bg-border text-muted-foreground",
                    )}
                  >
                    {c.colors.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollbaar lichaam */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {/* Bladeren: actieve collectie */}
        {!q && (
          <>
            <div className="grid gap-2.5" style={GRID_STYLE}>
              {activeColors.slice(0, 300).map((color, i) =>
                renderSwatch(color, `${color.code}-${color.hex}-${i}`),
              )}
              {activeColors.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Nog geen kleuren in deze collectie.
                </p>
              )}
            </div>
            {activeColors.length > 300 && (
              <p className="pt-3 text-center text-xs text-muted-foreground">
                Eerste 300 van {activeColors.length} kleuren — zoek op naam of code om alles te
                vinden.
              </p>
            )}
          </>
        )}

        {/* Zoeken: eerst passende collecties (snelle filter), dan losse kleuren */}
        {q && (
          <div className="space-y-5">
            {matchedCollections.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Collecties voor &ldquo;{query}&rdquo; — kies er één
                </p>
                <div className="flex flex-wrap gap-2">
                  {matchedCollections.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openCollection(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      {c.name}
                      <span className="rounded-full bg-border px-1.5 text-[10px] font-bold leading-4 text-muted-foreground">
                        {c.colors.length}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Zo bekijk je alle kleuren van de collectie overzichtelijk in plaats van
                  eindeloos scrollen.
                </p>
              </div>
            )}

            {searchGroups.length > 0 ? (
              <div className="space-y-5">
                {matchedCollections.length > 0 && (
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Losse kleuren
                  </p>
                )}
                {searchGroups.map((g) => (
                  <div key={g.id}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {g.name} <span className="text-foreground">· {g.total}</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openCollection(g.id)}
                        className="shrink-0 text-xs font-semibold text-primary hover:underline"
                      >
                        Toon collectie
                      </button>
                    </div>
                    <div className="grid gap-2.5" style={GRID_STYLE}>
                      {g.colors.map((color, i) =>
                        renderSwatch(color, `${g.id}-${color.code}-${color.hex}-${i}`),
                      )}
                    </div>
                    {g.total > g.colors.length && (
                      <button
                        type="button"
                        onClick={() => openCollection(g.id)}
                        className="mt-2 text-xs font-medium text-muted-foreground hover:text-primary"
                      >
                        +{g.total - g.colors.length} meer in {g.name} — toon collectie
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              matchedCollections.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold">Geen kleuren gevonden</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Voor &ldquo;{query}&rdquo; — probeer een andere naam of code.
                  </p>
                </div>
              )
            )}
          </div>
        )}

      </div>

      {/* Onderbalk: gekozen kleur + bevestigen (mobiel-vriendelijk) */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-3">
        {selected ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span
                className="h-11 w-11 shrink-0 rounded-lg border border-black/10 shadow-sm"
                style={{ backgroundColor: selected.hex }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{selected.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.code}
                  {selected.collection ? ` · ${selected.collection}` : ""}
                  {selected.base
                    ? ` · ${selected.base.label}${
                        selected.base.surcharge > 0
                          ? ` (+${formatPrice(selected.base.surcharge)})`
                          : ""
                      }`
                    : ""}
                </p>
              </div>
            </div>
            {onConfirm && (
              <Button
                onClick={() => onConfirm(selected)}
                size="lg"
                className="w-full sm:w-auto"
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        ) : (
          <p className="py-1 text-center text-sm text-muted-foreground">
            Kies hierboven een kleur om verder te gaan.
          </p>
        )}
      </div>
    </div>
  );
}
