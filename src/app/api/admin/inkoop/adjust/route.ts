import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import { recordAdjustment } from "@/lib/store/stock-ledger";
import { resolveLine } from "@/lib/pos-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  variantId: z.string().min(1),
  productId: z.string().min(1),
  delta: z.number().int(),
  reference: z.string().max(120).optional(),
});

/** Handmatige voorraadcorrectie/ontvangst (WMS). Boekt op het grootboek. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige correctie" }, { status: 400 });
  }
  const { variantId, productId, delta, reference } = parsed.data;
  if (!delta) return NextResponse.json({ error: "Mutatie is 0" }, { status: 400 });

  const found = resolveLine(productId, variantId);
  const title = found ? found.product.title : productId;
  await recordAdjustment({
    variantId,
    productId,
    title,
    delta,
    kind: delta > 0 ? "receive" : "adjust",
    reference: reference || "Handmatige correctie",
  });
  return NextResponse.json({ ok: true });
}
