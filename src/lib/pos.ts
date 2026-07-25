import { profGrossPrice, VAT_RATE } from "@/lib/pricing";

/**
 * Kassa-(POS)-rekenlogica. Pure functies, server-autoritatief: de kassa-routes
 * berekenen prijzen en totalen hiermee opnieuw uit de catalogus, zodat de client
 * nooit een prijs kan dicteren.
 *
 * Drie klantmodi aan de toonbank (gespiegeld aan de webshop):
 *  - particulier → normale prijs (incl. btw)
 *  - kluspas     → KLUSRPAS-pasprijs (incl. btw)
 *  - zakelijk    → ProfPas: 10% korting op de normale prijs (incl. btw)
 *
 * Per regel kan de kassamedewerker bovendien een handmatige korting (%) geven.
 */

export type PosCustomerMode = "particulier" | "kluspas" | "zakelijk";

export const round2 = (n: number): number => Math.round(n * 100) / 100;

const clampPct = (p: number): number => Math.min(100, Math.max(0, p || 0));

export interface PosLinePricing {
  /** Gerekende stuksprijs (incl. btw) na pas/zakelijk + handmatige korting. */
  unit: number;
  /** Normale stuksprijs (incl. btw) — referentie voor de besparing. */
  normalUnit: number;
  /** Korting per stuk t.o.v. de normale prijs (incl. btw). */
  unitSavings: number;
}

/** Bepaal de te rekenen stuksprijs voor een regel, gegeven modus + korting. */
export function posLinePrice(
  input: { price: number; kluspasPrice: number },
  mode: PosCustomerMode,
  discountPct = 0,
): PosLinePricing {
  const base =
    mode === "zakelijk"
      ? profGrossPrice(input.price)
      : mode === "kluspas" && input.kluspasPrice > 0
        ? input.kluspasPrice
        : input.price;
  const unit = round2(base * (1 - clampPct(discountPct) / 100));
  const normalUnit = round2(input.price);
  return { unit, normalUnit, unitSavings: Math.max(0, round2(normalUnit - unit)) };
}

export interface PosTotalsLine {
  unit: number;
  normalUnit: number;
  quantity: number;
}

export interface PosTotals {
  subtotal: number;
  total: number;
  /** Totale besparing t.o.v. de normale prijzen (pas + zakelijk + korting). */
  savings: number;
  /** Btw-deel van het totaal (21%, prijzen zijn incl. btw). */
  vat: number;
  /** Nettobedrag (totaal − btw). */
  net: number;
}

/** Tel een set kassaregels op tot subtotaal/totaal/btw/besparing. */
export function posTotals(lines: PosTotalsLine[]): PosTotals {
  let subtotal = 0;
  let savings = 0;
  for (const l of lines) {
    const qty = Math.max(0, Math.round(l.quantity));
    subtotal += l.unit * qty;
    savings += Math.max(0, l.normalUnit - l.unit) * qty;
  }
  subtotal = round2(subtotal);
  // Geen verzendkosten aan de toonbank → totaal = subtotaal.
  const total = subtotal;
  const net = round2(total / (1 + VAT_RATE));
  return { subtotal, total, savings: round2(savings), vat: round2(total - net), net };
}

/** Teruggegeven wisselgeld bij contant betalen (nooit negatief). */
export function changeFor(total: number, cashGiven: number): number {
  return round2(Math.max(0, (cashGiven || 0) - total));
}
