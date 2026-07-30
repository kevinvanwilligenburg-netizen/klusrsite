import type { CartItem, SelectedColor } from "@/types";
import { colorCollections } from "@/lib/data/colors";
import { withBase } from "@/lib/paint-bases";
import { VDM_DASHBOARD_BASE } from "@/lib/vdm-dashboard";

/**
 * Server-side controle van de gekozen verfkleur.
 *
 * De kleurkiezer draait in de browser en zet naam, code, hex én de afgeleide
 * mengbasis op de winkelwagenregel. Die gegevens bepalen wat de winkel
 * daadwerkelijk mengt, dus we mogen ze niet zomaar op de order overnemen: een
 * gemanipuleerde of verouderde regel zou een kleur opleveren die wij niet
 * voeren. We zoeken de kleur daarom opnieuw op in onze eigen bron en gebruiken
 * uitsluitend die waarden.
 *
 * We hebben bewust géén sleutel aan de winkelwagen toegevoegd: code +
 * collectie staan er al in, en die zijn genoeg om te resolven. Zo is er geen
 * overgangsperiode waarin bestaande mandjes omvallen — precies het probleem dat
 * we bij de prijzen wél hadden.
 *
 * Bron: de kleurenfeed van het VDM-dashboard, aangevuld met onze eigen
 * gecureerde collecties (waaronder RAL Classic). Die laatste staan lokaal in de
 * code, zodat RAL-bestellingen blijven werken als de feed onbereikbaar is.
 */

const FEED_URL = `${VDM_DASHBOARD_BASE}/api/kleurenkiezer/feed`;

/** Hoe lang de opgehaalde kleurenbron per lambda blijft staan. */
const TTL_MS = 60 * 60 * 1000;

interface Bron {
  /** code (genormaliseerd) → kleuren met die code, over alle collecties. */
  byCode: Map<string, SelectedColor[]>;
  /** Kwam de externe feed binnen? Zo niet, dan draaien we op de eigen set. */
  compleet: boolean;
  ts: number;
}

let cache: Bron | null = null;

/** Codes vergelijkbaar maken: "RAL 9010", "ral9010" en "9010" zijn hetzelfde. */
function normCode(s: string | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function index(colors: SelectedColor[]): Map<string, SelectedColor[]> {
  const map = new Map<string, SelectedColor[]>();
  for (const c of colors) {
    for (const sleutel of [normCode(c.code), normCode(c.name)]) {
      if (!sleutel) continue;
      const lijst = map.get(sleutel);
      if (lijst) lijst.push(c);
      else map.set(sleutel, [c]);
    }
  }
  return map;
}

/** Eigen gecureerde kleuren (incl. RAL Classic) — altijd beschikbaar. */
function curated(): SelectedColor[] {
  return colorCollections.flatMap((c) => c.colors);
}

async function loadBron(): Promise<Bron> {
  const nu = Date.now();
  if (cache && nu - cache.ts < TTL_MS) return cache;

  let portal: SelectedColor[] = [];
  let compleet = false;
  try {
    const res = await fetch(FEED_URL, {
      headers: {
        Accept: "application/json",
        // Browserachtige UA: sommige hosts weigeren kale server-requests.
        "User-Agent": "Mozilla/5.0 (compatible; KLUSR-kleurcheck/1.0)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        colors?: { name?: string; code?: string; hex?: string; collection?: string }[];
      };
      // Let op: `??` valt niet terug op een lege string, en de feed levert die
      // wel degelijk. Zonder deze `blank`-check belandt er een kleur zónder
      // code op de order — en dan kan de winkel niets mengen.
      const blank = (v: string | undefined) => !v || !v.trim();
      portal = (data.colors ?? [])
        .filter((c) => !blank(c.hex) && !(blank(c.code) && blank(c.name)))
        .map((c) => ({
          name: (blank(c.name) ? c.code : c.name)!.trim(),
          code: (blank(c.code) ? c.name : c.code)!.trim(),
          hex: c.hex!.trim(),
          collection: c.collection,
        }));
      compleet = portal.length > 0;
    }
  } catch {
    /* feed onbereikbaar → we draaien op de gecureerde set */
  }

  cache = { byCode: index([...portal, ...curated()]), compleet, ts: nu };
  return cache;
}

export interface KleurControle {
  /** De kleur zoals wij 'm kennen; `null` als we 'm niet konden vinden. */
  kleur: SelectedColor | null;
  /** True wanneer we zeker weten dat de kleur niet bestaat (bron was compleet). */
  afgewezen: boolean;
}

/**
 * Zoek de door de klant gekozen kleur op in onze eigen bron.
 *
 * Matcht op code (en anders op naam), met de collectie als tiebreak wanneer
 * dezelfde code in meerdere collecties voorkomt. De mengbasis leiden we af uit
 * de ópgezochte hex — niet uit de meegestuurde — anders resolve je de kleur wel
 * maar reken je alsnog met browserdata.
 */
export async function resolvePaintColor(gekozen: SelectedColor): Promise<KleurControle> {
  const bron = await loadBron();
  const kandidaten =
    bron.byCode.get(normCode(gekozen.code)) ?? bron.byCode.get(normCode(gekozen.name)) ?? [];

  if (!kandidaten.length) {
    // Alleen hard afwijzen als de volledige bron beschikbaar was; anders zou
    // een storing bij het dashboard alle mengverf-bestellingen blokkeren.
    return { kleur: null, afgewezen: bron.compleet };
  }

  // Zelfde collectie wint; daarna een kandidaat mét een echte code (een match
  // op naam kan een kleur opleveren waarvan de code ontbreekt).
  const wens = (gekozen.collection ?? "").trim().toLowerCase();
  const treffer =
    kandidaten.find(
      (c) => (c.collection ?? "").trim().toLowerCase() === wens && c.code.trim(),
    ) ??
    kandidaten.find((c) => c.code.trim()) ??
    kandidaten[0];

  return { kleur: withBase(treffer), afgewezen: false };
}

export interface KleurResultaat {
  items: CartItem[];
  /** Melding wanneer een regel een kleur droeg die wij niet voeren. */
  fout?: string;
}

/**
 * Vervang op elke regel de meegestuurde kleur door onze eigen versie. Regels
 * zonder kleur blijven ongemoeid, en zonder gekleurde regels raken we de
 * kleurenbron niet aan — dat scheelt een zware fetch op de checkout.
 */
export async function resolveCartColors(items: CartItem[]): Promise<KleurResultaat> {
  if (!items.some((i) => i.selectedColor)) return { items };

  const out: CartItem[] = [];
  for (const item of items) {
    if (!item.selectedColor) {
      out.push(item);
      continue;
    }
    const { kleur, afgewezen } = await resolvePaintColor(item.selectedColor);
    if (afgewezen) {
      return {
        items,
        fout: `De kleur "${item.selectedColor.name}" kennen we niet (meer). Kies de kleur opnieuw bij ${item.title}.`,
      };
    }
    // Bron onbereikbaar én niet gevonden: dan houden we de meegestuurde kleur
    // aan. Bewust fail-open — een storing mag geen bestellingen tegenhouden.
    out.push(kleur ? { ...item, selectedColor: kleur } : item);
  }
  return { items: out };
}
