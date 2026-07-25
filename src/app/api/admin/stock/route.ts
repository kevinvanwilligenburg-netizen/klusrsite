import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/auth";
import { products, getSubCategory } from "@/lib/data/products";
import { stores } from "@/lib/data/stores";
import { getCategoryTitle } from "@/lib/data/categories";
import {
  getSoldMap,
  getAdjustMap,
  liveStock,
  recordAdjustment,
} from "@/lib/store/stock-ledger";
import type { Product, ProductVariant } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Drempel waaronder een product als "bijna op" geldt (totale voorraad ≤ 5). */
const LOW_STOCK_THRESHOLD = 5;

type StockStatus = "uitverkocht" | "bijna-op" | "op-voorraad";

interface StockStoreLine {
  storeId: string;
  qty: number;
}

interface StockRow {
  id: string;
  title: string;
  brand: string;
  category: string;
  /** Nette categorie-titel (productsoort). */
  categoryTitle: string;
  subCategory?: string;
  /** Nette subcategorie-titel, indien aanwezig. */
  subCategoryTitle?: string;
  image?: string;
  /** Live voorraad uit het grootboek: feed-basis − verkocht + correcties/tellingen. */
  totalStock: number;
  /** Ongecorrigeerde feed-/snapshotstand (referentie). */
  feedStock: number;
  status: StockStatus;
  perStore: StockStoreLine[];
}

interface StockResponse {
  rows: StockRow[];
  brands: string[];
  categories: { slug: string; title: string }[];
  stores: { id: string; name: string }[];
  threshold: number;
  counts: { total: number; uitverkocht: number; bijnaOp: number; opVoorraad: number };
}

/**
 * Totale voorraad = som van de voorraad-per-winkel over álle varianten. Elke
 * variant draagt zijn eigen `stockByStore`; het product-niveau `stockByStore`
 * spiegelt in de feed niet betrouwbaar de som (soms alleen de eerste variant),
 * dus we tellen op variantniveau om dubbeltellen/onderrapportage te vermijden.
 */
function perStoreStock(p: Product): Map<string, number> {
  const acc = new Map<string, number>();
  const variants = p.variants?.length ? p.variants : [];
  if (variants.length) {
    for (const v of variants) {
      for (const s of v.stockByStore ?? []) {
        acc.set(s.storeId, (acc.get(s.storeId) ?? 0) + (s.quantity ?? 0));
      }
    }
  } else {
    // Vangnet: producten zonder varianten → product-niveau voorraad.
    for (const s of p.stockByStore ?? []) {
      acc.set(s.storeId, (acc.get(s.storeId) ?? 0) + (s.quantity ?? 0));
    }
  }
  return acc;
}

/** Feed-voorraad van één variant (som over winkels) — de basis voor het grootboek. */
function variantFeedQty(v: ProductVariant): number {
  return (v.stockByStore ?? []).reduce((s, x) => s + (x.quantity ?? 0), 0);
}

function statusOf(total: number): StockStatus {
  if (total <= 0) return "uitverkocht";
  if (total <= LOW_STOCK_THRESHOLD) return "bijna-op";
  return "op-voorraad";
}

