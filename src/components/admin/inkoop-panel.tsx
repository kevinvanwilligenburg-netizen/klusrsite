"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Truck,
  PackagePlus,
  ClipboardList,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Loader2,
  Search,
  AlertTriangle,
  TrendingDown,
  PackageX,
  ShoppingCart,
  X,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface ForecastRow {
  productId: string;
  variantId: string;
  title: string;
  brand: string;
  variantLabel: string;
  image?: string;
  feedStock: number;
  sold: number;
  adjust: number;
  live: number;
  soldWindow: number;
  velocityPerDay: number;
  daysCover: number | null;
  onOrder: number;
  advies: number;
}
interface Summary {
  reorder: number;
  outOfStock: number;
  lowStock: number;
  openPurchaseOrders: number;
}
interface POLine {
  productId: string;
  variantId: string;
  title: string;
  variantLabel?: string;
  qty: number;
  costPrice?: number;
  receivedQty?: number;
}
interface PurchaseOrder {
  id: string;
  reference: string;
  supplier: string;
  status: "concept" | "besteld" | "ontvangen" | "geannuleerd";
  lines: POLine[];
  note?: string;
  createdAt: string;
  expectedAt?: string;
}

const DAYS = [14, 30, 90];
const COVER = [14, 30, 60];

const STATUS: Record<PurchaseOrder["status"], { label: string; variant: "default" | "action" | "stock" }> = {
  concept: { label: "Concept", variant: "default" },
  besteld: { label: "Besteld", variant: "action" },
  ontvangen: { label: "Ontvangen", variant: "stock" },
  geannuleerd: { label: "Geannuleerd", variant: "default" },
};

