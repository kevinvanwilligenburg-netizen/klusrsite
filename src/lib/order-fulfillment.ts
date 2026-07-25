import type { Order } from "@/types";
import { pushChannableOrder } from "@/lib/channable";
import {
  claimConfirmationEmail,
  markChannable,
  releaseConfirmationEmail,
} from "@/lib/store/orders";
import { sendOrderConfirmation } from "@/lib/email";
import { addContact, AUDIENCES } from "@/lib/email/audiences";
import { clearPendingCart } from "@/lib/store/pending-cart";
import { logEvent } from "@/lib/store/analytics";
import { recordOrderSale } from "@/lib/store/stock-ledger";

/**
 * Verwerk een betaalde order: schiet hem in Channable (die routeert naar Tilroy)
 * en houd de fulfilment-status bij. Idempotent: een al verzonden order wordt niet
 * opnieuw gepusht.
 */
export async function fulfillPaidOrder(order: Order): Promise<void> {
  // Voorraad afboeken op het gedeelde grootboek (idempotent per order) — zodat
  // een webverkoop direct meetelt met wat de kassa/voorraad nog beschikbaar ziet.
  void recordOrderSale(order).catch(() => {});

  if (order.channableStatus === "sent" || order.channableStatus === "demo") return;

  const result = await pushChannableOrder(order);
  if (result.demo) {
    await markChannable(order.id, "demo");
  } else if (result.ok) {
    await markChannable(order.id, "sent", result.channableOrderId);
  } else {
    await markChannable(order.id, "failed");
  }
}

/**
 * Stuur de bestelbevestiging naar de klant — exact één keer per order. De claim
 * is synchroon, dus parallelle webhook-calls leveren geen dubbele mail op. Bij
 * een echte verzendfout geven we de claim vrij zodat een retry alsnog mag.
 */
export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  // Betaald → geen "winkelwagen-vergeten" herinnering meer nodig.
  void clearPendingCart(order.customer.email).catch(() => {});

  if (!(await claimConfirmationEmail(order.id))) return;

  // Conversie registreren — precies één keer per order (na de mail-claim).
  void logEvent("conversion", { value: order.total, reference: order.reference }).catch(() => {});

  // Koper als contact in de Resend-audiences zetten (klanten + zakelijk).
  const c = order.customer;
  void addContact({
    audience: AUDIENCES.CUSTOMERS,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
  }).catch(() => {});
  if (c.company) {
    void addContact({
      audience: AUDIENCES.BUSINESS,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
    }).catch(() => {});
  }

  const result = await sendOrderConfirmation(order);
  if (!result.ok && !result.demo) {
    await releaseConfirmationEmail(order.id);
  }
}
