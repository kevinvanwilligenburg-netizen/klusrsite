import type { CartItem, PaintBaseSelection } from "@/types";
import { VDM_DASHBOARD_BASE } from "@/lib/vdm-dashboard";

/**
 * Mengverf-basissen uit Tilroy (via het VDM-dashboard).
 *
 * Waarom dit bestaat: in Tilroy is elke mengbasis een **eigen artikel** met een
 * eigen sku, prijs en voorraad — geen variant van één pot. Onze import vouwt die
 * basissen samen tot één variant per maat, dus wij kennen alleen de sku van het
 * artikel waarop de klant klikte. Zet je díé op de bestelregel, dan boekt Tilroy
 * van het verkeerde artikel af: de klant koopt een donkere kleur, en de lichte
 * basis loopt leeg. Dat zie je pas maanden later terug in de inkoop.
 *
 * Deze module zoekt daarom bij het afrekenen op wélk basisartikel er
 * daadwerkelijk gemengd wordt, en zet díé sku op de regel.
 *
 * Bron: `GET /api/mengverf` op het dashboard (vereist `SITE_API_KEY`). Per
 * verflijn + maat staan daar de basissen die echt bestaan, met sku, basiscode
 * (W05/N00/LN/ZN/ZX/TR), prijs en voorraad per vestiging.
 *
 * **Fail-safe.** Is de bron onbereikbaar, ontbreekt de sleutel, of kunnen we de
 * basis niet met zekerheid thuisbrengen, dan laten we de regel staan zoals hij
 * was — dezelfde sku als vandaag. Nooit een gok: een verkeerd basisartikel
 * afboeken is erger dan het huidige gedrag.
 *
 * Zie docs/vdm-dashboard-koppeling.md.
 */

const BASIS_URL =
  (process.env.VDM_MENGVERF_URL || `${VDM_DASHBOARD_BASE}/api/mengverf`) + "?alleMengverf=1";

/** Hoe lang de opgehaalde basissen per lambda blijven staan. */
const TTL_MS = 60 * 60 * 1000;

/** Eén basisartikel zoals het dashboard 'm levert. */
interface Basis {
  sku: string;
  naam: string;
  basisCode: string;
  /** "light" | "medium" | "dark" — null als het dashboard 'm niet herkent. */
  basis: string | null;
  prijsCenten: number;
  kluspasCenten: number | null;
  voorraad: number;
  perWinkel: Record<string, number>;
}

/** Een verflijn in één maat, met alle basissen die daarvan bestaan. */
export interface MengverfLijn {
  lijn: string;
  merk: string;
  maat: string;
  /** Kost elke basis hetzelfde? Zo ja, dan hoeft de keuzelijst geen prijs te tonen. */
  zelfdePrijs: boolean;
  voorraadSamen: number;
  perWinkelSamen: Record<string, number>;
  basissen: Basis[];
}

interface Bron {
  /** Kale sku (alleen cijfers) → de lijn waar dat artikel bij hoort. */
  bySku: Map<string, MengverfLijn>;
  ts: number;
}

let cache: Bron | null = null;

/**
 * Sku's vergelijkbaar maken. Wij gebruiken `tilroy-39973076`, het dashboard
 * `feed-39973076` en de prijsfeed `39973076` — dezelfde artikelen, drie
 * schrijfwijzen. We vergelijken op de kale cijfers.
 */
function kaal(sku: string | undefined): string {
  return String(sku ?? "").replace(/^[a-z]+-/i, "").trim();
}

/**
 * Onze basis-id → de waarde die het dashboard gebruikt.
 *
 * Wij kennen drie niveaus (wit/medium/deep), Tilroy meestal maar twee (light en
 * dark; alleen Fitex/Drenth/Pastolex hebben er een medium tussen). Bestaat ons
 * niveau niet, dan pakken we de eerstvolgende **donkerdere** basis.
 *
 * ⚠️ Die richting is een aanname, geen vaststaand feit. Er stond hier eerst dat
 * een donkerdere basis "hooguit wat meer colorant kost"; dat is onjuist. Beide
 * kanten kunnen misgaan: een lichte kleur in een donkere basis mist wit en dekt
 * daardoor slecht, en een donkere kleur in een lichte basis haalt de kleur niet.
 * Welke van de twee de winkel pakt als een kleur er tussenin valt, is vakkennis
 * van de mensen achter de mengmachine — die vraag staat uit.
 *
 * Wat we hier kiezen bepaalt overigens **niet** wat er fysiek gemengd wordt: de
 * winkel ziet de kleur en beslist zelf. Het bepaalt van welk artikel Tilroy
 * afboekt. Een systematische voorspelling is daarvoor beter dan de willekeurige
 * basis die onze import toevallig in de variant vouwde — maar zodra het antwoord
 * er is, hoort deze tabel eraan aangepast te worden.
 */
