import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import { searchCustomers, upsertPosCustomer } from "@/lib/pos-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kassa: klanten zoeken (eerdere bestellingen + accounts/profielen). */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const customers = await searchCustomers(q, 8);
  return NextResponse.json({ customers });
}

const bodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().max(80).optional().default(""),
  lastName: z.string().max(80).optional().default(""),
  phone: z.string().max(40).optional(),
  company: z.string().max(160).optional(),
  cocNumber: z.string().max(40).optional(),
  vatNumber: z.string().max(40).optional(),
  createAccount: z.boolean().optional(),
  sendInvite: z.boolean().optional(),
});

/** Kassa: klant aanmaken/bijwerken (KLUSRPAS-account + ProfPas-profiel). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige klantgegevens" }, { status: 400 });
  }
  const result = await upsertPosCustomer(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    customer: result.customer,
    accountCreated: result.accountCreated ?? false,
  });
}
