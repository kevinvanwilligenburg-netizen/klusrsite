"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, ProductVariant, SelectedColor } from "@/types";
import { exVat, profGrossPrice } from "@/lib/pricing";
import type { PricingMode } from "@/lib/store/pricing-mode";
import { isBrievenbusOrder } from "@/lib/brievenbus";
import { BRIEVENBUS_PRICE, SHIPPING_COUNTRY_MAP, DEFAULT_COUNTRY } from "@/lib/shipping";

// Eén bron voor de NL-tarieven: lib/shipping.ts. Stond hier eerder los
// hardgecodeerd, waardoor de winkelwagen na een tariefwijziging een andere
// gratis-verzendgrens toonde dan de checkout rekende.
const NL = SHIPPING_COUNTRY_MAP[DEFAULT_COUNTRY];
const FREE_SHIPPING_THRESHOLD = NL.freeOver ?? 59;
const SHIPPING_COST = NL.price;

interface AddArgs {
  product: Product;
  variant: ProductVariant;
  quantity?: number;
  color?: SelectedColor;
  useKLUSRPAS?: boolean;
}

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  kluspasActive: boolean;
  /** Recently viewed product ids (most recent first). */
  recentlyViewed: string[];

  addItem: (args: AddArgs) => CartItem;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  setColor: (key: string, color: SelectedColor) => void;
  saveForLater: (key: string) => void;
  moveToCart: (key: string) => void;
  toggleKLUSRPAS: () => void;
  /** Zet de KLUSRPAS-status op basis van de login (zie membership-sync). */
  setMembership: (active: boolean) => void;
  clear: () => void;
  pushRecentlyViewed: (productId: string) => void;
}

function lineKey(productId: string, variantId: string, color?: SelectedColor): string {
  return [productId, variantId, color?.code ?? "default"].join("__");
}

/** Unit price for a line, honouring the KLUSRPAS toggle. */
export function linePrice(item: CartItem, kluspasActive: boolean): number {
  return kluspasActive ? item.kluspasPrice : item.price;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedForLater: [],
      // Gasten betalen de normale prijs; de KLUSRPAS-prijs is een ingelogd
      // voordeel. Wordt bij het laden afgeleid van de sessie (membership-sync)
      // en bewust NIET gepersisteerd (zie partialize), zodat hij altijd vers
      // begint en de inlogstatus volgt.
      kluspasActive: false,
      recentlyViewed: [],

      addItem: ({ product, variant, quantity = 1, color, useKLUSRPAS }) => {
        const key = lineKey(product.id, variant.id, color);
        const existing = get().items.find((i) => i.key === key);

        if (useKLUSRPAS !== undefined) {
          set({ kluspasActive: useKLUSRPAS });
        }

        if (existing) {
          set({
            items: get().items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + quantity } : i,
            ),
          });
          return { ...existing, quantity: existing.quantity + quantity };
        }

        // A deep/medium tinting base adds a per-unit surcharge to the line.
        const surcharge = color?.base?.surcharge ?? 0;
        const item: CartItem = {
          key,
          productId: product.id,
          variantId: variant.id,
          title: product.title,
          brand: product.brand,
          image: product.images[0],
          variantLabel: variant.label,
          slug: product.slug,
          gtin: product.gtin,
          quantity,
          price: variant.price + surcharge,
          kluspasPrice: variant.kluspasPrice + surcharge,
          selectedColor: color,
        };
        set({ items: [...get().items, item] });
        return item;
      },

      removeItem: (key) => set({ items: get().items.filter((i) => i.key !== key) }),

      updateQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.key !== key) });
          return;
        }
        set({
          items: get().items.map((i) => (i.key === key ? { ...i, quantity } : i)),
        });
      },

      setColor: (key, color) =>
        set({
          items: get().items.map((i) =>
            i.key === key ? { ...i, selectedColor: color } : i,
          ),
        }),

      saveForLater: (key) => {
        const item = get().items.find((i) => i.key === key);
        if (!item) return;
        set({
          items: get().items.filter((i) => i.key !== key),
          savedForLater: [...get().savedForLater.filter((i) => i.key !== key), item],
        });
      },

      moveToCart: (key) => {
        const item = get().savedForLater.find((i) => i.key === key);
        if (!item) return;
        set({
          savedForLater: get().savedForLater.filter((i) => i.key !== key),
          items: [...get().items.filter((i) => i.key !== key), item],
        });
      },

      toggleKLUSRPAS: () => set({ kluspasActive: !get().kluspasActive }),

      setMembership: (active) => set({ kluspasActive: active }),

      clear: () => set({ items: [] }),

      pushRecentlyViewed: (productId) =>
        set({
          recentlyViewed: [
            productId,
            ...get().recentlyViewed.filter((id) => id !== productId),
          ].slice(0, 8),
        }),
    }),
    {
      name: "klusr-cart",
      // `kluspasActive` bewust NIET persisteren: het is een ingelogd voordeel dat
      // bij elke load uit de sessie wordt afgeleid (membership-sync). Zo kan een
      // uitgelogde bezoeker nooit met een gepersisteerde "true" de pasprijs zien.
      partialize: (state) => ({
        items: state.items,
        savedForLater: state.savedForLater,
        recentlyViewed: state.recentlyViewed,
      }),
    },
  ),
);

