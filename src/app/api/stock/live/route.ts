import { NextResponse } from "next/server";
import { liveAvailability } from "@/lib/live-stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live verkoopbare voorraad (Nijverdal, na de veiligheidsvoorraadregel) per
 * variant-id — voor de productpagina, met dezelfde bronnen als de
 * checkout-guard: min(eigen grootboek, VDM-dashboard live Tilroy).
 *
 *   GET /api/stock/live?ids=tilroy-123,tilroy-456
 *   → { stock: { "tilroy-123": 7, "tilroy-456": 0 } }
 *
 * Onbekende ids ontbreken in het antwoord (client valt dan terug op de
 * snapshot-stand). Kort gecachet: de onderliggende dashboard-call cachet zelf
 * ook al ~45 s per lambda.
 */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  if (!ids.length) {
    return NextResponse.json({ error: "ids ontbreekt" }, { status: 400 });
  }

  try {
    const map = await liveAvailability(ids);
    return NextResponse.json(
      { stock: Object.fromEntries(map) },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err) {
    // Fail-open: de PDP toont dan gewoon de snapshot-stand.
    console.error("[api/stock/live]", err);
    return NextResponse.json({ stock: {} });
  }
}
