import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, setMolliePaymentId } from "@/lib/store/orders";
import { createPayment } from "@/lib/payments";
import { checkStockForItems, shortageMessage } from "@/lib/live-stock";
import type { CartItem, OrderCustomer } from "@/types";

export const runtime = "nodejs";

/**
 * Apple Pay Direct vanuit de checkout — voor de HELE winkelwagen (express-knop
 * bovenaan de checkout). De client levert in `onpaymentauthorized` de payment-
 * token + het door Apple verzamelde contact/bezorgadres. We bouwen de order
 * server-side uit de meegestuurde cart + bedragen (niet manipuleerbaar) en maken
 * via Mollie een betaling met de Apple Pay-token. Zo hoeft de klant geen
 * formulier in te vullen: Apple levert naam, e-mail én bezorgadres.
 *
 * Tegenhanger van /api/checkout/applepay-pay (die voor één PDP-product is).
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
  token: z.unknown(),
  // Apple Pay shippingContact — losjes getypeerd; defensief uitgelezen.
  contact: z.any(),
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
      return NextResponse.json({ ok: false, error: "Ongeldige Apple Pay-gegevens" }, { status: 400 });
    }
    const data = parsed.data;

    // 0. Voorraad-guard (Nijverdal): zie lib/live-stock.ts. Fail-open bij storing.
    const shortages = await checkStockForItems(data.items as CartItem[]);
    if (shortages.length) {
      return NextResponse.json(
        { ok: false, error: shortageMessage(shortages), shortages },
        { status: 409 },
      );
    }

    // 1. Klantgegevens uit het Apple Pay-contact (naam, e-mail, bezorgadres).
    const contact = (data.contact ?? {}) as {
      givenName?: string;
      familyName?: string;
      emailAddress?: string;
      phoneNumber?: string;
      addressLines?: string[];
      postalCode?: string;
      locality?: string;
      countryCode?: string;
    };
    const customer: OrderCustomer = {
      firstName: contact.givenName ?? "",
      lastName: contact.familyName ?? "",
      email: contact.emailAddress ?? "",
      phone: contact.phoneNumber,
      street: (contact.addressLines ?? []).join(" ").trim(),
      postalCode: contact.postalCode ?? "",
      city: contact.locality ?? "",
      country: (contact.countryCode || "NL").toUpperCase(),
    };

    // 2. Order vastleggen uit de meegestuurde winkelwagen (status "open").
    const order = await createOrder({
      customer,
      items: data.items as CartItem[],
      subtotal: data.subtotal,
      shipping: data.shipping,
      total: data.total,
      kluspasSavings: data.kluspasSavings,
      paymentMethod: "applepay",
      ga: data.ga,
    });

    // 3. Mollie-betaling met de Apple Pay-token.
    const origin =
      req.headers.get("origin") ||
      (() => {
        try {
          return new URL(req.url).origin;
        } catch {
          return undefined;
        }
      })();

    const billingAddress = {
      givenName: customer.firstName,
      familyName: customer.lastName,
      email: customer.email,
      streetAndNumber: customer.street,
      postalCode: customer.postalCode,
      city: customer.city,
      country: (customer.country || "NL").toUpperCase().slice(0, 2),
    };

    const payment = await createPayment({
      orderId: order.id,
      reference: order.reference,
      amount: data.total,
      method: "applepay",
      applePayToken: JSON.stringify(data.token),
      baseUrl: origin,
      billingAddress,
    });

    if (payment.molliePaymentId) {
      await setMolliePaymentId(order.id, payment.molliePaymentId);
    }

    return NextResponse.json({ ok: true, orderId: order.id, reference: order.reference });
  } catch (err) {
    console.error("[api/checkout/applepay-cart]", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: detail }, { status: 500 });
  }
}
