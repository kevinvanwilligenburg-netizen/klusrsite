"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Check,
  ShoppingCart,
  Heart,
  Truck,
  RotateCcw,
  Sparkles,
  CreditCard,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { showAddedToCartToast } from "@/components/cart/added-to-cart-toast";
import type { Product, ProductVariant, SelectedColor } from "@/types";
import type { GlansVariant } from "@/lib/data/products";
import { onlineStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "./star-rating";
import { StockStatus } from "./stock-status";
import { DeliveryCountdown } from "@/components/shared/delivery-countdown";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { ColorPickerDialog } from "@/components/color/color-picker-dialog";
import { useCart } from "@/lib/store/cart";
import { useFavorites } from "@/lib/store/favorites";
import { useMounted } from "@/lib/hooks/use-mounted";
import { shippingForCountry, SHIPPING_COUNTRY_MAP } from "@/lib/shipping";
import { baseStockByStore, paintBases, withBase } from "@/lib/paint-bases";

/** Snelkeuze: 100% wit — veruit de meest gekozen "kleur" voor mengverf. */
const WHITE_COLOR = { name: "100% wit", code: "RAL 9010", hex: "#FFFFFF", collection: "Wit" } as const;
import { isLightColor, findColor } from "@/lib/data/colors";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import { formatPrice, cn } from "@/lib/utils";
import { usePricingMode } from "@/lib/store/pricing-mode";
import { priceView } from "@/lib/pricing";
import { useT } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/dictionaries";

/**
 * `pricing.ts` levert `vatSuffix` ("incl. btw"/"excl. btw") als vaste NL-string;
 * die mappen we hier naar een vertaalsleutel (NL blijft identiek, rest vertaalt).
 */
const VAT_SUFFIX_KEY: Record<string, MessageKey> = {
  "incl. btw": "price.inclVat",
  "excl. btw": "price.exclVat",
};

/**
 * GAMMA-stijl prijsblok voor INGELOGDE pashouders: de pasprijs is al toegepast,
 * dus tonen we 'm als "X met {pass}" (GAMMA-stijl) + "X% KORTING"-badge +
 * (optioneel) prijs per liter en een korte bevestiging dat de korting automatisch
 * is verrekend. Werkt voor zowel KLUSRPAS als ProfPas. Geen "Wat is de KLUSRPAS?"-
 * uitlegregel: een pashouder kent de pas al.
 */
function PassDiscountBox({
  amount,
  passName,
  pct,
  perLiter,
  t,
}: {
  amount: number;
  passName: string;
  pct: number;
  perLiter: number | null;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black leading-none">
            {formatPrice(amount)}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {t("pdp.yourPassPrice", { pass: passName })}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          {t("pdp.discountBadge", { pct })}
        </span>
      </div>
      {perLiter !== null && (
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
          {t("pdp.perLiter", { price: formatPrice(perLiter) })}
        </p>
      )}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {t("pdp.passApplied", { pass: passName, pct })}
      </p>
    </div>
  );
}

/**
 * Neutrale skeleton voor het pasblok terwijl de sessiestatus nog niet bekend is
 * (`!mounted || status === "loading"`). Reserveert ~dezelfde hoogte als de pas-/
 * teaserbox zodat er geen layout shift optreedt, en voorkomt dat een ingelogde
 * bezoeker eerst de gast-teaser ("log in voor 5%") ziet flitsen. Rendert op SSR
 * en de eerste client-paint identiek → hydration-safe.
 */
function PassBoxSkeleton() {
  return (
    <div
      aria-hidden
      className="mt-3 h-[104px] animate-pulse rounded-xl border border-border bg-muted/60 motion-reduce:animate-none"
    />
  );
}

/**
 * Gast-variant van het GAMMA-stijl kortingsblok: zelfde rode look-and-feel met de
 * "5% KORTING"-badge, maar in plaats van de toegepaste pasprijs een aansporing om
 * in te loggen. De KLUSRPAS-prijs is een ingelogd voordeel, dus we tonen wat het
 * kan opleveren + een knop naar inloggen/registreren (met redirect terug hierheen).
 */
function PassTeaserBox({
  amount,
  savings,
  pct,
  perLiter,
  t,
}: {
  amount: number;
  savings: number;
  pct: number;
  perLiter: number | null;
  t: ReturnType<typeof useT>;
}) {
  // Bewust GEEN inlog-/registratie-CTA op de productpagina: we tonen alleen de
  // KLUSRPAS-prijs als voordeel — zelfde GAMMA-stijl blok als voor ingelogde
  // pashouders. De korting wordt gewoon bij het afrekenen verrekend.
  return (
    <div className="mt-3 rounded-xl border border-border bg-muted/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black leading-none">
            {formatPrice(amount)}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {t("pdp.yourPassPrice", { pass: "KLUSRPAS" })}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-extrabold uppercase tracking-wide text-primary">
          {t("pdp.discountBadge", { pct })}
        </span>
      </div>
      {perLiter !== null && (
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
          {t("pdp.perLiter", { price: formatPrice(perLiter) })}
        </p>
      )}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {t("pdp.kluspas.teaserSave", { amount: formatPrice(savings), pct })}
      </p>
    </div>
  );
}

const usps: { icon: typeof Truck; labelKey: MessageKey }[] = [
  { icon: Truck, labelKey: "pdp.usp.freeShipping" },
  { icon: RotateCcw, labelKey: "pdp.usp.returns" },
  { icon: Sparkles, labelKey: "usp.advice" },
  { icon: CreditCard, labelKey: "pdp.usp.afterpay" },
];

/**
 * Minimale, lokale types voor de Apple Pay JS-API. Apple levert hiervoor geen
 * officieel @types-pakket, dus typen we precies de stukken die we gebruiken.
 * Zo blijft `tsc` schoon zonder een nieuwe dependency of losse `any`-casts.
 */
interface ApplePayValidateMerchantEvent {
  validationURL: string;
}
interface ApplePayPaymentAuthorizedEvent {
  payment: {
    token: unknown;
    shippingContact?: unknown;
  };
}
interface ApplePaySessionInstance {
  onvalidatemerchant: (event: ApplePayValidateMerchantEvent) => void;
  onpaymentauthorized: (event: ApplePayPaymentAuthorizedEvent) => void;
  oncancel: () => void;
  begin(): void;
  abort(): void;
  completeMerchantValidation(merchantSession: unknown): void;
  completePayment(status: number): void;
}
interface ApplePaySessionConstructor {
  new (version: number, request: unknown): ApplePaySessionInstance;
  canMakePayments(): boolean;
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
}

export function ProductBuybox({
  product,
  glansVariants = [],
  safetyStock = DEFAULT_SAFETY_STOCK,
}: {
  product: Product;
  glansVariants?: GlansVariant[];
  safetyStock?: number;
}) {
  const t = useT();
  const [variant, setVariant] = useState<ProductVariant>(product.variants[0]);
  const [color, setColor] = useState<SelectedColor | undefined>();
  const [quantity, setQuantity] = useState(1);
  // Inline-melding bij de winkelwagen-knop wanneer een kleur nog ontbreekt
  // (i.p.v. een toast bovenin). Verdwijnt zodra er een kleur is gekozen.
  const [colorError, setColorError] = useState(false);
  // Apple Pay express-knop: alleen zichtbaar wanneer de express-flag aanstaat én
  // het apparaat/browser Apple Pay daadwerkelijk kan tonen (zie effect onder).
  const [applePayAvailable, setApplePayAvailable] = useState(false);

  // Voorkeuze van kleur via ?kleur=<code> (bijv. vanuit de Kleurenkiezer-funnel).
  // Client-side gelezen zodat de productpagina statisch/ISR blijft.
  useEffect(() => {
    if (!product.colorMatchable) return;
    const code = new URLSearchParams(window.location.search).get("kleur");
    if (!code) return;
    const found = findColor(code);
    if (found) setColor(withBase(found));
  }, [product.colorMatchable]);

  // Voorkeuze van variant via ?v=<variantId> (vanuit de Google-feed, zodat de
  // getoonde prijs overeenkomt met de feed-prijs van díe maat). Client-side
  // gelezen zodat de PDP statisch/ISR blijft.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("v");
    if (!id) return;
    const found = product.variants.find((x) => x.id === id);
    if (found) setVariant(found);
  }, [product]);

  // Apple Pay-detectie: toon de "Betaal met Apple Pay"-knop op élk toestel dat
  // Apple Pay ondersteunt (Safari op iOS/macOS). Werkt alleen écht op het in
  // Mollie geverifieerde domein (www.klus-r.nl). Client-only zodat de PDP
  // statisch/ISR blijft; faalt de detectie, dan blijft de knop gewoon weg.
  useEffect(() => {
    try {
      const AP = (window as unknown as { ApplePaySession?: { canMakePayments(): boolean } })
        .ApplePaySession;
      if (AP && AP.canMakePayments()) setApplePayAvailable(true);
    } catch {
      // Apple Pay niet beschikbaar → knop blijft verborgen.
    }
  }, []);

  const addItem = useCart((s) => s.addItem);
  const toggleFavorite = useFavorites((s) => s.toggle);
  const favoriteIds = useFavorites((s) => s.ids);
  const mounted = useMounted();
  const isFavorite = mounted && favoriteIds.includes(product.id);

  // Tinting base (from the chosen colour) adds a surcharge and has its own stock.
  const surcharge = color?.base?.surcharge ?? 0;
  const effectiveKLUSRPAS = variant.kluspasPrice + surcharge;
  const effectivePrice = variant.price + surcharge;
  const effectiveStock =
    color?.base && product.colorMatchable
      ? baseStockByStore(variant.stockByStore, color.base.id)
      : variant.stockByStore;
  // Online verkoopbaar = Nijverdal-voorraad ≥ veiligheidsvoorraad.
  const sellable = onlineStock(effectiveStock, safetyStock) > 0;

  // De KLUSRPAS-prijs (5%) is een ingelogd voordeel: alleen ingelogde bezoekers
  // krijgen 'm toegepast. Gasten zien de normale prijs + een teaser (zie onder).
  // De sessie is pas betrouwbaar zodra `status` is geresolved; tot die tijd (en
  // vóór hydratie) is het pasgebied "onbekend" → skeleton i.p.v. de gast-teaser.
  const { data: session, status } = useSession();
  const passResolved = mounted && status !== "loading";
  const member = passResolved && Boolean(session);

  const mode = usePricingMode((s) => s.mode);
  const priceInfo = priceView(
    {
      price: effectivePrice,
      kluspasPrice: effectiveKLUSRPAS,
      compareAtPrice:
        variant.compareAtPrice !== undefined ? variant.compareAtPrice + surcharge : undefined,
    },
    mounted ? mode : "particulier",
    member,
  );

  // GAMMA-stijl prijsweergave: normale prijs prominent bovenaan, de pasprijs in
  // een apart kortingsblok met "X% KORTING"-badge. De pasprijs (priceInfo.amount)
  // is mode-correct (KLUSRPAS incl. btw, ProfPas excl. btw).
  const showPass = Boolean(priceInfo.badge && priceInfo.savings && priceInfo.savings > 0);
  // Gast-teaser: er is een pasprijs maar de bezoeker is niet ingelogd → toon de
  // "log in voor 5%"-aansporing in plaats van de toegepaste pasprijs.
  const showTeaser = Boolean(priceInfo.passAmount && priceInfo.passSavings && priceInfo.passSavings > 0);
  const isKlusPass = priceInfo.badge === "KLUSRPAS";
  const passName = isKlusPass ? "KLUSRPAS" : "ProfPas";
  const headlinePrice = priceInfo.normalPrice ?? priceInfo.amount;
  // Prijs per liter (alleen voor producten met een inhoud), afgeleid van de
  // getoonde bedragen zodat ze de juiste btw-modus volgen.
  const normalPerLiter = variant.size ? headlinePrice / variant.size : null;
  const memberPerLiter = variant.size && showPass ? priceInfo.amount / variant.size : null;
  // Per-liter voor de gast-teaser: de potentiële KLUSRPAS-prijs gedeeld door inhoud.
  const teaserPerLiter =
    variant.size && showTeaser && priceInfo.passAmount
      ? priceInfo.passAmount / variant.size
      : null;

  function buildItem() {
    return addItem({ product, variant, quantity, color });
  }

  const router = useRouter();

  /** Direct afrekenen: leg in de winkelwagen en ga meteen naar de checkout
   * (daar staan o.a. Apple Pay / Google Pay zodra die in Mollie actief zijn). */
  function handleBuyNow() {
    if (product.colorMatchable && !color) {
      setColorError(true);
      return;
    }
    buildItem();
    trackEvent("begin_checkout", { value: variant.kluspasPrice * quantity });
    router.push("/checkout");
  }

  /**
   * Native Apple Pay express-betaling vanaf de PDP (Mollie Apple Pay Direct).
   * Flow: open de Apple Pay-sheet → valideer de merchant via Mollie → maak de
   * order + betaling aan met de payment-token → stuur door naar /bedankt. Bij elke
   * fout breken we de sheet netjes af (geen halve bestelling). Verzendkosten worden
   * altijd voor NL berekend, zodat het bedrag in de sheet en op de server matcht.
   */
  function payWithApplePay() {
    // Mengverf vereist eerst een kleur (zelfde gate als de andere knoppen).
    if (product.colorMatchable && !color) {
      setColorError(true);
      return;
    }

    const subtotal = variant.price * quantity;
    const shipping = shippingForCountry(subtotal, "NL", {});
    const total = subtotal + shipping;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AP = (window as any).ApplePaySession as ApplePaySessionConstructor | undefined;
    if (!AP) return;

    const session = new AP(3, {
      countryCode: "NL",
      currencyCode: "EUR",
      supportedNetworks: ["visa", "masterCard", "amex", "maestro", "vPay"],
      merchantCapabilities: ["supports3DS"],
      requiredShippingContactFields: ["name", "email", "postalAddress", "phone"],
      // Regelopbouw in de Apple Pay-sheet zelf, zodat de verzendkosten zichtbaar
      // zijn naast het subtotaal — geen verrassing in het eindbedrag.
      lineItems: [
        { label: t("cart.subtotal"), amount: subtotal.toFixed(2) },
        { label: t("cart.shipping"), amount: shipping.toFixed(2) },
      ],
      total: { label: "KLUSR", amount: total.toFixed(2) },
    });

    // Stap 1 — merchant-validatie: laat Mollie de Apple-sessie ondertekenen.
    session.onvalidatemerchant = async (event) => {
      try {
        const r = await fetch("/api/checkout/applepay-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ validationUrl: event.validationURL }),
        });
        if (!r.ok) throw new Error("validation failed");
        const merchantSession = await r.json();
        session.completeMerchantValidation(merchantSession);
      } catch {
        session.abort();
        toast.error("Apple Pay is even niet beschikbaar. Probeer het opnieuw.");
      }
    };

    // Stap 2 — betaling geautoriseerd: order + Mollie-betaling server-side aanmaken.
    session.onpaymentauthorized = async (event) => {
      try {
        const r = await fetch("/api/checkout/applepay-pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            variantId: variant.id,
            quantity,
            color: color ?? null,
            token: event.payment.token,
            contact: event.payment.shippingContact,
          }),
        });
        const d = await r.json();
        if (r.ok && d.ok) {
          session.completePayment(AP.STATUS_SUCCESS);
          router.push(`/bedankt?order=${d.orderId}`);
        } else {
          session.completePayment(AP.STATUS_FAILURE);
        }
      } catch {
        session.completePayment(AP.STATUS_FAILURE);
      }
    };

    // Annuleren door de gebruiker: niets te doen (sheet sluit vanzelf).
    session.oncancel = () => {};

    session.begin();
  }

  function handleAdd() {
    if (!sellable) return;
    if (product.colorMatchable && !color) {
      setColorError(true);
      return;
    }
    buildItem();
    trackEvent("add_to_cart", {
      value: variant.kluspasPrice * quantity,
      items: [
        {
          ...toAnalyticsItem({
            id: product.id,
            title: product.title,
            brand: product.brand,
            category: product.category,
            price: variant.kluspasPrice,
            quantity,
          }),
          item_variant: variant.label,
        },
      ],
    });
    showAddedToCartToast({
      title: product.title,
      brand: product.brand,
      image: product.images[0],
      meta: `${variant.label}${color ? ` · ${color.name}` : ""}${quantity > 1 ? ` · ${quantity}×` : ""}`,
      labels: {
        added: t("pdp.addedToCart"),
        toCart: t("cart.toCart"),
        continue: t("cart.continueShopping"),
      },
    });
  }

  // Verzendkosten transparant tonen vóór de klik — express (Apple Pay / direct
  // afrekenen) slaat de winkelwagen over, dus de €4,95 mag geen verrassing zijn.
  // Net als de express-flow rekenen we met het NL-tarief en de kale variantprijs.
  const buyboxSubtotal = variant.price * quantity;
  const buyboxShipping = shippingForCountry(buyboxSubtotal, "NL", {});
  const buyboxShipFree = buyboxSubtotal > 0 && buyboxShipping === 0;
  const freeShipThreshold = SHIPPING_COUNTRY_MAP.NL?.freeOver ?? 50;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight sm:text-3xl">
          {product.title}
        </h1>
        <div className="mt-2 flex items-center gap-3">
          {product.reviewCount > 0 ? (
            <>
              <StarRating rating={product.rating} size="md" showCount={false} />
              <a href="#reviews" className="text-sm font-medium text-muted-foreground hover:text-primary">
                {t("pdp.reviewsLink", { rating: product.rating.toFixed(1), count: product.reviewCount })}
              </a>
            </>
          ) : (
            // Geen reviews → geen rating-getal en geen (lege) #reviews-link, alleen
            // een nette muted melding.
            <span className="text-sm font-medium text-muted-foreground">
              {t("rating.none")}
            </span>
          )}
        </div>
      </div>

      {/* Highlights */}
      <ul className="grid gap-1.5">
        {product.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-klusr-stock" strokeWidth={3} />
            {h}
          </li>
        ))}
      </ul>

      <Separator />

      {/* Price */}
      <div>
        {/* Adviesprijs (RRP) — doorgestreept boven de normale prijs. Mode-correct:
            alleen particulier met een échte adviesprijs (referenceLabel "Adviesprijs"). */}
        {priceInfo.referenceLabel === "Adviesprijs" && priceInfo.reference != null && (
          <p className="mb-1 text-sm text-muted-foreground">
            {t("price.advies")}{" "}
            <span className="font-medium line-through">{formatPrice(priceInfo.reference)}</span>
          </p>
        )}
        {/* Normale prijs — prominent (GAMMA-stijl) */}
        <div className="flex items-end gap-2.5">
          <span className="text-4xl font-black leading-none">
            {formatPrice(headlinePrice)}
          </span>
          <span className="mb-1.5 text-xs font-medium text-muted-foreground">
            {t(VAT_SUFFIX_KEY[priceInfo.vatSuffix])}
          </span>
        </div>
        {normalPerLiter !== null && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pdp.perLiter", { price: formatPrice(normalPerLiter) })}
          </p>
        )}
        {/* Pasgebied: zolang de sessiestatus onbekend is (vóór hydratie / terwijl
            next-auth "loading" is) tonen we een neutrale skeleton i.p.v. de gast-
            teaser of het pasblok. Zo flitst een ingelogde bezoeker niet eerst de
            "log in voor 5%"-versie. De skeleton rendert op SSR/eerste paint
            identiek → geen hydration-mismatch. Pas ná resolve het juiste blok. */}
        {!passResolved ? (
          (showPass || showTeaser) && <PassBoxSkeleton />
        ) : showPass ? (
          // Ingelogd: pasprijs toegepast → "Jouw prijs"-blok (KLUSRPAS én ProfPas).
          <PassDiscountBox
            amount={priceInfo.amount}
            passName={passName}
            pct={priceInfo.savingsPct ?? 0}
            perLiter={memberPerLiter}
            t={t}
          />
        ) : showTeaser ? (
          // Gast: pasprijs is een ingelogd voordeel → "log in voor 5%"-teaser.
          <PassTeaserBox
            amount={priceInfo.passAmount!}
            savings={priceInfo.passSavings!}
            pct={priceInfo.passSavingsPct ?? 0}
            perLiter={teaserPerLiter}
            t={t}
          />
        ) : null}
        {surcharge > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pdp.surcharge", {
              base: color?.base?.label.toLowerCase() ?? "",
              amount: formatPrice(surcharge),
            })}
          </p>
        )}
      </div>

      {/* Stock + delivery (base-specific when a colour is chosen) */}
      <StockStatus
        stockByStore={effectiveStock}
        safetyStock={safetyStock}
        showScarcity
        className="text-sm"
      />
      {/* Dynamische bezorgklok (vervangt de statische "morgen in huis"-regel). */}
      <DeliveryCountdown />
      {color?.base && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("pdp.stockForBasePre")}<strong>{color.base.label}</strong>{t("pdp.stockForBasePost")}
        </p>
      )}

      <Separator />

      {/* Variant selector — dropdown bij veel maten (bv. schroeven), anders knoppen */}
      {product.variants.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold">
            {t("pdp.sizeLabel")} <span className="text-muted-foreground">{variant.label}</span>
          </p>
          {product.variants.length > 8 ? (
            <select
              value={variant.id}
              onChange={(e) =>
                setVariant(
                  product.variants.find((v) => v.id === e.target.value) ?? product.variants[0],
                )
              }
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {product.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v)}
                  className={cn(
                    "min-w-[64px] rounded-md border px-3 py-2 text-sm font-semibold transition-all",
                    v.id === variant.id
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                      : "border-input bg-card hover:border-primary/40",
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Glansgraad — andere glansvarianten van dezelfde verflijn */}
      {glansVariants.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold">{t("plp.facet.glans")}</p>
          <div className="flex flex-wrap gap-2">
            {glansVariants.map((g) =>
              g.active ? (
                <span
                  key={g.id}
                  className="min-w-[64px] rounded-md border border-primary bg-primary/5 px-3 py-2 text-center text-sm font-semibold text-primary ring-1 ring-primary"
                >
                  {g.label}
                </span>
              ) : (
                <Link
                  key={g.id}
                  href={`/product/${g.slug}`}
                  className="min-w-[64px] rounded-md border border-input bg-card px-3 py-2 text-center text-sm font-semibold transition-all hover:border-primary/40"
                >
                  {g.label}
                </Link>
              ),
            )}
          </div>
        </div>
      )}

      {/* Mengverf — kleur kiezen + preview op de muur */}
      {product.colorMatchable && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t("pdp.color")}</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              <Palette className="h-3 w-3" />
              {t("plp.group.mengverf")}
            </span>
          </div>

          {(() => {
            const isWhite =
              color?.hex?.toUpperCase() === WHITE_COLOR.hex && color?.code === WHITE_COLOR.code;
            return (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={isWhite ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setColor(withBase({ ...WHITE_COLOR }))}
                >
                  <span className="h-4 w-4 rounded-full border border-black/20 bg-white shadow-inner" />
                  100% wit
                </Button>
                <ColorPickerDialog
                  value={color}
                  onConfirm={setColor}
                  trigger={
                    <Button variant="outline" className="gap-2">
                      <Palette className="h-4 w-4" />
                      {color && !isWhite ? t("pdp.changeColor") : t("pdp.chooseColor")}
                    </Button>
                  }
                />
              </div>
            );
          })()}

          {color ? (
            <div className="overflow-hidden rounded-xl border border-border">
              {/* Kleur op de muur */}
              <div
                className="relative flex aspect-[5/2] items-end p-4"
                style={{ backgroundColor: color.hex }}
              >
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/10 to-transparent" />
                <span
                  className={cn(
                    "relative rounded-md px-2 py-1 text-xs font-bold backdrop-blur",
                    isLightColor(color.hex) ? "bg-black/5 text-black/80" : "bg-white/20 text-white",
                  )}
                >
                  {color.name}
                  {color.code ? ` · ${color.code}` : ""}
                </span>
              </div>
              <div className="flex items-start gap-2 bg-secondary/40 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {t("pdp.mixed.pre")}
                  <strong className="text-foreground">{t("pdp.mixed.bold")}</strong>
                  {color.base ? t("pdp.mixed.inBase", { base: color.base.label.toLowerCase() }) : ""}
                  {t("pdp.mixed.post")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("pdp.anyColor")}
            </p>
          )}
        </div>
      )}

      {/* Quantity + CTAs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-stretch gap-3">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <Button onClick={handleAdd} size="lg" className="flex-1" disabled={!sellable}>
            <ShoppingCart className="h-5 w-5" />
            {sellable ? t("pdp.addToCart") : "Tijdelijk uitverkocht"}
          </Button>
        </div>
        {colorError && !color && (
          <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm font-semibold text-primary">
            <Palette className="h-4 w-4 shrink-0" />
            {t("pdp.chooseColorTitle")}
          </p>
        )}
        {/* Apple Pay vervangt "Direct afrekenen" wanneer het toestel Apple Pay
            ondersteunt; anders de gewone direct-checkout. */}
        {applePayAvailable ? (
          <Button
            type="button"
            onClick={payWithApplePay}
            size="lg"
            className="w-full gap-1.5 bg-klusr-black text-white hover:bg-klusr-black/90"
            aria-label="Betaal met Apple Pay"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current">
              <path d="M16.36 12.78c.02 2.3 2.02 3.07 2.04 3.08-.02.05-.32 1.1-1.06 2.18-.64.94-1.3 1.87-2.35 1.89-1.03.02-1.36-.61-2.54-.61-1.18 0-1.55.59-2.52.63-1.01.04-1.78-1.01-2.42-1.95-1.32-1.91-2.32-5.39-.97-7.74.67-1.17 1.87-1.91 3.17-1.93.99-.02 1.93.67 2.54.67.61 0 1.75-.83 2.95-.71.5.02 1.91.2 2.81 1.53-.07.05-1.68.98-1.66 2.94M14.44 6.5c.54-.65.9-1.56.8-2.46-.78.03-1.71.52-2.27 1.17-.5.58-.94 1.5-.82 2.39.86.07 1.75-.44 2.29-1.1"/>
            </svg>
            Betaal met Apple&nbsp;Pay
          </Button>
        ) : (
          <Button
            onClick={handleBuyNow}
            size="lg"
            className="w-full bg-klusr-black text-white hover:bg-klusr-black/90"
          >
            {t("pdp.buyNow")}
          </Button>
        )}
        {/* Verzendkosten-regel direct onder de afrekenknop: voorkomt dat de
            klant bij Apple Pay / direct afrekenen verrast wordt door de €4,95. */}
        {buyboxShipFree ? (
          <p className="-mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="first-letter:uppercase">
              {t("cart.freeShipping.reachedBold")}
            </span>
          </p>
        ) : (
          <p className="-mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("cart.shipping")} {formatPrice(buyboxShipping)}{" "}
              {t("service.shipping.freeFrom", {
                amount: formatPrice(freeShipThreshold),
              })}
            </span>
          </p>
        )}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            toggleFavorite(product.id);
            toast(isFavorite ? t("pdp.favRemoved") : t("pdp.favAdded"), {
              description: product.title,
            });
          }}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-primary text-primary")} />
          {isFavorite ? t("pdp.favSaved") : t("pdp.favSave")}
        </Button>
      </div>

      {/* USPs */}
      <ul className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-secondary/40 p-3 sm:grid-cols-2">
        {usps.map(({ icon: Icon, labelKey }) => (
          <li key={labelKey} className="flex items-start gap-2 text-xs font-medium">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t(labelKey)}
          </li>
        ))}
      </ul>

    </div>
  );
}