const VOORKEUR: Record<PaintBaseSelection["id"], string[]> = {
  wit: ["light", "medium", "dark"],
  medium: ["medium", "dark", "light"],
  deep: ["dark", "medium", "light"],
};

function isLijn(x: unknown): x is MengverfLijn {
  if (!x || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  return Array.isArray(l.basissen) && l.basissen.length > 0;
}

/** Haal de basissen op en indexeer ze op sku. Faalt stil: dan geen bron. */
async function laadBron(): Promise<Bron | null> {
  if (cache && Date.now() - cache.ts < TTL_MS) return cache;

  const sleutel = process.env.SITE_API_KEY;
  if (!sleutel) return null; // Geen sleutel = geen bron; huidige gedrag blijft.

  try {
    const res = await fetch(BASIS_URL, {
      headers: { Authorization: `Bearer ${sleutel}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { lijnen?: unknown };
    const lijnen = Array.isArray(body?.lijnen) ? body.lijnen.filter(isLijn) : [];
    if (!lijnen.length) throw new Error("geen lijnen in het antwoord");

    const bySku = new Map<string, MengverfLijn>();
    for (const lijn of lijnen) {
      for (const b of lijn.basissen) {
        const k = kaal(b.sku);
        if (k) bySku.set(k, lijn);
      }
    }
    cache = { bySku, ts: Date.now() };
    return cache;
  } catch (e) {
    console.warn(`[mengverf] basissen niet op te halen: ${e instanceof Error ? e.message : e}`);
    // Kort onthouden dat het misging, zodat één storing niet elke bestelling
    // met acht seconden vertraagt.
    cache = { bySku: new Map(), ts: Date.now() - TTL_MS + 60_000 };
    return null;
  }
}

/** De verflijn waar een variant bij hoort — null als het geen mengverf is. */
export async function mengverfLijnVoor(variantId: string): Promise<MengverfLijn | null> {
  const bron = await laadBron();
  return bron?.bySku.get(kaal(variantId)) ?? null;
}

/**
 * De sku van het basisartikel dat er écht in gaat.
 *
 * Geeft null zodra er ook maar iets onzeker is: geen bron, geen mengverf, of
 * geen basis die we kunnen thuisbrengen. De aanroeper houdt dan de bestaande
 * sku aan.
 */
export function basisSkuVoor(lijn: MengverfLijn, base: PaintBaseSelection | undefined | null): string | null {
  if (!base) return null;
  // Eén basis? Dan valt er niets te kiezen en is die sku per definitie juist.
  if (lijn.basissen.length === 1) return kaal(lijn.basissen[0].sku) || null;

  for (const niveau of VOORKEUR[base.id] ?? []) {
    const treffer = lijn.basissen.find((b) => b.basis === niveau);
    if (treffer) return kaal(treffer.sku) || null;
  }
  return null;
}

export interface BasisResultaat {
  items: CartItem[];
  /** Voor hoeveel regels we de basis-sku hebben kunnen zetten. */
  gezet: number;
}

/**
 * Zet op elke mengverf-regel de sku van de gekozen basis.
 *
 * Draait ná `resolveCartColors`: die bepaalt de basis uit de opgezochte kleur,
 * en dus pas daarna weten we welk artikel er gemengd wordt. Regels zonder
 * kleurkeuze en regels die we niet herkennen blijven onaangeroerd.
 */
export async function resolveBaseSkus(items: CartItem[]): Promise<BasisResultaat> {
  const teDoen = items.some((it) => it.selectedColor?.base);
  if (!teDoen) return { items, gezet: 0 };

  const bron = await laadBron();
  if (!bron) return { items, gezet: 0 };

  let gezet = 0;
  const uit = items.map((it) => {
    const base = it.selectedColor?.base;
    if (!base) return it;
    const lijn = bron.bySku.get(kaal(it.variantId || it.productId));
    if (!lijn) return it;
    const sku = basisSkuVoor(lijn, base);
    if (!sku) return it;
    gezet++;
    return { ...it, baseSku: sku };
  });

  return { items: uit, gezet };
}
