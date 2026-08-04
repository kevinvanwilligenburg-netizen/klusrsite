"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Trash2,
  ArrowRight,
  ShoppingCart,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "./quantity-stepper";
import { FreeShippingBar } from "./free-shipping-bar";
import { ExpressCheckout } from "./express-checkout";
import { ColorChip } from "./color-chip";
import { ProductCarousel } from "@/components/shared/product-carousel";
import { SectionHeading } from "@/components/shared/section-heading";
import { DeliveryCountdown } from "@/components/shared/delivery-countdown";
import {
  useCart,
  cartSummary,
  displayLine,
  linePrice,
  kluspasSavings,
} from "@/lib/store/cart";
import { usePricingMode } from "@/lib/store/pricing-mode";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { Product } from "@/types";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import { trackRemoveFromCart } from "@/lib/cart-tracking";
import { formatPrice } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";
import { PaymentIcons, CarrierBadge } from "@/components/shared/payment-icons";

export function CartView() {
  const {
    items,
    savedForLater,
    kluspasActive,
    updateQuantity,
    removeItem,
    saveForLater,
    moveToCart,
  } = useCart();
  const t = useT();
  const mounted = useMounted();
  const mode = usePricingMode((s) => s.mode);

  // Upsell + "vaak vergeten" come from the API so the catalogus isn't bundled.
  const [upsell, setUpsell] = useState<Product[]>([]);
  const [forgotten, setForgotten] = useState<Product[]>([]);
  // "Hier heb je ook nog dit voor nodig" — afgestemd op wat er in de mand ligt,
  // met per artikel de reden. Zie lib/data/klus-aanvulling.ts.
  const [aanvulling, setAanvulling] = useState<Product[]>([]);
  const [redenen, setRedenen] = useState<Record<string, string>>({});
  useEffect(() => {
    const exclude = items.map((i) => i.productId).join(",");
    let active = true;
    Promise.all([
      fetch(`/api/products?list=bestsellers&limit=8&exclude=${exclude}`).then((r) => r.json()),
      fetch(`/api/products?list=accessory&limit=3&exclude=${exclude}`).then((r) => r.json()),
      fetch(`/api/products?list=aanvulling&limit=3&voor=${exclude}`).then((r) => r.json()),
    ])
      .then(([up, fg, av]) => {
        if (!active) return;
        setUpsell(up.products ?? []);
        setForgotten(fg.products ?? []);
        setAanvulling(av.products ?? []);
        setRedenen(av.redenen ?? {});
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [items]);

  /**
   * GA4 `view_cart` — de klant kijkt naar zijn winkelwagen.
   *
   * Stond alleen op de knop in de zijlade, en dat is "doorklikken naar de mand",
   * niet "de mand bekijken". Wie rechtstreeks naar /winkelwagen ging — vanuit
   * een bladwijzer, de e-mail over een achtergelaten mand, of gewoon het
   * winkelwagen-icoon — werd nergens geteld. De GA4-tag in GTM stond er al klaar
   * voor.
   *
   * Eén keer per paginabezoek: `items` verandert bij elke aanpassing van een
   * aantal, en dan zou het event bij elk plusje opnieuw vuren.
   */
  const viewCartGemeld = useRef(false);
  useEffect(() => {
    if (!mounted || viewCartGemeld.current || items.length === 0) return;
    viewCartGemeld.current = true;
    trackEvent("view_cart", {
      value: cartSummary(items, mode, kluspasActive).total,
      items: items.map((i) =>
        toAnalyticsItem({
          id: i.productId,
          title: i.title,
          brand: i.brand,
          price: linePrice(i, kluspasActive),
          quantity: i.quantity,
        }),
      ),
    });
  }, [mounted, items, mode, kluspasActive]);

  if (!mounted) {
    return <div className="container-klusr py-16 text-center text-muted-foreground">{t("cart.loading")}</div>;
  }

  const summary = cartSummary(items, mode, kluspasActive);
  // Login-nudge voor gasten: de KLUSRPAS-prijs is een ingelogd voordeel, dus als
  // de pas niet actief is maar er wél te besparen valt (particulier), tonen we
  // hoeveel inloggen oplevert i.p.v. de toegepaste kortingsregel.
  const potentialSavings = kluspasSavings(items);
  const showKluspasNudge =
    summary.vatIncluded && !kluspasActive && potentialSavings > 0;

  if (items.length === 0) {
    return (
      <div className="container-klusr py-16">
        <div className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-secondary">
            <ShoppingCart className="h-9 w-9 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">{t("cart.empty.title")}</h1>
            <p className="mt-1 text-muted-foreground">
              {t("cart.empty.viewText")}
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/categorie/verf">{t("cart.empty.viewPaint")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/klushulp">{t("cart.empty.klushulp")}</Link>
            </Button>
          </div>
        </div>

        {savedForLater.length > 0 && (
          <SavedForLater items={savedForLater} onMove={moveToCart} onRemove={removeItem} />
        )}
      </div>
    );
  }

  return (
    <div className="container-klusr py-6">
      <h1 className="mb-6 text-2xl font-extrabold sm:text-3xl">
        {t("cart.title")} <span className="text-muted-foreground">({items.length})</span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Items */}
        <div>
          <FreeShippingBar subtotal={summary.grossSubtotal} className="mb-4" />

          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {items.map((item) => (
              <li key={item.key} className="flex gap-4 p-4">
                <Link
                  href={`/product/${item.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-white"
                >
                  <Image src={item.image} alt={item.title} fill sizes="96px" className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase text-muted-foreground">
                        {item.brand}
                      </p>
                      <Link href={`/product/${item.slug}`} className="font-semibold hover:text-primary">
                        {item.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                      {item.selectedColor && (
                        <ColorChip color={item.selectedColor} className="mt-1.5" />
                      )}
                    </div>
                    {(() => {
                      const line = displayLine(item, mode, kluspasActive);
                      return (
                        <div className="text-right">
                          <p className="font-black text-primary">{formatPrice(line.main)}</p>
                          {line.reference && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(line.reference)}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="mt-auto flex items-center gap-3 pt-3">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      onChange={(q) => updateQuantity(item.key, q)}
                    />
                    <button
                      onClick={() => saveForLater(item.key)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                    >
                      <Heart className="h-3.5 w-3.5" /> {t("cart.item.save")}
                    </button>
                    <button
                      onClick={() => {
                        trackRemoveFromCart(item, kluspasActive);
                        removeItem(item.key);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t("cart.item.remove")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* "Hier heb je ook nog dit voor nodig" — afgestemd op de mand.
              Staat bewust vóór "vaak vergeten": dit is het blok met een reden
              erbij, en dat is wat overtuigt. */}
          {aanvulling.length > 0 && (
            <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="mb-1 text-sm font-bold">Hier heb je ook nog dit voor nodig</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Gekozen bij de verf in je winkelwagen — scheelt een tweede bestelling.
              </p>
              <ul className="grid gap-2 sm:grid-cols-3">
                {aanvulling.map((p) => (
                  <AanvullingItem key={p.id} product={p} reden={redenen[p.id]} />
                ))}
              </ul>
            </div>
          )}

          {/* Vaak vergeten */}
          {forgotten.length > 0 && (
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Sparkles className="h-4 w-4 text-primary" /> {t("cart.forgotten")}
              </p>
              <ul className="grid gap-2 sm:grid-cols-3">
                {forgotten.map((p) => (
                  <ForgottenItem key={p.id} product={p} />
                ))}
              </ul>
            </div>
          )}

          {savedForLater.length > 0 && (
            <SavedForLater items={savedForLater} onMove={moveToCart} onRemove={removeItem} />
          )}
        </div>

        {/* Summary */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-lg font-bold">{t("cart.summary.title")}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("cart.subtotal")}{!summary.vatIncluded && t("cart.exclVat")}
                </dt>
                <dd className="font-medium">{formatPrice(summary.subtotalRegular)}</dd>
              </div>
              {summary.savings > 0 && (
                <div className="flex justify-between text-primary">
                  <dt className="inline-flex items-center gap-1 font-medium">
                    <Sparkles className="h-3.5 w-3.5" />{" "}
                    {summary.vatIncluded ? t("cart.kluspasDiscount") : t("cart.profpasDiscount")}
                  </dt>
                  <dd className="font-bold">-{formatPrice(summary.savings)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {t("cart.shipping")}{!summary.vatIncluded && t("cart.exclVat")}
                </dt>
                <dd className="font-medium">
                  {summary.shipping === 0 ? (
                    <span className="text-klusr-stock">{t("cart.free")}</span>
                  ) : (
                    formatPrice(summary.shipping)
                  )}
                </dd>
              </div>
              {summary.vat !== undefined && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("cart.vat")}</dt>
                  <dd className="font-medium">{formatPrice(summary.vat)}</dd>
                </div>
              )}
            </dl>
            {showKluspasNudge && (
              <Link
                href={`/inloggen?redirect=${encodeURIComponent("/winkelwagen")}`}
                className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("cart.kluspas.nudge", { amount: formatPrice(potentialSavings) })}</span>
              </Link>
            )}
            <Separator className="my-3" />
            <div className="flex items-baseline justify-between">
              <span className="font-bold">{t("cart.total")}</span>
              <span className="text-2xl font-black">{formatPrice(summary.total)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.vatIncluded
                ? t("cart.vatIncluded")
                : t("cart.vatIncludedBusiness")}
            </p>

            {/* Snelle checkout (Apple Pay / Google Pay / PayPal) vanuit de winkelwagen. */}
            <ExpressCheckout className="mt-4" />

            <Button
              asChild
              size="lg"
              className="mt-4 w-full"
              onClick={() =>
                trackEvent("begin_checkout", {
                  value: summary.total,
                  items: items.map((i) =>
                    toAnalyticsItem({
                      id: i.productId,
                      title: i.title,
                      brand: i.brand,
                      price: linePrice(i, kluspasActive),
                      quantity: i.quantity,
                    }),
                  ),
                })
              }
            >
              <Link href="/checkout">
                {t("cart.checkout")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/categorie/verf">{t("cart.continueShopping")}</Link>
            </Button>

            <ul className="mt-4 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <li>
                <DeliveryCountdown compact />
              </li>
              <li className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" /> {t("cart.usp.returns")}
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> {t("cart.usp.payment")}
              </li>
            </ul>

            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("footer.trust.payTitle")}
              </p>
              <PaymentIcons />
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("footer.trust.shipTitle")}
                </span>
                <CarrierBadge />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Upsell */}
      {upsell.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title={t("cart.upsell.title")}
            subtitle={t("cart.upsell.subtitle")}
          />
          <ProductCarousel products={upsell} listName="Maak je klus compleet" />
        </section>
      )}
    </div>
  );
}

/**
 * Eén regel uit "hier heb je ook nog dit voor nodig".
 *
 * De reden staat er bewust bij ("Voor randen, hoeken en kozijnen"). Een rijtje
 * producten zonder uitleg is een advertentie; met de reden erbij is het advies,
 * en dat is waarom iemand 'm meeneemt.
 */
function AanvullingItem({ product, reden }: { product: Product; reden?: string }) {
  const addItem = useCart((s) => s.addItem);
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-white">
        <Image src={product.images[0]} alt={product.title} fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{product.title}</p>
        {reden && <p className="truncate text-[11px] text-muted-foreground">{reden}</p>}
        <p className="text-xs font-bold text-primary">{formatPrice(product.kluspasPrice)}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        aria-label={`${product.title} toevoegen`}
        onClick={() => {
          addItem({ product, variant: product.variants[0], quantity: 1 });
          // Met `source` erbij, zodat straks te zien is of dit blok werkt.
          trackEvent("add_to_cart", {
            value: product.kluspasPrice,
            source: "aanvulling",
            items: [
              toAnalyticsItem({
                id: product.id,
                title: product.title,
                brand: product.brand,
                price: product.kluspasPrice,
                quantity: 1,
              }),
            ],
          });
        }}
      >
        +
      </Button>
    </li>
  );
}

function ForgottenItem({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border p-2">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-white">
        <Image src={product.images[0]} alt={product.title} fill sizes="48px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{product.title}</p>
        <p className="text-xs font-bold text-primary">{formatPrice(product.kluspasPrice)}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          addItem({ product, variant: product.variants[0], quantity: 1 });
          // Vuurde eerder niets: elke toevoeging vanuit dit blok was onzichtbaar
          // in GA4, dus je kon niet zien of het iets opleverde.
          trackEvent("add_to_cart", {
            value: product.kluspasPrice,
            source: "vaak_vergeten",
            items: [
              toAnalyticsItem({
                id: product.id,
                title: product.title,
                brand: product.brand,
                price: product.kluspasPrice,
                quantity: 1,
              }),
            ],
          });
        }}
      >
        +
      </Button>
    </li>
  );
}

function SavedForLater({
  items,
  onMove,
  onRemove,
}: {
  items: ReturnType<typeof useCart.getState>["savedForLater"];
  onMove: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const t = useT();
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-bold">{t("cart.savedForLater", { count: items.length })}</p>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border border-border bg-white">
              <Image src={item.image} alt={item.title} fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="text-xs font-bold text-primary">{formatPrice(item.kluspasPrice)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onMove(item.key)}>
              {t("cart.moveToCart")}
            </Button>
            <button
              onClick={() => onRemove(item.key)}
              aria-label={t("cart.item.removeLabel")}
              className="text-muted-foreground hover:text-primary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
