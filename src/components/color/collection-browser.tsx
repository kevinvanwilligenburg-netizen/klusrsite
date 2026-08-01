"use client";

import { useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Search, X } from "lucide-react";
import type { ColorCollection } from "@/lib/data/colors";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Collectie-overzicht voor de kleurkiezer.
 *
 * De kiezer toonde alle collecties als één horizontale strip pillen. Met 245
 * collecties uit de portalfeed betekende dat op mobiel eindeloos swipen, en de
 * volgorde volgde de feed in plaats van het alfabet — je kon dus niet zien wat
 * er ís, laat staan iets terugvinden.
 *
 * Dit paneel zet ze allemaal in één beeld: alfabetisch gegroepeerd, twee
 * kolommen op mobiel, met een letterbalk om direct naar een groep te springen
 * en een zoekveld voor wie de naam al weet. De strip in de kiezer zelf houdt
 * alleen nog een handvol snelkoppelingen plus de knop hierheen.
 */

interface Props {
  collections: ColorCollection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Enkelvoudige keuze (PDP-kiezer): sluit meteen na het kiezen. */
  activeId?: string;
  onPick?: (id: string) => void;
  /** Meervoudige keuze (kleurenkiezer-funnel): blijft open, met vinkjes. */
  selectedIds?: Set<string>;
  onToggle?: (id: string) => void;
  onClear?: () => void;
}

