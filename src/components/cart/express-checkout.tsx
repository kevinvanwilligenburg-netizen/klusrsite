"use client";

import { useEffect, useState } from "react";
import { useCart, cartSummary } from "@/lib/store/cart";
import { usePricingMode } from "@/lib/store/pricing-mode";
import { useReorderActive } from "@/lib/store/reorder";
import { useMounted } from "@/lib/hooks/use-mounted";
import { shippingForCountry } from "@/lib/shipping";
import { cn } from "@/lib/utils";
import type { PaymentMethodInfo } from "@/types";

/**
 * "Snelle checkout"-blok (Shopify-stijl): de express-wallets op een rij, direct
 * afrekenen vanuit de winkelwagen/drawer. Apple Pay loopt via de native sheet
 * (levert naam/e-mail/bezorgadres) → /applepay-cart; Google Pay via
 * /api/checkout/express (Mollie int het adres, de webhook vult het aan).
 *
 * Self-contained: haalt zelf de winkelwagen, het totaal, de wallet-methoden en de
 * Apple Pay-beschikbaarheid op. Rendert niets wanneer er geen wallets zijn.
 */

const walletIds = ["applepay", "googlepay"];
const MOLLIE_ICON = "https://www.mollie.com/external/icons/payment-methods";
const GA4_MEASUREMENT_ID = "M854M83RJW";

/** Minimale Apple Pay (JS) typing voor de native express-flow. */
interface ApplePaySessionConstructor {
  new (
    version: number,
    request: unknown,
  ): {
    onvalidatemerchant: (event: { validationURL: string }) => void;
    onpaymentauthorized: (event: {
      payment: { token: unknown; shippingContact?: unknown };
    }) => void;
    /** Klant kiest een bezorgadres — hier herrekenen we de verzendkosten. */
    onshippingcontactselected: (event: {
      shippingContact?: { countryCode?: string };
    }) => void;
    oncancel: () => void;
    begin(): void;
    completeMerchantValidation(session: unknown): void;
    completeShippingContactSelection(update: {
      newTotal: { label: string; amount: string };
      newLineItems: { label: string; amount: string }[];
    }): void;
    completePayment(status: unknown): void;
    abort(): void;
  };
  STATUS_SUCCESS: unknown;
  STATUS_FAILURE: unknown;
  canMakePayments(): boolean;
}

/** GA4-/Ads-attributie uit de cookies lezen (best-effort) voor de server-side purchase. */
function readGaAttribution(): {
  clientId?: string;
  sessionId?: string;
  gclid?: string;
} {
  const ga: { clientId?: string; sessionId?: string; gclid?: string } = {};
  try {
    const cookies = new Map<string, string>();
    for (const part of document.cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }
    const gaCookie = cookies.get("_ga");
    if (gaCookie) {
      const clientId = gaCookie.split(".").slice(-2).join(".");
      if (clientId) ga.clientId = clientId;
    }
    const sessionCookie = cookies.get(`_ga_${GA4_MEASUREMENT_ID}`);
    if (sessionCookie) {
      const sessionId = sessionCookie.split(".")[2];
      if (sessionId) ga.sessionId = sessionId;
    }
    const gclCookie = cookies.get("_gcl_aw");
    if (gclCookie) {
      const gclid = gclCookie.split(".").slice(2).join(".");
      if (gclid) ga.gclid = gclid;
    }
  } catch {
    /* cookies niet leesbaar — laat ga leeg */
  }
  return ga;
}