export function InkoopPanel() {
  const [days, setDays] = useState(30);
  const [cover, setCover] = useState(30);
  const [overview, setOverview] = useState<{ rows: ForecastRow[]; summary: Summary } | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Concept-inkooporder (selectie uit het advies).
  const [draft, setDraft] = useState<Record<string, { row: ForecastRow; qty: number }>>({});
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [ov, p] = await Promise.all([
        fetch(`/api/admin/inkoop?days=${days}&cover=${cover}`, { cache: "no-store" }).then((r) =>
          r.json(),
        ),
        fetch("/api/admin/purchase-orders", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setOverview({ rows: ov.rows ?? [], summary: ov.summary ?? null });
      setPos(p.purchaseOrders ?? []);
    } catch {
      setOverview({ rows: [], summary: { reorder: 0, outOfStock: 0, lowStock: 0, openPurchaseOrders: 0 } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, cover]);

  const draftLines = Object.values(draft);

  function toggle(row: ForecastRow) {
    setDraft((d) => {
      const next = { ...d };
      if (next[row.variantId]) delete next[row.variantId];
      else next[row.variantId] = { row, qty: Math.max(1, row.advies || 1) };
      return next;
    });
  }
  function setQty(variantId: string, qty: number) {
    setDraft((d) => ({ ...d, [variantId]: { ...d[variantId], qty: Math.max(1, qty) } }));
  }

  async function createPO(ordered: boolean) {
    if (!draftLines.length) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier: supplier.trim() || "Onbekende leverancier",
          note: note.trim() || undefined,
          ordered,
          lines: draftLines.map((l) => ({
            productId: l.row.productId,
            variantId: l.row.variantId,
            qty: l.qty,
          })),
        }),
      });
      if (res.ok) {
        setDraft({});
        setSupplier("");
        setNote("");
        await load();
      }
    } finally {
      setCreating(false);
    }
  }

  async function poAction(id: string, body: object) {
    await fetch(`/api/admin/purchase-orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-primary" /> Inkoop &amp; voorraad
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Bijbestel-advies op basis van de verkoopsnelheid (web + kassa), inkooporders en
                voorraadboekingen. Ontvangst boekt direct bij op de gedeelde voorraad.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Ververs
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Periode */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Period label="Verkoop over" value={days} options={DAYS} onChange={setDays} suffix="d" />
            <Period label="Dekking tot" value={cover} options={COVER} onChange={setCover} suffix="d" />
          </div>

          {/* Samenvatting */}
          {overview?.summary && (
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat icon={ShoppingCart} label="Te bestellen" value={overview.summary.reorder} tone="primary" />
              <Stat icon={PackageX} label="Uitverkocht (loopt)" value={overview.summary.outOfStock} tone="primary" />
              <Stat icon={TrendingDown} label="Bijna op" value={overview.summary.lowStock} tone="amber" />
              <Stat icon={ClipboardList} label="Open inkooporders" value={overview.summary.openPurchaseOrders} tone="neutral" />
            </div>
          )}

          {/* Adviestabel */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="py-2 pr-2 font-semibold"></th>
                  <th className="py-2 pr-3 font-semibold">Product</th>
                  <th className="py-2 pr-3 text-right font-semibold">Live</th>
                  <th className="py-2 pr-3 text-right font-semibold">/dag</th>
                  <th className="py-2 pr-3 text-right font-semibold">Dagen</th>
                  <th className="py-2 pr-3 text-right font-semibold">Besteld</th>
                  <th className="py-2 pr-3 text-right font-semibold">Advies</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.rows ?? []).map((r) => {
                  const sel = Boolean(draft[r.variantId]);
                  return (
                    <tr key={r.variantId} className={cn("border-b border-border align-middle", sel && "bg-primary/5")}>
                      <td className="py-2 pr-2">
                        <input
                          type="checkbox"
                          checked={sel}
                          onChange={() => toggle(r)}
                          className="h-4 w-4 accent-klusr-black"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">
                          {r.brand} {r.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.variantLabel}</div>
                      </td>
                      <td className={cn("py-2 pr-3 text-right font-bold tabular-nums", r.live <= 0 && "text-primary")}>
                        {r.live}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {r.velocityPerDay.toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {r.daysCover == null ? "—" : (
                          <span className={cn(r.daysCover < 7 && "font-semibold text-primary")}>
                            {r.daysCover}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums text-muted-foreground">
                        {r.onOrder || "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {r.advies > 0 ? (
                          <span className="rounded-md bg-klusr-black px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                            {r.advies}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Laden…
                    </td>
                  </tr>
                )}
                {!loading && (overview?.rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      Geen bijbestel-advies — voorraad is op peil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Concept inkooporder uit selectie */}
      {draftLines.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackagePlus className="h-4 w-4 text-primary" /> Nieuwe inkooporder ({draftLines.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Leverancier" />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notitie (optioneel)" />
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {draftLines.map((l) => (
                <li key={l.row.variantId} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {l.row.brand} {l.row.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{l.row.variantLabel}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(l.row.variantId, l.qty - 1)}
                      className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-secondary"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => setQty(l.row.variantId, Math.floor(Number(e.target.value) || 1))}
                      className="h-7 w-14 rounded border border-border bg-secondary text-center text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => setQty(l.row.variantId, l.qty + 1)}
                      className="grid h-7 w-7 place-items-center rounded border border-border hover:bg-secondary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggle(l.row)}
                      className="ml-1 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-primary"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => createPO(true)} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Bestellen
              </Button>
              <Button variant="outline" onClick={() => createPO(false)} disabled={creating}>
                Opslaan als concept
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bestaande inkooporders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" /> Inkooporders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nog geen inkooporders. Selecteer producten in het advies hierboven.
            </p>
          ) : (
            <ul className="space-y-2">
              {pos.map((po) => {
                const units = po.lines.reduce((s, l) => s + l.qty, 0);
                const value = po.lines.reduce((s, l) => s + (l.costPrice ?? 0) * l.qty, 0);
                return (
                  <li key={po.id} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS[po.status].variant}>{STATUS[po.status].label}</Badge>
                        <span className="font-semibold">{po.reference}</span>
                        <span className="text-sm text-muted-foreground">· {po.supplier}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {po.status === "concept" && (
                          <Button size="sm" variant="outline" onClick={() => poAction(po.id, { action: "status", status: "besteld" })}>
                            Markeer besteld
                          </Button>
                        )}
                        {(po.status === "besteld" || po.status === "concept") && (
                          <Button size="sm" onClick={() => poAction(po.id, { action: "receive" })}>
                            <PackagePlus className="h-4 w-4" /> Ontvangen
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground">
                      {po.lines.length} regel{po.lines.length === 1 ? "" : "s"} · {units} stuks
                      {value > 0 && ` · ${formatPrice(value)}`}
                      {po.note && ` · ${po.note}`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Handmatige voorraadboeking (WMS) */}
      <ManualStockAdjust onDone={load} />
    </div>
  );
}

function Period({
  label,
  value,
  options,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <div className="flex gap-1 rounded-lg bg-secondary p-0.5">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold",
              value === o ? "bg-klusr-black text-white" : "text-muted-foreground hover:bg-white",
            )}
          >
            {o}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Truck;
  label: string;
  value: number;
  tone: "primary" | "amber" | "neutral";
}) {
  const cls =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "amber"
        ? "bg-klusr-action/20 text-klusr-black"
        : "bg-secondary text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={cn("grid h-6 w-6 place-items-center rounded-md", cls)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-black tabular-nums">{value}</div>
    </div>
  );
}

interface SearchVariant {
  id: string;
  label: string;
  feedStock: number;
  live: number;
}
interface SearchHit {
  productId: string;
  title: string;
  brand: string;
  variants: SearchVariant[];
}

/** Handmatige voorraadcorrectie/ontvangst zonder inkooporder. */
function ManualStockAdjust({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/kassa/search?q=${encodeURIComponent(s)}`, { cache: "no-store" });
        const d = await r.json();
        setResults(d.results ?? []);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const variants = useMemo(
    () =>
      results.flatMap((p) =>
        p.variants.map((v) => ({ product: p, variant: v, key: v.id })),
      ),
    [results],
  );

  async function book(productId: string, variantId: string, sign: 1 | -1) {
    const qty = Math.max(1, Math.floor(qtys[variantId] || 1));
    setBusy(variantId);
    try {
      await fetch("/api/admin/inkoop/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          variantId,
          delta: sign * qty,
          reference: sign > 0 ? "Handmatige ontvangst" : "Handmatige correctie",
        }),
      });
      onDone();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus className="h-4 w-4 text-primary" /> Voorraad bijboeken
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Handmatige ontvangst of correctie (telling, breuk). Boekt direct op de gedeelde voorraad.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek product of scan barcode…"
            className="pl-9"
          />
        </div>
        {variants.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {variants.slice(0, 12).map(({ product, variant }) => (
              <li key={variant.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {product.brand} {product.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {variant.label} · live {variant.live}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  value={qtys[variant.id] ?? 1}
                  onChange={(e) => setQtys((m) => ({ ...m, [variant.id]: Math.floor(Number(e.target.value) || 1) }))}
                  className="h-8 w-16 rounded border border-border bg-secondary text-center text-sm outline-none focus:border-primary"
                />
                <Button size="sm" disabled={busy === variant.id} onClick={() => book(product.productId, variant.id, 1)}>
                  {busy === variant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Bijboeken
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === variant.id}
                  onClick={() => book(product.productId, variant.id, -1)}
                >
                  <Minus className="h-4 w-4" /> Afboeken
                </Button>
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 2 && variants.length === 0 && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" /> Geen producten gevonden.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
