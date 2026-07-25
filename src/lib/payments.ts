import createMollieClient, { type MollieClient } from "@mollie/api-client";
import type { PaymentMethodInfo } from "@/types";

/**
 * Mollie payments helper. When MOLLIE_API_KEY is missing the app runs in demo
 * mode: payments are simulated as immediately paid so the full checkout →
 * thank-you flow is testable without credentials.
 */

/**
 * Maak de Mollie-sleutel robuust. Vangt twee veelgemaakte fouten op:
 *  - een per ongeluk dubbel geplakte sleutel (live_x…live_x…), en
 *  - omringende spaties/tekst.
 * We pakken de éérste geldige test_/live_-sleutel (prefix + 30 alfanumerieke
 * tekens). Zo voorkomen we de "Invalid Authorization header"-fout.
 */
function normalizeMollieKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const m = trimmed.match(/(?:test|live)_[A-Za-z0-9]{30}/);
  if (m && m[0] !== trimmed) {
    console.warn("[mollie] MOLLIE_API_KEY is opgeschoond (dubbele/verkeerd geplakte waarde gedetecteerd).");
  }
  return m ? m[0] : trimmed;
}

const API_KEY = normalizeMollieKey(process.env.MOLLIE_API_KEY);
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

let client: MollieClient | null = null;

export function isMollieConfigured(): boolean {
  return Boolean(API_KEY);
}

/**
 * De opgeschoonde Mollie-sleutel. Gebruikt door routes die rechtstreeks met de
 * Mollie-API praten (bijv. de Apple Pay merchant-sessie), zodat ze exact dezelfde
 * normalisatie krijgen als deze helper en de "Invalid Authorization header"-fout
 * voorkomen wordt. Geeft undefined wanneer er geen sleutel is geconfigureerd.
 */
export function getMollieApiKey(): string | undefined {
  return API_KEY;
}

function getClient(): MollieClient | null {
  if (!isMollieConfigured()) return null;
  if (!client) client = createMollieClient({ apiKey: API_KEY! });
  return client;
}

/**
 * Aliassen voor enkele interne method-ids → Mollie. De checkout stuurt sinds de
 * dynamische methodenlijst meestal al een echte Mollie-id mee; onbekende ids
 * laten we dus ongewijzigd door (passthrough).
 */
const methodMap: Record<string, string> = {
  ideal: "ideal",
  bancontact: "bancontact",
  creditcard: "creditcard",
  klarna: "klarna",
};

function toMollieMethod(method?: string): string | undefined {
  if (!method) return undefined;
  return methodMap[method] ?? method;
}

export interface CreatePaymentInput {
  orderId: string;
  reference: string;
  amount: number;
  method?: string;
  description?: string;
  /** Basis-URL voor redirect/webhook (uit de request-origin); valt terug op SITE_URL. */
  baseUrl?: string;
  /** Mollie Components card-token (creditcard ingebed op onze eigen pagina). */
  cardToken?: string;
  /** Apple Pay payment-token (JSON-string) uit de native Apple Pay-sheet. */
  applePayToken?: string;
  /** iDEAL-bank (issuer-id) — vooraf gekozen op onze eigen checkout. */
  issuer?: string;
  /** Factuuradres — vereist voor Klarna e.d. (pay-later). */
  billingAddress?: Record<string, unknown>;
  /** Order-regels — vereist voor Klarna e.d.; moeten exact optellen tot `amount`. */
  lines?: unknown[];
}

export interface CreatePaymentResult {
  checkoutUrl: string;
  molliePaymentId?: string;
  demo: boolean;
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const mollie = getClient();
  const value = input.amount.toFixed(2);
  const base = (input.baseUrl || SITE_URL).replace(/\/$/, "");

  // Demo mode — no real redirect; go straight to the thank-you page.
  if (!mollie) {
    return {
      checkoutUrl: `${base}/bedankt?order=${input.orderId}&demo=1`,
      demo: true,
    };
  }