export function ExpressCheckout({ className }: { className?: string }) {
  const mounted = useMounted();
  const items = useCart((s) => s.items);
  const kluspasActive = useCart((s) => s.kluspasActive);
  const mode = usePricingMode((s) => s.mode);
  const { active: reorderFree } = useReorderActive();
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = cartSummary(items, mode, kluspasActive, reorderFree ? 0 : undefined);

  // Beschikbare wallet-methoden ophalen (alleen als er iets in de wagen zit).
  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    fetch(`/api/checkout/payment-methods?amount=${summary.total.toFixed(2)}&country=NL`)
      .then((r) => r.json())
      .then((d) => {
        if (active) setMethods(Array.isArray(d.methods) ? d.methods : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Apple Pay-detectie (alleen op toestellen die het kunnen tonen).
  useEffect(() => {
    try {
      const AP = (window as unknown as { ApplePaySession?: { canMakePayments(): boolean } })
        .ApplePaySession;
      if (AP && AP.canMakePayments()) setApplePayAvailable(true);
    } catch {
      /* Apple Pay niet beschikbaar */
    }
  }, []);

  // Google Pay is tijdelijk verborgen: de hosted-redirect werkt niet bij onze
  // eigen on-site checkout (de native flow komt eraan). PayPal is BEWUST geen
  // snelle-checkoutknop meer — dat is een normale betaalmethode in de volledige
  // checkout. Er blijven dus geen redirect-wallets over; alleen Apple Pay (native)
  // verschijnt hieronder nog als snelle knop.
  const wallets = methods.filter(
    (m) => walletIds.includes(m.id) && m.id !== "applepay" && m.id !== "googlepay",
  );

  if (!mounted || items.length === 0) return null;
  if (!applePayAvailable && wallets.length === 0) return null;

  // Google Pay → direct order + Mollie-betaling, dan door naar de wallet.
  async function onWalletExpress(method: string) {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const ga = readGaAttribution();
      const res = await fetch("/api/checkout/express", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          subtotal: summary.grossSubtotal,
          shipping: summary.grossShipping,
          total: summary.total,
          kluspasSavings: summary.savings,
          method,
          ...(Object.keys(ga).length ? { ga } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "Betaling aanmaken mislukt");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Er ging iets mis. Probeer het opnieuw.");
      setBusy(false);
    }
  }

  // Apple Pay Direct: native sheet levert naam/e-mail/bezorgadres → /applepay-cart.
  async function onApplePayExpress() {
    if (busy) return;
    setError(null);
    const AP = (window as unknown as { ApplePaySession?: ApplePaySessionConstructor })
      .ApplePaySession;
    if (!AP) return;
    setBusy(true);
    const session = new AP(3, {
      countryCode: "NL",
      currencyCode: "EUR",
      supportedNetworks: ["visa", "masterCard", "amex", "maestro", "vPay"],
      merchantCapabilities: ["supports3DS"],
      requiredShippingContactFields: ["name", "email", "postalAddress", "phone"],
      // Subtotaal + verzendkosten zichtbaar in de Apple Pay-sheet zelf.
      lineItems: [
        { label: "Subtotaal", amount: summary.grossSubtotal.toFixed(2) },
        { label: "Verzendkosten", amount: summary.grossShipping.toFixed(2) },
      ],
      total: { label: "KLUSR", amount: summary.total.toFixed(2) },
    });
    session.onvalidatemerchant = async (event) => {
      try {
        const r = await fetch("/api/checkout/applepay-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validationUrl: event.validationURL }),
        });
        if (!r.ok) throw new Error("validation failed");
        session.completeMerchantValidation(await r.json());
      } catch {
        session.abort();
        setBusy(false);
        setError("Apple Pay is even niet beschikbaar. Probeer het opnieuw.");
      }
    };
    // Bezorgadres gekozen: verzendkosten herrekenen vóór de klant akkoord geeft.
    // De winkelwagen rekent met het Nederlandse tarief — daar is het bezorgadres
    // nog niet bekend. Zonder deze stap toont de sheet € 4,95 terwijl de server
    // op het wallet-adres € 7,95 vastlegt, en keurt de klant dus een ander bedrag
    // goed dan we innen. Bij afhalen of een gratis-verzending-actie staat het
    // bedrag op 0 en laten we dat zo.
    session.onshippingcontactselected = (event) => {
      const gratis = reorderFree || summary.grossShipping === 0;
      const land = (event.shippingContact?.countryCode || "NL").toUpperCase();
      const verzend = gratis ? 0 : shippingForCountry(summary.grossSubtotal, land, {});
      session.completeShippingContactSelection({
        newLineItems: [
          { label: "Subtotaal", amount: summary.grossSubtotal.toFixed(2) },
          { label: "Verzendkosten", amount: verzend.toFixed(2) },
        ],
        newTotal: { label: "KLUSR", amount: (summary.grossSubtotal + verzend).toFixed(2) },
      });
    };
    session.onpaymentauthorized = async (event) => {
      try {
        const ga = readGaAttribution();
        const r = await fetch("/api/checkout/applepay-cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            subtotal: summary.grossSubtotal,
            shipping: summary.grossShipping,
            total: summary.total,
            kluspasSavings: summary.savings,
            token: event.payment.token,
            contact: event.payment.shippingContact,
            ...(Object.keys(ga).length ? { ga } : {}),
          }),
        });
        const d = await r.json();
        if (r.ok && d.ok) {
          session.completePayment(AP.STATUS_SUCCESS);
          window.location.href = `/bedankt?order=${d.orderId}`;
        } else {
          session.completePayment(AP.STATUS_FAILURE);
          setBusy(false);
          setError(d.error || "Apple Pay-betaling mislukt.");
        }
      } catch {
        session.completePayment(AP.STATUS_FAILURE);
        setBusy(false);
      }
    };
    session.oncancel = () => setBusy(false);
    session.begin();
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-center text-xs font-semibold text-muted-foreground">Snelle checkout</p>
      <div className="flex flex-wrap gap-2">
        {applePayAvailable && (
          <button
            type="button"
            onClick={onApplePayExpress}
            disabled={busy}
            className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-klusr-black text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${MOLLIE_ICON}/applepay.svg`} alt="" className="h-[18px] w-auto" />
            <span>Apple Pay</span>
          </button>
        )}
        {wallets.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onWalletExpress(m.id)}
            disabled={busy}
            className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-klusr-black text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
          >
            {m.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image} alt="" className="h-[18px] w-auto" />
            )}
            <span>{m.label}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span className="shrink-0 font-medium">OF</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {/* Maak duidelijk dat de volledige checkout álle betaalmethoden biedt. */}
      <p className="text-center text-xs text-muted-foreground">
        Liever iDEAL, PayPal, creditcard of Klarna? Kies je betaalmethode bij het afrekenen.
      </p>
    </div>
  );
}
