import { NextResponse } from "next/server";
import {
  getProductById,
  getAccessorySuggestions,
  getBestsellers,
} from "@/lib/data/products";
import { klusAanvulling } from "@/lib/data/klus-aanvulling";
import type { Product } from "@/types";

export const runtime = "nodejs";

/**
 * Lightweight product lookups for client components, so they don't bundle the
 * full catalogus. Supports:
 *   /api/products?ids=a,b,c            → those products (order preserved)
 *   /api/products?list=accessory&...   → accessory suggestions
 *   /api/products?list=bestsellers     → bestsellers
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  const list = searchParams.get("list");
  const limit = Math.min(24, Number(searchParams.get("limit")) || 8);
  const exclude = (searchParams.get("exclude") ?? "").split(",").filter(Boolean);

  let products: Product[] = [];

  if (ids) {
    products = ids
      .split(",")
      .map((id) => getProductById(id))
      .filter((p): p is Product => Boolean(p));
  } else if (list === "accessory") {
    products = getAccessorySuggestions(limit, exclude);
  } else if (list === "bestsellers") {
    products = getBestsellers(limit).filter((p) => !exclude.includes(p.id));
  } else if (list === "aanvulling") {
    // "Hier heb je ook nog dit voor nodig": hangt af van wát er in de mand
    // ligt, dus de winkelwagen stuurt zijn product-ids mee via ?voor=.
    const voor = (searchParams.get("voor") ?? "").split(",").filter(Boolean);
    const aanvulling = klusAanvulling(voor, limit);
    return NextResponse.json({
      products: aanvulling.map((a) => a.product),
      redenen: Object.fromEntries(aanvulling.map((a) => [a.product.id, a.reden])),
    });
  }

  return NextResponse.json({ products });
}
