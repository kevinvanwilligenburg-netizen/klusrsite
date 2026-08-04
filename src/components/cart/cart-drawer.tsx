"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ArrowRight, Sparkles } from "lucide-react";
import { TrailerIcon } from "@/components/shared/trailer-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "./quantity-stepper";
import { FreeShippingBar } from "./free-shipping-bar";
import { ExpressCheckout } from "./express-checkout";
import { ColorChip } from "./color-chip";
import { DeliveryCountdown } from "@/components/shared/delivery-countdown";
import {
  useCart,
  cartSummary,
  displayLine,
  linePrice,
  kluspasSavings,
} from "@/lib/store/cart";
import { usePricingMode } from "@/lib/store/pricing-mode";
import { useReorderActive } from "@/lib/store/reorder";
import { useUI } from "@/lib/store/ui";
import { useMounted } from "@/lib/hooks/use-mounted";
import type { Product } from "@/types";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import { trackRemoveFromCart } from "@/lib/cart-tracking";
import { formatPrice } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const { items, kluspasActive, updateQuantity, removeItem, addItem } = useCart();
  const t = useT();
  const mounted = useMounted();
  const mode = usePricingMode((s) => s.mode);
  const { active: reorderFree } = useReorderActive();

  const summary = cartSummary(items, mode, kluspasActive, reorderFree ? 0 : undefined);
  const subtotal = mounted
    ? summary.vatIncluded
      ? summary.grossSubtotal
      : summary.subtotalRegular - summary.savings
    : 0;
  const savings = mounted ? summary.savings : 0;
  const shipping = mounted ? summary.shipping : 0;
  const total = subtotal + shipping;
  // Login-nudge voor gasten (de KLUSRPAS-prijs is een ingelogd voordeel).
  const potentialSavings = mounted ? kluspasSavings(items) : 0;
  const showKluspasNudge =
    mounted && summary.vatIncluded && !kluspasActive && potentialSavings > 0;

  /**
   * GA4 `view_cart` bij het openen van de lade.
   *
   * Hing eerder aan de knop "naar de winkelwagen", en dat is doorklikken, niet
   * bekijken — de lade zelf ís de winkelwagen. Die knop stuurt nu niets meer;
   * /winkelwagen meldt zijn eigen weergave, anders telde één klik twee keer.
   */
  const viewCartGemeld = useRef(false);
  useEffect(() => {
    if (!open) {
      viewCartGemeld.current = false;
      return;
    }
    if (viewCartGemeld.current || !mounted || items.length === 0) return;
    viewCartGemeld.current = true;
    trackEvent("view_cart", {
      value: total,
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
  }, [open, mounted, items, total, kluspasActive]);

  // "Vaak vergeten" — fetch cheap add-ons (not in cart) from the API when the
  // drawer opens, so the catalogus stays out of the global bundle.
  const [forgotten, setForgotten] = useState<Product[]>([]);
  useEffect(() => {
    if (!open) return;
    const exclude = items.map((i) => i.productId).join(",");
    let active = true;
    fetch(`/api/products?list=accessory&limit=2&exclude=${exclude}`)
      .then((r) => r.json())
      .then((d) => active && setForgotten(d.products ?? []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, items]);

  return (
    <Sheet open={open} onOpenChange={setCartOpen}>
      <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <TrailerIcon className="h-5 w-5 text-primary" />
            {t("cart.title")} ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary">
              <TrailerIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">{t("cart.empty.title")}</p>
              <p className="text-sm text-muted-foreground">
                {t("cart.empty.drawerText")}
              </p>
            </div>
            <Button asChild onClick={() => setCartOpen(false)}>
              <Link href="/categorie/verf">{t("cart.empty.startPaint")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <FreeShippingBar subtotal={subtotal} className="mb-4" />

              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.key} className="flex gap-3">
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border bg-white"
                    >
                      <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase text-muted-foreground">
                            {item.brand}
                          </p>
                          <p className="truncate text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                        </div>
                        <button
                          onClick={() => {
                            trackRemoveFromCart(item, kluspasActive);
                            removeItem(item.key);
                          }}
                          aria-label={t("cart.item.removeLabel")}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {item.selectedColor && (
                        <ColorChip color={item.selectedColor} className="mt-1 w-fit" />
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <QuantityStepper
                          size="sm"
                          value={item.quantity}
                          onChange={(q) => updateQuantity(item.key, q)}
                        />
                        <span className="font-bold text-primary">
                          {formatPrice(displayLine(item, mode, kluspasActive).main)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {forgotten.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-bold">{t("cart.forgotten")}</p>
                  <div className="space-y-2">
                    {forgotten.map((p) => (
                      <div
                        key={p!.id}
                        className="flex items-center gap-3 rounded-md border border-border p-2"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-white">
                          <Image src={p!.images[0]} alt={p!.title} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{p!.title}</p>
                          <p className="text-xs font-bold text-primary">
                            {formatPrice(p!.kluspasPrice)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            addItem({ product: p!, variant: p!.variants[0], quantity: 1 })
                          }
                        >
                          {t("cart.item.add")}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-4">
              {savings > 0 && (
                <div className="mb-2 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    {summary.vatIncluded ? t("cart.kluspasDiscount") : t("cart.profpasDiscount")}
                  </span>
                  <span className="font-bold text-primary">-{formatPrice(savings)}</span>
                </div>
              )}
              {showKluspasNudge && (
                <Link
                  href={`/inloggen?redirect=${encodeURIComponent("/winkelwagen")}`}
                  onClick={() => setCartOpen(false)}
                  className="mb-2 flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t("cart.kluspas.nudge", { amount: formatPrice(potentialSavings) })}</span>
                </Link>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("cart.subtotal")}{!summary.vatIncluded && t("cart.exclVat")}
                </span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <TrailerIcon className="h-4 w-4" />
                  {t("cart.shipping")}
                </span>
                {shipping === 0 ? (
                  <span className="font-semibold text-klusr-stock">{t("cart.free")}</span>
                ) : (
                  <span className="font-semibold">{formatPrice(shipping)}</span>
                )}
              </div>
              <Separator className="my-2.5" />
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {t("cart.total")}{!summary.vatIncluded && t("cart.exclVat")}
                </span>
                <span className="text-lg font-extrabold">{formatPrice(total)}</span>
              </div>
              {/* Dynamische bezorgklok bij de totalen/CTA. */}
              <DeliveryCountdown compact className="mb-3 text-xs" />
              {/* Snelle checkout (Apple Pay / Google Pay / PayPal) direct vanuit de drawer. */}
              <ExpressCheckout className="mb-3" />
              <Button
                asChild
                size="lg"
                className="w-full"
                onClick={() => setCartOpen(false)}
              >
                <Link href="/winkelwagen">
                  {t("cart.toCart")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <button
                onClick={() => setCartOpen(false)}
                className="mt-2 w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                {t("cart.continueShopping")}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
