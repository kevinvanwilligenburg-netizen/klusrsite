"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  CreditCard,
  Printer,
  ArrowUpRight,
  Store,
  Globe,
  CheckCircle2,
  AlertCircle,
  History,
  Grid3x3,
  Plus,
  Trash2,
  Search,
  Loader2,
  Tag,
  Banknote,
  Percent,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAID: OrderStatus[] = ["paid", "authorized", "shipped", "delivered"];
const isPaid = (o: Order) => PAID.includes(o.paymentStatus);
const isPos = (o: Order) => o.channel === "pos";

interface StockMovement {
  orderId: string;
  reference: string;
  variantId: string;
  productId: string;
  title: string;
  qty: number;
  channel: "web" | "pos";
  ts: number;
}

interface QuickKeyRec {
  id: string;
  label: string;
  kind: "catalog" | "surcharge" | "discount";
  color?: string;
  productId?: string;
  variantId?: string;
  amount?: number;
}

interface KassaConfig {
  movements: StockMovement[];
  quickKeys: QuickKeyRec[];
  terminalConfigured: boolean;
  printAgentConfigured: boolean;
}

function sameDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getDate() === ref.getDate() &&
    d.getMonth() === ref.getMonth() &&
    d.getFullYear() === ref.getFullYear()
  );
}

