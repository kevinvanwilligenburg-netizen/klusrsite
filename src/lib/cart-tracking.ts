import { linePrice } from "@/lib/store/cart";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import type { CartItem } from "@/types";

/**
 * GA4 `remove_from_cart` voor één winkelwagenregel.
 *
 * Staat apart omdat er drie plekken zijn waar iets de mand verlaat — de
 * winkelwagenpagina, de zijlade en "bewaar voor later" — en een gemiste plek
 * levert een trechter op die niet klopt. De GA4-tag stond al in GTM te wachten;
 * de site verstuurde het event alleen nergens.
 *
 * Waarde is de regelwaarde (stukprijs × aantal), niet de stukprijs: dat is wat
 * er daadwerkelijk uit de mand verdwijnt.
 */
export function trackRemoveFromCart(item: CartItem, kluspasActive: boolean): void {
  const stuk = linePrice(item, kluspasActive);
  trackEvent("remove_from_cart", {
    value: Math.round(stuk * item.quantity * 100) / 100,
    items: [
      toAnalyticsItem({
        id: item.productId,
        title: item.title,
        brand: item.brand,
        price: stuk,
        quantity: item.quantity,
      }),
    ],
  });
}
