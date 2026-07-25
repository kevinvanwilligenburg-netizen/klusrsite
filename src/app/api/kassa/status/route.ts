import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { getOrder, updateOrderStatus } from "@/lib/store/orders";
import { getPaymentStatus, mapMollieStatus } from "@/lib/payments";
import { recordOrderSale } from "@/lib/store/stock-ledger";
import { receiptDataForOrder } from "@/lib/pos-receipt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kassa: pollt de betaalstatus van een (terminal-)order. Bij de eerste overgang
 * naar betaald boeken we de voorraad af en geven we de bon-gegevens terug.
 */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const orderId = new URL(req.url).searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "order ontbreekt" }, { status: 400 });

  let order = await getOrder(orderId);
  if (!order) return NextResponse.json({ error: "order niet gevonden" }, { status: 404 });

  const settled = new Set(["paid", "authorized", "shipped", "delivered"]);

  // Nog niet afgerond én er is een Mollie-betaling → status ophalen en bijwerken.
  if (!settled.has(order.paymentStatus) && order.molliePaymentId) {
    const status = await getPaymentStatus(order.molliePaymentId);
    if (status) {
      const mapped = mapMollieStatus(status.status);
      const wasPaid = settled.has(order.paymentStatus);
      order = (await updateOrderStatus(order.id, mapped)) ?? order;
      if (!wasPaid && (mapped === "paid" || mapped === "authorized")) {
        await recordOrderSale(order);
      }
    }
  }

  const paid = settled.has(order.paymentStatus);
  return NextResponse.json({
    orderId: order.id,
    reference: order.reference,
    status: order.paymentStatus,
    paid,
    change: order.pos?.change,
    receipt: receiptDataForOrder(order),
  });
}
