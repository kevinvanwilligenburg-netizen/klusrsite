import { Check, PackageX, Truck } from "lucide-react";
import type { StoreStock } from "@/types";
import { onlineStock, DEFAULT_SAFETY_STOCK } from "@/lib/stock";
import { cn } from "@/lib/utils";

interface StockStatusProps {
  stockByStore: StoreStock[];
  /** Behouden voor API-compatibiliteit; niet meer gebruikt (geen fysieke winkels). */
  storeId?: string;
  /** Veiligheidsvoorraad: onder dit aantal (Nijverdal) tonen we uitverkocht. */
  safetyStock?: number;
  showScarcity?: boolean;
  showDelivery?: boolean;
  className?: string;
}

const SCARCITY_THRESHOLD = 5;

/**
 * Online voorraadindicator. We tonen uitsluitend de voorraad van de
 * hoofdvestiging (Nijverdal), en pas vanaf de veiligheidsvoorraad: zakt die
 * eronder, dan is het product niet leverbaar ("uitverkocht").
 */
export function StockStatus({
  stockByStore,
  safetyStock = DEFAULT_SAFETY_STOCK,
  showScarcity = true,
  showDelivery = false,
  className,
}: StockStatusProps) {
  const qty = onlineStock(stockByStore, safetyStock);
  const inStock = qty > 0;

  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      {inStock ? (
        <span className="inline-flex items-center gap-1 font-semibold text-klusr-stock">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Op voorraad
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
          <PackageX className="h-3.5 w-3.5" />
          Tijdelijk uitverkocht
        </span>
      )}
      {showScarcity && inStock && qty <= SCARCITY_THRESHOLD && (
        <span className="font-semibold text-primary">Nog {qty} op voorraad</span>
      )}
      {showDelivery && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          Voor 09:00 besteld, vanavond in huis
        </span>
      )}
    </div>
  );
}
