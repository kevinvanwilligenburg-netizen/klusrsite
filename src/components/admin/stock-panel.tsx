"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  RefreshCw,
  AlertTriangle,
  PackageX,
  Search,
  ShieldCheck,
  ClipboardList,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
  categoryTitle: string;
  subCategory?: string;
  subCategoryTitle?: string;
  image?: string;
  totalStock: number;
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

const STATUS_LABEL: Record<StockStatus, string> = {
  uitverkocht: "Uitverkocht",
  "bijna-op": "Bijna op",
  "op-voorraad": "Op voorraad",
};

const STATUS_VARIANT: Record<StockStatus, "default" | "action" | "stock"> = {
  uitverkocht: "default",
  "bijna-op": "action",
  "op-voorraad": "stock",
};

const ALL = "__all__";
const PAGE_SIZE = 50;

type StatusFilter = StockStatus | typeof ALL;

export function StockPanel() {
  const [data, setData] = useState<StockResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [merk, setMerk] = useState<string>(ALL);
  const [categorie, setCategorie] = useState<string>(ALL);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/stock", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as StockResponse;
      setData(json);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const storeName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of data?.stores ?? []) m[s.id] = s.name;
    return m;
  }, [data]);

  // Gefilterde set (over de VOLLEDIGE catalogus); de samenvatting telt hierover.
  const filtered = useMemo(() => {
    const rows = data?.rows ?? [];
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (merk !== ALL && r.brand !== merk) return false;
      if (categorie !== ALL && r.category !== categorie) return false;
      if (status !== ALL && r.status !== status) return false;
      if (q) {
        const hay = `${r.title} ${r.brand}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, merk, categorie, status, query]);

  // Samenvatting over de volledige gefilterde set.
  const summary = useMemo(() => {
    let uitverkocht = 0;
    let bijnaOp = 0;
    for (const r of filtered) {
      if (r.status === "uitverkocht") uitverkocht++;
      else if (r.status === "bijna-op") bijnaOp++;
    }
    return { total: filtered.length, uitverkocht, bijnaOp };
  }, [filtered]);

  // Reset paginering wanneer de filters wijzigen.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [merk, categorie, status, query]);

  const visible = filtered.slice(0, limit);
  const filtersActive = merk !== ALL || categorie !== ALL || status !== ALL || query.trim() !== "";

  const resetFilters = () => {
    setMerk(ALL);
    setCategorie(ALL);
    setStatus(ALL);
    setQuery("");
  };

  return (
    <div className="space-y-6">
      <SafetyStockSetting />
      <TellingCard rows={data?.rows ?? []} onCounted={load} />
      <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Boxes className="h-4 w-4 text-primary" /> Voorraad
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Live voorraad uit het grootboek (feed-basis − verkocht + tellingen) over de volledige
              catalogus. Tel de fysieke voorraad via <strong>Telling</strong> hierboven; web- en
              kassaverkopen tellen automatisch mee.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Ververs
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Samenvatting (over de huidige filter) */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryStat
            icon={PackageX}
            label="Uitverkocht"
            value={summary.uitverkocht}
            tone="red"
          />
          <SummaryStat
            icon={AlertTriangle}
            label="Bijna op"
            value={summary.bijnaOp}
            tone="amber"
            hint={data ? `≤ ${data.threshold} stuks` : undefined}
          />
          <SummaryStat icon={Boxes} label="Producten (filter)" value={summary.total} tone="neutral" />
        </div>

        {/* Filters */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Zoek op titel of merk…"
              className="pl-9 text-sm"
              aria-label="Zoeken"
            />
          </div>

          <Select value={merk} onValueChange={setMerk}>
            <SelectTrigger aria-label="Merk">
              <SelectValue placeholder="Alle merken" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle merken</SelectItem>
              {(data?.brands ?? []).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categorie} onValueChange={setCategorie}>
            <SelectTrigger aria-label="Productsoort">
              <SelectValue placeholder="Alle productsoorten" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle productsoorten</SelectItem>
              {(data?.categories ?? []).map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle statussen</SelectItem>
              <SelectItem value="uitverkocht">Uitverkocht</SelectItem>
              <SelectItem value="bijna-op">Bijna op</SelectItem>
              <SelectItem value="op-voorraad">Op voorraad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtersActive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {summary.total} resultaat{summary.total === 1 ? "" : "en"}
            </span>
            <button onClick={resetFilters} className="font-semibold text-primary hover:underline">
              Filters wissen
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Kon de voorraad niet laden. Probeer te
            verversen.
          </div>
        )}

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Product</th>
                <th className="py-2 pr-3 font-semibold">Merk</th>
                <th className="py-2 pr-3 font-semibold">Productsoort</th>
                <th className="py-2 pr-3 text-right font-semibold">Voorraad (live)</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Per winkel</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border align-top">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.image || "/icon.svg"}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded border border-border bg-white object-contain"
                      />
                      <span className="line-clamp-2 max-w-[260px] font-medium">{r.title}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{r.brand}</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {r.categoryTitle}
                    {r.subCategoryTitle && (
                      <span className="block text-xs">{r.subCategoryTitle}</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">
                    <span className="font-semibold">{r.totalStock}</span>
                    {r.feedStock !== r.totalStock && (
                      <span className="block text-[10px] font-normal text-muted-foreground">
                        feed {r.feedStock}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="text-xs text-muted-foreground">
                      {r.perStore
                        .map((s) => `${storeName[s.storeId] ?? s.storeId} ${s.qty}`)
                        .join(" · ")}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    <Boxes className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    {data ? "Geen producten voor deze filters." : "Geen voorraaddata."}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Voorraad laden…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginering: "laad meer" */}
        {visible.length < filtered.length && (
          <div className="flex flex-col items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Laad meer
            </Button>
            <span className="text-xs text-muted-foreground">
              {visible.length} van {filtered.length} getoond
            </span>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

/**
 * Instelbare veiligheidsvoorraad: onder dit aantal (voorraad hoofdvestiging
 * Nijverdal) verkopen we een product niet meer online. Leest/schrijft via
 * /api/admin/stock-settings.
 */
function SafetyStockSetting() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/stock-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && typeof d.safetyStock === "number") {
          setSaved(d.safetyStock);
          setValue(String(d.safetyStock));
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setBusy(true);
    try {
      const res = await fetch("/api/admin/stock-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safetyStock: n }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d && typeof d.safetyStock === "number") {
        setSaved(d.safetyStock);
        setValue(String(d.safetyStock));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" /> Veiligheidsvoorraad
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Onder dit aantal (voorraad hoofdvestiging Nijverdal) verkopen we een product niet meer
          online — het wordt dan als uitverkocht getoond.
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div>
            <label
              htmlFor="safety-stock"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Drempel (stuks)
            </label>
            <Input
              id="safety-stock"
              type="number"
              min={0}
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-28"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={busy || loading}>
            {busy ? "Opslaan…" : "Opslaan"}
          </Button>
          {saved !== null && !busy && (
            <span className="text-sm text-muted-foreground">
              Actief: <strong className="text-foreground">{saved}</strong> stuks
            </span>
          )}
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Geldt direct op de productpagina&apos;s. De Google-feed gebruikt de waarde bij de
          eerstvolgende build (env <code>SAFETY_STOCK</code>).
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Telling (stocktake): zoek een product, tel de fysieke voorraad per variant en
 * leg het verschil met het grootboek vast. Zo wordt de getelde stand de waarheid,
 * losgekoppeld van de uit de feed gesynthetiseerde openingsstand.
 */
function TellingCard({ rows, onCounted }: { rows: StockRow[]; onCounted: () => void }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<StockRow | null>(null);
  const [variants, setVariants] = useState<
    { id: string; label: string; feedQty: number; live: number }[] | null
  >(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return rows.filter((r) => `${r.title} ${r.brand}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, rows]);

  async function pick(r: StockRow) {
    setPicked(r);
    setVariants(null);
    setCounts({});
    setMsg("");
    setQ("");
    try {
      const res = await fetch(`/api/admin/stock?variantsFor=${encodeURIComponent(r.id)}`, {
        cache: "no-store",
      });
      const d = await res.json();
      setVariants(d.variants ?? []);
    } catch {
      setMsg("Kon varianten niet laden.");
    }
  }

  async function record(variantId: string) {
    const raw = counts[variantId];
    if (raw == null || raw.trim() === "") return;
    const counted = Math.max(0, Math.round(Number(raw.replace(",", "."))));
    if (!Number.isFinite(counted)) return;
    setBusy(variantId);
    setMsg("");
    try {
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "count", variantId, counted }),
      });
      const d = await res.json();
      if (res.ok) {
        setVariants((vs) => vs?.map((v) => (v.id === variantId ? { ...v, live: d.live } : v)) ?? vs);
        setCounts((c) => {
          const n = { ...c };
          delete n[variantId];
          return n;
        });
        setMsg(
          d.delta === 0
            ? "Telling klopte met het grootboek — niets gewijzigd."
            : `Telling vastgelegd (${d.delta > 0 ? "+" : ""}${d.delta}).`,
        );
        onCounted();
      } else {
        setMsg(d.error || "Vastleggen mislukt.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-primary" /> Telling
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Tel de fysieke voorraad per variant; we leggen het verschil met het grootboek vast (de
          getelde stand wordt de waarheid, los van de feed). Web- en kassaverkopen tellen er daarna
          gewoon overheen.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek product om te tellen…"
            className="pl-9"
          />
          {matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-white shadow-lg">
              {matches.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image || "/icon.svg"}
                    alt=""
                    className="h-7 w-7 shrink-0 rounded border border-border bg-white object-contain"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {r.brand} {r.title}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.totalStock}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {picked && (
          <div className="rounded-lg border border-border p-3">
            <div className="mb-2 text-sm font-semibold">
              {picked.brand} {picked.title}
            </div>
            {!variants ? (
              <p className="text-sm text-muted-foreground">Varianten laden…</p>
            ) : variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Geen varianten.</p>
            ) : (
              <div className="space-y-1.5">
                {variants.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                      {v.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      grootboek: <strong className="text-foreground tabular-nums">{v.live}</strong>
                    </span>
                    <Input
                      value={counts[v.id] ?? ""}
                      onChange={(e) => setCounts((c) => ({ ...c, [v.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && record(v.id)}
                      placeholder="geteld"
                      inputMode="numeric"
                      className="h-8 w-24 text-right tabular-nums"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => record(v.id)}
                      disabled={busy === v.id || (counts[v.id] ?? "").trim() === ""}
                    >
                      {busy === v.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Vastleggen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {msg && <p className="text-sm font-medium text-foreground">{msg}</p>}
      </CardContent>
    </Card>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: typeof Boxes;
  label: string;
  value: number;
  tone: "red" | "amber" | "neutral";
  hint?: string;
}) {
  const toneClasses =
    tone === "red"
      ? "bg-primary/10 text-primary"
      : tone === "amber"
        ? "bg-klusr-action/20 text-klusr-black"
        : "bg-secondary text-muted-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span className={cn("grid h-6 w-6 place-items-center rounded-md", toneClasses)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-black tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
