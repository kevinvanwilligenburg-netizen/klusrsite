import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import {
  createPurchaseOrder,
  listPurchaseOrders,
} from "@/lib/store/purchase-orders";
import { resolveLine } from "@/lib/pos-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lijst inkooporders. */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const purchaseOrders = await listPurchaseOrders();
  return NextResponse.json({ purchaseOrders });
}

const schema = z.object({
  supplier: z.string().min(1).max(160),
  note: z.string().max(500).optional(),
  expectedAt: z.string().max(40).optional(),
  ordered: z.boolean().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1),
        qty: z.number().int().positive().max(99999),
        costPrice: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

/** Maak een inkooporder aan (regels server-autoritatief uit de catalogus). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige inkooporder" }, { status: 400 });
  }

  const lines = parsed.data.lines.map((l) => {
    const found = resolveLine(l.productId, l.variantId);
    return {
      productId: l.productId,
      variantId: l.variantId,
      title: found?.product.title ?? l.productId,
      variantLabel: found?.variant.label,
      qty: l.qty,
      costPrice: l.costPrice,
    };
  });

  const po = await createPurchaseOrder({
    supplier: parsed.data.supplier,
    note: parsed.data.note,
    expectedAt: parsed.data.expectedAt,
    ordered: parsed.data.ordered,
    lines,
  });
  return NextResponse.json({ purchaseOrder: po });
}
