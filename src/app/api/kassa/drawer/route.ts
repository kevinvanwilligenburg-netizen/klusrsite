import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { drawerKickBytes } from "@/lib/escpos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kassalade openen: geeft de ruwe ESC/POS "drawer kick"-bytes terug. De kassa-pc
 * (print-agent / WebUSB) stuurt deze naar de bonprinter, die de lade-poort
 * aanstuurt waardoor de kassalade opent.
 */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return new Response(new Blob([drawerKickBytes()]), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": 'attachment; filename="drawer-kick.bin"',
      "Cache-Control": "no-store",
    },
  });
}

export const POST = GET;
