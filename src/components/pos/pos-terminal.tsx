"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  X,
  ShoppingCart,
  Banknote,
  CreditCard,
  Loader2,
  Check,
  ChevronLeft,
  Printer,
  Inbox,
  PackageX,
  Receipt,
  AlertTriangle,
  User,
  UserPlus,
  Building2,
  Star,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { posLinePrice, posTotals, changeFor, type PosCustomerMode } from "@/lib/pos";

interface PosCustomer {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  cocNumber?: string;
  vatNumber?: string;
  account: boolean;
  business: boolean;
  orderCount: number;
  lastOrderAt?: string;
}

/** Prijsmodus die bij het lidmaatschap van een klant past. */
function membershipMode(c: { account?: boolean; business?: boolean }): PosCustomerMode {
  if (c.business) return "zakelijk";
  if (c.account) return "kluspas";
  return "particulier";
}

const fullName = (c: { firstName: string; lastName: string; email: string }) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || c.email;

interface VariantHit {
  id: string;
  label: string;
  price: number;
  kluspasPrice: number;
  feedStock: number;
  live: number;
}
interface ProductHit {
  productId: string;
  title: string;
  brand: string;
  slug: string;
  image?: string;
  gtin?: string;
  category: string;
  variants: VariantHit[];
}
interface CartLine {
  key: string;
  /** "catalog" = gewoon product; "adhoc" = losse regel via snelknop (toeslag/korting). */
  kind: "catalog" | "adhoc";
  productId: string;
  variantId: string;
  title: string;
  brand: string;
  variantLabel: string;
  image?: string;
  gtin?: string;
  price: number; // normale catalogusprijs
  kluspasPrice: number;
  live: number;
  quantity: number;
  discountPct: number;
  /** adhoc: bron-snelknop + getekend stuksbedrag (negatief = korting). */
  quickKeyId?: string;
  amount?: number;
}

/** Opgeloste snelknop zoals de kassa hem van de server krijgt. */
type QuickKey =
  | {
      id: string;
      kind: "catalog";
      label: string;
      color?: string;
      productId: string;
      variantId: string;
      title: string;
      brand: string;
      variantLabel: string;
      image?: string;
      gtin?: string;
      price: number;
      kluspasPrice: number;
      live: number;
    }
  | { id: string; kind: "surcharge" | "discount"; label: string; color?: string; amount: number };

type PayMethod = "cash" | "terminal" | "manual";

const MODES: { id: PosCustomerMode; label: string }[] = [
  { id: "particulier", label: "Particulier" },
  { id: "kluspas", label: "KLUSRPAS" },
  { id: "zakelijk", label: "Zakelijk" },
];