/* ----------------------------------------------------------------- selectors */

export const cartConfig = {
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  shippingCost: SHIPPING_COST,
};

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[], kluspasActive: boolean): number {
  return items.reduce((sum, i) => sum + linePrice(i, kluspasActive) * i.quantity, 0);
}

export function cartRegularSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function kluspasSavings(items: CartItem[]): number {
  return items.reduce(
    (sum, i) => sum + Math.max(0, i.price - i.kluspasPrice) * i.quantity,
    0,
  );
}

export function shippingFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

/** Verzendkosten voor de winkelwagen: past het voordelige brievenbuspakje-tarief
 *  toe als de héle inhoud daarvoor in aanmerking komt (kleine, platte artikelen
 *  zoals schroeven, pluggen, staalkabel, schuurpapier). Gratis verzending wint. */
function shippingForCart(items: CartItem[], subtotal: number): number {
  const base = shippingFor(subtotal);
  if (base <= 0) return base;
  return isBrievenbusOrder(items) ? Math.min(base, BRIEVENBUS_PRICE.NL ?? base) : base;
}

export function freeShippingProgress(subtotal: number): {
  remaining: number;
  percent: number;
  reached: boolean;
} {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const percent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  return { remaining, percent, reached: remaining === 0 };
}

/* ---- Modusbewuste weergave: Particulier (incl. btw) / Zakelijk (ProfPas, excl. btw) ---- */

export interface LineDisplay {
  /** Te tonen regelprijs in de huidige modus. */
  main: number;
  /** Doorgestreepte referentie (hoger), of undefined. */
  reference?: number;
}

export function displayLine(
  item: CartItem,
  mode: PricingMode,
  kluspasActive: boolean,
): LineDisplay {
  if (mode === "zakelijk") {
    return {
      main: exVat(profGrossPrice(item.price)) * item.quantity,
      reference: exVat(item.price) * item.quantity,
    };
  }
  return {
    main: linePrice(item, kluspasActive) * item.quantity,
    reference:
      kluspasActive && item.price > item.kluspasPrice
        ? item.price * item.quantity
        : undefined,
  };
}

export interface CartSummary {
  /** Of de getoonde bedragen incl. btw zijn (particulier) of excl. (zakelijk). */
  vatIncluded: boolean;
  /** Subtotaal vóór pas-korting, in de getoonde btw-basis. */
  subtotalRegular: number;
  /** Korting (KLUSRPAS of ProfPas), positief bedrag. */
  savings: number;
  /** Verzendkosten in de getoonde btw-basis. */
  shipping: number;
  /** Btw-bedrag (alleen zakelijk; particulier = undefined). */
  vat?: number;
  /** Eindtotaal dat afgerekend wordt — altijd incl. btw. */
  total: number;
  /** Brutobedragen (incl. btw) voor de daadwerkelijke betaling/order. */
  grossSubtotal: number;
  grossShipping: number;
  grossTotal: number;
}

export function cartSummary(
  items: CartItem[],
  mode: PricingMode,
  kluspasActive: boolean,
  shippingOverride?: number,
): CartSummary {
  if (mode === "zakelijk") {
    const grossSubtotal = items.reduce((s, i) => s + profGrossPrice(i.price) * i.quantity, 0);
    const grossShipping = shippingOverride ?? shippingForCart(items, grossSubtotal);
    const grossTotal = grossSubtotal + grossShipping;
    const regularEx = items.reduce((s, i) => s + exVat(i.price) * i.quantity, 0);
    const subtotalEx = exVat(grossSubtotal);
    const shippingEx = exVat(grossShipping);
    return {
      vatIncluded: false,
      subtotalRegular: regularEx,
      savings: regularEx - subtotalEx,
      shipping: shippingEx,
      vat: grossTotal - (subtotalEx + shippingEx),
      total: grossTotal,
      grossSubtotal,
      grossShipping,
      grossTotal,
    };
  }

  const grossSubtotal = cartSubtotal(items, kluspasActive);
  const grossShipping = shippingOverride ?? shippingForCart(items, grossSubtotal);
  const grossTotal = grossSubtotal + grossShipping;
  return {
    vatIncluded: true,
    subtotalRegular: cartRegularSubtotal(items),
    savings: kluspasActive ? kluspasSavings(items) : 0,
    shipping: grossShipping,
    vat: undefined,
    total: grossTotal,
    grossSubtotal,
    grossShipping,
    grossTotal,
  };
}
