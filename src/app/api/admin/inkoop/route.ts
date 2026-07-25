import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { products } from "@/lib/data";
import { listOrders } from "@/lib/store/orders";
import { listPurchaseOrders } from "@/lib/store/purchase-orders";
import { getSoldMap, getAdjustMap } from "@/lib/store/stock-ledger";
import { unitsSoldByVariant, forecastRows } from "@/lib/forecast";
import { getSafetyStock } from "@/lib/store/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inkoop-overzicht: bijbestel-advies (prognose) + samenvatting. Combineert de
 * orderhistorie (verkoopsnelheid), het voorraad-grootboek en de openstaande
 * inkooporders.
 */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(180, Math.max(7, Number(url.searchParams.get("days")) || 30));
  const coverDays = Math.min(180, Math.max(7, Number(url.searchParams.get("cover")) || 30));

  const [orders, sold, adjust, pos, safety] = await Promise.all([
    listOrders(),
    getSoldMap(),
    getAdjustMap(),
    listPurchaseOrders(),
    getSafetyStock().catch(() => 2),
  ]);

  const sinceTs = Date.now() - days * 86400000;
  const velocity = unitsSoldByVariant(orders, sinceTs);

  // Reeds bestelde (open) stuks per variant → niet dubbel adviseren.
  const onOrder: Record<string, number> = {};
  for (const po of pos) {
    if (po.status !== "besteld") continue;
    for (const l of po.lines) {
      const open = Math.max(0, l.qty - (l.receivedQty ?? 0));
      if (open > 0) onOrder[l.variantId] = (onOrder[l.variantId] ?? 0) + open;
    }
  }

  const rows = forecastRows(
    products,
    { sold, adjust, velocity, onOrder },
    { days, coverDays, lowThreshold: Math.max(3, safety), limit: 300 },
  );

  const summary = {
    reorder: rows.filter((r) => r.advies > 0).length,
    outOfStock: rows.filter((r) => r.live <= 0 && r.soldWindow > 0).length,
    lowStock: rows.filter((r) => r.live > 0 && r.live <= Math.max(3, safety)).length,
    openPurchaseOrders: pos.filter((p) => p.status === "besteld").length,
  };

  return NextResponse.json({ rows, summary, days, coverDays });
}
