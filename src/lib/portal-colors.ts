import type { SelectedColor } from "@/types";
import { colorCollections, type ColorCollection } from "@/lib/data/colors";

/**
 * Verbinding met de DVM-kleurenkiezerportal (repo: vdmhq01-eng/dashboardvdm).
 * Haalt de gesynchroniseerde Gamma/Kleurenwaaier- + AkzoNobel-kleuren op uit de
 * publieke dashboard-API (CORS staat open). Valt netjes terug op de gecureerde
 * set bij een fout of lege respons, en cachet het resultaat per sessie.
 *
 * Overschrijfbaar via NEXT_PUBLIC_KLEURENKIEZER_API (bv. https://kleur.devoordeelmarkt.nl).
 */
const API_BASE = (
  process.env.NEXT_PUBLIC_KLEURENKIEZER_API || "https://dashboardvdm.vercel.app"
).replace(/\/+$/, "");
// Eerst onze gecachete server-proxy (zelfde origin, klein + snel), dan de
// volledige bron-feed, dan de lichtere public-colors, dan de gecureerde set.
const PROXY_URL = "/api/colors";
const FEED_URL = `${API_BASE}/api/kleurenkiezer/feed`;
const FALLBACK_URL = `${API_BASE}/api/kleurenkiezer/public-colors`;

interface PortalColor {
  name?: string;
  code?: string;
  hex?: string;
  collectionId?: string | number;
  collection?: string;
  provider?: string;
}

function normalizeHex(h?: string): string {
  const raw = (h ?? "").trim();
  if (!raw) return "#cccccc";
  return raw.charAt(0) === "#" ? raw : `#${raw}`;
}

let cache: ColorCollection[] | null = null;

async function loadFrom(url: string): Promise<ColorCollection[] | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { colors?: PortalColor[] };
    const rows = Array.isArray(data?.colors) ? data.colors : [];
    if (!rows.length) return null;

    const byId = new Map<string, ColorCollection>();
    for (const c of rows) {
      const name = String(c?.name || c?.code || "").trim();
      if (!name) continue;
      const collectionName = String(c?.collection || "Kleuren").trim();
      const id = String(c?.collectionId || collectionName);
      if (!byId.has(id)) byId.set(id, { id, name: collectionName, colors: [] });
      byId.get(id)!.colors.push({
        name,
        code: String(c?.code || name),
        hex: normalizeHex(c?.hex),
        collection: collectionName,
        provider: c?.provider ? String(c.provider) : undefined,
      } as SelectedColor);
    }
    const collections = [...byId.values()].filter((c) => c.colors.length);
    // Grootste collecties eerst, voor vindbaarheid in de pillsbalk.
    collections.sort((a, b) => b.colors.length - a.colors.length);
    return collections.length ? collections : null;
  } catch {
    return null;
  }
}

/**
 * Vult de portal-set aan met de gecureerde collecties die de portal NIET (op
 * naam) levert. Zo blijven onze vaste families — met name **RAL Classic**, maar
 * ook grijs/blauw/groen/pastels enz. — altijd zichtbaar, ook wanneer de live
 * portal-set aanslaat. Voorheen verving de portal de hele lijst, waardoor RAL
 * en de kleurfamilies in productie verdwenen. Portal-collecties staan voorop
 * (live, actueel), de ontbrekende gecureerde collecties worden eronder
 * aangevuld, ontdubbeld op collectienaam.
 */
function mergeCurated(portal: ColorCollection[]): ColorCollection[] {
  const seen = new Set(portal.map((c) => c.name.trim().toLowerCase()));
  const merged = [...portal];
  for (const c of colorCollections) {
    const key = c.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
  }
  return merged;
}

export async function fetchPortalColors(): Promise<ColorCollection[]> {
  if (cache) return cache;
  const portal =
    (await loadFrom(PROXY_URL)) ||
    (await loadFrom(FEED_URL)) ||
    (await loadFrom(FALLBACK_URL));
  // Portal-set vooraan, aangevuld met ontbrekende gecureerde collecties (o.a.
  // RAL Classic). Geen portal beschikbaar? Dan de volledige gecureerde set.
  cache = portal ? mergeCurated(portal) : colorCollections;
  return cache;
}
