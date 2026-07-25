import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { searchCatalog } from "@/lib/pos-catalog";
import { getSoldMap, getAdjustMap, liveStock } from "@/lib/store/stock-ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kassa: producten zoeken (titel/merk/EAN-scan). Voegt per variant de live
 * voorraad toe (feed-voorraad − verkocht volgens het gedeelde grootboek).
 */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = searchCatalog(q, 25);
  const [sold, adjust] = await Promise.all([getSoldMap(), getAdjustMap()]);
  const results = hits.map((h) => ({
    ...h,
    variants: h.variants.map((v) => ({
      ...v,
      live: liveStock(v.feedStock, sold[v.id] ?? 0, adjust[v.id] ?? 0),
    })),
  }));
  return NextResponse.json({ results });
}
