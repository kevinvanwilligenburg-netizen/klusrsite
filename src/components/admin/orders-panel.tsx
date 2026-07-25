"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Truck,
  Package,
  ExternalLink,
  Download,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  FileText,
  ListChecks,
  Mailbox,
  ChevronDown,
  Repeat,
  Briefcase,
  Store,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { isBrievenbusOrder } from "@/lib/brievenbus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, formatDate, cn } from "@/lib/utils";

interface LabelResult {
  ok: boolean;
  configured: boolean;
  demo?: boolean;
  status: number;
  message: string;
  barcode?: string;
  trackTrace?: string;
  labelBase64?: string;
  response?: unknown;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  open: "Open",
  pending: "In behandeling",
  paid: "Betaald",
  authorized: "Geautoriseerd",
  shipped: "Verzonden",
  delivered: "Geleverd",
  canceled: "Geannuleerd",
  failed: "Mislukt",
  expired: "Verlopen",
  refunded: "Terugbetaald",
};

/** Kassaverkoop (toonbank) — geen picken/verzenden nodig. */
const isPos = (o: Order) => o.channel === "pos";

const needsLabel = (o: Order) =>
  !isPos(o) && (o.paymentStatus === "paid" || o.paymentStatus === "authorized") && !o.shipment;

/**
 * "Openstaand" = betaald (of geautoriseerd) én nog niet verwerkt (geen label).
 * Onbetaalde orders (open/pending — vaak afgebroken checkouts) en afgeronde of
 * geannuleerde orders vallen weg. Zodra er een label is, verdwijnt de order uit
 * deze pick-/verzendqueue.
 */
const isOpenOrder = (o: Order) =>
  (o.paymentStatus === "paid" || o.paymentStatus === "authorized") && !o.shipment;

// Net geplaatste orders 15 min vasthouden (nabestelvenster) — nog niet picken/labelen.
const ORDER_HOLD_MS = 15 * 60 * 1000;
const isHeld = (o: Order) =>
  needsLabel(o) && Date.now() - new Date(o.createdAt).getTime() < ORDER_HOLD_MS;
const holdMinutesLeft = (o: Order) =>
  Math.max(1, Math.ceil((new Date(o.createdAt).getTime() + ORDER_HOLD_MS - Date.now()) / 60000));

