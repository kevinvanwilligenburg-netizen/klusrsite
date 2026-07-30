import type { PaintBaseSelection, SelectedColor, StoreStock } from "@/types";

/**
 * Verf-basislogica (mengsysteem).
 *
 * Een gemengde kleur wordt aangemaakt in een tinting-basis. Lichte/pastelkleuren
 * gaan in een witte basis; hoe donkerder/verzadigder de kleur, hoe transparanter
 * de basis (meer kleurpigment nodig). Dit beïnvloedt:
 *   - de BASIS (wit / medium / deep)
 *   - de PRIJS (deep basis = duurder: meer colorant + transparante basis)
 *   - de VOORRAAD (elke basis is een eigen blik met eigen voorraad)
 *
 * Deze logica spiegelt het mengsysteem van de portal-kleurkiezer.
 */

export interface PaintBase {
  id: "wit" | "medium" | "deep";
  label: string;
  short: string;
  description: string;
  /** Per-unit surcharge (EUR) bovenop de variantprijs. */
  surcharge: number;
  /** Voorraadfactor t.o.v. de basisvoorraad van het product. */
  stockFactor: number;
}

/**
 * De tinting-basissen.
 *
 * `surcharge` staat overal op 0 en dat is een bewuste correctie: hier stond
 * € 0 / € 2,00 / € 4,50, een bedrag dat ooit is verzonnen en nooit een bron
 * had. Het dashboard heeft in de Tilroy-prijslijst nagemeten dat een donkere
 * basis in 8 van de 10 gevallen exact hetzelfde kost als een lichte — er ís
 * geen toeslag. Wij rekenden op donkere kleuren dus zo'n 10% te veel.
 *
 * Waar de prijs wél verschilt (bv. Sikkens Alphadur: 24,95 om 31,95 op 2,5 L)
 * zijn het twee losse artikelen met een eigen prijs, geen opslag op één artikel
 * — daar hoort de prijs van het gekozen basisartikel getoond te worden. Zodra
 * we `/api/mengverf` aansluiten komt die prijs uit Tilroy en verdwijnt dit
 * veld helemaal. Zie docs/vdm-dashboard-koppeling.md.
 */
export const paintBases: Record<PaintBase["id"], PaintBase> = {
  wit: {
    id: "wit",
    label: "Basis Wit (W)",
    short: "Wit",
    description: "Voor witte, lichte en pastelkleuren.",
    surcharge: 0,
    stockFactor: 1,
  },
  medium: {
    id: "medium",
    label: "Basis Medium (M)",
    short: "Medium",
    description: "Voor heldere en middentinten.",
    surcharge: 0,
    stockFactor: 1,
  },
  deep: {
    id: "deep",
    label: "Basis Deep (D)",
    short: "Deep",
    description: "Voor diepe en donkere kleuren — meer pigment nodig.",
    surcharge: 0,
    stockFactor: 1,
  },
};

/** Relatieve luminantie (0 = zwart, 1 = wit). */
export function luminance(hex: string): number {
  const c = hex.replace("#", "");
  if (c.length < 6) return 1;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Kies de juiste basis op basis van de helderheid van de kleur. */
export function baseForColor(hex: string): PaintBase {
  const lum = luminance(hex);
  if (lum > 0.62) return paintBases.wit;
  if (lum > 0.34) return paintBases.medium;
  return paintBases.deep;
}

/** Compacte selectie die we op het cart line item bewaren. */
export function toBaseSelection(base: PaintBase): PaintBaseSelection {
  return { id: base.id, label: base.label, surcharge: base.surcharge };
}

/** Verrijk een gekozen kleur met de afgeleide basis. */
export function withBase(color: SelectedColor): SelectedColor {
  const base = baseForColor(color.hex);
  return { ...color, base: toBaseSelection(base) };
}

/** Prijs per stuk inclusief basistoeslag. */
export function priceWithBase(unitPrice: number, base?: PaintBaseSelection | null): number {
  return Math.round((unitPrice + (base?.surcharge ?? 0)) * 100) / 100;
}

/**
 * VERVALLEN — gaf de voorraad per basis terug op een verzonnen factor.
 *
 * Bij Tilroy is elke mengbasis een eigen artikel met een eigen voorraadstand
 * per vestiging; die stand kennen wij niet, want onze import vouwt de basissen
 * samen tot één variant per maat. De factor (1 / 0,6 / 0,35) was dus een gok,
 * en een dure: 143 van de 212 leverbare mengverf-varianten (67%) waren daardoor
 * niet in een donkere kleur te bestellen, terwijl de winkel ze gewoon kan
 * mengen. Sinds de checkout-guard erop blokkeerde was dat geen weergavefoutje
 * meer maar een geweigerde bestelling.
 *
 * Tot we de echte voorraad per basisartikel hebben, rekenen we met de
 * variantvoorraad zoals die er staat. Zie docs/vdm-dashboard-koppeling.md.
 */
export function baseStockByStore(productStock: StoreStock[]): StoreStock[] {
  return productStock;
}
