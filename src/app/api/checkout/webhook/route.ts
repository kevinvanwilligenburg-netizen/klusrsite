import { NextResponse } from "next/server";
import { getPaymentStatus, mapMollieStatus } from "@/lib/payments";
import { getOrder, getOrderByMollieId, updateOrderStatus, updateOrderContact } from "@/lib/store/orders";
import { fulfillPaidOrder, sendOrderConfirmationEmail } from "@/lib/order-fulfillment";
import { sendPushToAdmins } from "@/lib/push";
import { sendGa4Purchase } from "@/lib/ga4-mp";
import { formatPrice } from "@/lib/utils";
import { meldCartLeadCompleet } from "@/lib/vdm-cart-lead";

export const runtime = "nodejs";

/**
 * Mollie webhook. Mollie POSTs `id=<paymentId>` (form-encoded) whenever a
 * payment's status changes. We re-fetch the payment (never trust the body)
 * and update the corresponding order.
 */
export async function POST(req: Request) {
  try {
    let paymentId: string | undefined;

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      paymentId = body.id;
    } else {
      const form = await req.formData();
      paymentId = form.get("id")?.toString();
    }

    if (!paymentId) {
      return NextResponse.json({ error: "Geen payment id" }, { status: 400 });
    }

    const status = await getPaymentStatus(paymentId);
    if (!status) {
      // Mollie not configured (demo) — nothing to verify.
      return NextResponse.json({ ok: true, demo: true });
    }

    // Prefer the orderId from Mollie metadata, fall back to the payment-id index.
    const order =
      (status.orderId ? await getOrder(status.orderId) : undefined) ??
      (await getOrderByMollieId(paymentId));
    if (order) {
      // Express-checkout (wallet zonder formulier): vul een ontbrekend bezorgadres
      // aan met wat de wallet/Mollie teruggaf, vóór we fulfilen en mailen.
      let current = order;
      if (
        status.contact &&
        (!order.customer.street?.trim() || !order.customer.city?.trim())
      ) {
        await updateOrderContact(order.id, status.contact);
        current = (await getOrder(order.id)) ?? order;
      }
      const mapped = mapMollieStatus(status.status);
      // Terugbetaling herkennen: een (deels) gerefunde betaling.
      const refunded = (status.amountRefunded ?? 0) > 0;
      const fullyRefunded =
        refunded && status.amount != null && (status.amountRefunded ?? 0) >= status.amount - 0.005;
      const finalStatus = fullyRefunded ? "refunded" : mapped;
      const isTest = status.mode === "test" ? true : undefined;
      // `order` is opgehaald vóór updateOrderStatus, dus dit is de VORIGE status.
      // Zo herkennen we de éérste overgang naar betaald (voor de GA4-purchase).
      const wasPaid = order.paymentStatus === "paid" || order.paymentStatus === "authorized";
      await updateOrderStatus(order.id, finalStatus, {
        isTest,
        refundedAmount: refunded ? status.amountRefunded : undefined,
      });
      // Alleen bij een échte, niet-terugbetaalde, niet-test betaling: fulfilen + mailen.
      if (!refunded && !isTest && (mapped === "paid" || mapped === "authorized")) {
        const paidOrder = { ...current, paymentStatus: mapped };
        await fulfillPaidOrder(paidOrder);
        // Send the branded confirmation once (claim guards against retries).
        await sendOrderConfirmationEmail(paidOrder);
        // Server-side GA4 `purchase` (Measurement Protocol) — alleen bij de éérste
        // overgang naar betaald, zodat retries niet dubbel tellen (GA4 ontdubbelt
        // bovendien op transaction_id). Best-effort: gooit nooit en raakt de
        // 200-respons niet. Testorders worden hierboven al overgeslagen.
        if (!wasPaid) {
          // Awaiten (géén fire-and-forget): op Vercel serverless kan de functie
          // ná de 200-respons bevriezen vóórdat de fetch klaar is. sendGa4Purchase
          // gooit nooit en heeft een eigen 3s-timeout, dus awaiten is veilig en
          // garandeert dat de purchase écht wordt verstuurd.
          await sendGa4Purchase(paidOrder);
          // Verlaten-wagen-melding afmelden bij het VDM-dashboard. Zonder dit
          // krijgt iemand die net betaald heeft alsnog "je winkelwagen staat
          // klaar". Bewust hier en niet op de bedankpagina: de webhook is onze
          // bron van waarheid, en niet elke klant komt terug.
          await meldCartLeadCompleet(paidOrder.customer.email ?? "");
        }
        // Beheerders een push sturen over de nieuwe bestelling. Awaiten (parallel +
        // in tijd gebonden, gooit nooit) zodat de melding écht verstuurd wordt vóór
        // de serverless functie kan bevriezen; de outer try/catch garandeert 200.
        await sendPushToAdmins({
          title: "Nieuwe bestelling",
          body: `${order.reference} · ${formatPrice(order.total)}`,
          url: "/admin",
        });
      }
    }

    // Always return 200 so Mollie stops retrying.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/checkout/webhook]", err);
    // Still return 200 to avoid infinite Mollie retries on transient errors.
    return NextResponse.json({ ok: true });
  }
}
