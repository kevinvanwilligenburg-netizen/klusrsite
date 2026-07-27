import { NextResponse } from "next/server";

/**
 * Server-proxy voor de kleurenkiezer-feed. Haalt de (grote) DVM-feed één keer
 * server-side op, cachet 'm op de Vercel-CDN en serveert een uitgeklede versie
 * (alleen de velden die de kiezer nodig heeft). Zo downloadt de browser niet bij
 * elke sessie de volledige bron en is het sneller + betrouwbaarder.
 */
export const runtime = "nodejs";
export const revalidate = 86400; // 24 uur

const FEED_URL =
  (process.env.NEXT_PUBLIC_KLEURENKIEZER_API || "https://dashboardvdm.vercel.app").replace(
    /\/+$/,
    "",
  ) + "/api/kleurenkiezer/feed";

const CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

export async function GET() {
  try {
    const res = await fetch(FEED_URL, {
      headers: {
        Accept: "application/json",
        // Browserachtige UA — sommige hosts weigeren kale server-requests.
        "User-Agent": "Mozilla/5.0 (compatible; KLUSR-kleurkiezer/1.0)",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ colors: [] }, { headers: { "Cache-Control": "public, max-age=300" } });
    }
    const data = (await res.json()) as {
      colors?: { name?: string; code?: string; hex?: string; collection?: string; collectionId?: string }[];
    };
    const colors = (Array.isArray(data?.colors) ? data.colors : []).map((c) => ({
      name: c.name,
      code: c.code,
      hex: c.hex,
      collection: c.collection,
      collectionId: c.collectionId,
    }));
    return new NextResponse(JSON.stringify({ colors }), {
      headers: { "Content-Type": "application/json", "Cache-Control": CACHE },
    });
  } catch {
    return NextResponse.json({ colors: [] }, { headers: { "Cache-Control": "public, max-age=300" } });
  }
}