  const mollieMethod = toMollieMethod(input.method);
  const params: Record<string, unknown> = {
    amount: { currency: "EUR", value },
    description: input.description ?? `KLUSR bestelling ${input.reference}`,
    redirectUrl: `${base}/bedankt?order=${input.orderId}`,
    webhookUrl: process.env.MOLLIE_WEBHOOK_URL || `${base}/api/checkout/webhook`,
    metadata: { orderId: input.orderId, reference: input.reference },
    ...(mollieMethod ? { method: mollieMethod } : {}),
  };
  // iDEAL: vooraf gekozen bank meesturen → klant gaat direct naar de juiste bank.
  if (mollieMethod === "ideal" && input.issuer) params.issuer = input.issuer;
  // Mollie Components: card-token meegeven bij een ingebedde creditcard-betaling.
  if (input.cardToken) params.cardToken = input.cardToken;
  // Apple Pay Direct: de payment-token uit de native sheet meegeven → Mollie
  // verwerkt de betaling direct zonder gehoste redirect (method "applepay").
  if (input.applePayToken) params.applePayPaymentToken = input.applePayToken;
  // Factuuradres + order-regels (Klarna e.d.).
  if (input.billingAddress) params.billingAddress = input.billingAddress;
  if (input.lines && input.lines.length) params.lines = input.lines;
  const payment = await mollie.payments.create(params as never);

  return {
    checkoutUrl: payment.getCheckoutUrl() ?? `${base}/bedankt?order=${input.orderId}`,
    molliePaymentId: payment.id,
    demo: false,
  };
}

/** Mollie-terminal (Point-of-Sale) voor pinnen aan de fysieke kassa. */
export function getMollieTerminalId(): string | undefined {
  const id = (process.env.MOLLIE_TERMINAL_ID || "").trim();
  return id || undefined;
}

/** Is er een Mollie-betaalterminal gekoppeld (sleutel + terminal-id)? */
export function isMollieTerminalConfigured(): boolean {
  return isMollieConfigured() && Boolean(getMollieTerminalId());
}

export interface TerminalPaymentInput {
  amount: number;
  description: string;
  orderId: string;
  reference: string;
  /** Basis-URL voor de webhook (uit de request-origin); valt terug op SITE_URL. */
  baseUrl?: string;
  /** Specifieke terminal; valt terug op MOLLIE_TERMINAL_ID. */
  terminalId?: string;
}

export interface TerminalPaymentResult {
  molliePaymentId?: string;
  status: string;
  demo: boolean;
}

/**
 * Start een Point-of-Sale-betaling op een Mollie-betaalterminal: het bedrag
 * verschijnt op de pinautomaat en de klant betaalt daar. De kassa pollt daarna
 * de status (`getPaymentStatus`) tot "paid". Zonder Mollie/terminal degradeert
 * dit naar demo (meteen betaald), zodat de kassa-flow testbaar blijft.
 */
export async function createTerminalPayment(
  input: TerminalPaymentInput,
): Promise<TerminalPaymentResult> {
  const mollie = getClient();
  const terminalId = input.terminalId || getMollieTerminalId();
  if (!mollie || !terminalId) {
    return { status: "paid", demo: true };
  }
  const base = (input.baseUrl || SITE_URL).replace(/\/$/, "");
  const payment = await mollie.payments.create({
    amount: { currency: "EUR", value: input.amount.toFixed(2) },
    description: input.description,
    method: "pointofsale",
    terminalId,
    webhookUrl: process.env.MOLLIE_WEBHOOK_URL || `${base}/api/checkout/webhook`,
    metadata: { orderId: input.orderId, reference: input.reference },
  } as never);
  return { molliePaymentId: payment.id, status: payment.status, demo: false };
}

