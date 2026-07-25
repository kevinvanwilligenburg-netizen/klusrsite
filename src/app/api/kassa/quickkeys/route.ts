import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { getQuickKeys } from "@/lib/store/pos-quickkeys";
import { resolveLine } from "@/lib/pos-catalog";
import { getSoldMap, getAdjustMap, liveStock } from "@/lib/store/stock-ledger";
import { primaryStock } from "@/lib/stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kassa: de (door de admin aangemaakte) snelknoppen, server-zijdig opgelost.
 * Catalogus-knoppen krijgen hun actuele titel/prijs/live-voorraad mee; toeslag-/
 * korting-knoppen hun label + bedrag. De kassa voegt ze hiermee direct toe.
 */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const keys = await getQuickKeys();
  const needLedger = keys.some((k) => k.kind === "catalog");
  const [sold, adjust] = needLedger
    ? await Promise.all([getSoldMap(), getAdjustMap()])
    : [{} as Record<string, number>, {} as Record<string, number>];

  const quickKeys = keys
    .map((k) => {
      if (k.kind === "catalog" && k.productId && k.variantId) {
        const found = resolveLine(k.productId, k.variantId);
        if (!found) return null;
        const { product, variant } = found;
        return {
          id: k.id,
          kind: "catalog" as const,
          label: k.label,
          color: k.color,
          productId: product.id,
          variantId: variant.id,
          title: product.title,
          brand: product.brand,
          variantLabel: variant.label,
          image: (product.images ?? []).find((u) => /^https?:\/\//.test(u)),
          gtin: product.gtin,
          price: variant.price,
          kluspasPrice: variant.kluspasPrice,
          live: liveStock(primaryStock(variant.stockByStore), sold[variant.id] ?? 0, adjust[variant.id] ?? 0),
        };
      }
      if (k.kind === "surcharge" || k.kind === "discount") {
        return { id: k.id, kind: k.kind, label: k.label, color: k.color, amount: k.amount ?? 0 };
      }
      return null;
    })
    .filter(Boolean);

  return NextResponse.json({ quickKeys });
}
