import type { Order } from "@/types";
import { sendEmail, isEmailConfigured, type SendEmailResult } from "./client";
import {
  orderConfirmationEmail,
  shippingConfirmationEmail,
  reviewRequestEmail,
  welcomeEmail,
  verificationEmail,
  magicLinkEmail,
  passwordResetEmail,
  abandonedCartEmail,
  supportConfirmationEmail,
  supportTeamNotificationEmail,
  supportReplyEmail,
} from "./templates";

/** Inbox van de klantenservice (waar contactformulier-meldingen heen gaan). */
const TEAM_EMAIL = process.env.EMAIL_REPLY_TO || "klantenservice@klus-r.nl";

/** Verstuur een "winkelwagen-vergeten" herinnering. */
export async function sendAbandonedCart(input: {
  email: string;
  name?: string;
  items: { title: string; quantity: number; price: number }[];
  total: number;
}): Promise<SendEmailResult> {
  const { subject, html, text } = abandonedCartEmail({
    name: input.name,
    items: input.items,
    total: input.total,
  });
  return sendEmail({ to: input.email, subject, html, text });
}

export { isEmailConfigured };
export type { SendEmailResult };

/** Verstuur een e-mailbevestigingslink na registratie. */
export async function sendVerificationEmail(input: {
  email: string;
  name?: string;
  url: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = verificationEmail(input.name ?? "", input.url);
  return sendEmail({ to: input.email, subject, html, text });
}

/** Verstuur een magic-link inlogmail. */
export async function sendMagicLink(input: {
  email: string;
  name?: string;
  url: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = magicLinkEmail(input.name ?? "", input.url);
  return sendEmail({ to: input.email, subject, html, text });
}

/** Verstuur een wachtwoord-herstelmail. */
export async function sendPasswordReset(input: {
  email: string;
  name?: string;
  url: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = passwordResetEmail(input.name ?? "", input.url);
  return sendEmail({ to: input.email, subject, html, text });
}

/** Verstuur de bestelbevestiging naar de klant. */
export async function sendOrderConfirmation(order: Order): Promise<SendEmailResult> {
  const { subject, html, text } = orderConfirmationEmail(order);
  return sendEmail({ to: order.customer.email, subject, html, text });
}

/** Verstuur de "je bestelling is onderweg"-mail met track & trace. */
export async function sendShippingConfirmation(order: Order): Promise<SendEmailResult> {
  const { subject, html, text } = shippingConfirmationEmail(order);
  return sendEmail({ to: order.customer.email, subject, html, text });
}

/** Verstuur een reviewverzoek (enkele dagen na bezorging). */
export async function sendReviewRequest(order: Order): Promise<SendEmailResult> {
  const { subject, html, text } = reviewRequestEmail(order);
  return sendEmail({ to: order.customer.email, subject, html, text });
}

/** Verstuur een welkomstmail na nieuwsbrief-inschrijving. */
export async function sendWelcomeEmail(input: {
  email: string;
  firstName?: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = welcomeEmail({ firstName: input.firstName });
  return sendEmail({ to: input.email, subject, html, text });
}

/** Bevestig de ontvangst van een klantenservicevraag. */
export async function sendSupportConfirmation(input: {
  email: string;
  name?: string;
  reference: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = supportConfirmationEmail(
    input.name ?? "",
    input.reference,
    input.subject,
    input.body,
  );
  return sendEmail({ to: input.email, subject, html, text });
}

/**
 * Meld een nieuw contactformulier-ticket aan de klantenservice-inbox. De reply-to
 * is de klant, zodat het team rechtstreeks vanuit de mail kan antwoorden. Zonder
 * deze melding belandde een vraag alléén in /admin en niet in de mailbox.
 */
export async function sendSupportTeamNotification(input: {
  email: string;
  name?: string;
  reference: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = supportTeamNotificationEmail(
    input.name ?? "",
    input.email,
    input.reference,
    input.subject,
    input.body,
  );
  return sendEmail({ to: TEAM_EMAIL, subject, html, text, replyTo: input.email });
}

/** Verstuur het antwoord van de klantenservice op een ticket. */
export async function sendSupportReply(input: {
  email: string;
  name?: string;
  reference: string;
  body: string;
}): Promise<SendEmailResult> {
  const { subject, html, text } = supportReplyEmail(input.name ?? "", input.reference, input.body);
  return sendEmail({ to: input.email, subject, html, text });
}
