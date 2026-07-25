import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { getOrder } from "@/lib/store/orders";
import { receiptDataForOrder } from "@/lib/pos-receipt";
import { buildReceiptEscPos } from "@/lib/escpos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kassa-bon. `?format=escpos` geeft ruwe ESC/POS-bytes (voor een lokale print-
 * agent / WebUSB / QZ Tray), met optioneel een drawer kick (`?drawer=1`) en een
 * instelbare bonbreedte (`?width=48`). Zonder format geven we de bon-gegevens als
 * JSON terug (voor de schermweergave).
 */
export async function GET(
  req: Request,
  { params }: { params: { orderId: string } },
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const order = await getOrder(params.orderId);
  if (!order) return NextResponse.json({ error: "order niet gevonden" }, { status: 404 });

  const url = new URL(req.url);
  const data = receiptDataForOrder(order);

  if (url.searchParams.get("format") === "escpos") {
    const width = Number(url.searchParams.get("width")) || 48;
    const openDrawer = url.searchParams.get("drawer") === "1";
    const bytes = buildReceiptEscPos(data, { width, openDrawer, cut: true });
    return new Response(new Blob([bytes]), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="bon-${order.reference}.bin"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ receipt: data });
}
