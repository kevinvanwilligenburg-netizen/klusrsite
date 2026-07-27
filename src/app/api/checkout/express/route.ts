import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, setMolliePaymentId } from "@/lib/store/orders";
import { createPayment } from "@/lib/payments";
import { checkStockForItems, shortageMessage } from "@/lib/live-stock";
import type { CartItem, OrderCustomer } from "@/types";

export const runtime = "nodejs";

/**
 * Express-checkout voor wallets zónder native sheet (Google Pay, PayPal). De klant
 * tikt de knop in het "Snelle checkout"-blok bovenaan; wij maken meteen de order +
 * Mollie-betaling aan en sturen 'm door naar de wallet (checkoutUrl). De wallet/Mollie
 * verzamelt het bezorgadres; de webhook vult dat daarna via updateOrderContact aan op
 * de order. Zo hoeft de klant geen formulier in te vullen.
 *
 * Apple Pay loopt NIET via deze route maar via de native flow (/applepay-cart).
 */

const cartItemSchema = z.object({
  key: z.string(),
  productId: z.string(),
  variantId: z.string(),
  title: z.string(),
  brand: z.string(),
  image: z.string(),
  variantLabel: z.string(),
  slug: z.string(),
  quantity: z.number().int().positive(),
  price: z.number(),
  kluspasPrice: z.number(),
  selectedColor: z
    .object({
      name: z.string(),
      code: z.string(),
      hex: z.string(),
      collection: z.string().optional(),
    })
    .optional(),
});

const bodySchema = z.object({
  items: z.array(cartItemSchema).min(1),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
  kluspasSavings: z.number(),
  method: z.string(),
  email: z.string().email().optional(),
  ga: z
    .object({
      clientId: z.string().optional(),
      sessionId: z.string().optional(),
      gclid: z.string().optional(),
      consent: z.boolean().optional(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Ongeldige bestelgegevens" }, { status: 400 });
    }
    const data = parsed.data;

    // Voorraad-guard (Nijverdal): zie lib/live-stock.ts. Fail-open bij storing.
    const shortages = await checkStockForItems(data.items as CartItem[]);
    if (shortages.length) {
      return NextResponse.json(
        { error: shortageMessage(shortages), shortages },
        { status: 409 },
      );
    }

    // Order met (nog) leeg adres — de wallet/Mollie levert dat; de webhook vult aan.
    const customer: OrderCustomer = {
      email: data.email ?? "",
      firstName: "",
      lastName: "",
      street: "",
      postalCode: "",
      city: "",
      country: "NL",
    };

    const order = await createOrder({
      customer,
      items: data.items as CartItem[],
      subtotal: data.subtotal,
      shipping: data.shipping,
      total: data.total,
      kluspasSavings: data.kluspasSavings,
      paymentMethod: data.method,
      ga: data.ga,
    });

    const origin =
      req.headers.get("origin") ||
      (() => {
        try {
          return new URL(req.url).origin;
        } catch {
          return undefined;
        }
      })();

    const payment = await createPayment({
      orderId: order.id,
      reference: order.reference,
      amount: data.total,
      method: data.method,
      baseUrl: origin,
    });

    if (payment.molliePaymentId) {
      await setMolliePaymentId(order.id, payment.molliePaymentId);
    }

    return NextResponse.json({
      orderId: order.id,
      reference: order.reference,
      checkoutUrl: payment.checkoutUrl,
      demo: payment.demo,
    });
  } catch (err) {
    console.error("[api/checkout/express]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Betaling aanmaken mislukt: ${detail}` }, { status: 500 });
  }
}