export function KassaPanel({ orders }: { orders: Order[] }) {
  const [cfg, setCfg] = useState<KassaConfig | null>(null);

  const loadCfg = useCallback(() => {
    return fetch("/api/admin/kassa", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCfg(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadCfg();
  }, [loadCfg]);

  const stats = useMemo(() => {
    const now = new Date();
    const paid = orders.filter(isPaid);
    const posPaid = paid.filter(isPos);
    const posToday = posPaid.filter((o) => sameDay(o.createdAt, now));
    const webToday = paid.filter((o) => !isPos(o) && sameDay(o.createdAt, now));
    const sum = (arr: Order[]) => arr.reduce((s, o) => s + o.total, 0);
    return {
      posTodayCount: posToday.length,
      posTodayRevenue: sum(posToday),
      webTodayRevenue: sum(webToday),
      posTotalCount: posPaid.length,
      posTotalRevenue: sum(posPaid),
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Launch */}
      <Card className="overflow-hidden border-klusr-black/10 bg-gradient-to-br from-klusr-black to-neutral-800 text-white">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <ShoppingCart className="h-7 w-7" />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-tight">KLUSR Kassa</h2>
              <p className="max-w-md text-sm text-white/70">
                Omnichannel kassa: verkoop aan de toonbank, betaal met PIN (Mollie-terminal) of
                contant, print de bon en open de kassalade. Elke verkoop boekt direct af op dezelfde
                voorraad als de webshop.
              </p>
            </div>
          </div>
          <a
            href="/kassa"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-klusr-black hover:opacity-90"
          >
            Open kassa <ArrowUpRight className="h-4 w-4" />
          </a>
        </CardContent>
      </Card>

      {/* Omnichannel-omzet vandaag */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Store}
          label="Kassa vandaag"
          value={formatPrice(stats.posTodayRevenue)}
          hint={`${stats.posTodayCount} ${stats.posTodayCount === 1 ? "transactie" : "transacties"}`}
          tone="black"
        />
        <StatCard
          icon={Globe}
          label="Online vandaag"
          value={formatPrice(stats.webTodayRevenue)}
          hint="Webshop"
          tone="neutral"
        />
        <StatCard
          icon={ShoppingCart}
          label="Kassa totaal"
          value={formatPrice(stats.posTotalRevenue)}
          hint={`${stats.posTotalCount} verkopen`}
          tone="neutral"
        />
      </div>

      {/* Koppelingen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4 text-primary" /> Kassakoppelingen
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <ConfigRow
            icon={CreditCard}
            label="Mollie-betaalterminal (PIN)"
            ok={cfg?.terminalConfigured}
            okText="Gekoppeld"
            offText="Zet MOLLIE_TERMINAL_ID — anders is alleen contant/handmatig actief"
          />
          <ConfigRow
            icon={Printer}
            label="Bonprinter / kassalade-agent"
            ok={cfg?.printAgentConfigured}
            okText="Gekoppeld"
            offText="Zet NEXT_PUBLIC_POS_PRINT_AGENT_URL — anders print je de bon via de browser"
          />
        </CardContent>
      </Card>

      {/* Snelknoppen */}
      <SnelknoppenCard keys={cfg?.quickKeys ?? []} onChange={loadCfg} />

      {/* Recente voorraadmutaties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" /> Recente voorraadmutaties
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Elke betaalde verkoop (kassa én webshop) boekt af op het gedeelde voorraad-grootboek.
          </p>
        </CardHeader>
        <CardContent>
          {!cfg ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Laden…</p>
          ) : cfg.movements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nog geen mutaties. Reken een verkoop af om hier de afboeking te zien.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {cfg.movements.map((m, i) => (
                <li key={`${m.orderId}-${m.variantId}-${i}`} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      m.channel === "pos"
                        ? "bg-klusr-black text-white"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {m.channel === "pos" ? <Store className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                    {m.channel === "pos" ? "Kassa" : "Online"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-primary">
                    −{m.qty}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {m.reference}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SearchVariant {
  id: string;
  label: string;
  price: number;
}
interface SearchProduct {
  productId: string;
  title: string;
  brand: string;
  image?: string;
  variants: SearchVariant[];
}

const KIND_META = {
  catalog: { label: "Product", icon: Tag },
  surcharge: { label: "Toeslag (+€)", icon: Banknote },
  discount: { label: "Korting (−€)", icon: Percent },
} as const;

/**
 * Beheer van de kassa-snelknoppen: maak knoppen voor een product zónder barcode
 * (uit de catalogus) of een actie/toeslag (los bedrag). Ze verschijnen direct in
 * de kassa.
 */
function SnelknoppenCard({ keys, onChange }: { keys: QuickKeyRec[]; onChange: () => void }) {
  const [kind, setKind] = useState<"catalog" | "surcharge" | "discount">("surcharge");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ productId: string; variantId: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (kind !== "catalog") return;
    const s = q.trim();
    if (s.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/kassa/search?q=${encodeURIComponent(s)}`, { cache: "no-store" });
        const d = await r.json();
        setHits(d.results ?? []);
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, kind]);

  function resetForm() {
    setLabel("");
    setAmount("");
    setQ("");
    setHits([]);
    setPicked(null);
    setError("");
  }

  async function save() {
    setError("");
    const body: Record<string, unknown> = { action: "saveKey", kind };
    if (kind === "catalog") {
      if (!picked) {
        setError("Kies een product + variant.");
        return;
      }
      body.productId = picked.productId;
      body.variantId = picked.variantId;
      if (label.trim()) body.label = label.trim();
    } else {
      const amt = Number(amount.replace(",", "."));
      if (!label.trim()) {
        setError("Vul een label in.");
        return;
      }
      if (!(amt > 0)) {
        setError("Vul een bedrag (> 0) in.");
        return;
      }
      body.label = label.trim();
      body.amount = amt;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/kassa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Opslaan mislukt.");
        return;
      }
      resetForm();
      onChange();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/admin/kassa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteKey", id }),
    });
    onChange();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3x3 className="h-4 w-4 text-primary" /> Snelknoppen
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Maak knoppen voor de kassa: een product zónder barcode, of een actie/toeslag als losse
          regel. Ze verschijnen meteen in de kassa.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {keys.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keys.map((k) => (
              <span
                key={k.id}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-sm"
              >
                <span className="font-semibold">{k.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {k.kind === "catalog"
                    ? "product"
                    : k.kind === "discount"
                      ? `−${formatPrice(k.amount ?? 0)}`
                      : `+${formatPrice(k.amount ?? 0)}`}
                </span>
                <button
                  onClick={() => remove(k.id)}
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Verwijderen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {(["catalog", "surcharge", "discount"] as const).map((kk) => {
              const M = KIND_META[kk];
              const Icon = M.icon;
              return (
                <button
                  key={kk}
                  onClick={() => {
                    setKind(kk);
                    setError("");
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold",
                    kind === kk
                      ? "border-klusr-black bg-klusr-black text-white"
                      : "border-border text-muted-foreground hover:bg-secondary",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {M.label}
                </button>
              );
            })}
          </div>

          {kind === "catalog" ? (
            <div className="space-y-2">
              {picked ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm">
                  <span className="truncate font-medium">{picked.label}</span>
                  <button
                    onClick={() => setPicked(null)}
                    className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-primary"
                  >
                    Wijzig
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Zoek product (naam, merk, EAN)…"
                    className="pl-9"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                  {hits.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                      {hits.map((p) =>
                        p.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setPicked({
                                productId: p.productId,
                                variantId: v.id,
                                label: `${p.brand} ${p.title} · ${v.label}`,
                              });
                              setHits([]);
                              setQ("");
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {p.brand} {p.title}{" "}
                              <span className="text-muted-foreground">· {v.label}</span>
                            </span>
                            <span className="shrink-0 tabular-nums">{formatPrice(v.price)}</span>
                          </button>
                        )),
                      )}
                    </div>
                  )}
                </div>
              )}
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Knoplabel (optioneel — anders de productnaam)"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={kind === "discount" ? "bv. Kortingsactie" : "bv. Verpakkingstoeslag"}
              />
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="€ bedrag"
                inputMode="decimal"
                className="text-right tabular-nums"
              />
            </div>
          )}

          {error && <p className="text-sm font-medium text-primary">{error}</p>}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Knop toevoegen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  hint?: string;
  tone: "black" | "neutral";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-card",
        tone === "black" ? "border-klusr-black bg-klusr-black text-white" : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
          tone === "black" ? "text-white/70" : "text-muted-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
      {hint && (
        <div className={cn("mt-0.5 text-xs", tone === "black" ? "text-white/60" : "text-muted-foreground")}>
          {hint}
        </div>
      )}
    </div>
  );
}

function ConfigRow({
  icon: Icon,
  label,
  ok,
  okText,
  offText,
}: {
  icon: typeof CreditCard;
  label: string;
  ok?: boolean;
  okText: string;
  offText: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div
          className={cn(
            "mt-0.5 flex items-center gap-1 text-xs",
            ok ? "text-klusr-stock" : "text-muted-foreground",
          )}
        >
          {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
          {ok ? okText : offText}
        </div>
      </div>
    </div>
  );
}
