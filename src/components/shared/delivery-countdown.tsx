"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { deliveryInfo, CUTOFF_HOUR } from "@/lib/delivery";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

/**
 * Bezorgklok met live aftelling.
 *
 * Toont WANNEER een bestelling geleverd wordt (zie `@/lib/delivery`):
 *  - Vóór de cutoff (10:00): "Vóór 10:00 besteld, ‹vanavond› in huis" + een
 *    live aftelling "nog 3 u 12 m" — DHL bezorgt dan nog dezelfde avond.
 *  - Ná de cutoff: "Besteld → ‹morgen/weekdag› in huis" (geen aftelling).
 *
 * Hydratie-veilig: vóór `mounted` (server + eerste client-paint) rendert 'ie een
 * stabiele placeholder zonder `Date.now()`, daarna pas de live waarde. Zo is er
 * geen hydration-mismatch.
 *
 * Twee varianten via `compact`: een compacte regel (cart/checkout) en een iets
 * prominentere doos (PDP). Respecteert `prefers-reduced-motion` (geen animatie).
 */
export function DeliveryCountdown({
  compact = false,
  className,
}: {
  /** Compacte één-regel-variant (cart/checkout). Default = prominente PDP-variant. */
  compact?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const mounted = useMounted();

  // Live "tik": elke 30s herberekenen we de bezorginfo + aftelling. Dat is
  // ruim genoeg vloeiend voor een minuten-aftelling én zuinig (geen seconde-
  // timer). De `now`-state forceert de re-render; de waarde zelf gebruiken we
  // niet rechtstreeks (deliveryInfo() leest opnieuw de actuele tijd).
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [mounted]);

  // Vóór hydratie: stabiele, tijd-onafhankelijke placeholder. We tonen de "ná
  // cutoff"-vorm met de tekstuele dag-fallback, zodat er geen Date.now() op de
  // server draait en SSR == eerste client-paint.
  if (!mounted) {
    return (
      <DeliveryRow compact={compact} className={className} urgent={false}>
        {t("delivery.afterCutoff", { day: t("delivery.tomorrow") })}
      </DeliveryRow>
    );
  }

  const info = deliveryInfo();
  const day = dayLabel();

  if (info.sameDay) {
    const cutoffTime = formatCutoff(locale);
    return (
      <DeliveryRow compact={compact} className={className} urgent>
        <span>{t("delivery.beforeCutoff", { time: cutoffTime, day })}</span>{" "}
        <span className="whitespace-nowrap font-semibold text-primary">
          {t("delivery.countdown", countdownParts(info.msUntilCutoff))}
        </span>
      </DeliveryRow>
    );
  }

  return (
    <DeliveryRow compact={compact} className={className} urgent={false}>
      {t("delivery.afterCutoff", { day })}
    </DeliveryRow>
  );

  /** Vertaalde dag-aanduiding: "vanavond"/"morgen"/"overmorgen" of de weekdag. */
  function dayLabel(): string {
    // DHL bezorgt 's avonds; vóór de cutoff is dat nog dezelfde dag.
    if (info.label === "today") return t("delivery.today");
    if (info.label === "tomorrow") return t("delivery.tomorrow");
    if (info.label === "dayAfter") return t("delivery.dayAfter");
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
      info.deliveryDate,
    );
  }
}

/** Splits de resterende ms in hele uren + minuten voor de aftelling. */
function countdownParts(ms: number): { h: number; m: number } {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  return { h: Math.floor(totalMinutes / 60), m: totalMinutes % 60 };
}

/** Cutoff-tijd netjes geformatteerd (bv. "10:00") in de actieve locale. */
function formatCutoff(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(2000, 0, 1, CUTOFF_HOUR, 0));
}

/**
 * Gedeelde presentatie-laag. Compact = subtiele muted regel (zoals de bestaande
 * "morgen in huis"-tekst); prominent = een lichte doos met accentkleur voor de
 * PDP. Geen vaste breedtes; tekst breekt netjes af (mobiel-veilig).
 */
function DeliveryRow({
  compact,
  urgent,
  className,
  children,
}: {
  compact: boolean;
  urgent: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-start gap-1 text-muted-foreground",
          className,
        )}
      >
        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0">{children}</span>
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
        urgent
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-secondary/40",
        className,
      )}
    >
      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 font-medium leading-snug">{children}</span>
    </div>
  );
}
