import type { CartItem } from "@/types";
import { getVariantById } from "@/lib/data/products";
import { paintBases } from "@/lib/paint-bases";
import { profGrossPrice } from "@/lib/pricing";
import { isBrievenbusOrder } from "@/lib/brievenbus";
import { shippingForCountry } from "@/lib/shipping";
import { SAME_DAY_SURCHARGE } from "@/lib/delivery";
import { isKleurtester, KLEURTESTER_PRIJS } from "@/lib/kleurtester";

/**
 * Server-side prijscontrole voor de checkout.
 *
 * De winkelwagen leeft in de browser en stuurt subtotaal, verzendkosten en
 * totaal mee. Die bedragen mag je niet geloven: ze zijn te manipuleren (een
 * order van € 200 voor € 0,01) én ze verouderen, want de winkelwagen bewaart
 * een prijsmomentopname in localStorage. Na een prijswijziging rekent zo'n oud
 * mandje stilletjes de verkeerde prijs af — dat valt niemand op, want er gaat
 * niets kapot.
 *
 * Daarom leiden we hier het totaal opnieuw af uit de catalogus. Wijkt het af
 * van wat de klant meestuurt, dan weigeren we de betaling in plaats van een
 * ander bedrag af te schrijven dan de klant op zijn scherm zag.
 */

/** Marge voor afrondingsverschillen tussen client en server (in euro's). */
const TOLERANCE = 0.02;

export interface PriceCheck {
  ok: boolean;
  /** Het door de server berekende totaal dat het dichtst bij de client lag. */
  expected: number;
  /** Wat de client meestuurde. */
  received: number;
  /** Mensvriendelijke reden wanneer `ok` false is. */
  message?: string;
}

/** Eenheidsprijzen van een regel volgens de catalogus (incl. basistoeslag). */
function catalogPrices(item: CartItem): { price: number; kluspasPrice: number } | null {
  // De kleurtester staat niet in de catalogus — hij is virtueel en wordt per
  // bestelling gemengd. Zijn prijs staat vast in code, en die is hier de
  // waarheid. Zonder deze uitzondering vindt getVariantById niets, valt de
  // regel uit de berekening, klopt het totaal niet meer en weigert de checkout
  // de héle bestelling met een 409.
  if (isKleurtester(item)) {
    return { price: KLEURTESTER_PRIJS, kluspasPrice: KLEURTESTER_PRIJS };
  }
  const variant = getVariantById(item.variantId || item.productId);
  if (!variant) return null;
  // Mengverf: de gekozen tinting-basis heeft een eigen toeslag per stuk.
  const baseId = item.selectedColor?.base?.id;
  const surcharge = baseId ? (paintBases[baseId]?.surcharge ?? 0) : 0;
  return {
    price: variant.price + surcharge,
    kluspasPrice: variant.kluspasPrice + surcharge,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Controleer of het meegestuurde totaal klopt met de catalogus.
 *
 * We accepteren elk totaal dat uit de catalogus te herleiden is: met of zonder
 * KLUSRPAS-prijs en in consumenten- of zakelijke weergave. Dat blijft veilig —
 * alle varianten zijn prijzen die wij zelf voeren — terwijl we niet hoeven te
 * weten in welke modus de klant stond. Onbekende varianten laten we door: die
 * kunnen net uit de catalogus zijn gehaald en worden elders al afgevangen.
 */
export function verifyOrderTotal(input: {
  items: CartItem[];
  total: number;
  country?: string;
  sameDay?: boolean;
  /** Zet verzendkosten op 0 (afhalen of een gratis-verzending-actie). */
  freeShipping?: boolean;
}): PriceCheck {
  const { items, total, country = "NL", sameDay = false, freeShipping = false } = input;

  let unknown = 0;
  const lines = items.map((it) => {
    const p = catalogPrices(it);
    if (!p) {
      unknown++;
      // Val terug op wat de client stuurt; deze regel kan het oordeel dan niet
      // beïnvloeden (zie de `unknown`-uitgang hieronder).
      return { price: it.price, kluspasPrice: it.kluspasPrice, qty: it.quantity };
    }
    return { price: p.price, kluspasPrice: p.kluspasPrice, qty: Math.max(0, it.quantity) };
  });

  if (unknown > 0) {
    return { ok: true, expected: total, received: total };
  }

  // Alle subtotalen die uit de catalogus te herleiden zijn.
  const subtotals = [
    lines.reduce((s, l) => s + l.price * l.qty, 0), // normale prijs
    lines.reduce((s, l) => s + l.kluspasPrice * l.qty, 0), // KLUSRPAS-prijs
    lines.reduce((s, l) => s + profGrossPrice(l.price) * l.qty, 0), // zakelijk
  ];

  const brievenbus = isBrievenbusOrder(items);
  const kandidaten: number[] = [];
  for (const sub of subtotals) {
    const verzendVarianten = freeShipping
      ? [0]
      : [0, shippingForCountry(sub, country, { brievenbus }), shippingForCountry(sub, country)];
    for (const verzend of verzendVarianten) {
      kandidaten.push(r2(sub + verzend));
      kandidaten.push(r2(sub + verzend + SAME_DAY_SURCHARGE));
    }
  }

  const dichtst = kandidaten.reduce((a, b) =>
    Math.abs(b - total) < Math.abs(a - total) ? b : a,
  );
  const ok = Math.abs(dichtst - total) <= TOLERANCE;

  return {
    ok,
    expected: dichtst,
    received: r2(total),
    ...(ok
      ? {}
      : {
          message:
            "De prijzen in je winkelwagen kloppen niet meer met onze actuele prijzen. " +
            "Ververs de pagina en probeer het opnieuw.",
        }),
  };
}
