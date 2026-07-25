"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Tags,
  PackagePlus,
  Upload,
  RefreshCw,
  Search,
  Save,
  Trash2,
  Rocket,
  Loader2,
  Truck,
  Check,
  AlertTriangle,
  Pencil,
  X,
} from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface VRow {
  id: string;
  label: string;
  price: number;
  kluspasPrice: number;
  override?: { price?: number; kluspasPrice?: number };
}
interface PRow {
  productId: string;
  title: string;
  brand: string;
  category: string;
  image?: string;
  price: number;
  kluspasPrice: number;
  variants: VRow[];
}
interface CustomRow {
  productId: string;
  title: string;
  brand: string;
  category: string;
  image?: string;
  price: number;
  kluspasPrice: number;
  dropship: boolean;
  supplier?: string;
}
interface CatData {
  rows: PRow[];
  custom: CustomRow[];
  categories: { slug: string; title: string }[];
  counts: { catalog: number; custom: number };
}

type Edits = Record<string, { price?: string; kluspasPrice?: string }>;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function CatalogPanel() {
  const [tab, setTab] = useState<"prijzen" | "producten" | "import">("prijzen");
  const [data, setData] = useState<CatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishConfigured, setPublishConfigured] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(params = "") {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/catalog${params}`, { cache: "no-store" });
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    fetch("/api/admin/catalog/publish", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPublishConfigured(Boolean(d.configured)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  async function publish() {
    setPublishing(true);
    try {
      const r = await fetch("/api/admin/catalog/publish", { method: "POST" });
      const d = await r.json();
      setNotice(d.ok ? "Publiceren gestart — live na de deploy." : d.error || "Publiceren mislukt.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-klusr-black/10 bg-gradient-to-br from-klusr-black to-neutral-800 text-white">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
              <Tags className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight">Catalogus &amp; prijzen</h2>
              <p className="max-w-md text-sm text-white/70">
                Pas prijzen aan, maak eigen producten en dropship-artikelen of importeer een lijst.
                Wijzigingen worden <strong>live bij de eerstvolgende deploy</strong>.
              </p>
            </div>
          </div>
          <Button
            onClick={publish}
            disabled={publishing}
            className="shrink-0 bg-white text-klusr-black hover:bg-white/90"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publiceren
          </Button>
        </CardContent>
      </Card>

      {!publishConfigured && (
        <div className="flex items-start gap-2 rounded-lg border border-klusr-action/40 bg-klusr-action/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-klusr-black" />
          <span>
            Geen <code className="rounded bg-white/60 px-1">DEPLOY_HOOK_URL</code> ingesteld. Je
            wijzigingen worden bewaard en gaan live bij de volgende deploy (of stel een Vercel
            deploy-hook in om met één klik te publiceren).
          </span>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {([
          ["prijzen", "Prijzen", Tags],
          ["producten", `Eigen producten${data ? ` (${data.counts.custom})` : ""}`, PackagePlus],
          ["import", "Importeren", Upload],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold",
              tab === id
                ? "border-klusr-black text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "prijzen" && (
        <PrijzenTab data={data} loading={loading} onReload={load} onNotice={setNotice} />
      )}
      {tab === "producten" && (
        <ProductenTab data={data} onReload={() => load()} onNotice={setNotice} />
      )}
      {tab === "import" && <ImportTab data={data} onReload={() => load()} onNotice={setNotice} />}

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-klusr-black px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Prijzen */

function PrijzenTab({
  data,
  loading,
  onReload,
  onNotice,
}: {
  data: CatData | null;
  loading: boolean;
  onReload: (params?: string) => void;
  onNotice: (m: string) => void;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [edits, setEdits] = useState<Edits>({});
  const [saving, setSaving] = useState(false);
  const [bulkMode, setBulkMode] = useState<"pct" | "amount" | "round95" | "kluspasPct">("pct");
  const [bulkVal, setBulkVal] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  function search() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (category) p.set("category", category);
    onReload(`?${p.toString()}`);
    setEdits({});
  }

  const rows = data?.rows ?? [];

  const setEdit = (vid: string, field: "price" | "kluspasPrice", value: string) =>
    setEdits((e) => ({ ...e, [vid]: { ...e[vid], [field]: value } }));

  function applyBulk() {
    const v = Number(bulkVal.replace(",", "."));
    if (bulkMode !== "round95" && !v) return;
    const round95 = (n: number) => Math.max(0.95, Math.floor(n) + 0.95);
    const next: Edits = { ...edits };
    for (const p of rows) {
      for (const vr of p.variants) {
        const cur = next[vr.id];
        const basePrice = cur?.price != null && cur.price !== "" ? Number(cur.price) : vr.price;
        const baseKp = cur?.kluspasPrice != null && cur.kluspasPrice !== "" ? Number(cur.kluspasPrice) : vr.kluspasPrice;
        if (bulkMode === "pct") {
          const f = 1 + v / 100;
          next[vr.id] = { price: String(r2(basePrice * f)), kluspasPrice: String(r2(baseKp * f)) };
        } else if (bulkMode === "amount") {
          next[vr.id] = {
            price: String(r2(Math.max(0, basePrice + v))),
            kluspasPrice: String(r2(Math.max(0, baseKp + v))),
          };
        } else if (bulkMode === "round95") {
          next[vr.id] = { price: String(round95(basePrice)), kluspasPrice: String(round95(baseKp)) };
        } else {
          // KLUSRPAS-korting: pasprijs = prijs − v% (prijs blijft).
          next[vr.id] = { ...cur, kluspasPrice: String(r2(basePrice * (1 - v / 100))) };
        }
      }
    }
    setEdits(next);
    onNotice(`Bulk toegepast op ${rows.length} producten — controleer en sla op.`);
  }

  async function save() {
    const variants: Record<string, { price?: number; kluspasPrice?: number }> = {};
    for (const [vid, e] of Object.entries(edits)) {
      const patch: { price?: number; kluspasPrice?: number } = {};
      if (e.price != null && e.price !== "") patch.price = Number(e.price.replace(",", "."));
      if (e.kluspasPrice != null && e.kluspasPrice !== "")
        patch.kluspasPrice = Number(e.kluspasPrice.replace(",", "."));
      if (Object.keys(patch).length) variants[vid] = patch;
    }
    if (!Object.keys(variants).length) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override", variants }),
      });
      if (r.ok) {
        onNotice(`${Object.keys(variants).length} prijs(zen) opgeslagen. Publiceer om live te zetten.`);
        setEdits({});
        search();
      }
    } finally {
      setSaving(false);
    }
  }

  const dirty = Object.keys(edits).length;

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Zoek product/merk…"
                className="w-56 pl-9"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-lg border border-border bg-secondary px-3 text-sm"
            >
              <option value="">Alle categorieën</option>
              {(data?.categories ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={search} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Zoek
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex items-center gap-1">
              <select
                value={bulkMode}
                onChange={(e) => setBulkMode(e.target.value as typeof bulkMode)}
                className="h-9 rounded-lg border border-border bg-secondary px-2 text-sm"
              >
                <option value="pct">± %</option>
                <option value="amount">± € bedrag</option>
                <option value="round95">Afronden op ,95</option>
                <option value="kluspasPct">KLUSRPAS-korting %</option>
              </select>
              {bulkMode !== "round95" && (
                <Input
                  value={bulkVal}
                  onChange={(e) => setBulkVal(e.target.value)}
                  placeholder={bulkMode === "amount" ? "±€" : "%"}
                  className="w-20 text-center"
                  inputMode="decimal"
                />
              )}
              <Button variant="outline" size="sm" onClick={applyBulk}>
                Toepassen
              </Button>
            </div>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Opslaan{dirty ? ` (${dirty})` : ""}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Prijzen per variant (incl. btw) — in bulk of los. Met het{" "}
          <Pencil className="inline h-3 w-3" />-potlood bewerk je de productgegevens (titel, merk,
          categorie, beeld, EAN, omschrijving). Wijzigingen overschrijven de bron en gaan live bij
          publiceren.
        </p>
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.productId} className="rounded-lg border border-border p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image || "/icon.svg"}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded border border-border bg-white object-contain"
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {p.brand} {p.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{p.category}</div>
                </div>
                <button
                  onClick={() => setEditId(p.productId)}
                  title="Productgegevens bewerken"
                  className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {p.variants.map((v) => {
                  const e = edits[v.id];
                  const overridden = v.override?.price != null || v.override?.kluspasPrice != null;
                  return (
                    <div key={v.id} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
                        {v.label}
                      </span>
                      <label className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Prijs</span>
                        <Input
                          value={e?.price ?? String(v.price)}
                          onChange={(ev) => setEdit(v.id, "price", ev.target.value)}
                          className="h-8 w-24 text-right tabular-nums"
                          inputMode="decimal"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">KLUSRPAS</span>
                        <Input
                          value={e?.kluspasPrice ?? String(v.kluspasPrice)}
                          onChange={(ev) => setEdit(v.id, "kluspasPrice", ev.target.value)}
                          className="h-8 w-24 text-right tabular-nums"
                          inputMode="decimal"
                        />
                      </label>
                      {overridden && (
                        <Badge variant="action" className="text-[10px]">
                          aangepast
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {loading && <p className="py-8 text-center text-sm text-muted-foreground">Laden…</p>}
          {!loading && rows.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Geen producten.</p>
          )}
        </div>
      </CardContent>
    </Card>
    {editId && (
      <ProductEditModal
        productId={editId}
        categories={data?.categories ?? []}
        onClose={() => setEditId(null)}
        onSaved={(m) => {
          onNotice(m);
          setEditId(null);
          search();
        }}
      />
    )}
    </>
  );
}

/* ------------------------------------------------------------- Producten */

const emptyForm = {
  title: "",
  brand: "",
  category: "",
  price: "",
  kluspasPrice: "",
  gtin: "",
  image: "",
  description: "",
  stock: "",
  dropship: false,
  supplier: "",
};

function ProductenTab({
  data,
  onReload,
  onNotice,
}: {
  data: CatData | null;
  onReload: () => void;
  onNotice: (m: string) => void;
}) {
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function create() {
    setError("");
    const price = Number(form.price.replace(",", "."));
    if (!form.title.trim() || !form.category || !(price > 0)) {
      setError("Titel, categorie en prijs (> 0) zijn verplicht.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "custom",
          product: {
            title: form.title.trim(),
            brand: form.brand.trim() || undefined,
            category: form.category,
            price,
            kluspasPrice: form.kluspasPrice ? Number(form.kluspasPrice.replace(",", ".")) : undefined,
            gtin: form.gtin.trim() || undefined,
            image: form.image.trim() || undefined,
            description: form.description.trim() || undefined,
            stock: form.stock ? Math.max(0, Math.round(Number(form.stock))) : undefined,
            dropship: form.dropship,
            supplier: form.dropship ? form.supplier.trim() || undefined : undefined,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Opslaan mislukt.");
        return;
      }
      setForm({ ...emptyForm });
      onNotice("Product opgeslagen. Publiceer om het live te zetten.");
      onReload();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteCustom", id }),
    });
    onNotice("Product verwijderd.");
    onReload();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackagePlus className="h-4 w-4 text-primary" /> Nieuw product
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Titel *" value={form.title} onChange={(v) => set("title", v)} />
            <Field label="Merk" value={form.brand} onChange={(v) => set("brand", v)} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Categorie *
              </span>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm"
              >
                <option value="">Kies…</option>
                {(data?.categories ?? []).map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <Field label="EAN / barcode" value={form.gtin} onChange={(v) => set("gtin", v)} />
            <Field label="Prijs * (incl. btw)" value={form.price} onChange={(v) => set("price", v)} />
            <Field label="KLUSRPAS-prijs" value={form.kluspasPrice} onChange={(v) => set("kluspasPrice", v)} />
            <Field label="Afbeelding-URL" value={form.image} onChange={(v) => set("image", v)} />
            <Field label="Voorraad" value={form.stock} onChange={(v) => set("stock", v)} />
          </div>
          <Field label="Omschrijving" value={form.description} onChange={(v) => set("description", v)} />

          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.dropship}
              onChange={(e) => set("dropship", e.target.checked)}
              className="h-4 w-4 accent-klusr-black"
            />
            <Truck className="h-4 w-4" /> Dropshipping (altijd leverbaar, door leverancier verzonden)
          </label>
          {form.dropship && (
            <Field label="Leverancier" value={form.supplier} onChange={(v) => set("supplier", v)} />
          )}

          {error && <p className="text-sm font-medium text-primary">{error}</p>}
          <Button onClick={create} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Product opslaan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eigen producten ({data?.custom.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.custom ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nog geen eigen producten. Maak er hierboven één aan of importeer een lijst.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data!.custom.map((c) => (
                <li key={c.productId} className="flex items-center gap-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.image || "/icon.svg"}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-border bg-white object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                      {c.brand} {c.title}
                      {c.dropship && (
                        <Badge variant="action" className="text-[10px]">
                          <Truck className="mr-0.5 h-2.5 w-2.5" /> dropship
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(c.price)} · {c.category}
                      {c.supplier && ` · ${c.supplier}`}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(c.productId)}
                    className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-primary"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------------- Import */

function ImportTab({
  onReload,
  onNotice,
}: {
  data: CatData | null;
  onReload: () => void;
  onNotice: (m: string) => void;
}) {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number; errors: { row: number; error: string }[] } | null>(null);

  const example = useMemo(
    () =>
      "titel;merk;categorie;prijs;kluspasprijs;ean;afbeelding;voorraad;dropship\n" +
      "Voorbeeldborstel;KLUSR;gereedschap;9,95;9,45;;;25;\n" +
      "Dropship-ladder;MerkX;gereedschap;89,00;;;https://...jpg;;ja",
    [],
  );

  async function importCsv() {
    if (csv.trim().length < 5) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", csv }),
      });
      const d = await r.json();
      if (r.ok) {
        setResult({ imported: d.imported, total: d.total, errors: d.errors ?? [] });
        onNotice(`${d.imported} product(en) geïmporteerd. Publiceer om live te zetten.`);
        onReload();
      } else {
        onNotice(d.error || "Import mislukt.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(setCsv);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4 text-primary" /> Producten importeren (CSV)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Kolommen (NL of EN): <code>titel, merk, categorie, prijs, kluspasprijs, ean, afbeelding,
          voorraad, dropship</code>. Scheidingsteken <code>,</code> of <code>;</code>. Eerste regel =
          koppen.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="text-sm" />
          <Button variant="ghost" size="sm" onClick={() => setCsv(example)}>
            Voorbeeld invullen
          </Button>
        </div>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="Plak hier je CSV…"
          rows={10}
          className="w-full rounded-lg border border-border bg-secondary p-3 font-mono text-xs outline-none focus:border-primary focus:bg-white"
        />
        <Button onClick={importCsv} disabled={busy || csv.trim().length < 5}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importeren
        </Button>

        {result && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <div className="font-semibold text-klusr-stock">
              {result.imported} van {result.total} geïmporteerd.
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>
                    Regel {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------- Productgegevens (master) */

interface Detail {
  productId: string;
  title: string;
  brand: string;
  category: string;
  subCategory: string;
  gtin: string;
  images: string[];
  highlights: string[];
  description: string;
  override: Record<string, unknown> | null;
}

type EditForm = {
  title: string;
  brand: string;
  category: string;
  subCategory: string;
  gtin: string;
  images: string;
  highlights: string;
  description: string;
};

function ProductEditModal({
  productId,
  categories,
  onClose,
  onSaved,
}: {
  productId: string;
  categories: { slug: string; title: string }[];
  onClose: () => void;
  onSaved: (m: string) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/catalog?productId=${encodeURIComponent(productId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.detail) return;
        const dt = d.detail as Detail;
        setDetail(dt);
        setForm({
          title: dt.title ?? "",
          brand: dt.brand ?? "",
          category: dt.category ?? "",
          subCategory: dt.subCategory ?? "",
          gtin: dt.gtin ?? "",
          images: (dt.images ?? []).join("\n"),
          highlights: (dt.highlights ?? []).join("\n"),
          description: dt.description ?? "",
        });
      })
      .catch(() => alive && setErr("Laden mislukt."));
    return () => {
      alive = false;
    };
  }, [productId]);

  const set = (k: keyof EditForm, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

  async function save() {
    if (!form || !detail) return;
    // Alleen gewijzigde velden meesturen, zodat de override minimaal blijft.
    const patch: Record<string, unknown> = {};
    if (form.title.trim() && form.title.trim() !== detail.title) patch.title = form.title.trim();
    if (form.brand.trim() !== detail.brand) patch.brand = form.brand.trim();
    if (form.category && form.category !== detail.category) patch.category = form.category;
    if (form.subCategory.trim() !== detail.subCategory) patch.subCategory = form.subCategory.trim();
    if (form.gtin.trim() !== detail.gtin) patch.gtin = form.gtin.trim();
    if (form.description !== detail.description) patch.description = form.description.trim();
    const imgs = lines(form.images);
    if (imgs.join("\n") !== (detail.images ?? []).join("\n")) patch.images = imgs;
    const hl = lines(form.highlights);
    if (hl.join("\n") !== (detail.highlights ?? []).join("\n")) patch.highlights = hl;

    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "override", products: { [productId]: patch } }),
      });
      if (!r.ok) {
        setErr("Opslaan mislukt.");
        return;
      }
      onSaved("Productgegevens opgeslagen. Publiceer om live te zetten.");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    try {
      await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clearOverride", kind: "product", id: productId }),
      });
      onSaved("Teruggezet naar de bron. Publiceer om live te zetten.");
    } finally {
      setSaving(false);
    }
  }

  const hasMasterOverride = Boolean(
    detail?.override &&
      Object.keys(detail.override).some(
        (k) => !["price", "kluspasPrice", "compareAtPrice"].includes(k),
      ),
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black">Productgegevens bewerken</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!form ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {err || "Laden…"}
          </p>
        ) : (
          <div className="space-y-3">
            <Field label="Titel" value={form.title} onChange={(v) => set("title", v)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Merk" value={form.brand} onChange={(v) => set("brand", v)} />
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Categorie
                </span>
                <select
                  value={form.category}
                  onChange={(e) => set("category", e.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Subcategorie" value={form.subCategory} onChange={(v) => set("subCategory", v)} />
              <Field label="EAN / barcode" value={form.gtin} onChange={(v) => set("gtin", v)} />
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Afbeeldingen (één URL per regel)
              </span>
              <textarea
                value={form.images}
                onChange={(e) => set("images", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-secondary p-2 font-mono text-xs outline-none focus:border-primary focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                USP&apos;s / kenmerken (één per regel)
              </span>
              <textarea
                value={form.highlights}
                onChange={(e) => set("highlights", e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-secondary p-2 text-sm outline-none focus:border-primary focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Omschrijving
              </span>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="Leeg laten = automatisch gegenereerde omschrijving."
                className="w-full rounded-lg border border-border bg-secondary p-2 text-sm outline-none focus:border-primary focus:bg-white"
              />
            </label>
            {err && <p className="text-sm font-medium text-primary">{err}</p>}
            <div className="flex items-center justify-between gap-2 pt-1">
              {hasMasterOverride ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                  disabled={saving}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="h-4 w-4" /> Herstel naar bron
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Opslaan
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
