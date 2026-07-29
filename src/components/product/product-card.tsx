"use client";

import { ProductImage } from "./product-image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { showAddedToCartToast } from "@/components/cart/added-to-cart-toast";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { Price } from "./price";
import { StockStatus } from "./stock-status";
import { ProductBadges } from "./product-badges";
import { CompareButton } from "./compare-button";
import { useCart } from "@/lib/store/cart";
import { useFavorites } from "@/lib/store/favorites";
import { useMounted } from "@/lib/hooks/use-mounted";
import { trackEvent, toAnalyticsItem } from "@/lib/tracking";
import { productKindLabel } from "@/lib/product-kind";
import { bestVariantStock, cheapestSellableVariant } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

interface ProductCardProps {
  product: Product;
  /** Analytics list context, e.g. "Populaire producten". */
  listName?: string;
  className?: string;
}

export function ProductCard({ product, listName, className }: ProductCardProps) {
  const t = useT();
  const addItem = useCart((s) => s.addItem);
  const toggleFavorite = useFavorites((s) => s.toggle);
  const favoriteIds = useFavorites((s) => s.ids);
  const mounted = useMounted();
  const isFavorite = mounted && favoriteIds.includes(product.id);

  // Toon de goedkoopste variant die ook leverbaar is (laagste KLUSRPAS-prijs) →
  // meer clicks, zonder dat "snel toevoegen" een onbestelbaar blik in de wagen
  // legt. Is er niets leverbaar, dan valt 'ie terug op de goedkoopste voor de
  // prijsweergave; de knop verdwijnt dan (zie `canAdd` hieronder).
  const sellableCheapest = cheapestSellableVariant(product.variants);
  const cheapest =
    sellableCheapest ??
    product.variants.reduce(
      (a, b) => (b.kluspasPrice < a.kluspasPrice ? b : a),
      product.variants[0],
    );
  const canAdd = Boolean(sellableCheapest);

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!sellableCheapest) return;
    addItem({ product, variant: sellableCheapest, quantity: 1 });
    trackEvent("add_to_cart", {
      value: cheapest.kluspasPrice,
      items: [
        toAnalyticsItem({
          id: product.id,
          title: product.title,
          brand: product.brand,
          category: product.category,
          price: cheapest.kluspasPrice,
        }),
      ],
    });
    showAddedToCartToast({
      title: product.title,
      brand: product.brand,
      image: product.images[0],
      meta: cheapest.label,
      labels: {
        added: t("pdp.addedToCart"),
        toCart: t("cart.toCart"),
        continue: t("cart.continueShopping"),
      },
    });
  }

  function handleSelect() {
    trackEvent("select_item", {
      item_list_name: listName,
      items: [
        toAnalyticsItem({
          id: product.id,
          title: product.title,
          brand: product.brand,
          category: product.category,
          price: product.kluspasPrice,
        }),
      ],
    });
  }

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
    >
      {/* Badges + favorite + vergelijk */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2.5">
        <ProductBadges badges={product.badges} />
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              toggleFavorite(product.id);
              toast(isFavorite ? t("pdp.favRemoved") : t("pdp.favAdded"));
            }}
            aria-label={t("plp.favorite")}
            className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-primary"
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-primary text-primary")} />
          </button>
          <CompareButton productId={product.id} />
        </div>
      </div>

      <Link
        href={`/product/${product.slug}`}
        onClick={handleSelect}
        className="relative block aspect-square overflow-hidden bg-white"
      >
        <ProductImage
          src={product.images[0]}
          alt={`${product.brand} ${product.title}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
          <Link
            href={`/product/${product.slug}`}
            onClick={handleSelect}
            className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-foreground hover:text-primary"
          >
            {product.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            {productKindLabel(product)}
            {product.variants.length > 1
              ? ` · ${product.variants.length} maten`
              : ` · ${cheapest.label}`}
          </span>
        </div>

        <StarRating
          rating={product.rating}
          reviewCount={product.reviewCount}
          noReviewsLabel={t("rating.none")}
        />

        <div className="mt-auto flex flex-col gap-2 pt-1">
          <Price
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            kluspasPrice={product.kluspasPrice}
            size="md"
            from={product.variants.length > 1}
          />
          <StockStatus stockByStore={bestVariantStock(product)} showScarcity />
          {canAdd && (
            <Button onClick={handleAdd} className="w-full" size="sm">
              <ShoppingCart className="h-4 w-4" />
              {t("pdp.addToCart")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
