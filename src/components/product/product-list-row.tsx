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
import { bestVariantStock } from "@/lib/stock";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n/locale-provider";

interface ProductListRowProps {
  product: Product;
  /** Analytics list context, e.g. "Populaire producten". */
  listName?: string;
  className?: string;
}

/** Eerste paar specificaties als korte, leesbare regel (terugval: beschrijving). */
function specLine(product: Product): string {
  const items = product.specifications.flatMap((g) => g.items);
  if (items.length > 0) {
    return items
      .slice(0, 3)
      .map((i) => `${i.label}: ${i.value}`)
      .join(" · ");
  }
  return product.description;
}

export function ProductListRow({
  product,
  listName,
  className,
}: ProductListRowProps) {
  const t = useT();
  const addItem = useCart((s) => s.addItem);
  const toggleFavorite = useFavorites((s) => s.toggle);
  const favoriteIds = useFavorites((s) => s.ids);
  const mounted = useMounted();
  const isFavorite = mounted && favoriteIds.includes(product.id);

  // Toon altijd de goedkoopste variant (laagste KLUSRPAS-prijs) → meer clicks.
  const cheapest = product.variants.reduce(
    (a, b) => (b.kluspasPrice < a.kluspasPrice ? b : a),
    product.variants[0],
  );

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem({ product, variant: cheapest, quantity: 1 });
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
        "group relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover sm:flex-row sm:gap-4 sm:p-4",
        className,
      )}
    >
      {/* Afbeelding */}
      <Link
        href={`/product/${product.slug}`}
        onClick={handleSelect}
        className="relative block aspect-square w-full shrink-0 overflow-hidden rounded-md bg-white sm:h-[140px] sm:w-[140px]"
      >
        <ProductBadges badges={product.badges} />
        <ProductImage
          src={product.images[0]}
          alt={`${product.brand} ${product.title}`}
          sizes="(max-width: 640px) 100vw, 140px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </Link>

      {/* Midden: merk, titel, beoordeling, specs */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {product.brand}
        </span>
        <Link
          href={`/product/${product.slug}`}
          onClick={handleSelect}
          className="line-clamp-2 text-sm font-semibold leading-tight text-foreground hover:text-primary sm:text-base"
        >
          {product.title}
        </Link>
        <StarRating
          rating={product.rating}
          reviewCount={product.reviewCount}
          noReviewsLabel={t("rating.none")}
        />
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {specLine(product)}
        </p>
        <span className="text-xs text-muted-foreground">
          {productKindLabel(product)}
          {product.variants.length > 1
            ? ` · ${product.variants.length} maten`
            : ` · ${cheapest.label}`}
        </span>
      </div>

      {/* Rechts: prijs + acties */}
      <div className="flex shrink-0 flex-col gap-2 sm:w-[200px] sm:items-end sm:text-right">
        <Price
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          kluspasPrice={product.kluspasPrice}
          size="md"
          from={product.variants.length > 1}
          className="sm:items-end"
        />
        <StockStatus
          stockByStore={bestVariantStock(product)}
          showScarcity
          className="sm:items-end"
        />
        <div className="mt-auto flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              toggleFavorite(product.id);
              toast(isFavorite ? t("pdp.favRemoved") : t("pdp.favAdded"));
            }}
            aria-label={t("plp.favorite")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-primary"
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-primary text-primary")} />
          </button>
          <Button onClick={handleAdd} className="flex-1" size="sm">
            <ShoppingCart className="h-4 w-4" />
            {t("pdp.addToCart")}
          </Button>
        </div>
        <CompareButton productId={product.id} variant="labeled" className="pt-0.5 sm:self-end" />
      </div>
    </div>
  );
}
