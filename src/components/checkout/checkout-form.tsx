"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Lock,
  ShieldCheck,
  Truck,
  RotateCcw,
  ArrowLeft,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ColorChip } from "@/components/cart/color-chip";
import { PaymentMethods } from "./payment-methods";
import { MollieCard, type MollieCardHandle } from "./mollie-card";
import { CheckoutTrust } from "./checkout-trust";
import { DeliveryCountdown } from "@/components/shared/delivery-countdown";
import { sameDayAvailable, SAME_DAY_SURCHARGE } from "@/lib/delivery";
import type { PaymentMethodInfo } from "@/types";
import type { CustomerProfile } from "@/lib/store/profile";
import {
  useCart,
  cartSummary,
  displayLine,
  shippingFor,
  kluspasSavings,
} from "@/lib/store/cart";
import { usePricingMode, type PricingMode } from "@/lib/store/pricing-mode";
import { useReorderActive } from "@/lib/store/reorder";
import {
  SHIPPING_COUNTRIES,
  shippingForCountry,
  isShippingCountry,
  COUNTRY_COOKIE,
  COUNTRY_SUGGEST_COOKIE,
} from "@/lib/shipping";
import { isBrievenbusOrder } from "@/lib/brievenbus";
import { useMounted } from "@/lib/hooks/use-mounted";
import { trackEvent } from "@/lib/tracking";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

/**
 * Geldig btw-nummer? Strikt voor NL (NL123456789B01), soepeler voor overige
 * EU-landen (2 letters + 8–12 alfanumeriek). Input is al genormaliseerd
 * (uppercase, spaties/punten verwijderd).
 */
function isValidVat(v: string): boolean {
  // NL strikt (NL123456789B01); overige EU-landen soepeler (2 letters + 8–12 alfanum.).
  if (v.startsWith("NL")) return /^NL\d{9}B\d{2}$/.test(v);
  return /^[A-Z]{2}[0-9A-Z]{8,12}$/.test(v);
}