/** Beginletter waaronder een collectie hoort; cijfers en tekens vallen onder #. */
function letterVan(naam: string): string {
  const c = (naam.trim()[0] ?? "#").toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

export function CollectionBrowser({
  collections,
  open,
  onOpenChange,
  activeId,
  onPick,
  selectedIds,
  onToggle,
  onClear,
}: Props) {
  const meervoudig = Boolean(onToggle);
  const isActief = (id: string) => (meervoudig ? Boolean(selectedIds?.has(id)) : id === activeId);
  const kies = (id: string) => {
    if (meervoudig) onToggle?.(id);
    else {
      onPick?.(id);
      onOpenChange(false);
    }
  };

  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const groepRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const q = query.trim().toLowerCase();

  // Alfabetisch, met numerieke sortering zodat "Alpha 401" vóór "Alpha 2008"
  // niet op tekstvolgorde maar op getal gaat.
  const gesorteerd = useMemo(
    () =>
      [...collections].sort((a, b) =>
        a.name.localeCompare(b.name, "nl", { numeric: true, sensitivity: "base" }),
      ),
    [collections],
  );

  const zichtbaar = useMemo(
    () => (q ? gesorteerd.filter((c) => c.name.toLowerCase().includes(q)) : gesorteerd),
    [gesorteerd, q],
  );

  const groepen = useMemo(() => {
    const map = new Map<string, ColorCollection[]>();
    for (const c of zichtbaar) {
      const l = letterVan(c.name);
      const lijst = map.get(l);
      if (lijst) lijst.push(c);
      else map.set(l, [c]);
    }
    return [...map.entries()];
  }, [zichtbaar]);

  // Letters die daadwerkelijk een groep hebben — de rest tonen we gedimd, zodat
  // de balk niet verspringt terwijl je filtert.
  const aanwezig = useMemo(() => new Set(groepen.map(([l]) => l)), [groepen]);
  const alleLetters = useMemo(() => {
    const uit = new Set<string>();
    for (const c of gesorteerd) uit.add(letterVan(c.name));
    return [...uit].sort();
  }, [gesorteerd]);

  const totaalKleuren = useMemo(
    () => zichtbaar.reduce((s, c) => s + c.colors.length, 0),
    [zichtbaar],
  );

  function springNaar(letter: string) {
    const el = groepRefs.current[letter];
    const box = scrollRef.current;
    if (!el || !box) return;
    // Via getBoundingClientRect en niet via offsetTop: dat laatste rekent vanaf
    // de dichtstbijzijnde positioned ancestor, en die is hier de dialoog en niet
    // de scrollende kolom — dan komt er 0 uit en beweegt er niets.
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    // Direct springen, niet "smooth". Twee redenen: een letterbalk is een
    // "breng me er nu heen"-actie, dus een halve seconde animatie vertraagt
    // alleen het lezen — en `behavior: "smooth"` bleek in de testbrowser
    // helemaal niet uitgevoerd te worden, waardoor de knop stilletjes niets deed.
    box.scrollTop = Math.max(0, top - 8);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col bg-background shadow-xl",
            // Mobiel: vult het scherm. Desktop: gecentreerd venster.
            "inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[80vh] sm:w-[42rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Alle kleurcollecties</DialogPrimitive.Title>

          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek een collectie…"
                className="pl-9"
                inputMode="search"
                autoComplete="off"
              />
            </div>
            <DialogPrimitive.Close
              aria-label="Sluiten"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pt-2">
            <p className="text-xs text-muted-foreground">
              {zichtbaar.length} collecties · {totaalKleuren.toLocaleString("nl-NL")} kleuren
            </p>
            {meervoudig && (selectedIds?.size ?? 0) > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
              >
                Wis {selectedIds!.size} gekozen
              </button>
            )}
          </div>

          <div className="relative flex min-h-0 flex-1">
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2">
              {groepen.map(([letter, lijst]) => (
                <div
                  key={letter}
                  ref={(el) => {
                    groepRefs.current[letter] = el;
                  }}
                  className="scroll-mt-2"
                >
                  <h3 className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1.5 text-xs font-black uppercase tracking-wider text-primary backdrop-blur">
                    {letter}
                  </h3>
                  <ul className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {lijst.map((c) => {
                      const actief = isActief(c.id);
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            aria-pressed={actief}
                            onClick={() => kies(c.id)}
                            className={cn(
                              "flex w-full flex-col gap-1 rounded-xl border p-2 text-left transition-colors",
                              actief
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40 hover:bg-secondary/40",
                            )}
                          >
                            {/* Kleurenrijtje: je herkent een waaier eerder aan
                                zijn kleuren dan aan zijn naam. */}
                            <span className="flex h-4 overflow-hidden rounded">
                              {c.colors.slice(0, 6).map((kleur, i) => (
                                <span
                                  key={`${c.id}-${i}`}
                                  className="flex-1"
                                  style={{ backgroundColor: kleur.hex }}
                                />
                              ))}
                            </span>
                            <span className="flex items-start justify-between gap-1">
                              <span className="line-clamp-2 text-xs font-semibold leading-tight">
                                {c.name}
                              </span>
                              {actief && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {c.colors.length} kleuren
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {!zichtbaar.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Geen collectie gevonden voor “{query}”.
                </p>
              )}
            </div>

            {/* Letterbalk: met 245 collecties is scrollen naar de S geen optie. */}
            <nav
              aria-label="Spring naar letter"
              className="flex w-7 shrink-0 flex-col items-center justify-center gap-px border-l border-border py-2"
            >
              {alleLetters.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => springNaar(l)}
                  disabled={!aanwezig.has(l)}
                  className={cn(
                    "w-full rounded text-[10px] font-bold leading-4 transition-colors",
                    aanwezig.has(l)
                      ? "text-muted-foreground hover:bg-secondary hover:text-primary"
                      : "text-border",
                  )}
                >
                  {l}
                </button>
              ))}
            </nav>
          </div>

          {/* Bij meervoudige keuze blijft het paneel open, dus is er een
              expliciete afsluiter nodig — anders weet je niet wanneer je klaar
              bent. Bij enkelvoudige keuze sluit hij zichzelf al bij het kiezen. */}
          {meervoudig && (
            <div className="shrink-0 border-t border-border p-3">
              <DialogPrimitive.Close className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90">
                {(selectedIds?.size ?? 0) > 0
                  ? `Toon ${selectedIds!.size} collectie${selectedIds!.size === 1 ? "" : "s"}`
                  : "Sluiten"}
              </DialogPrimitive.Close>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