export function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [postnlConfigured, setPostnlConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, LabelResult>>({});
  // Per order: keuze brievenbuspakje (default = heuristiek; medewerker kan overrulen).
  const [bbChoice, setBbChoice] = useState<Record<string, boolean>>({});
  // Uitklapbare orderregels + bezorgadres.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  // Filters: kanaal (web/kassa/alle) + alleen openstaande orders.
  const [channel, setChannel] = useState<"web" | "pos" | "all">("web");
  const [openOnly, setOpenOnly] = useState(true);
  // Hoe vaak deze klant (e-mail) heeft besteld — voor de 'terugkerend'-tag.
  const orderCount = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of orders) {
      const e = o.customer.email?.toLowerCase();
      if (e) m[e] = (m[e] ?? 0) + 1;
    }
    return m;
  }, [orders]);

  const webCount = useMemo(() => orders.filter((o) => !isPos(o)).length, [orders]);
  const posCount = useMemo(() => orders.filter(isPos).length, [orders]);
  const visible = useMemo(
    () =>
      orders.filter((o) => {
        if (channel === "web" && isPos(o)) return false;
        if (channel === "pos" && !isPos(o)) return false;
        if (openOnly && !isOpenOrder(o)) return false;
        return true;
      }),
    [orders, channel, openOnly],
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders ?? []);
      setPostnlConfigured(Boolean(data.postnlConfigured));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function makeLabel(order: Order, brievenbus: boolean) {
    setBusy(order.id);
    try {
      const res = await fetch("/api/admin/postnl-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, brievenbus }),
      });
      const result = (await res.json()) as LabelResult;
      setResults((r) => ({ ...r, [order.id]: result }));
      if (result.ok && result.barcode) {
        setOrders((list) =>
          list.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  paymentStatus: "shipped",
                  shipment: {
                    carrier: "postnl",
                    barcode: result.barcode!,
                    trackTrace: result.trackTrace,
                    labelCreatedAt: new Date().toISOString(),
                  },
                }
              : o,
          ),
        );
      }
    } catch {
      setResults((r) => ({
        ...r,
        [order.id]: { ok: false, configured: postnlConfigured, status: 0, message: "Labelroute onbereikbaar." },
      }));
    } finally {
      setBusy(null);
    }
  }

  const open = orders.filter(needsLabel);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Orders</CardTitle>
            <p className="text-sm text-muted-foreground">
              Webshop-orders pick en verzend je hier (PostNL-label). <strong>Kassaverkopen</strong>{" "}
              zijn toonbankverkopen — die hoef je niet te picken. Filter op <strong>Webshop</strong>{" "}
              voor de pickqueue; <strong>Alleen openstaande</strong> verbergt afgeronde en
              geannuleerde orders.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="dark" size="sm" asChild>
              <a href="/looplijst" target="_blank" rel="noreferrer">
                <ListChecks className="h-4 w-4" />
                Looplijst
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Ververs
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {!postnlConfigured && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              PostNL is nog niet geconfigureerd — labels worden als <strong>demo</strong> aangemaakt
              (geen echte verzending). Zet <code>POSTNL_API_KEY</code>,{" "}
              <code>POSTNL_CUSTOMER_CODE</code> en <code>POSTNL_CUSTOMER_NUMBER</code> in de omgeving.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              ["web", `Webshop (${webCount})`],
              ["pos", `Kassa (${posCount})`],
              ["all", "Alle"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setChannel(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  channel === key
                    ? "bg-klusr-black text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setOpenOnly((v) => !v)}
              aria-pressed={openOnly}
              className={cn(
                "ml-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                openOnly
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <ListChecks className="h-3.5 w-3.5" /> Alleen openstaande
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4 text-primary" />
            {loading ? "Laden…" : `${open.length} te picken · ${visible.length} getoond`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Order</th>
                <th className="py-2 pr-3 font-semibold">Klant</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Totaal</th>
                <th className="py-2 pr-3 font-semibold">Verzending</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => {
                const res = results[o.id];
                const bbSuggested = isBrievenbusOrder(o.items);
                const bb = bbChoice[o.id] ?? bbSuggested;
                const email = o.customer.email?.toLowerCase() ?? "";
                const isOpen = expanded[o.id];
                return (
                  <Fragment key={o.id}>
                  <tr className={cn("border-b border-border align-top", needsLabel(o) && "bg-primary/5", isOpen && "bg-secondary/30")}>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => toggle(o.id)}
                        className="flex items-start gap-1.5 text-left"
                      >
                        <ChevronDown
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                        <span>
                          <span className="block font-semibold">{o.reference}</span>
                          <span className="block text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                        </span>
                      </button>
                      {isPos(o) && (
                        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Store className="h-3 w-3" /> Kassa
                        </span>
                      )}
                      <a
                        href={isPos(o) ? `/kassa/bon/${o.id}` : `/pakbon/${o.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" /> {isPos(o) ? "Kassabon" : "Print pakbon"}
                      </a>
                    </td>
                    <td className="py-3 pr-3">
                      <div>{o.customer.firstName} {o.customer.lastName}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.customer.postalCode} {o.customer.city}
                      </div>
                      {orderCount[email] > 1 && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-klusr-stock/10 px-2 py-0.5 text-[10px] font-semibold text-klusr-stock">
                          <Repeat className="h-3 w-3" /> Terugkerend · {orderCount[email]}× besteld
                        </span>
                      )}
                      {(o.customer.company || o.customer.cocNumber) && (
                        <span className="mt-1 flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Briefcase className="h-3 w-3" /> ProfPas
                          {o.customer.company ? ` · ${o.customer.company}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                          o.paymentStatus === "shipped" || o.paymentStatus === "delivered"
                            ? "bg-klusr-stock/10 text-klusr-stock"
                            : needsLabel(o)
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL[o.paymentStatus]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-semibold">{formatPrice(o.total)}</td>
                    <td className="py-3 pr-3">
                      {isPos(o) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Store className="h-3.5 w-3.5" /> Toonbankverkoop · geen verzending
                        </span>
                      ) : o.shipment ? (
                        <div className="space-y-1 text-xs">
                          <div className="inline-flex items-center gap-1 font-semibold text-klusr-stock">
                            <Truck className="h-3.5 w-3.5" /> {o.shipment.barcode}
                          </div>
                          {o.shipment.trackTrace && (
                            <a
                              href={o.shipment.trackTrace}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              Track &amp; Trace <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {res?.labelBase64 && (
                            <a
                              href={`data:application/pdf;base64,${res.labelBase64}`}
                              download={`label-${o.reference}.pdf`}
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              Download label <Download className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ) : isHeld(o) ? (
                        <div className="text-xs text-amber-600">
                          <p className="font-semibold">Wacht op nabestelling</p>
                          <p className="text-muted-foreground">
                            nog ~{holdMinutesLeft(o)} min · nog niet picken
                          </p>
                        </div>
                      ) : (o.paymentStatus === "paid" || o.paymentStatus === "authorized") ? (
                        <div className="space-y-1.5">
                          <label
                            className={cn(
                              "flex w-fit items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                              bb ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={bb}
                              onChange={(e) => setBbChoice((c) => ({ ...c, [o.id]: e.target.checked }))}
                              className="h-3.5 w-3.5"
                            />
                            <Mailbox className="h-3.5 w-3.5" />
                            Brievenbuspakje
                            {bbSuggested && <span className="text-muted-foreground">· voorgesteld</span>}
                          </label>
                          <Button size="sm" variant="dark" onClick={() => makeLabel(o, bb)} disabled={busy === o.id}>
                            {busy === o.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Bezig…
                              </>
                            ) : (
                              <>
                                <Truck className="h-4 w-4" /> Maak {bb ? "brievenbus" : "PostNL"}-label
                              </>
                            )}
                          </Button>
                          {res && !res.ok && (
                            <div className="text-xs text-destructive">
                              <p className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> {res.message}
                              </p>
                              {res.response != null && (
                                <pre className="mt-1 max-h-32 overflow-auto rounded bg-destructive/5 p-1.5 text-[10px] text-muted-foreground">
                                  {typeof res.response === "string"
                                    ? res.response
                                    : JSON.stringify(res.response, null, 2)}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border bg-secondary/20">
                      <td colSpan={5} className="px-3 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              Orderregels
                            </p>
                            <ul className="space-y-2">
                              {o.items.map((it) => (
                                <li
                                  key={it.key}
                                  className="flex items-center gap-3 rounded-lg border border-border bg-card p-2"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={it.image || "/icon.svg"}
                                    alt=""
                                    className="h-12 w-12 shrink-0 rounded border border-border bg-white object-contain"
                                  />
                                  <div className="min-w-0 flex-1 text-xs">
                                    <p className="font-semibold">
                                      {it.brand} {it.title}
                                    </p>
                                    <p className="text-muted-foreground">
                                      {it.variantLabel}
                                      {it.selectedColor
                                        ? ` · ${it.selectedColor.name}${it.selectedColor.code ? ` (${it.selectedColor.code})` : ""}${it.selectedColor.collection ? ` · ${it.selectedColor.collection}` : ""}`
                                        : ""}
                                    </p>
                                    <p className="text-muted-foreground">
                                      Barcode: {it.gtin || it.variantId || "—"}
                                    </p>
                                  </div>
                                  <div className="shrink-0 text-right text-xs">
                                    <p className="font-semibold">{it.quantity}×</p>
                                    <p className="text-muted-foreground">
                                      {formatPrice(it.kluspasPrice * it.quantity)}
                                    </p>
                                  </div>
                                </li>
                              ))}
                              {o.items.length === 0 && (
                                <li className="text-xs text-muted-foreground">
                                  Geen orderregels (demo-order).
                                </li>
                              )}
                            </ul>
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                              Bezorgadres
                            </p>
                            <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                              <p className="font-semibold text-foreground">
                                {o.customer.firstName} {o.customer.lastName}
                              </p>
                              <p>{o.customer.street}</p>
                              <p>
                                {o.customer.postalCode} {o.customer.city}
                              </p>
                              <p>{(o.customer.country || "NL").toUpperCase()}</p>
                              <p className="mt-1 break-all">{o.customer.email}</p>
                              {o.customer.phone && <p>{o.customer.phone}</p>}
                              {(o.customer.company || o.customer.cocNumber || o.customer.vatNumber) && (
                                <div className="mt-2 border-t border-border pt-2">
                                  <p className="font-semibold text-primary">Zakelijk · ProfPas</p>
                                  {o.customer.company && <p>{o.customer.company}</p>}
                                  {o.customer.cocNumber && <p>KvK: {o.customer.cocNumber}</p>}
                                  {o.customer.vatNumber && <p>Btw: {o.customer.vatNumber}</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                    {orders.length === 0 ? "Geen orders gevonden." : "Geen orders voor deze filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Let op: orders worden nu in-memory bewaard (demo). Voor een betrouwbaar productie-overzicht
          koppelen we een database of de Channable/Tilroy-orders als bron.
        </p>
      </CardContent>
    </Card>
  );
}