// Het schema is een FACTORY zodat de validatieteksten vertaalbaar zijn: de
// component bouwt het binnen een useMemo op met de actieve `t`. In zakelijke
// modus zijn bedrijfsnaam, KVK- en btw-nummer VERPLICHT (met formaatcontrole);
// particulier blijven die velden ongebruikt.
function makeSchema(t: ReturnType<typeof useT>, mode: PricingMode) {
  return z
    .object({
      email: z.string().email(t("checkout.validation.email")),
      firstName: z.string().min(1, t("checkout.validation.required")),
      lastName: z.string().min(1, t("checkout.validation.required")),
      postalCode: z.string().min(3, t("checkout.validation.postalCode")),
      houseNumber: z.string().min(1, t("checkout.validation.required")),
      houseNumberAddition: z.string().optional(),
      street: z.string().min(2, t("checkout.validation.street")),
      city: z.string().min(1, t("checkout.validation.required")),
      country: z.string().min(2).default("NL"),
      phone: z.string().optional(),
      // Zakelijk: in het schema basaal optioneel; in zakelijke modus dwingt de
      // superRefine hieronder ze af als verplicht (+ formaatcontrole).
      companyName: z.string().optional(),
      cocNumber: z.string().optional(),
      vatNumber: z.string().optional(),
      // Afwijkend factuuradres (optioneel).
      billingDifferent: z.boolean().optional(),
      billingCompany: z.string().optional(),
      billingStreet: z.string().optional(),
      billingPostalCode: z.string().optional(),
      billingCity: z.string().optional(),
      terms: z.boolean().refine((v) => v === true, {
        message: t("checkout.validation.terms"),
      }),
      newsletter: z.boolean().optional(),
    })
    .superRefine((val, ctx) => {
      // Nederlandse postcode strikt valideren (1234 AB); buitenland soepeler.
      if (val.country === "NL" && !/^\d{4}\s?[A-Za-z]{2}$/.test(val.postalCode)) {
        ctx.addIssue({
          path: ["postalCode"],
          code: z.ZodIssueCode.custom,
          message: t("checkout.validation.postalCodeNl"),
        });
      }

      // Zakelijk: bedrijfsnaam, KVK-nummer (8 cijfers) en btw-nummer verplicht.
      if (mode === "zakelijk") {
        if (!val.companyName || val.companyName.trim().length < 2) {
          ctx.addIssue({
            path: ["companyName"],
            code: z.ZodIssueCode.custom,
            message: t("checkout.validation.required"),
          });
        }
        const coc = (val.cocNumber ?? "").replace(/\s/g, "");
        if (!coc) {
          ctx.addIssue({
            path: ["cocNumber"],
            code: z.ZodIssueCode.custom,
            message: t("checkout.validation.required"),
          });
        } else if (!/^\d{8}$/.test(coc)) {
          ctx.addIssue({
            path: ["cocNumber"],
            code: z.ZodIssueCode.custom,
            message: t("checkout.validation.coc"),
          });
        }
        const vat = (val.vatNumber ?? "").replace(/[\s.]/g, "").toUpperCase();
        if (!vat) {
          ctx.addIssue({
            path: ["vatNumber"],
            code: z.ZodIssueCode.custom,
            message: t("checkout.validation.required"),
          });
        } else if (!isValidVat(vat)) {
          ctx.addIssue({
            path: ["vatNumber"],
            code: z.ZodIssueCode.custom,
            message: t("checkout.validation.vat"),
          });
        }
      }
    });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// Wallet-/express-methoden: deze krijgen in de interne checkout een eigen,
// prominente "Snelle checkout"-knop bovenaan; de overige methoden staan in de
// gewone keuzelijst. PayPal hoort hier BEWUST niet bij — dat is een normale
// betaalmethode in de keuzelijst, geen snelle-checkoutknop.
const walletIds = ["applepay", "googlepay"];

/** Minimale Apple Pay (JS) typing voor de native express-flow op de checkout. */
interface ApplePaySessionConstructor {
  new (
    version: number,
    request: unknown,
  ): {
    onvalidatemerchant: (event: { validationURL: string }) => void;
    onpaymentauthorized: (event: {
      payment: { token: unknown; shippingContact?: unknown };
    }) => void;
    oncancel: () => void;
    begin(): void;
    completeMerchantValidation(session: unknown): void;
    completePayment(status: unknown): void;
    abort(): void;
  };
  STATUS_SUCCESS: unknown;
  STATUS_FAILURE: unknown;
  canMakePayments(): boolean;
}

const MOLLIE_ICON = "https://www.mollie.com/external/icons/payment-methods";
/** Fallback wanneer de methodenroute onbereikbaar is. Landbewust: BE → Bancontact,
 *  anders iDEAL. Apple Pay & Google Pay altijd erbij. */
function fallbackFor(country: string): PaymentMethodInfo[] {
  const rest: PaymentMethodInfo[] = [
    { id: "creditcard", label: "Creditcard", image: `${MOLLIE_ICON}/creditcard.svg` },
    { id: "applepay", label: "Apple Pay", image: `${MOLLIE_ICON}/applepay.svg` },
    { id: "googlepay", label: "Google Pay", image: `${MOLLIE_ICON}/googlepay.svg` },
    { id: "klarna", label: "Achteraf betalen met Klarna", image: `${MOLLIE_ICON}/klarna.svg` },
  ];
  return country === "BE"
    ? [{ id: "bancontact", label: "Bancontact", image: `${MOLLIE_ICON}/bancontact.svg` }, ...rest]
    : [{ id: "ideal", label: "iDEAL", image: `${MOLLIE_ICON}/ideal.svg` }, ...rest];
}

// GA4 measurement-id (zonder "G-") voor de naam van het GA4-sessiecookie. Moet
// gelijk zijn aan de stream in GTM/GA4 (G-M854M83RJW).
const GA4_MEASUREMENT_ID = "M854M83RJW";

/**
 * Leest de GA4-/Ads-attributie uit `document.cookie` + de bewaarde consent. Wordt
 * meegestuurd naar create-payment zodat de webhook server-side een `purchase` kan
 * vuren (Measurement Protocol). Volledig best-effort: gooit nooit en geeft alleen
 * de aanwezige velden terug — mag het afrekenen nooit breken.
 */
function readGaAttribution(): {
  clientId?: string;
  sessionId?: string;
  gclid?: string;
  consent?: boolean;
} {
  const ga: { clientId?: string; sessionId?: string; gclid?: string; consent?: boolean } = {};
  try {
    const cookies = new Map<string, string>();
    for (const part of document.cookie.split(";")) {
      const eq = part.indexOf("=");
      if (eq === -1) continue;
      cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
    }

    // _ga = "GA1.1.<A>.<B>" → client-id = de laatste twee dot-segmenten ("A.B").
    const gaCookie = cookies.get("_ga");
    if (gaCookie) {
      const clientId = gaCookie.split(".").slice(-2).join(".");
      if (clientId) ga.clientId = clientId;
    }

    // _ga_<meet-id> = "GS1.1.<sid>.<...>" → sessie-id = het 3e dot-segment.
    const sessionCookie = cookies.get(`_ga_${GA4_MEASUREMENT_ID}`);
    if (sessionCookie) {
      const sessionId = sessionCookie.split(".")[2];
      if (sessionId) ga.sessionId = sessionId;
    }

    // _gcl_aw = "GCL.<ts>.<gclid>" → gclid = alles vanaf het 3e segment.
    const gclCookie = cookies.get("_gcl_aw");
    if (gclCookie) {
      const gclid = gclCookie.split(".").slice(2).join(".");
      if (gclid) ga.gclid = gclid;
    }

    // Analytics-toestemming uit de bewaarde cookiekeuze (klusr-consent).
    const consent = JSON.parse(localStorage.getItem("klusr-consent") || "null") as {
      analytics?: boolean;
    } | null;
    if (consent) ga.consent = Boolean(consent.analytics);
  } catch {
    /* best-effort: nooit het afrekenen breken */
  }
  return ga;
}

export function CheckoutForm({
  expressMode,
  mollieProfile,
  mollieTest,
}: {
  // Feature-flag: alleen wanneer `true` rendert de interne checkout (express-
  // knoppen + methodekeuze + ingebedde kaart). Staat-ie uit (default), dan blijft
  // de huidige Mollie hosted-checkout exact zoals nu.
  expressMode?: boolean;
  mollieProfile?: string;
  mollieTest?: boolean;
}) {
  const { items, kluspasActive } = useCart();
  const t = useT();
  const mounted = useMounted();
  const mode = usePricingMode((s) => s.mode);
  const setMode = usePricingMode((s) => s.setMode);
  // 15-min nabestelvenster → geen extra verzendkosten.
  const { active: reorderFree } = useReorderActive();
  const [shippingMethod, setShippingMethod] = useState<"standard" | "pickup">("standard");
  /** Betaalde same-day-optie (€ 1,25) — alleen zichtbaar als 'ie haalbaar is. */
  const [sameDay, setSameDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * VIES-controle van het btw-nummer, bij het verlaten van het veld.
   *
   * Puur informatief: de uitkomst blokkeert het bestellen niet. VIES ligt er
   * met enige regelmaat uit, en dan zou een harde blokkade een zakelijke klant
   * buitensluiten om een storing in Brussel. Zie /api/zakelijk/vies.
   */
  const [viesStatus, setViesStatus] = useState<"leeg" | "bezig" | "geldig" | "ongeldig">("leeg");
  const [viesNaam, setViesNaam] = useState<string | undefined>();

  async function controleerBtw(waarde: string) {
    const btw = String(waarde ?? "").toUpperCase().replace(/[\s.-]/g, "");
    // NL gaat op KVK, en een half ingetypt nummer hoeft niet opgezocht.
    if (!btw || btw.startsWith("NL") || btw.length < 8) {
      setViesStatus("leeg");
      return;
    }
    setViesStatus("bezig");
    try {
      const res = await fetch(`/api/zakelijk/vies?btw=${encodeURIComponent(btw)}`);
      const j = (await res.json()) as { bekend?: boolean; geldig?: boolean; naam?: string };
      if (!j.bekend) {
        // Dienst onbereikbaar of niet van toepassing → niets tonen.
        setViesStatus("leeg");
        return;
      }
      setViesNaam(j.naam);
      setViesStatus(j.geldig ? "geldig" : "ongeldig");
    } catch {
      setViesStatus("leeg");
    }
  }
  const [lookingUp, setLookingUp] = useState(false);

  // --- Interne checkout (alleen actief bij expressMode) ----------------------
  // Deze state heeft alleen betekenis wanneer de feature-flag aanstaat; in de
  // hosted-modus blijft 'ie ongebruikt en verandert er niets aan het gedrag.
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const cardRef = useRef<MollieCardHandle>(null);
  // Form-element + "vastgehouden" express-keuze: een express-knop kiest een
  // methode én verstuurt meteen. setState is asynchroon, dus we leggen de keuze
  // ook in een ref vast zodat onSubmit 'm gegarandeerd ziet in dezelfde tick.
  const formRef = useRef<HTMLFormElement>(null);
  const expressMethodRef = useRef<string | null>(null);

  // Account-funnel: inloggen kan inline (geen redirect), of de klant rekent af
  // als gast en kan met één vinkje een account aanmaken bij het bestellen.
  const { data: session } = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPw, setAccountPw] = useState("");
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [expressBusy, setExpressBusy] = useState(false);
  // Apple Pay-detectie: toon de native express-knop alleen als het toestel 'm kan.
  useEffect(() => {
    if (!expressMode) return;
    try {
      const AP = (window as unknown as { ApplePaySession?: { canMakePayments(): boolean } })
        .ApplePaySession;
      if (AP && AP.canMakePayments()) setApplePayAvailable(true);
    } catch {
      /* Apple Pay niet beschikbaar */
    }
  }, [expressMode]);

  // Validatieschema met vertaalde meldingen — herbouwd zodra de taal wijzigt.
  const schema = useMemo(() => makeSchema(t, mode), [t, mode]);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { terms: false, newsletter: false, country: "NL" },
  });

  // Vul contactgegevens voor zodra de klant is ingelogd (inline of al ingelogd).
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    if (!getValues("email")) setValue("email", email);
    const name = session.user?.name ?? "";
    if (name) {
      const [first, ...rest] = name.split(" ");
      if (first && !getValues("firstName")) setValue("firstName", first);
      if (rest.length && !getValues("lastName")) setValue("lastName", rest.join(" "));
    }
    setShowLogin(false);
    setCreateAccount(false);
  }, [session, setValue, getValues]);

  // Vul het opgeslagen bezorgadres voor zodra de klant is ingelogd — zodat een
  // ingelogde klant z'n gegevens niet bij elke bestelling opnieuw hoeft te typen.
  // Overschrijft nooit wat de klant al heeft ingevuld (alleen lege velden).
  useEffect(() => {
    if (!session?.user?.email) return;
    let active = true;
    fetch("/api/account/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { profile?: CustomerProfile } | null) => {
        if (!active || !d?.profile) return;
        const p = d.profile;
        if (p.phone && !getValues("phone")) setValue("phone", p.phone);
        if (p.company && !getValues("companyName")) setValue("companyName", p.company);
        if (p.cocNumber && !getValues("cocNumber")) setValue("cocNumber", p.cocNumber);
        if (p.vatNumber && !getValues("vatNumber")) setValue("vatNumber", p.vatNumber);
        const a = p.address;
        if (a) {
          if (a.firstName && !getValues("firstName")) setValue("firstName", a.firstName);
          if (a.lastName && !getValues("lastName")) setValue("lastName", a.lastName);
          if (a.street && !getValues("street")) setValue("street", a.street);
          if (a.houseNumber && !getValues("houseNumber")) setValue("houseNumber", a.houseNumber);
          if (a.houseNumberAddition && !getValues("houseNumberAddition"))
            setValue("houseNumberAddition", a.houseNumberAddition);
          if (a.postalCode && !getValues("postalCode")) setValue("postalCode", a.postalCode);
          if (a.city && !getValues("city")) setValue("city", a.city);
          if (a.country) setValue("country", a.country);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session, setValue, getValues]);

  // Slim bezorgland als standaard: de middleware zet op basis van het IP-land een
  // (suggest-)cookie. We nemen dat over zolang de klant het land nog niet zelf
  // heeft aangeraakt. Het account-adres hierboven wint voor ingelogde klanten.
  useEffect(() => {
    const read = (name: string) =>
      typeof document === "undefined"
        ? ""
        : (document.cookie
            .split("; ")
            .find((r) => r.startsWith(`${name}=`))
            ?.split("=")
            .slice(1)
            .join("=") ?? "");
    const pick = (read(COUNTRY_COOKIE) || read(COUNTRY_SUGGEST_COOKIE)).toUpperCase();
    if (pick && pick !== "NL" && isShippingCountry(pick) && getValues("country") === "NL") {
      setValue("country", pick);
    }
  }, [setValue, getValues]);

  // Inline inloggen zonder de checkout te verlaten.
  async function handleLogin() {
    if (!loginEmail || !loginPw) return;
    setLoginBusy(true);
    setLoginError(null);
    const res = await signIn("credentials", {
      redirect: false,
      email: loginEmail,
      password: loginPw,
    });
    setLoginBusy(false);
    if (res?.error) {
      setLoginError(t("checkout.login.error"));
    } else {
      setShowLogin(false);
    }
  }

  // "Winkelwagen-vergeten": zodra de klant een geldig e-mailadres invult, bewaren
  // we de winkelwagen (debounced) zodat de cron later een herinnering kan sturen.
  const watchedEmail = watch("email");
  const watchedFirstName = watch("firstName");
  useEffect(() => {
    const email = (watchedEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || items.length === 0) return;
    const timer = setTimeout(() => {
      const name = [watchedFirstName, getValues("lastName")].filter(Boolean).join(" ").trim();
      fetch("/api/cart/remember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          items: items.map((i) => ({
            title: i.title,
            quantity: i.quantity,
            price: kluspasActive ? i.kluspasPrice : i.price,
            image: i.image,
            slug: i.slug,
            // Maat en kleur mee: bij mengverf is de kleur het hele punt van de
            // bestelling, en dan is "je Sikkens staat klaar" een stuk minder
            // overtuigend dan "je Monumentengroen staat klaar".
            variant: [i.variantLabel, i.selectedColor?.name].filter(Boolean).join(" · ") || undefined,
          })),
          total: cartSummary(items, mode, kluspasActive).grossTotal,
        }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEmail, watchedFirstName, items, mode, kluspasActive]);

  const country = watch("country") || "NL";

  // Betaalmethoden ophalen — ALLEEN in de interne checkout (expressMode). In de
  // hosted-modus halen we niets op en blijft de pagina ongewijzigd. Landbewust
  // (Mollie filtert per land) en incl. Apple Pay / Google Pay; herlaadt zodra het
  // bedrag of het gekozen land wijzigt.
  useEffect(() => {
    if (!expressMode) return;
    let active = true;
    const total = cartSummary(items, mode, kluspasActive).grossTotal;
    const params = new URLSearchParams();
    if (total > 0) params.set("amount", total.toFixed(2));
    params.set("country", country);
    setMethodsLoading(true);
    const apply = (list: PaymentMethodInfo[]) => {
      if (!active) return;
      setMethods(list);
      setMethodsLoading(false);
      // Voorselecteer de gangbaarste methode (iDEAL/NL, Bancontact/BE) zodat de
      // "Betaal"-knop meteen actief is → minder afhakers in de checkout.
      setPaymentMethod((cur) => {
        if (cur) return cur;
        const preferred =
          country === "NL" ? "ideal" : country === "BE" ? "bancontact" : null;
        // iDEAL/Bancontact voor NL/BE; anders gewoon de eerste beschikbare methode
        // zodat de "Betaal"-knop ook buiten NL/BE meteen actief is.
        return (
          (preferred && list.find((m) => m.id === preferred)?.id) ||
          list[0]?.id ||
          null
        );
      });
    };
    fetch(`/api/checkout/payment-methods?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { methods?: PaymentMethodInfo[] }) =>
        apply(d.methods?.length ? d.methods : fallbackFor(country)),
      )
      .catch(() => apply(fallbackFor(country)));
    return () => {
      active = false;
    };
  }, [expressMode, items, mode, kluspasActive, country]);

  // Postcode + huisnummer → straat + plaats automatisch invullen (PDOK).
  async function lookupAddress() {
    const postcode = (getValues("postalCode") || "").replace(/\s/g, "").toUpperCase();
    const number = (getValues("houseNumber") || "").trim();
    if (!/^\d{4}[A-Z]{2}$/.test(postcode) || !number) return;
    setLookingUp(true);
    try {
      const res = await fetch(
        `/api/address-lookup?postcode=${encodeURIComponent(postcode)}&number=${encodeURIComponent(number)}`,
      );
      const data = await res.json();
      if (data.street) setValue("street", data.street, { shouldValidate: true });
      if (data.city) setValue("city", data.city, { shouldValidate: true });
    } catch {
      /* laat de velden gewoon handmatig invulbaar */
    } finally {
      setLookingUp(false);
    }
  }

  if (!mounted) {
    return <div className="container-klusr py-16 text-center text-muted-foreground">{t("cart.loading")}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="container-klusr py-16 text-center">
        <h1 className="text-2xl font-extrabold">{t("cart.empty.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("checkout.empty.text")}</p>
        <Button asChild className="mt-5">
          <Link href="/categorie/verf">{t("checkout.empty.toRange")}</Link>
        </Button>
      </div>
    );
  }

  // Landafhankelijke verzendkosten (gratis alleen NL/BE); afhalen of nabestel-
  // venster = 0.
  const grossSubtotalForShipping = cartSummary(items, mode, kluspasActive).grossSubtotal;
  const brievenbus = isBrievenbusOrder(items);
  const baseShipping =
    shippingMethod === "pickup" || reorderFree
      ? 0
      : shippingForCountry(grossSubtotalForShipping, country, { brievenbus });

  // Same-day is een betaalde optie: alleen aanbieden binnen NL, vóór de cutoff
  // en niet bij afhalen. `mounted` houdt de server-render tijdloos, anders zou
  // de knop tijdens hydratie kunnen verspringen. De toeslag gaat bewust in de
  // verzendkosten, zodat de omzetoverzichten in het dashboard blijven kloppen.
  const canSameDay =
    mounted && shippingMethod !== "pickup" && sameDayAvailable(country);
  const wantsSameDay = canSameDay && sameDay;
  const shippingOverride = wantsSameDay ? baseShipping + SAME_DAY_SURCHARGE : baseShipping;
  const summary = cartSummary(items, mode, kluspasActive, shippingOverride);

  // Login-nudge voor gasten: de KLUSRPAS-prijs is een ingelogd voordeel. Inloggen
  // (de inline-login hierboven) zet via membership-sync `kluspasActive` aan,
  // waardoor de totalen automatisch meebewegen.
  const potentialKluspasSavings = kluspasSavings(items);
  const showKluspasNudge =
    summary.vatIncluded && !kluspasActive && potentialKluspasSavings > 0;

  // Splits de methoden voor de interne checkout: wallets (express-knoppen) en de
  // gewone keuzelijst. Billie blijft zakelijk-only. Leeg/ongebruikt in hosted-modus.
  const expressMethods = methods.filter((m) => walletIds.includes(m.id));
  const pickMethods = methods.filter(
    (m) => !walletIds.includes(m.id) && (mode === "zakelijk" || m.id !== "billie"),
  );

  // Een express-knop: leg de gekozen wallet vast (state + ref) en verstuur meteen.
  // Google Pay express (Snelle checkout): direct order + Mollie-betaling
  // aanmaken en doorsturen naar de wallet. Het bezorgadres komt via Mollie terug
  // en wordt door de webhook aangevuld — dus geen formulier nodig.
  async function onWalletExpress(method: string) {
    if (expressBusy || submitting) return;
    setError(null);
    setExpressBusy(true);
    try {
      const ga = readGaAttribution();
      const email = getValues("email")?.trim();
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
          ...(email ? { email } : {}),
          ...(Object.keys(ga).length ? { ga } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || t("checkout.error.paymentFailed"));
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkout.error.generic"));
      setExpressBusy(false);
    }
  }

  // Apple Pay Direct (native sheet): Apple levert naam, e-mail én bezorgadres →
  // /applepay-cart maakt order + Mollie-betaling. Geen formulier nodig.
  async function onApplePayExpress() {
    if (expressBusy || submitting) return;
    setError(null);
    const AP = (window as unknown as { ApplePaySession?: ApplePaySessionConstructor })
      .ApplePaySession;
    if (!AP) return;
    setExpressBusy(true);
    const session = new AP(3, {
      countryCode: "NL",
      currencyCode: "EUR",
      supportedNetworks: ["visa", "masterCard", "amex", "maestro", "vPay"],
      merchantCapabilities: ["supports3DS"],
      requiredShippingContactFields: ["name", "email", "postalAddress", "phone"],
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
        setExpressBusy(false);
        setError("Apple Pay is even niet beschikbaar. Probeer het opnieuw.");
      }
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
          setExpressBusy(false);
          setError(d.error || "Apple Pay-betaling mislukt.");
        }
      } catch {
        session.completePayment(AP.STATUS_FAILURE);
        setExpressBusy(false);
      }
    };
    session.oncancel = () => setExpressBusy(false);
    session.begin();
  }

  async function onSubmit(values: FormValues) {
    // Interne checkout: bepaal de gekozen methode. Een express-knop legt 'm in een
    // ref vast (state is asynchroon); daarna heeft de gewone keuze voorrang. Blijft
    // null in de hosted-modus → het request-body verandert dan niets.
    const method = expressMode ? expressMethodRef.current ?? paymentMethod : null;
    expressMethodRef.current = null;
    if (expressMode && !method) {
      setError(t("checkout.error.choosePayment"));
      return;
    }

    setSubmitting(true);
    setError(null);

    // Ingebedde creditcard: maak vooraf een card-token aan; mislukt dat, dan
    // afbreken met een duidelijke melding (alleen relevant bij expressMode).
    let cardToken: string | null = null;
    if (expressMode && method === "creditcard" && mollieProfile) {
      cardToken = (await cardRef.current?.createToken()) ?? null;
      if (!cardToken) {
        setError(t("checkout.error.card"));
        setSubmitting(false);
        return;
      }
    }

    // Optioneel: account aanmaken vanuit de checkout (blijft volledig in de funnel).
    if (createAccount && !session) {
      if (accountPw.length < 8) {
        setError(t("checkout.error.accountPassword"));
        setSubmitting(false);
        return;
      }
      try {
        const reg = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: accountPw,
            name: [values.firstName, values.lastName].filter(Boolean).join(" "),
          }),
        });
        // 409 (bestaat al) of een mislukte registratie mag de bestelling nooit blokkeren.
        if (reg.ok) {
          await signIn("credentials", {
            redirect: false,
            email: values.email,
            password: accountPw,
          });
        }
      } catch {
        /* account aanmaken is best-effort */
      }
    }

    // Straat + huisnummer (+ toevoeging) samenvoegen voor het order-adres.
    const street = `${values.street} ${values.houseNumber}${
      values.houseNumberAddition ? `-${values.houseNumberAddition}` : ""
    }`.trim();
    const customer = {
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      street,
      postalCode: values.postalCode,
      city: values.city,
      country: values.country,
      phone: values.phone,
      ...(mode === "zakelijk" && values.companyName?.trim()
        ? {
            company: values.companyName.trim(),
            cocNumber: values.cocNumber?.trim() || undefined,
            vatNumber: values.vatNumber?.trim() || undefined,
          }
        : {}),
      ...(values.billingDifferent && values.billingStreet?.trim()
        ? {
            billing: {
              company: values.billingCompany?.trim() || undefined,
              street: values.billingStreet.trim(),
              postalCode: values.billingPostalCode?.trim() || "",
              city: values.billingCity?.trim() || "",
            },
          }
        : {}),
    };

    // Adres op het account bewaren voor een ingelogde klant → volgende keer staat
    // de checkout al ingevuld. Best-effort; mag de bestelling nooit blokkeren.
    if (session?.user?.email) {
      void fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: [values.firstName, values.lastName].filter(Boolean).join(" ") || undefined,
          phone: values.phone,
          ...(mode === "zakelijk"
            ? {
                company: values.companyName,
                cocNumber: values.cocNumber,
                vatNumber: values.vatNumber,
              }
            : {}),
          address: {
            firstName: values.firstName,
            lastName: values.lastName,
            street: values.street,
            houseNumber: values.houseNumber,
            houseNumberAddition: values.houseNumberAddition,
            postalCode: values.postalCode,
            city: values.city,
            country: values.country,
          },
        }),
      }).catch(() => {});
    }

    // Optioneel inschrijven voor de nieuwsbrief (demo-safe, fire-and-forget).
    if (values.newsletter) {
      void fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          firstName: values.firstName,
          lastName: values.lastName,
          source: "checkout",
        }),
      }).catch(() => {});
    }

    trackEvent("add_shipping_info", { shipping_tier: shippingMethod, value: summary.total });

    /**
     * GA4 `add_payment_info` — de klant gaat betalen.
     *
     * De GA4-tag stond al in GTM, maar de site verstuurde dit event nergens; die
     * stap ontbrak dus in de hele trechter.
     *
     * Het moment is bewust hier, vlak vóór de overdracht aan Mollie. In de
     * gewone flow kiest de klant zijn methode pas op de betaalpagina van Mollie,
     * dus dit is het laatste punt waarop wij nog iets weten. Kiest hij bij ons
     * (express-modus), dan gaat die keuze mee als `payment_type`.
     */
    trackEvent("add_payment_info", {
      payment_type: method ?? "mollie_hosted",
      value: summary.total,
      items: items.map((i) => ({
        item_id: i.productId,
        item_name: i.title,
        item_brand: i.brand,
        item_variant: i.variantLabel,
        price: kluspasActive ? i.kluspasPrice : i.price,
        quantity: i.quantity,
      })),
    });

    // GA4-/Ads-attributie uit de cookies lezen (best-effort) zodat de webhook
    // server-side een `purchase` kan vuren — los van of de klant terugkeert naar
    // /bedankt of cookies accepteert. Alleen meesturen als er iets gevonden is.
    const ga = readGaAttribution();
    const hasGa = Object.keys(ga).length > 0;

    try {
      const res = await fetch("/api/checkout/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          items,
          subtotal: summary.grossSubtotal,
          shipping: summary.grossShipping,
          total: summary.total,
          kluspasSavings: summary.savings,
          // Wens voor same-day; de server toetst 'm nog aan de klok voordat het
          // als "same-day" op de order (en dus op het DHL-label) belandt.
          ...(wantsSameDay ? { sameDay: true } : {}),
          // Interne checkout: stuur de gekozen methode (+ evt. card-token) mee. In
          // de hosted-modus blijft dit weg → het body is identiek aan voorheen.
          ...(expressMode && method ? { method } : {}),
          ...(expressMode && cardToken ? { cardToken } : {}),
          ...(hasGa ? { ga } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("checkout.error.paymentFailed"));
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkout.error.generic"));
      setSubmitting(false);
    }
  }

  return (
    <div className="container-klusr py-6">
      <Link
        href="/winkelwagen"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> {t("checkout.backToCart")}
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">{t("checkout.title")}</h1>

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left: details. min-w-0 zodat de kolom nooit breder wordt dan de
            viewport (grid-items hebben standaard min-width:auto → anders kan
            inhoud de hele pagina op mobiel naar rechts duwen). */}
        <div className="min-w-0 space-y-6">
          {/* Snelle checkout — express-wallets bovenaan (Shopify-stijl). Apple Pay
              is écht direct (native sheet levert het bezorgadres); Google Pay
              loopt via Mollie en de webhook vult het adres aan. PayPal staat
              bewust niet hier maar als normale betaalmethode in de keuzelijst. */}
          {expressMode &&
            (applePayAvailable || expressMethods.some((m) => m.id !== "applepay")) && (
              <div className="space-y-3">
                <p className="text-center text-sm font-semibold text-muted-foreground">
                  Snelle checkout
                </p>
                <div className="flex flex-wrap gap-2">
                  {applePayAvailable && (
                    <button
                      type="button"
                      onClick={onApplePayExpress}
                      disabled={expressBusy}
                      className="flex h-11 min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-klusr-black text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${MOLLIE_ICON}/applepay.svg`} alt="" className="h-[18px] w-auto" />
                      <span>Apple Pay</span>
                    </button>
                  )}
                  {expressMethods
                    .filter((m) => m.id !== "applepay")
                    .map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onWalletExpress(m.id)}
                        disabled={expressBusy}
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
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span className="shrink-0 font-medium">OF</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
              </div>
            )}
          {/* Particulier of zakelijk bestellen */}
          <div className="flex rounded-xl border border-border bg-secondary/40 p-1">
            {(["particulier", "zakelijk"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors",
                  mode === m
                    ? "bg-card text-primary shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "particulier" ? t("checkout.private") : t("checkout.business")}
              </button>
            ))}
          </div>

          {reorderFree && (
            <div className="flex items-center gap-2 rounded-xl border border-klusr-stock/30 bg-klusr-stock/10 p-3 text-sm font-medium text-klusr-stock">
              <Truck className="h-4 w-4 shrink-0" />
              {t("checkout.reorderFree")}
            </div>
          )}

          {session?.user ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-klusr-stock/30 bg-klusr-stock/5 p-4">
              <UserRound className="h-5 w-5 shrink-0 text-klusr-stock" />
              <p className="text-sm">
                {t("checkout.loggedInPre")}
                <strong>{session.user.email}</strong>{t("checkout.loggedInPost")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">
                      {t("checkout.guest.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("checkout.guest.text")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogin((v) => !v)}
                  className="shrink-0 text-left text-sm font-semibold text-primary hover:underline"
                >
                  {t("checkout.guest.haveAccount")}
                </button>
              </div>

              {showLogin && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <Input
                      type="email"
                      placeholder={t("checkout.login.emailPlaceholder")}
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                    <Input
                      type="password"
                      placeholder={t("checkout.login.passwordPlaceholder")}
                      autoComplete="current-password"
                      value={loginPw}
                      onChange={(e) => setLoginPw(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleLogin();
                        }
                      }}
                    />
                    <Button type="button" variant="dark" onClick={() => void handleLogin()} disabled={loginBusy}>
                      {loginBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("checkout.login.submit")}
                    </Button>
                  </div>
                  {loginError && <p className="mt-2 text-xs text-destructive">{loginError}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("checkout.login.forgotPre")}
                    <Link href="/inloggen" className="font-semibold text-primary hover:underline">
                      {t("checkout.login.forgotLink")}
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

          <Section title={t("checkout.section.contact")} step={1}>
            <Field label={t("checkout.field.email")} error={errors.email?.message}>
              <Input type="email" placeholder={t("checkout.field.emailPlaceholder")} {...register("email")} />
            </Field>

            {!session && (
              <div className="rounded-lg border border-border bg-background p-3">
                <label className="flex items-start gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                  <span>
                    <span className="font-semibold">{t("checkout.createAccount.labelBold")}</span>{t("checkout.createAccount.labelRest")}
                    <span className="text-muted-foreground">{t("checkout.createAccount.optional")}</span>
                  </span>
                </label>
                {createAccount && (
                  <div className="mt-3">
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder={t("checkout.createAccount.passwordPlaceholder")}
                      value={accountPw}
                      onChange={(e) => setAccountPw(e.target.value)}
                    />
                    {accountPw.length > 0 && accountPw.length < 8 && (
                      <p className="mt-1 text-xs text-destructive">{t("checkout.createAccount.passwordHint")}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            {mode === "zakelijk" && (
              <>
                <Field label={t("checkout.field.company")} error={errors.companyName?.message}>
                  <Input placeholder={t("checkout.field.companyPlaceholder")} {...register("companyName")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("checkout.field.coc")} error={errors.cocNumber?.message}>
                    <Input placeholder="12345678" {...register("cocNumber")} />
                  </Field>
                  <Field label={t("checkout.field.vat")} error={errors.vatNumber?.message}>
                    <Input
                      placeholder="NL000000000B00"
                      {...register("vatNumber", { onBlur: (e) => controleerBtw(e.target.value) })}
                    />
                    {/* Uitkomst van de VIES-opzoeking. Bewust alleen informatief:
                        de bestelling gaat door, ook als VIES er niet uit komt.
                        Zie /api/zakelijk/vies voor waarom dat fail-open moet. */}
                    {viesStatus === "bezig" && (
                      <p className="mt-1 text-xs text-muted-foreground">Btw-nummer controleren…</p>
                    )}
                    {viesStatus === "geldig" && (
                      <p className="mt-1 text-xs font-semibold text-klusr-stock">
                        ✓ Geldig btw-nummer{viesNaam ? ` — ${viesNaam}` : ""}
                      </p>
                    )}
                    {viesStatus === "ongeldig" && (
                      <p className="mt-1 text-xs font-semibold text-destructive">
                        Dit btw-nummer kent de EU-registratie niet. Controleer het even — je kunt
                        gewoon doorgaan, maar we kunnen de btw dan niet verleggen.
                      </p>
                    )}
                  </Field>
                </div>
              </>
            )}
          </Section>

          <Section title={t("checkout.section.delivery")} step={2}>
            <Field label={t("checkout.field.country")}>
              <select
                {...register("country", {
                  onChange: (e) => {
                    // Onthoud de expliciete landkeuze 1 jaar → stopt het voorstel.
                    document.cookie = `${COUNTRY_COOKIE}=${e.target.value}; path=/; max-age=${
                      60 * 60 * 24 * 365
                    }; samesite=lax`;
                  },
                })}
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SHIPPING_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {country !== "NL" && country !== "BE" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("checkout.country.outsideNote")}
                </p>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("checkout.field.firstName")} error={errors.firstName?.message}>
                <Input {...register("firstName")} />
              </Field>
              <Field label={t("checkout.field.lastName")} error={errors.lastName?.message}>
                <Input {...register("lastName")} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("checkout.field.postalCode")} error={errors.postalCode?.message}>
                <Input placeholder="7442 CK" {...register("postalCode", { onBlur: lookupAddress })} />
              </Field>
              <Field label={t("checkout.field.houseNumber")} error={errors.houseNumber?.message}>
                <Input placeholder="3" {...register("houseNumber", { onBlur: lookupAddress })} />
              </Field>
              <Field label={t("checkout.field.addition")}>
                <Input placeholder="A" {...register("houseNumberAddition")} />
              </Field>
            </div>

            <Field
              label={lookingUp ? t("checkout.field.streetLookup") : t("checkout.field.street")}
              error={errors.street?.message}
            >
              <Input placeholder={t("checkout.field.autofill")} {...register("street")} />
            </Field>
            <Field label={t("checkout.field.city")} error={errors.city?.message}>
              <Input placeholder={t("checkout.field.autofill")} {...register("city")} />
            </Field>

            <Field label={t("checkout.field.phone")} error={errors.phone?.message}>
              <Input type="tel" {...register("phone")} />
            </Field>

            {/* Afwijkend factuuradres */}
            <label className="mt-1 flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                {...register("billingDifferent")}
                className="h-4 w-4 accent-primary"
              />
              {t("checkout.billing.toggle")}
            </label>
            {watch("billingDifferent") && (
              <div className="grid gap-4 rounded-lg border border-border bg-secondary/30 p-3">
                <Field label={t("checkout.billing.companyOptional")}>
                  <Input {...register("billingCompany")} />
                </Field>
                <Field label={t("checkout.billing.streetAndNumber")}>
                  <Input placeholder={t("checkout.billing.streetPlaceholder")} {...register("billingStreet")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("checkout.field.postalCode")}>
                    <Input placeholder="7442 CK" {...register("billingPostalCode")} />
                  </Field>
                  <Field label={t("checkout.field.city")}>
                    <Input {...register("billingCity")} />
                  </Field>
                </div>
              </div>
            )}
          </Section>

          <Section title={t("checkout.section.shipping")} step={3}>
            <div className="space-y-2">
              <ShippingOption
                active
                onClick={() => setShippingMethod("standard")}
                icon={Truck}
                title={t("checkout.delivery.title")}
                hint={t("usp.delivery")}
                price={
                  shippingFor(summary.grossSubtotal) === 0
                    ? t("cart.free")
                    : formatPrice(shippingFor(summary.grossSubtotal))
                }
              />
              {/* Vóór de cutoff kiest de klant expliciet tussen next-day (gratis)
                  en same-day (+ toeslag). Alleen zichtbaar zolang same-day echt
                  haalbaar is: NL, vóór 09:00, geen afhaalorder. */}
              {canSameDay && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <DeliverySpeedOption
                    active={!sameDay}
                    onClick={() => setSameDay(false)}
                    title={t("checkout.nextDay.title")}
                    hint={t("checkout.nextDay.hint")}
                    price={t("cart.free")}
                  />
                  <DeliverySpeedOption
                    active={sameDay}
                    onClick={() => setSameDay(true)}
                    title={t("checkout.sameDay.title")}
                    hint={t("checkout.sameDay.hint")}
                    price={`+ ${formatPrice(SAME_DAY_SURCHARGE)}`}
                  />
                </div>
              )}
              {/* Dynamische bezorgklok onder de verzendmethode. */}
              <DeliveryCountdown compact className="px-1 text-xs" />
            </div>
          </Section>

          {/* Stap 4 — Betaalmethode (interne checkout): express-knoppen + eigen
              methodekeuze + ingebedde kaart, direct ná de verzendmethode in de
              hoofdflow. Alleen in expressMode (hosted-modus kiest op Mollie). */}
          {expressMode && (
            <Section title={t("checkout.section.payment")} step={4}>
              <div className="space-y-3">
                <PaymentMethods
                  methods={pickMethods}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  loading={methodsLoading}
                />

                {paymentMethod === "creditcard" && mollieProfile && (
                  <MollieCard ref={cardRef} profileId={mollieProfile} testmode={Boolean(mollieTest)} />
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Right: order summary */}
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-bold">{t("checkout.summary.title")}</h2>
            <ul className="max-h-72 space-y-3 overflow-y-auto">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-border bg-white">
                    <Image src={item.image} alt={item.title} fill sizes="56px" className="object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-klusr-black px-1 text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    {item.selectedColor && <ColorChip color={item.selectedColor} className="mt-1" />}
                  </div>
                  <span className="text-sm font-semibold">
                    {formatPrice(displayLine(item, mode, kluspasActive).main)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator className="my-4" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("cart.subtotal")}{!summary.vatIncluded && t("cart.exclVat")}
                </dt>
                <dd>{formatPrice(summary.subtotalRegular)}</dd>
              </div>
              {summary.savings > 0 && (
                <div className="flex justify-between text-primary">
                  <dt className="font-medium">
                    {summary.vatIncluded ? t("cart.kluspasDiscount") : t("cart.profpasDiscount")}
                  </dt>
                  <dd className="font-bold">-{formatPrice(summary.savings)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("cart.shipping")}{!summary.vatIncluded && t("cart.exclVat")}
                </dt>
                <dd>{summary.shipping === 0 ? <span className="text-klusr-stock">{t("cart.free")}</span> : formatPrice(summary.shipping)}</dd>
              </div>
              {summary.vat !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("cart.vat")}</dt>
                  <dd>{formatPrice(summary.vat)}</dd>
                </div>
              )}
            </dl>
            {showKluspasNudge && (
              <button
                type="button"
                onClick={() => setShowLogin(true)}
                className="mt-3 flex w-full items-start gap-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("cart.kluspas.nudge", { amount: formatPrice(potentialKluspasSavings) })}</span>
              </button>
            )}
            <Separator className="my-3" />
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{t("cart.total")}</span>
              <span className="text-2xl font-black">{formatPrice(summary.total)}</span>
            </div>
            {!summary.vatIncluded && (
              <p className="mt-1 text-xs text-muted-foreground">{t("cart.vatIncluded")}</p>
            )}

            {/* Akkoord + nieuwsbrief */}
            <div className="mt-4 space-y-2">
              <label className="flex items-start gap-2 text-xs leading-snug">
                <input type="checkbox" {...register("terms")} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                <span>
                  {t("checkout.terms.pre")}
                  <Link href="/voorwaarden" target="_blank" className="font-medium text-primary hover:underline">
                    {t("checkout.terms.termsLink")}
                  </Link>
                  {t("checkout.terms.mid")}
                  <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">
                    {t("checkout.terms.privacyLink")}
                  </Link>
                  {t("checkout.terms.post")}
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs font-medium text-primary">{errors.terms.message}</p>
              )}
              <label className="flex items-start gap-2 text-xs leading-snug">
                <input type="checkbox" {...register("newsletter")} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                <span>{t("checkout.newsletter")}</span>
              </label>
            </div>

            {error && (
              <p className="mt-3 rounded-md bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="xl"
              className="mt-4 w-full"
              disabled={expressMode ? submitting || !paymentMethod : submitting}
            >
              {submitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  {t("checkout.pay", { amount: formatPrice(summary.total) })}
                </>
              )}
            </Button>

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-klusr-stock" />
              {t("cart.usp.payment")}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-primary" /> {t("checkout.usp.freeReturn")}
              </li>
              <li className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" /> {t("checkout.usp.fastDelivery")}
              </li>
            </ul>
          </div>
          <CheckoutTrust className="mt-4" />
        </aside>
      </form>
    </div>
  );
}

function Section({
  title,
  step,
  children,
}: {
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-bold text-white">
          {step}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs font-medium text-primary">{error}</p>}
    </div>
  );
}

function ShippingOption({
  active,
  onClick,
  icon: Icon,
  title,
  hint,
  price,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Truck;
  title: string;
  hint: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="text-sm font-bold text-klusr-stock">{price}</span>
    </button>
  );
}

/**
 * Keuze tussen bezorgsnelheden (next-day gratis vs. same-day tegen toeslag).
 * Compacter dan `ShippingOption` — die kiest de verzendmethode zelf; deze zit
 * eronder en kiest alleen de snelheid, dus zonder icoon en met de prijs als
 * accent (de toeslag is geen "gratis"-groen).
 */
function DeliverySpeedOption({
  active,
  onClick,
  title,
  hint,
  price,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  price: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full flex-col gap-0.5 rounded-lg border p-3 text-left transition-all",
        active
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40",
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="shrink-0 text-sm font-bold text-primary">{price}</span>
      </span>
      <span className="text-xs leading-snug text-muted-foreground">{hint}</span>
    </button>
  );
}
