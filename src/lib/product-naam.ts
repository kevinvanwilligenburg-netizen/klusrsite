import type { Product } from "@/types";

/**
 * Volledige productnaam zonder het merk te verdubbelen.
 *
 * De catalogustitels beginnen meestal al met het merk ("Histor Perfect
 * Finish"), dus `${brand} ${title}` levert "Histor Histor Perfect Finish" op.
 * Dat leest niet alleen slordig — het staat in de `<title>` van de
 * productpagina, in het Product-schema en in beide Shopping-feeds, en dus in de
 * zoekresultaten.
 *
 * Stond eerst drie keer los in de codebase, waarvan twee keer goed; de
 * productpagina zelf plakte ze gewoon aan elkaar.
 */
export function productNaam(p: Product): string {
  const merk = (p.brand ?? "").trim();
  const titel = (p.title ?? "").trim();
  if (!merk) return titel;
  const esc = merk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `${merk} ${titel.replace(new RegExp(`^${esc}\\s+`, "i"), "")}`.trim();
}