/**
 * Admin: compacte voorraadlijst over de VOLLEDIGE catalogus. De getoonde stand is
 * de LIVE grootboekvoorraad (feed-basis − verkocht + correcties/tellingen), zodat
 * web- én kassaverkopen en handmatige tellingen direct meetellen. De ruwe feed-
 * stand blijft als referentie meekomen (`feedStock`). Self-guarded → 401.
 */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const [sold, adjust] = await Promise.all([getSoldMap(), getAdjustMap()]);

  // Telling-detail: live voorraad per variant van één product (voor de telling-tool).
  const variantsFor = url.searchParams.get("variantsFor");
  if (variantsFor) {
    const p = products.find((x) => x.id === variantsFor);
    if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({
      productId: p.id,
      title: p.title,
      brand: p.brand,
      variants: p.variants.map((v) => {
        const feedQty = variantFeedQty(v);
        return {
          id: v.id,
          label: v.label,
          feedQty,
          live: liveStock(feedQty, sold[v.id] ?? 0, adjust[v.id] ?? 0),
        };
      }),
    });
  }

  const brandSet = new Set<string>();
  const categorySet = new Map<string, string>();
  let uitverkocht = 0;
  let bijnaOp = 0;
  let opVoorraad = 0;

  const rows: StockRow[] = products.map((p) => {
    const per = perStoreStock(p);
    // Houd de winkelvolgorde van stores.ts aan voor een stabiele weergave.
    const perStore: StockStoreLine[] = stores.map((s) => ({
      storeId: s.id,
      qty: per.get(s.id) ?? 0,
    }));
    const feedStock = perStore.reduce((sum, s) => sum + s.qty, 0);

    // Live totaal via het grootboek, op variantniveau opgeteld.
    const totalStock = p.variants?.length
      ? p.variants.reduce(
          (sum, v) => sum + liveStock(variantFeedQty(v), sold[v.id] ?? 0, adjust[v.id] ?? 0),
          0,
        )
      : feedStock;

    const status = statusOf(totalStock);
    if (status === "uitverkocht") uitverkocht++;
    else if (status === "bijna-op") bijnaOp++;
    else opVoorraad++;

    if (p.brand) brandSet.add(p.brand);
    if (p.category && !categorySet.has(p.category)) {
      categorySet.set(p.category, getCategoryTitle(p.category));
    }

    const sub = p.subCategory ? getSubCategory(p.category, p.subCategory) : undefined;

    return {
      id: p.id,
      title: p.title,
      brand: p.brand,
      category: p.category,
      categoryTitle: getCategoryTitle(p.category),
      subCategory: p.subCategory,
      subCategoryTitle: sub?.title,
      image: p.images?.[0],
      totalStock,
      feedStock,
      status,
      perStore,
    };
  });

  const response: StockResponse = {
    rows,
    brands: [...brandSet].sort((a, b) => a.localeCompare(b, "nl")),
    categories: [...categorySet.entries()]
      .map(([slug, title]) => ({ slug, title }))
      .sort((a, b) => a.title.localeCompare(b.title, "nl")),
    stores: stores.map((s) => ({ id: s.id, name: s.city })),
    threshold: LOW_STOCK_THRESHOLD,
    counts: { total: rows.length, uitverkocht, bijnaOp, opVoorraad },
  };

  return NextResponse.json(response);
}

/* ----------------------------------------------------------------- POST: telling */

const countSchema = z.object({
  action: z.literal("count"),
  variantId: z.string().min(1),
  /** Geteld aantal fysiek op voorraad. */
  counted: z.number().int().nonnegative(),
});

/**
 * Leg een fysieke telling vast op het grootboek. We berekenen het verschil met de
 * huidige live-voorraad en boeken dat als correctie (kind "count"). Zo wordt de
 * getelde stand de waarheid — los van de uit de feed gesynthetiseerde stand — en
 * tellen latere verkopen/ontvangsten er gewoon overheen.
 */
export async function POST(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = countSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige aanvraag" }, { status: 400 });
  }
  const { variantId, counted } = parsed.data;

  // Vind de variant + zijn product in de catalogus.
  let found: { productId: string; title: string; feedQty: number } | null = null;
  for (const p of products) {
    const v = p.variants.find((x) => x.id === variantId);
    if (v) {
      found = {
        productId: p.id,
        title: `${p.title}${v.label ? ` — ${v.label}` : ""}`,
        feedQty: variantFeedQty(v),
      };
      break;
    }
  }
  if (!found) {
    return NextResponse.json({ error: "Variant niet gevonden." }, { status: 404 });
  }

  const [sold, adjust] = await Promise.all([getSoldMap(), getAdjustMap()]);
  const currentLive = liveStock(found.feedQty, sold[variantId] ?? 0, adjust[variantId] ?? 0);
  const delta = counted - currentLive;
  if (delta !== 0) {
    await recordAdjustment({
      variantId,
      productId: found.productId,
      title: found.title,
      delta,
      kind: "count",
      reference: "Telling",
    });
  }
  return NextResponse.json({ ok: true, live: counted, delta });
}
