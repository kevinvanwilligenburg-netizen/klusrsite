import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import {
  getPurchaseOrder,
  receivePurchaseOrder,
  setPurchaseOrderStatus,
} from "@/lib/store/purchase-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("receive") }),
  z.object({
    action: z.literal("status"),
    status: z.enum(["concept", "besteld", "ontvangen", "geannuleerd"]),
  }),
]);

/** Inkooporder-actie: ontvangen (boekt voorraad bij) of status wijzigen. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const existing = await getPurchaseOrder(params.id);
  if (!existing) return NextResponse.json({ error: "niet gevonden" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
  }

  const po =
    parsed.data.action === "receive"
      ? await receivePurchaseOrder(params.id)
      : await setPurchaseOrderStatus(params.id, parsed.data.status);

  return NextResponse.json({ purchaseOrder: po });
}
