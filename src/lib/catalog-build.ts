import type { Product, ProductVariant, StoreStock } from "@/types";
import { stores } from "@/lib/data";
import { PRIMARY_STORE_ID } from "@/lib/stock";
import { slugify } from "@/lib/utils";

/**
 * Server-side helpers om eigen (custom/dropship) producten en CSV-import op te
 * bouwen tot geldige `Product`-records voor de catalogus-overlay.
 */

const DROPSHIP_STOCK = 9999; // dropship = altijd leverbaar (leveranciersvoorraad)

export interface CustomProductInput {
  id?: string;
  title: string;
  brand?: string;
  category: string;
  price: number;
  kluspasPrice?: number;
  compareAtPrice?: number;
  gtin?: string;
  image?: string;
  description?: string;
  stock?: number;
  dropship?: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const randId = () => Math.random().toString(36).slice(2, 8);

function stockFor(qty: number): StoreStock[] {
  return stores.map((s) => ({ storeId: s.id, quantity: s.id === PRIMARY_STORE_ID ? qty : 0 }));
}

/** Bouw een geldig Product uit beheer-invoer (één standaardvariant). */
export function buildCustomProduct(input: CustomProductInput): Product {
  const id = input.id || `klusr-${Date.now().toString(36)}-${randId()}`;
  const price = r2(input.price);
  const kluspasPrice = r2(input.kluspasPrice != null ? input.kluspasPrice : price * 0.95);
  const qty = input.dropship ? DROPSHIP_STOCK : Math.max(0, Math.round(input.stock ?? 0));
  const stockByStore = stockFor(qty);
  const images = input.image && /^https?:\/\//.test(input.image) ? [input.image] : [];

  const variant: ProductVariant = {
    id: `${id}-1`,
    label: "Standaard",
    price,
    kluspasPrice,
    ...(input.compareAtPrice ? { compareAtPrice: r2(input.compareAtPrice) } : {}),
    stockByStore,
  };

  return {
    id,
    title: input.title.trim(),
    slug: `${slugify(input.title)}-${id.replace(/^klusr-/, "")}`,
    brand: input.brand?.trim() || "KLUSR",
    highlights: [],
    description:
      input.description?.trim() ||
      `${input.title.trim()} — verkrijgbaar bij KLUSR.${input.dropship ? " Wordt rechtstreeks door onze leverancier verzonden." : ""}`,
    images,
    price,
    ...(input.compareAtPrice ? { compareAtPrice: r2(input.compareAtPrice) } : {}),
    kluspasPrice,
    category: input.category.trim(),
    badges: ["NIEUW"],
    rating: 0,
    reviewCount: 0,
    ...(input.gtin && /^\d{8,14}$/.test(input.gtin.trim()) ? { gtin: input.gtin.trim() } : {}),
    specifications: [],
    variants: [variant],
    stockByStore,
    frequentlyBoughtTogether: [],
    aiGeneratedContentStatus: "complete",
  };
}

export interface ParsedCsvRow extends CustomProductInput {
  _row: number;
  _error?: string;
}

const HEADER_MAP: Record<string, keyof CustomProductInput> = {
  titel: "title",
  title: "title",
  naam: "title",
  merk: "brand",
  brand: "brand",
  categorie: "category",
  category: "category",
  prijs: "price",
  price: "price",
  kluspasprijs: "kluspasPrice",
  kluspasprice: "kluspasPrice",
  pasprijs: "kluspasPrice",
  adviesprijs: "compareAtPrice",
  compareatprice: "compareAtPrice",
  ean: "gtin",
  gtin: "gtin",
  barcode: "gtin",
  afbeelding: "image",
  image: "image",
  imageurl: "image",
  omschrijving: "description",
  description: "description",
  voorraad: "stock",
  stock: "stock",
  dropship: "dropship",
};

const truthy = (v: string) => /^(1|ja|true|yes|x)$/i.test(v.trim());

/** Splits één CSV-regel (ondersteunt eenvoudige quotes). */
function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === delim && !inQ) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * Parse een CSV/plak-tekst tot productregels. Eerste regel = kolomkoppen
 * (Nederlands of Engels). Scheidingsteken `,` of `;` (auto). Vereist minimaal
 * titel, categorie en prijs.
 */
export function parseProductCsv(text: string): ParsedCsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const delim = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const headers = splitLine(lines[0], delim).map((h) => h.toLowerCase().replace(/\s+/g, ""));

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const key = HEADER_MAP[h];
      if (key) rec[key] = cells[idx] ?? "";
    });

    const title = (rec.title ?? "").trim();
    const category = (rec.category ?? "").trim();
    const price = Number((rec.price ?? "").replace(",", "."));
    const row: ParsedCsvRow = {
      _row: i + 1,
      title,
      category,
      price,
      brand: rec.brand?.trim() || undefined,
      kluspasPrice: rec.kluspasPrice ? Number(rec.kluspasPrice.replace(",", ".")) : undefined,
      compareAtPrice: rec.compareAtPrice ? Number(rec.compareAtPrice.replace(",", ".")) : undefined,
      gtin: rec.gtin?.trim() || undefined,
      image: rec.image?.trim() || undefined,
      description: rec.description?.trim() || undefined,
      stock: rec.stock ? Math.max(0, Math.round(Number(rec.stock))) : undefined,
      dropship: rec.dropship ? truthy(rec.dropship) : undefined,
    };
    if (!title || !category || !(price > 0)) {
      row._error = "Titel, categorie en prijs (> 0) zijn verplicht";
    }
    rows.push(row);
  }
  return rows;
}
