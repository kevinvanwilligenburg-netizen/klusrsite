import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import { getRecentMovements } from "@/lib/store/stock-ledger";
import { isMollieTerminalConfigured } from "@/lib/payments";
import {
  getQuickKeys,
  upsertQuickKey,
  deleteQuickKey,
  type PosQuickKey,
} from "@/lib/store/pos-quickkeys";
import { resolveLine } from "@/lib/pos-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: kassastatus — koppelingsconfig, snelknoppen + recente voorraadmutaties. */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [movements, quickKeys] = await Promise.all([getRecentMovements(40), getQuickKeys()]);
  return NextResponse.json({
    movements,
    quickKeys,
    terminalConfigured: isMollieTerminalConfigured(),
    printAgentConfigured: Boolean((process.env.NEXT_PUBLIC_POS_PRINT_AGENT_URL || "").trim()),
  });
}

const saveSchema = z.object({
  action: z.literal("saveKey"),
  id: z.string().optional(),
  label: z.string().max(40).optional(),
  kind: z.enum(["catalog", "surcharge", "discount"]),
  color: z.string().max(16).optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  amount: z.number().nonnegative().optional(),
});
const delSchema = z.object({ action: z.literal("deleteKey"), id: z.string().min(1) });
const bodySchema = z.discriminatedUnion("action", [saveSchema, delSchema]);

/** Admin: snelknoppen aanmaken/bijwerken/verwijderen. */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const data = parsed.data;

  if (data.action === "deleteKey") {
    const quickKeys = await deleteQuickKey(data.id);
    return NextResponse.json({ ok: true, quickKeys });
  }

  // saveKey — valideer per soort en leid een nette label af.
  let rec: PosQuickKey;
  if (data.kind === "catalog") {
    if (!data.productId || !data.variantId) {
      return NextResponse.json({ error: "Kies een product + variant." }, { status: 400 });
    }
    const found = resolveLine(data.productId, data.variantId);
    if (!found) {
      return NextResponse.json({ error: "Product niet gevonden." }, { status: 400 });
    }
    rec = {
      id: data.id || crypto.randomUUID(),
      kind: "catalog",
      label: (data.label?.trim() || `${found.product.brand} ${found.product.title}`).slice(0, 40),
      productId: data.productId,
      variantId: data.variantId,
      ...(data.color ? { color: data.color } : {}),
    };
  } else {
    const amount = Math.round((data.amount ?? 0) * 100) / 100;
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Vul een bedrag (> 0) in." }, { status: 400 });
    }
    if (!data.label?.trim()) {
      return NextResponse.json({ error: "Vul een label in." }, { status: 400 });
    }
    rec = {
      id: data.id || crypto.randomUUID(),
      kind: data.kind,
      label: data.label.trim().slice(0, 40),
      amount,
      ...(data.color ? { color: data.color } : {}),
    };
  }

  const quickKeys = await upsertQuickKey(rec);
  return NextResponse.json({ ok: true, quickKeys });
}
