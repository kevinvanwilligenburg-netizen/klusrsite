import type { OrderStatus } from "@/types";
import type { BadgeProps } from "@/components/ui/badge";

/**
 * Shared mapping helpers for order (payment) status.
 * Kept in one place so the account dashboard and the bestelstatus tracker
 * stay consistent.
 */

/** Human-readable Dutch label per order status. */
export const orderStatusLabel: Record<OrderStatus, string> = {
  open: "Te betalen",
  pending: "In behandeling",
  paid: "Betaald",
  authorized: "Geautoriseerd",
  shipped: "Verzonden",
  delivered: "Bezorgd",
  canceled: "Geannuleerd",
  failed: "Mislukt",
  expired: "Verlopen",
  refunded: "Terugbetaald",
};

/** Badge variant per order status, using KLUSR brand colours. */
export const orderStatusBadgeVariant: Record<OrderStatus, BadgeProps["variant"]> = {
  open: "action",
  pending: "action",
  paid: "stock",
  authorized: "stock",
  shipped: "default",
  delivered: "nieuw",
  canceled: "muted",
  failed: "muted",
  expired: "muted",
  refunded: "muted",
};

/** Persoonlijke "beleving"-tekst per status — zo voelt het volgen levendig. */
export const orderStatusBeleving: Record<OrderStatus, string> = {
  open: "We wachten nog op je betaling. Zodra die binnen is, gaan we direct voor je aan de slag.",
  pending: "We controleren je betaling — nog heel even geduld.",
  paid: "Gelukt! Onze klussers pakken je bestelling nu zorgvuldig voor je in. 📦",
  authorized: "Betaling bevestigd — we maken je pakket klaar voor verzending.",
  // Vervoerder-neutraal: nieuwe zendingen gaan met DHL, oudere met PostNL.
  shipped: "Onderweg! Je pakket is onderweg naar je toe. 🚚",
  delivered: "Bezorgd — veel klusplezier! 🛠️",
  canceled: "Deze bestelling is geannuleerd.",
  failed: "De betaling is helaas niet gelukt.",
  expired: "De betaling is verlopen.",
  refunded: "Deze bestelling is terugbetaald.",
};

/** The four happy-path timeline steps. */
export const timelineSteps = ["Besteld", "Betaald", "Verzonden", "Bezorgd"] as const;
export type TimelineStep = (typeof timelineSteps)[number];

/** Statuses that represent a failed / cancelled order. */
const canceledStatuses: OrderStatus[] = ["canceled", "failed", "expired", "refunded"];

export function isCanceledStatus(status: OrderStatus): boolean {
  return canceledStatuses.includes(status);
}

/**
 * Index of the active step in {@link timelineSteps} for a given status.
 * Returns -1 for cancelled/failed orders (handled separately).
 */
export function activeStepIndex(status: OrderStatus): number {
  switch (status) {
    case "open":
    case "pending":
      return 0; // Besteld
    case "paid":
    case "authorized":
      return 1; // Betaald
    case "shipped":
      return 2; // Verzonden
    case "delivered":
      return 3; // Bezorgd
    default:
      return -1; // canceled / failed / expired
  }
}
