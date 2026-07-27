import { NextResponse } from "next/server";
import { addNewsletterSubscriber } from "@/lib/email/audiences";
import { isKvEnabled, kvSAdd, kvSMembers } from "@/lib/store/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Dagelijkse VDM → Resend nieuwsbrief-sync.
 *
 * Haalt de nieuwste Mailchimp-inschrijvingen op uit het VDM-dashboard en voegt
 * ze toe aan de "KLUSR Nieuwsbrief"-audience in Resend. Bedoeld als Vercel
 * Cron-route (zie vercel.json, draait elke dag). Idempotent: al gesyncte e-mails
 * worden in KV bijgehouden en overgeslagen, dus de kleine overlap (dagen=2)
 * tussen dagelijkse runs levert geen dubbele contacten op.
 *
 * Benodigde env-vars:
 *   DASHBOARD_PASSWORD  Bearer-token voor de VDM-dashboard API.
 *   CRON_SECRET         Beveiligt deze route (Vercel Cron stuurt 'm mee). Optioneel
 *                       maar sterk aangeraden; zonder staat de route open.
 *   RESEND_API_KEY      Nodig om contacten daadwerkelijk in Resend te zetten;
 *                       zonder draait alles in no-op/demo-modus.
 *
 * De route gooit nooit: bij netwerk-/KV-/parse-fouten degradeert hij naar een
 * JSON-foutsamenvatting. Er worden geen volledige e-mailadressen naar de console
 * gelogd (alleen aantallen), om PII-logging te voorkomen.
 */

const CRON_SECRET = process.env.CRON_SECRET;
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;

// We pakken dagen=2 (kleine overlap zodat er tussen dagelijkse runs niets wegvalt)
// en leunen voor de dubbele inschrijvingen op de KV-dedupe hieronder.
const VDM_ENDPOINT =
  "https://dashboardvdm.vercel.app/api/mailchimp/klanten?format=json&nieuw=1&dagen=2";

// Set-key met reeds gesyncte e-mailadressen (dedupe over runs heen).
const SYNCED_SET_KEY = "mailchimp-sync:synced";

// Bewust eenvoudige e-mailcheck: voldoende om rommel/lege velden te weren.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Json = Record<string, unknown>;

/** Lees de eerste niet-lege stringwaarde uit een record voor de gegeven keys. */
function pick(rec: Json, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Normaliseer de (onbekende) JSON-respons naar een array van records. De API kan
 * een kale array teruggeven, of een object met de records onder een van een
 * aantal mogelijke sleutels.
 */
function toRecords(payload: unknown): Json[] {
  if (Array.isArray(payload)) {
    return payload.filter((r): r is Json => typeof r === "object" && r !== null);
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Json;
    for (const key of ["klanten", "data", "subscribers", "members", "items", "results"]) {
      const v = obj[key];
      if (Array.isArray(v)) {
        return v.filter((r): r is Json => typeof r === "object" && r !== null);
      }
    }
  }
  return [];
}

type Subscriber = { email: string; firstName?: string; lastName?: string };

/** Haal uit één record een bruikbare inschrijving (of niets als e-mail ontbreekt). */
function toSubscriber(rec: Json): Subscriber | null {
  const rawEmail = pick(rec, ["email", "email_address", "mail", "e_mail"]);
  if (!rawEmail) return null;
  const email = rawEmail.toLowerCase();
  if (!EMAIL_RE.test(email)) return null;
  return {
    email,
    firstName: pick(rec, ["firstName", "voornaam", "first_name", "fname"]),
    lastName: pick(rec, ["lastName", "achternaam", "last_name", "lname"]),
  };
}

export async function GET(req: Request) {
  // Zelfde guard als de andere cron-routes (blog / abandoned-cart): Vercel Cron
  // stuurt "Authorization: Bearer <CRON_SECRET>" mee als CRON_SECRET is gezet.
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!DASHBOARD_PASSWORD) {
    return NextResponse.json({
      ok: false,
      note: "DASHBOARD_PASSWORD ontbreekt; sync overgeslagen.",
      fetched: 0,
      added: 0,
      skipped: 0,
      errors: 0,
    });
  }

  let fetched = 0;
  let added = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // 1) Inschrijvingen ophalen bij het VDM-dashboard.
    let payload: unknown;
    try {
      const res = await fetch(VDM_ENDPOINT, {
        headers: { Authorization: `Bearer ${DASHBOARD_PASSWORD}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        return NextResponse.json({
          ok: false,
          note: `VDM-dashboard gaf status ${res.status}.`,
          fetched: 0,
          added: 0,
          skipped: 0,
          errors: 1,
        });
      }
      payload = await res.json();
    } catch (err) {
      console.error("[mailchimp-sync] ophalen mislukt", err);
      return NextResponse.json({
        ok: false,
        note: "VDM-dashboard onbereikbaar of ongeldige JSON.",
        fetched: 0,
        added: 0,
        skipped: 0,
        errors: 1,
      });
    }

    // 2) Defensief normaliseren naar bruikbare inschrijvingen.
    const records = toRecords(payload);
    const subscribers: Subscriber[] = [];
    for (const rec of records) {
      const sub = toSubscriber(rec);
      if (sub) subscribers.push(sub);
      else skipped++; // geen plausibel e-mailadres
    }
    fetched = subscribers.length;

    // 3) Dedupe over runs heen via KV. Zonder KV draaien we alsnog (geen state).
    const alreadySynced = isKvEnabled()
      ? new Set(await kvSMembers(SYNCED_SET_KEY))
      : new Set<string>();

    // 4) Per inschrijving toevoegen aan Resend; best-effort, één fout stopt niet.
    for (const sub of subscribers) {
      if (alreadySynced.has(sub.email)) {
        skipped++;
        continue;
      }
      try {
        await addNewsletterSubscriber({
          email: sub.email,
          firstName: sub.firstName,
          lastName: sub.lastName,
        });
        // Pas na succesvol toevoegen markeren als gesynct.
        if (isKvEnabled()) await kvSAdd(SYNCED_SET_KEY, sub.email);
        alreadySynced.add(sub.email);
        added++;
      } catch (err) {
        errors++;
        console.error("[mailchimp-sync] contact toevoegen mislukt", err);
      }
    }

    console.info(
      `[mailchimp-sync] fetched=${fetched} added=${added} skipped=${skipped} errors=${errors}`,
    );
    return NextResponse.json({ ok: true, fetched, added, skipped, errors });
  } catch (err) {
    // Vangnet: een sync-job mag nooit een 500 gooien.
    console.error("[mailchimp-sync] onverwachte fout", err);
    return NextResponse.json({
      ok: false,
      note: "Onverwachte fout tijdens sync.",
      fetched,
      added,
      skipped,
      errors: errors + 1,
    });
  }
}
