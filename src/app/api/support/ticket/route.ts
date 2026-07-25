import { NextResponse } from "next/server";
import { createTicket } from "@/lib/store/tickets";
import { sendSupportConfirmation, sendSupportTeamNotification } from "@/lib/email";
import { logEvent } from "@/lib/store/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maak een klantenservice-ticket aan vanaf het contactformulier. */
export async function POST(req: Request) {
  let data: Record<string, unknown>;
  try {
    data = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  // Honeypot: bots vullen dit verborgen veld in → stilletjes negeren.
  if (typeof data.website === "string" && data.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid-email" }, { status: 400 });
  }
  if (message.length < 5) {
    return NextResponse.json({ ok: false, error: "message-too-short" }, { status: 400 });
  }

  const ticket = await createTicket({
    subject: subject || "Vraag via klantenservice",
    customerEmail: email,
    customerName: name || undefined,
    body: message,
    channel: "form",
  });

  // Best-effort: bevestiging naar de klant + melding naar de klantenservice-inbox.
  void sendSupportConfirmation({
    email,
    name,
    reference: ticket.reference,
    subject: ticket.subject,
    body: message,
  });
  void sendSupportTeamNotification({
    email,
    name,
    reference: ticket.reference,
    subject: ticket.subject,
    body: message,
  });
  void logEvent("support_ticket", { reference: ticket.reference, channel: "form" });

  return NextResponse.json({ ok: true, reference: ticket.reference });
}