/** Fetch a Mollie payment's status (used by the webhook). */
export async function getPaymentStatus(
  paymentId: string,
): Promise<{
  status: string;
  orderId?: string;
  mode?: string;
  amount?: number;
  amountRefunded?: number;
  /** Naam/adres dat de wallet/Mollie teruggaf (PayPal e.d.) — voor express-backfill. */
  contact?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
} | null> {
  const mollie = getClient();
  if (!mollie) return null;
  const payment = await mollie.payments.get(paymentId);
  const toNum = (m: { value?: string } | null | undefined) =>
    m?.value != null ? Number(m.value) : undefined;

  // Bezorg-/factuuradres uit de method-details halen (bv. PayPal levert dit terug).
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  const details = (payment as { details?: Record<string, unknown> }).details ?? {};
  const ship = (details.shippingAddress ?? {}) as Record<string, unknown>;
  const fullName = str(details.consumerName);
  const [firstName, ...rest] = (fullName ?? "").split(" ");
  const account = str(details.consumerAccount);
  const contact = {
    firstName: fullName ? firstName : undefined,
    lastName: rest.length ? rest.join(" ") : undefined,
    email: account && account.includes("@") ? account : undefined,
    street: str(ship.streetAndNumber),
    postalCode: str(ship.postalCode),
    city: str(ship.city),
    country: str(ship.country),
  };
  const hasContact = Object.values(contact).some(Boolean);

  return {
    status: payment.status,
    orderId: (payment.metadata as { orderId?: string } | null)?.orderId,
    mode: (payment as { mode?: string }).mode,
    amount: toNum(payment.amount as { value?: string } | undefined),
    amountRefunded: toNum(
      (payment as { amountRefunded?: { value?: string } }).amountRefunded,
    ),
    ...(hasContact ? { contact } : {}),
  };
}

/** Officieel Mollie-logo (CDN) per method-id — als fallback wanneer de live
 * methodenlijst (nog) geen image meegeeft. */
const mollieIcon = (id: string) =>
  `https://www.mollie.com/external/icons/payment-methods/${id}.svg`;

/** Statische fallback-lijst (demo / Mollie onbereikbaar) met officiële logo's. */
/** Statische terugval (demo / methodenroute onbereikbaar). Landbewust: NL toont
 *  iDEAL, BE toont Bancontact. Apple Pay & Google Pay altijd erbij. */
function fallbackMethods(country?: string): PaymentMethodInfo[] {
  const rest: PaymentMethodInfo[] = [
    { id: "creditcard", label: "Creditcard", image: mollieIcon("creditcard") },
    { id: "applepay", label: "Apple Pay", image: mollieIcon("applepay") },
    { id: "googlepay", label: "Google Pay", image: mollieIcon("googlepay") },
    { id: "klarna", label: "Achteraf betalen met Klarna", image: mollieIcon("klarna") },
  ];
  return country === "BE"
    ? [{ id: "bancontact", label: "Bancontact", image: mollieIcon("bancontact") }, ...rest]
    : [{ id: "ideal", label: "iDEAL", image: mollieIcon("ideal") }, ...rest];
}

/**
 * Lokale bankmethoden die aan één land gebonden zijn. Andere methoden
 * (creditcard, Apple Pay, Google Pay, Klarna, PayPal, SEPA-overboeking) zijn
 * EU-breed en passen altijd. Voorkomt dat een NL-klant Belgische methoden
 * (Bancontact/KBC/Belfius) ziet — en omgekeerd geen iDEAL voor BE — ook al
 * staat alles in Mollie aan.
 */
const COUNTRY_LOCKED_METHODS: Record<string, string> = {
  ideal: "NL",
  bancontact: "BE",
  kbc: "BE",
  belfius: "BE",
  eps: "AT",
  przelewy24: "PL",
  giropay: "DE",
};

/** Google Pay tonen we pas zodra de native flow geconfigureerd is (Google
 *  Merchant ID gezet). De hosted-redirect werkt niet bij onze eigen checkout. */
const GOOGLE_PAY_ENABLED =
  (process.env.NEXT_PUBLIC_GOOGLE_PAY_MERCHANT_ID ?? "").trim().length > 0;

/** Filter de methodenlijst voor de huidige context: landgebonden methoden alleen
 *  voor hun eigen land, en Google Pay alleen als de native flow aanstaat. */
function filterMethodsByCountry(
  methods: PaymentMethodInfo[],
  cc?: string,
): PaymentMethodInfo[] {
  return methods.filter((m) => {
    const id = m.id.toLowerCase();
    if (id === "googlepay" && !GOOGLE_PAY_ENABLED) return false;
    if (!cc) return true;
    const locked = COUNTRY_LOCKED_METHODS[id];
    return !locked || locked === cc;
  });
}

