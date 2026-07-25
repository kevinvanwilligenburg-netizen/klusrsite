import type { Order } from "@/types";
import { getStoreName } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import { posTotals, type PosTotalsLine } from "@/lib/pos";
import type { ReceiptData, ReceiptLine } from "@/lib/escpos";

/**
 * Bouw de bon-gegevens (geformatteerde tekst) voor een order. Gedeeld door de
 * kassarespons, de ESC/POS-route en de printbare bonpagina, zodat alle drie exact
 * dezelfde bon tonen.
 */

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Contant",
  terminal: "PIN (terminal)",
  pin: "PIN",
  manual: "Handmatig / op rekening",
};

/** Afzender-/winkeladres voor op de bon (env, met nette fallback). */
function storeAddressLines(): string[] {
  const street = process.env.POSTNL_SENDER_STREET || process.env.NEXT_PUBLIC_STORE_STREET;
  const houseNr = process.env.POSTNL_SENDER_HOUSENR || "";
  const zip = process.env.POSTNL_SENDER_ZIPCODE || process.env.NEXT_PUBLIC_STORE_ZIP;
  const city = process.env.POSTNL_SENDER_CITY || process.env.NEXT_PUBLIC_STORE_CITY || "Nijverdal";
  const lines: string[] = [];
  if (street) lines.push(`${street} ${houseNr}`.trim());
  if (zip || city) lines.push(`${zip ?? ""} ${city}`.trim());
  const vat = process.env.NEXT_PUBLIC_STORE_VAT;
  if (vat) lines.push(`BTW ${vat}`);
  return lines.length ? lines : ["KLUSR — Nijverdal"];
}

export function receiptDataForOrder(order: Order): ReceiptData {
  const lines: ReceiptLine[] = order.items.map((it) => ({
    title: [it.brand, it.title].filter(Boolean).join(" ") + (it.variantLabel ? ` · ${it.variantLabel}` : ""),
    qty: it.quantity,
    unit: formatPrice(it.price),
    total: formatPrice(it.price * it.quantity),
  }));

  // Totalen opnieuw afleiden uit de regels (consistent met posTotals).
  const totalLines: PosTotalsLine[] = order.items.map((it) => ({
    unit: it.price,
    normalUnit: it.price,
    quantity: it.quantity,
  }));
  const totals = posTotals(totalLines);

  const dt = new Date(order.createdAt);
  const dateTime = new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dt);

  const method = order.pos?.method ?? "manual";
  const savings = order.kluspasSavings > 0 ? order.kluspasSavings : 0;

  // Klantregel + lidmaatschap (alleen bij een echte, gekoppelde klant — niet bij
  // de anonieme toonbankverkoop).
  const c = order.customer;
  const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  const isAnon = !c.email && (c.firstName === "Toonbank" || !fullName);
  const membership = c.company || c.vatNumber ? "ProfPas" : c.email ? "KLUSRPAS" : "";
  const customerLine =
    !isAnon && fullName
      ? `Klant: ${fullName}${membership ? ` · ${membership}` : ""}`
      : undefined;

  return {
    storeName: order.pos?.storeId ? getStoreName(order.pos.storeId) || "KLUSR" : "KLUSR",
    addressLines: storeAddressLines(),
    reference: order.reference,
    dateTime,
    cashier: order.pos?.cashier,
    customerLine,
    lines,
    subtotal: formatPrice(totals.total),
    vat: formatPrice(totals.vat),
    total: formatPrice(order.total),
    paymentLabel: PAYMENT_LABEL[method] ?? method,
    cashGiven: order.pos?.cashGiven != null ? formatPrice(order.pos.cashGiven) : undefined,
    change: order.pos?.change != null && order.pos.change > 0 ? formatPrice(order.pos.change) : undefined,
    savings: savings > 0 ? formatPrice(savings) : undefined,
    footerLines: ["Bedankt en tot ziens!", "KLUSR · klus-r.nl"],
  };
}

export { PAYMENT_LABEL };