export function PosTerminal({
  storeId,
  storeName,
  cashier,
  terminalConfigured,
  printAgentUrl,
}: {
  storeId: string;
  storeName: string;
  cashier?: string;
  terminalConfigured: boolean;
  printAgentUrl: string;
}) {
  const [mode, setMode] = useState<PosCustomerMode>("particulier");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [payOpen, setPayOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [custOpen, setCustOpen] = useState(false);
  // Klant-koppelen wordt vóór afrekenen gevraagd (custGate): "Afrekenen" opent
  // eerst het klantpaneel, met een expliciete "verder zonder klant"-uitweg.
  const [custGate, setCustGate] = useState(false);

  const [quickKeys, setQuickKeys] = useState<QuickKey[]>([]);

  const scanRef = useRef<HTMLInputElement>(null);

  // Klant koppelen → prijsmodus volgt automatisch het lidmaatschap (overschrijfbaar).
  function selectCustomer(c: PosCustomer | null) {
    setCustomer(c);
    if (c) {
      setMode(membershipMode(c));
      setNotice(`Klant: ${fullName(c)}`);
    }
    setCustOpen(false);
    // Kwam dit uit de afreken-gate? Dan direct door naar betalen.
    if (c && custGate) {
      setCustGate(false);
      setPayOpen(true);
    }
  }

  // Afrekenen: vraag eerst om een klant (tenzij er al één hangt). De medewerker
  // kan in dat paneel een klant koppelen/aanmaken óf bewust zonder verder.
  function startCheckout() {
    if (cart.length === 0) return;
    if (customer) {
      setPayOpen(true);
      return;
    }
    setCustGate(true);
    setCustOpen(true);
  }

  useEffect(() => {
    scanRef.current?.focus();
    fetch("/api/kassa/quickkeys", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setQuickKeys(d.quickKeys ?? []))
      .catch(() => {});
  }, []);

  // Zoeken (gedebounced). Een gescande EAN levert meestal direct één product.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kassa/search?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const addVariant = useCallback((p: ProductHit, v: VariantHit) => {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.variantId === v.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: v.id,
          kind: "catalog",
          productId: p.productId,
          variantId: v.id,
          title: p.title,
          brand: p.brand,
          variantLabel: v.label,
          image: p.image,
          gtin: p.gtin,
          price: v.price,
          kluspasPrice: v.kluspasPrice,
          live: v.live,
          quantity: 1,
          discountPct: 0,
        },
      ];
    });
    setNotice(`${p.brand} ${p.title} toegevoegd`);
  }, []);

  // Snelknop toevoegen: catalogusknop → als product; toeslag/korting → losse regel.
  const addQuickKey = useCallback((k: QuickKey) => {
    if (k.kind === "catalog") {
      addVariant(
        {
          productId: k.productId,
          title: k.title,
          brand: k.brand,
          slug: "",
          image: k.image,
          gtin: k.gtin,
          category: "",
          variants: [],
        },
        {
          id: k.variantId,
          label: k.variantLabel,
          price: k.price,
          kluspasPrice: k.kluspasPrice,
          feedStock: 0,
          live: k.live,
        },
      );
      return;
    }
    const unit = k.kind === "discount" ? -Math.abs(k.amount) : Math.abs(k.amount);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.kind === "adhoc" && l.quickKeyId === k.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key: `adhoc-${k.id}`,
          kind: "adhoc",
          productId: "",
          variantId: "",
          title: k.label,
          brand: "",
          variantLabel: "",
          price: unit,
          kluspasPrice: unit,
          live: Infinity,
          quantity: 1,
          discountPct: 0,
          quickKeyId: k.id,
          amount: unit,
        },
      ];
    });
    setNotice(`${k.label} toegevoegd`);
  }, [addVariant]);

  // Enter in het zoekveld: bij precies één product met één variant direct toevoegen.
  function onScanEnter() {
    if (results.length === 1 && results[0].variants.length === 1) {
      addVariant(results[0], results[0].variants[0]);
      setQuery("");
      setResults([]);
      setExpanded(null);
      scanRef.current?.focus();
    } else if (results.length === 1) {
      setExpanded(results[0].productId);
    }
  }

  const setQty = (key: string, qty: number) =>
    setCart((prev) =>
      prev.flatMap((l) =>
        l.key === key ? (qty <= 0 ? [] : [{ ...l, quantity: qty }]) : [l],
      ),
    );
  const setDiscount = (key: string, pct: number) =>
    setCart((prev) =>
      prev.map((l) => (l.key === key ? { ...l, discountPct: Math.min(100, Math.max(0, pct)) } : l)),
    );
  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  const priced = useMemo(
    () =>
      cart.map((l) => {
        if (l.kind === "adhoc") {
          const unit = l.amount ?? 0;
          return { line: l, unit, normalUnit: unit, lineTotal: unit * l.quantity };
        }
        const p = posLinePrice({ price: l.price, kluspasPrice: l.kluspasPrice }, mode, l.discountPct);
        return { line: l, unit: p.unit, normalUnit: p.normalUnit, lineTotal: p.unit * l.quantity };
      }),
    [cart, mode],
  );
  const totals = useMemo(
    () =>
      posTotals(
        priced.map((p) => ({ unit: p.unit, normalUnit: p.normalUnit, quantity: p.line.quantity })),
      ),
    [priced],
  );
  const itemCount = cart.reduce((s, l) => s + l.quantity, 0);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 1800);
    return () => clearTimeout(t);
  }, [notice]);

  function reset() {
    setCart([]);
    setQuery("");
    setResults([]);
    setExpanded(null);
    setCustomer(null);
    setMode("particulier");
    scanRef.current?.focus();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-100 text-foreground">
      {/* Bovenbalk */}
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-klusr-black text-white">
            <ShoppingCart className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <div className="text-sm font-black tracking-tight">KLUSR Kassa</div>
            <div className="text-xs text-muted-foreground">
              {storeName}
              {cashier ? ` · ${cashier}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustOpen(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
              customer
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {customer ? <User className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span className="max-w-[150px] truncate">
              {customer ? fullName(customer) : "Klant"}
            </span>
            {customer?.business ? (
              <Building2 className="h-3.5 w-3.5" />
            ) : customer?.account ? (
              <Star className="h-3.5 w-3.5" />
            ) : null}
          </button>

          <div className="hidden items-center gap-1.5 rounded-lg bg-secondary p-1 sm:flex">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  mode === m.id
                    ? "bg-klusr-black text-white"
                    : "text-muted-foreground hover:bg-white",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" /> Sluiten
          </a>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_400px]">
        {/* Links: zoeken + resultaten */}
        <section className="flex min-h-0 flex-col border-r border-border">
          <div className="border-b border-border bg-white p-3">
            <div className="relative">
              <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <input
                ref={scanRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onScanEnter();
                  }
                }}
                placeholder="Scan barcode of zoek op naam / merk…"
                className="h-12 w-full rounded-xl border border-border bg-secondary pl-11 pr-4 text-base font-medium outline-none focus:border-primary focus:bg-white"
                autoComplete="off"
                inputMode="search"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {quickKeys.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-b border-border bg-white px-3 pb-2.5">
              {quickKeys.map((k) => (
                <button
                  key={k.id}
                  onClick={() => addQuickKey(k)}
                  style={k.color ? { borderColor: k.color } : undefined}
                  className="flex shrink-0 flex-col items-start gap-0.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-left hover:bg-white"
                >
                  <span className="max-w-[130px] truncate text-xs font-bold leading-tight">
                    {k.label}
                  </span>
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {k.kind === "catalog"
                      ? formatPrice(k.price)
                      : k.kind === "discount"
                        ? `−${formatPrice(k.amount)}`
                        : `+${formatPrice(k.amount)}`}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {query.trim().length < 2 ? (
              <EmptyHint />
            ) : results.length === 0 && !searching ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
                <PackageX className="h-7 w-7 opacity-50" />
                Geen producten gevonden voor “{query}”.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {results.map((p) => (
                  <ProductCard
                    key={p.productId}
                    product={p}
                    expanded={expanded === p.productId}
                    onToggle={() =>
                      setExpanded((cur) => (cur === p.productId ? null : p.productId))
                    }
                    onAdd={(v) => addVariant(p, v)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Rechts: winkelwagen + totalen */}
        <aside className="flex min-h-0 flex-col bg-white">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <ShoppingCart className="h-4 w-4" /> Verkoop
              {itemCount > 0 && (
                <span className="rounded-full bg-klusr-black px-2 py-0.5 text-xs font-bold text-white">
                  {itemCount}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={reset}
                className="text-xs font-semibold text-muted-foreground hover:text-primary"
              >
                Leegmaken
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                Nog geen artikelen.
                <br />
                Scan of zoek een product.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {priced.map(({ line, unit, lineTotal }) => (
                  <li key={line.key} className="rounded-lg border border-border p-2">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {line.brand} {line.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {line.kind === "adhoc"
                            ? (line.amount ?? 0) < 0
                              ? "Korting"
                              : "Toeslag"
                            : line.variantLabel}{" "}
                          · {formatPrice(unit)}
                          {line.kind === "catalog" &&
                            line.discountPct > 0 &&
                            ` · -${line.discountPct}%`}
                        </div>
                        {line.kind === "catalog" && line.quantity > line.live && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-klusr-action">
                            <AlertTriangle className="h-3 w-3" /> meer dan voorraad ({line.live})
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm font-bold tabular-nums">
                        {formatPrice(lineTotal)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <QtyButton onClick={() => setQty(line.key, line.quantity - 1)}>
                          <Minus className="h-4 w-4" />
                        </QtyButton>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">
                          {line.quantity}
                        </span>
                        <QtyButton onClick={() => setQty(line.key, line.quantity + 1)}>
                          <Plus className="h-4 w-4" />
                        </QtyButton>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {line.kind === "catalog" && (
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={line.discountPct || ""}
                              onChange={(e) => setDiscount(line.key, Math.floor(Number(e.target.value)))}
                              placeholder="0"
                              className="h-7 w-12 rounded border border-border bg-secondary px-1.5 text-center text-xs outline-none focus:border-primary"
                            />
                            %
                          </label>
                        )}
                        <button
                          onClick={() => removeLine(line.key)}
                          className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-primary"
                          aria-label="Verwijderen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totalen + afrekenen */}
          <div className="border-t border-border p-4">
            {totals.savings > 0 && (
              <div className="mb-1 flex justify-between text-sm text-klusr-stock">
                <span>Voordeel</span>
                <span className="font-semibold">−{formatPrice(totals.savings)}</span>
              </div>
            )}
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>waarvan btw 21%</span>
              <span>{formatPrice(totals.vat)}</span>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <span className="text-sm font-bold">Totaal</span>
              <span className="text-3xl font-black tabular-nums">{formatPrice(totals.total)}</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={startCheckout}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-black text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Afrekenen · {formatPrice(totals.total)}
            </button>
          </div>
        </aside>
      </div>

      {notice && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-klusr-black px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}

      {payOpen && (
        <PaymentSheet
          total={totals.total}
          mode={mode}
          storeId={storeId}
          cashier={cashier}
          customer={customer}
          terminalConfigured={terminalConfigured}
          printAgentUrl={printAgentUrl}
          lines={cart
            .filter((l) => l.kind === "catalog")
            .map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              discountPct: l.discountPct || undefined,
            }))}
          adhocLines={cart
            .filter((l) => l.kind === "adhoc" && l.quickKeyId)
            .map((l) => ({ quickKeyId: l.quickKeyId as string, quantity: l.quantity }))}
          onClose={() => setPayOpen(false)}
          onDone={() => {
            setPayOpen(false);
            reset();
          }}
        />
      )}

      {custOpen && (
        <CustomerSheet
          current={customer}
          gateMode={custGate}
          onClose={() => {
            setCustOpen(false);
            setCustGate(false);
          }}
          onSelect={selectCustomer}
          onClear={() => selectCustomer(null)}
          onSkip={() => {
            setCustOpen(false);
            setCustGate(false);
            setPayOpen(true);
          }}
        />
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
      <ScanLine className="h-10 w-10 opacity-40" />
      <div>
        Scan een productbarcode of typ een naam/merk om te zoeken.
        <br />
        Het veld staat klaar voor de scanner.
      </div>
    </div>
  );
}

function ProductCard({
  product,
  expanded,
  onToggle,
  onAdd,
}: {
  product: ProductHit;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (v: VariantHit) => void;
}) {
  const single = product.variants.length === 1;
  const minPrice = Math.min(...product.variants.map((v) => v.price));
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-white">
      <button
        onClick={() => (single ? onAdd(product.variants[0]) : onToggle())}
        className="flex flex-1 flex-col text-left"
      >
        <div className="aspect-square w-full bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image || "/icon.svg"}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-2"
          />
        </div>
        <div className="flex flex-1 flex-col gap-0.5 p-2">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">
            {product.brand}
          </div>
          <div className="line-clamp-2 text-xs font-medium leading-snug">{product.title}</div>
          <div className="mt-auto pt-1 text-sm font-black">
            {single ? formatPrice(product.variants[0].price) : `vanaf ${formatPrice(minPrice)}`}
          </div>
        </div>
      </button>
      {!single && expanded && (
        <div className="border-t border-border p-1.5">
          {product.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => onAdd(v)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-secondary"
            >
              <span className="truncate font-medium">{v.label}</span>
              <span className="flex items-center gap-1.5 tabular-nums">
                {formatPrice(v.price)}
                <Plus className="h-3.5 w-3.5 text-primary" />
              </span>
            </button>
          ))}
        </div>
      )}
      {single && (
        <div className="border-t border-border px-2 py-1 text-center text-[11px] font-semibold text-muted-foreground">
          {product.variants[0].live > 0 ? `${product.variants[0].live} op voorraad` : "uitverkocht"}
        </div>
      )}
    </div>
  );
}

function QtyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-white text-foreground hover:bg-secondary"
    >
      {children}
    </button>
  );
}

interface CheckoutLine {
  productId: string;
  variantId: string;
  quantity: number;
  discountPct?: number;
}

interface AdhocLine {
  quickKeyId: string;
  quantity: number;
}

function PaymentSheet({
  total,
  mode,
  storeId,
  cashier,
  customer,
  terminalConfigured,
  printAgentUrl,
  lines,
  adhocLines,
  onClose,
  onDone,
}: {
  total: number;
  mode: PosCustomerMode;
  storeId: string;
  cashier?: string;
  customer: PosCustomer | null;
  terminalConfigured: boolean;
  printAgentUrl: string;
  lines: CheckoutLine[];
  adhocLines: AdhocLine[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>(terminalConfigured ? "terminal" : "cash");
  const [cashGiven, setCashGiven] = useState<string>("");
  const [phase, setPhase] = useState<"choose" | "processing" | "pending" | "done" | "error">(
    "choose",
  );
  const [result, setResult] = useState<{ orderId: string; reference: string; change?: number } | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const cashNum = Number(cashGiven.replace(",", ".")) || 0;
  const change = method === "cash" ? changeFor(total, cashNum) : 0;
  const cashShort = method === "cash" && cashNum > 0 && cashNum < total;

  // Snelkeuze contant: gepast + eerstvolgende biljetten boven het totaal.
  const denoms = [5, 10, 20, 50, 100, 200].filter((d) => d >= total).slice(0, 3);

  async function sendToAgent(path: string) {
    if (!printAgentUrl) return false;
    try {
      const res = await fetch(path, { cache: "no-store" });
      const buf = await res.arrayBuffer();
      await fetch(printAgentUrl, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buf,
      });
      return true;
    } catch {
      return false;
    }
  }

  function printReceipt(orderId: string, openDrawer: boolean) {
    if (printAgentUrl) {
      void sendToAgent(
        `/api/kassa/receipt/${orderId}?format=escpos${openDrawer ? "&drawer=1" : ""}`,
      );
    } else {
      window.open(`/kassa/bon/${orderId}?print=1`, "_blank", "noopener");
    }
  }

  async function poll(orderId: string) {
    try {
      const res = await fetch(`/api/kassa/status?order=${orderId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.paid) {
        setResult({ orderId, reference: data.reference, change: data.change });
        setPhase("done");
        printReceipt(orderId, false);
        return;
      }
      if (data.status === "failed" || data.status === "canceled" || data.status === "expired") {
        setErrorMsg("Betaling op de terminal is niet gelukt.");
        setPhase("error");
        return;
      }
      pollRef.current = setTimeout(() => poll(orderId), 2000);
    } catch {
      pollRef.current = setTimeout(() => poll(orderId), 2500);
    }
  }

  async function confirm() {
    setPhase("processing");
    setErrorMsg("");
    try {
      const res = await fetch("/api/kassa/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines,
          adhocLines,
          mode,
          method,
          storeId,
          cashier,
          ...(method === "cash" ? { cashGiven: cashNum } : {}),
          ...(customer
            ? {
                customer: {
                  email: customer.email,
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  phone: customer.phone,
                  company: customer.company,
                  cocNumber: customer.cocNumber,
                  vatNumber: customer.vatNumber,
                },
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Afrekenen mislukt.");
        setPhase("error");
        return;
      }
      if (data.status === "pending") {
        setResult({ orderId: data.orderId, reference: data.reference });
        setPhase("pending");
        poll(data.orderId);
        return;
      }
      // Direct betaald (contant / handmatig / demo-terminal).
      setResult({ orderId: data.orderId, reference: data.reference, change: data.change });
      setPhase("done");
      printReceipt(data.orderId, method === "cash");
    } catch {
      setErrorMsg("Netwerkfout bij afrekenen.");
      setPhase("error");
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        {/* Kop */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            {phase === "done" ? (
              <Check className="h-5 w-5 text-klusr-stock" />
            ) : (
              <Receipt className="h-5 w-5" />
            )}
            {phase === "done" ? "Betaald" : "Afrekenen"}
          </div>
          {phase !== "processing" && phase !== "pending" && (
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {phase === "choose" && (
            <>
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Te betalen</span>
                <span className="text-3xl font-black tabular-nums">{formatPrice(total)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <MethodTile
                  active={method === "cash"}
                  onClick={() => setMethod("cash")}
                  icon={<Banknote className="h-5 w-5" />}
                  label="Contant"
                />
                <MethodTile
                  active={method === "terminal"}
                  onClick={() => setMethod("terminal")}
                  icon={<CreditCard className="h-5 w-5" />}
                  label={terminalConfigured ? "PIN-terminal" : "PIN (los)"}
                />
                <MethodTile
                  active={method === "manual"}
                  onClick={() => setMethod("manual")}
                  icon={<Receipt className="h-5 w-5" />}
                  label="Handmatig"
                />
              </div>

              {method === "cash" && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setCashGiven(total.toFixed(2))}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary"
                    >
                      Gepast
                    </button>
                    {denoms.map((d) => (
                      <button
                        key={d}
                        onClick={() => setCashGiven(String(d))}
                        className="rounded-lg border border-border px-3 py-2 text-sm font-semibold tabular-nums hover:bg-secondary"
                      >
                        € {d}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                      Ontvangen bedrag
                    </label>
                    <input
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      inputMode="decimal"
                      placeholder="0,00"
                      className="h-12 w-full rounded-xl border border-border bg-secondary px-4 text-lg font-bold tabular-nums outline-none focus:border-primary focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3">
                    <span className="text-sm font-semibold">Wisselgeld</span>
                    <span
                      className={cn(
                        "text-2xl font-black tabular-nums",
                        cashShort ? "text-muted-foreground" : "text-klusr-stock",
                      )}
                    >
                      {formatPrice(change)}
                    </span>
                  </div>
                </div>
              )}

              {method === "terminal" && (
                <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                  {terminalConfigured
                    ? "Het bedrag wordt naar de pinautomaat gestuurd. De klant rondt de betaling daar af."
                    : "Geen Mollie-terminal gekoppeld — bevestig de betaling op je losse pinapparaat en rond hier af."}
                </p>
              )}
              {method === "manual" && (
                <p className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                  Handmatig afronden (bijv. op rekening). De verkoop wordt als betaald geboekt.
                </p>
              )}
            </>
          )}

          {phase === "processing" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verwerken…</span>
            </div>
          )}

          {phase === "pending" && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CreditCard className="h-10 w-10 text-primary" />
              <div className="text-lg font-bold">Volg de betaling op de terminal</div>
              <div className="text-sm text-muted-foreground">
                Wachten op de pinautomaat… {result?.reference}
              </div>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {phase === "done" && result && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-klusr-stock/15 text-klusr-stock">
                <Check className="h-9 w-9" />
              </div>
              <div className="text-xl font-black">Verkoop afgerond</div>
              <div className="text-sm text-muted-foreground">Bon {result.reference}</div>
              {result.change != null && result.change > 0 && (
                <div className="mt-1 w-full rounded-xl bg-secondary px-4 py-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Wisselgeld
                  </div>
                  <div className="text-3xl font-black tabular-nums text-klusr-stock">
                    {formatPrice(result.change)}
                  </div>
                </div>
              )}
              <div className="mt-2 grid w-full grid-cols-2 gap-2">
                <button
                  onClick={() => printReceipt(result.orderId, false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  <Printer className="h-4 w-4" /> Print bon
                </button>
                <button
                  onClick={() => void sendToAgent("/api/kassa/drawer")}
                  disabled={!printAgentUrl}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold hover:bg-secondary disabled:opacity-40"
                >
                  <Banknote className="h-4 w-4" /> Open lade
                </button>
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div className="text-base font-bold">Niet gelukt</div>
              <div className="text-sm text-muted-foreground">{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Voet */}
        <div className="border-t border-border p-4">
          {phase === "choose" && (
            <button
              onClick={confirm}
              disabled={method === "cash" && cashShort}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-black text-white hover:opacity-90 disabled:opacity-40"
            >
              {method === "cash"
                ? "Contant ontvangen"
                : method === "terminal"
                  ? terminalConfigured
                    ? "Naar terminal"
                    : "Bevestig PIN"
                  : "Afronden"}
            </button>
          )}
          {phase === "pending" && (
            <button
              onClick={onClose}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" /> Stoppen met wachten
            </button>
          )}
          {phase === "done" && (
            <button
              onClick={onDone}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-klusr-black text-lg font-black text-white hover:opacity-90"
            >
              <Plus className="h-5 w-5" /> Nieuwe verkoop
            </button>
          )}
          {phase === "error" && (
            <button
              onClick={() => setPhase("choose")}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-secondary"
            >
              Opnieuw proberen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MethodTile({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "border-border text-muted-foreground hover:bg-secondary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CustomerSheet({
  current,
  gateMode,
  onClose,
  onSelect,
  onClear,
  onSkip,
}: {
  current: PosCustomer | null;
  gateMode?: boolean;
  onClose: () => void;
  onSelect: (c: PosCustomer) => void;
  onClear: () => void;
  onSkip?: () => void;
}) {
  const [tab, setTab] = useState<"zoek" | "nieuw">("zoek");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    cocNumber: "",
    vatNumber: "",
  });
  const [business, setBusiness] = useState(false);
  const [createAccount, setCreateAccount] = useState(true);
  const [sendInvite, setSendInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/kassa/customer?q=${encodeURIComponent(s)}`, {
          cache: "no-store",
        });
        const d = await r.json();
        setResults(d.customers ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function saveNew() {
    setError("");
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Vul een geldig e-mailadres in.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/kassa/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          company: business ? form.company.trim() || undefined : undefined,
          cocNumber: business ? form.cocNumber.trim() || undefined : undefined,
          vatNumber: business ? form.vatNumber.trim() || undefined : undefined,
          createAccount,
          sendInvite,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error || "Opslaan mislukt.");
        return;
      }
      onSelect(d.customer as PosCustomer);
    } catch {
      setError("Netwerkfout.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <User className="h-5 w-5" /> {gateMode ? "Klant koppelen vóór afrekenen" : "Klant koppelen"}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {gateMode && (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-klusr-action/10 px-4 py-2.5 text-sm">
            <span className="font-medium">Koppel een klant of ga verder zonder.</span>
            {onSkip && (
              <button
                onClick={onSkip}
                className="shrink-0 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
              >
                Verder zonder klant →
              </button>
            )}
          </div>
        )}

        {current && (
          <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{fullName(current)}</span>
              <MembershipBadge c={current} />
            </div>
            <button
              onClick={onClear}
              className="text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              Loskoppelen
            </button>
          </div>
        )}

        <div className="flex gap-1 border-b border-border px-4 pt-3">
          {(["zoek", "nieuw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-t-lg px-3 py-2 text-sm font-semibold",
                tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {t === "zoek" ? "Zoeken" : "Nieuwe klant"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "zoek" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Zoek op naam, e-mail of telefoon…"
                  className="h-11 w-full rounded-xl border border-border bg-secondary pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              {q.trim().length < 2 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Typ minimaal 2 tekens om te zoeken.
                </p>
              ) : results.length === 0 && !loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Geen klant gevonden. Maak een nieuwe klant aan.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {results.map((c) => (
                    <li key={c.email}>
                      <button
                        onClick={() => onSelect(c)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border p-2.5 text-left hover:border-primary hover:bg-primary/5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                            {fullName(c)} <MembershipBadge c={c} />
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                        </div>
                        {c.orderCount > 0 && (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {c.orderCount}×
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Voornaam" value={form.firstName} onChange={(v) => set("firstName", v)} />
                <Field label="Achternaam" value={form.lastName} onChange={(v) => set("lastName", v)} />
              </div>
              <Field
                label="E-mailadres"
                value={form.email}
                onChange={(v) => set("email", v)}
                type="email"
                placeholder="klant@voorbeeld.nl"
              />
              <Field label="Telefoon" value={form.phone} onChange={(v) => set("phone", v)} />

              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={business}
                  onChange={(e) => setBusiness(e.target.checked)}
                  className="h-4 w-4 accent-klusr-black"
                />
                <Building2 className="h-4 w-4" /> Zakelijk (ProfPas)
              </label>
              {business && (
                <div className="space-y-2 rounded-lg border border-border p-2.5">
                  <Field label="Bedrijfsnaam" value={form.company} onChange={(v) => set("company", v)} />
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="KVK" value={form.cocNumber} onChange={(v) => set("cocNumber", v)} />
                    <Field label="BTW-nummer" value={form.vatNumber} onChange={(v) => set("vatNumber", v)} />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="h-4 w-4 accent-klusr-black"
                />
                <Star className="h-4 w-4" /> KLUSRPAS-account aanmaken
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="h-4 w-4 accent-klusr-black"
                />
                Inlog-link e-mailen
              </label>

              {error && <p className="text-sm font-medium text-primary">{error}</p>}
            </div>
          )}
        </div>

        {tab === "nieuw" && (
          <div className="border-t border-border p-4">
            <button
              onClick={saveNew}
              disabled={saving}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-black text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-5 w-5" /> Klant opslaan &amp; koppelen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MembershipBadge({ c }: { c: { account?: boolean; business?: boolean } }) {
  if (c.business)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-klusr-black px-1.5 py-0.5 text-[10px] font-bold text-white">
        <Building2 className="h-2.5 w-2.5" /> ProfPas
      </span>
    );
  if (c.account)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
        <Star className="h-2.5 w-2.5" /> KLUSRPAS
      </span>
    );
  return null;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm outline-none focus:border-primary focus:bg-white"
      />
    </label>
  );
}