export interface PaymentMethodsResult {
  /** True wanneer de lijst live uit Mollie komt (anders fallback). */
  configured: boolean;
  methods: PaymentMethodInfo[];
}

type RawMollieMethod = {
  id: string;
  description?: string;
  image?: { svg?: string };
  issuers?: { id: string; name: string; image?: { svg?: string } }[] | null;
};

/**
 * Haal de in Mollie geactiveerde betaalmethoden op, inclusief officiële logo's
 * en (voor iDEAL) de banklijst. Filtert op bedrag zodat methoden met een
 * minimum/maximum (zoals Klarna) alleen verschijnen wanneer ze écht kunnen.
 * Valt terug op een statische lijst zonder credentials of bij een fout.
 */
export async function listPaymentMethods(
  amount?: number,
  country?: string,
): Promise<PaymentMethodsResult> {
  const cc = country ? country.toUpperCase().slice(0, 2) : undefined;
  const mollie = getClient();
  if (!mollie)
    return { configured: false, methods: filterMethodsByCountry(fallbackMethods(cc), cc) };
  try {
    const params: Record<string, unknown> = {
      include: "issuers",
      // Wallets (Apple Pay / Google Pay) komen alléén mee met includeWallets.
      includeWallets: "applepay,googlepay",
    };
    if (amount && amount > 0) {
      params.amount = { currency: "EUR", value: amount.toFixed(2) };
    }
    // Land meegeven zodat Mollie de juiste (bv. Belgische) methoden teruggeeft.
    if (cc) params.billingCountry = cc;
    const list = (await mollie.methods.list(params as never)) as unknown as RawMollieMethod[];
    const methods: PaymentMethodInfo[] = list.map((m) => ({
      id: m.id,
      label: m.description ?? m.id,
      image: m.image?.svg ?? mollieIcon(m.id),
      issuers: Array.isArray(m.issuers) && m.issuers.length
        ? m.issuers.map((i) => ({ id: i.id, name: i.name, image: i.image?.svg }))
        : undefined,
    }));
    const filtered = filterMethodsByCountry(methods, cc);
    return {
      configured: true,
      methods: filtered.length ? filtered : filterMethodsByCountry(fallbackMethods(cc), cc),
    };
  } catch (err) {
    console.error("[mollie] methods list failed", err);
    return { configured: false, methods: filterMethodsByCountry(fallbackMethods(cc), cc) };
  }
}

/** Translate a Mollie status to our internal OrderStatus. */
export function mapMollieStatus(status: string) {
  switch (status) {
    case "paid":
      return "paid" as const;
    case "authorized":
      return "authorized" as const;
    case "pending":
    case "open":
      return "pending" as const;
    case "canceled":
      return "canceled" as const;
    case "expired":
      return "expired" as const;
    case "failed":
      return "failed" as const;
    default:
      return "open" as const;
  }
}

export interface MollieCheckResult {
  ok: boolean;
  configured: boolean;
  status: number;
  message: string;
  /** Geactiveerde betaalmethoden (id's), indien beschikbaar. */
  methods?: string[];
  error?: string;
}

/**
 * Controleer of de Mollie-koppeling werkt: valideert de API-sleutel en haalt de
 * geactiveerde betaalmethoden op (mollie.methods.list). Maakt geen betaling aan.
 */
export async function checkMollie(): Promise<MollieCheckResult> {
  const mollie = getClient();
  if (!mollie) {
    return {
      ok: false,
      configured: false,
      status: 0,
      message: "Mollie is niet geconfigureerd — zet MOLLIE_API_KEY in de omgeving.",
    };
  }
  try {
    const methods = await mollie.methods.list();
    const ids = methods.map((m) => m.id);
    return {
      ok: true,
      configured: true,
      status: 200,
      message: ids.length
        ? `Mollie werkt. Actieve betaalmethoden: ${ids.join(", ")}.`
        : "Mollie-sleutel werkt, maar er zijn nog géén betaalmethoden geactiveerd. Zet ze aan in je Mollie-dashboard.",
      methods: ids,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      status: 0,
      message: "De Mollie-sleutel werkt niet of het profiel is nog niet geactiveerd.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
