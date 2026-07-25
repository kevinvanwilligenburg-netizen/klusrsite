"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BarChart3,
  Sparkles,
  Send,
  Euro,
  Package,
  TrendingUp,
  Search,
  MessageCircle,
  MessagesSquare,
  Eye,
  Radio,
  ShoppingCart,
  ShieldOff,
  XCircle,
  Boxes,
  Plus,
  Trash2,
  RotateCcw,
  MapPin,
  Mail,
  Globe,
  Calculator,
  Truck,
  Tags,
} from "lucide-react";
import type { Order, OrderStatus } from "@/types";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrdersPanel } from "./orders-panel";
import { TicketsPanel } from "./tickets-panel";
import { ConversationsPanel } from "./conversations-panel";
import { CustomersPanel } from "./customers-panel";
import { StockPanel } from "./stock-panel";
import { AbandonedPanel } from "./abandoned-panel";
import { AiContentManager } from "./ai-content-manager";
import { NewsletterPanel } from "./newsletter-panel";
import { HeroImages } from "./hero-images";
import { ChannableTestOrder } from "./channable-test-order";
import { MollieTest } from "./mollie-test";
import { SeoRankPanel } from "./seo-rank-panel";
import { KassaPanel } from "./kassa-panel";
import { InkoopPanel } from "./inkoop-panel";
import { CatalogPanel } from "./catalog-panel";

type SectionId =
  | "overzicht"
  | "kassa"
  | "orders"
  | "afgebroken"
  | "tickets"
  | "gesprekken"
  | "klanten"
  | "voorraad"
  | "inkoop"
  | "catalogus"
  | "rapportages"
  | "inzichten"
  | "seo"
  | "content"
  | "nieuwsbrief"
  | "channable";

const NAV: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overzicht", label: "Overzicht", icon: LayoutDashboard },
  { id: "kassa", label: "Kassa", icon: Calculator },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "afgebroken", label: "Afgebroken", icon: XCircle },
  { id: "tickets", label: "Tickets", icon: MessageCircle },
  { id: "gesprekken", label: "Gesprekken", icon: MessagesSquare },
  { id: "klanten", label: "Klanten", icon: Users },
  { id: "voorraad", label: "Voorraad", icon: Boxes },
  { id: "inkoop", label: "Inkoop", icon: Truck },
  { id: "catalogus", label: "Catalogus", icon: Tags },
  { id: "rapportages", label: "Rapportages", icon: BarChart3 },
  { id: "seo", label: "SEO-ranking", icon: TrendingUp },
  { id: "content", label: "AI-content", icon: Sparkles },
  { id: "nieuwsbrief", label: "Nieuwsbrief", icon: Mail },
  { id: "channable", label: "Koppelingen", icon: Send },
];

const PAID: OrderStatus[] = ["paid", "authorized", "shipped", "delivered"];
const isPaid = (o: Order) => PAID.includes(o.paymentStatus);
const isOpen = (o: Order) =>
  (o.paymentStatus === "paid" || o.paymentStatus === "authorized") && !o.shipment;

export function AdminDashboard() {
  const [section, setSection] = useState<SectionId>("overzicht");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/admin/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[210px_1fr]">
      {/* Zijbalk / tabs */}
      <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors lg:w-full",
              section === id
                ? "bg-klusr-black text-white"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Inhoud */}
      <div className="min-w-0">
        {section === "overzicht" && <Overview orders={orders} onGo={setSection} />}
        {section === "kassa" && <KassaPanel orders={orders} />}
        {section === "orders" && <OrdersPanel />}
        {section === "afgebroken" && <AbandonedPanel />}
        {section === "tickets" && <TicketsPanel />}
        {section === "gesprekken" && <ConversationsPanel />}
        {section === "klanten" && <CustomersPanel orders={orders} />}
        {section === "voorraad" && <StockPanel />}
        {section === "inkoop" && <InkoopPanel />}
        {section === "catalogus" && <CatalogPanel />}
        {(section === "rapportages" || section === "inzichten") && (
          <div className="space-y-8">
            <Insights />
            <Reports orders={orders} />
          </div>
        )}
        {section === "content" && (
          <div className="space-y-8">
            <HeroImages />
            <AiContentManager />
          </div>
        )}
        {section === "seo" && <SeoRankPanel />}
        {section === "nieuwsbrief" && <NewsletterPanel />}
        {section === "channable" && (
          <div className="space-y-6">
            <MollieTest />
            <ChannableTestOrder />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

type Period = "vandaag" | "week" | "maand" | "alles" | "eigen";
const PERIODS: { id: Period; label: string }[] = [
  { id: "vandaag", label: "Vandaag" },
  { id: "week", label: "Deze week" },
  { id: "maand", label: "Deze maand" },
  { id: "alles", label: "Alles" },
  { id: "eigen", label: "Eigen periode" },
];

function Overview({ orders, onGo }: { orders: Order[]; onGo: (s: SectionId) => void }) {
  const [period, setPeriod] = useState<Period>("alles");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(() => {
    const now = new Date();
    const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    if (period === "vandaag") return { start: sod(now), end: Infinity };
    if (period === "week") {
      const dow = (now.getDay() + 6) % 7; // maandag = 0
      return { start: sod(new Date(now.getTime() - dow * 86400000)), end: Infinity };
    }
    if (period === "maand")
      return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end: Infinity };
    if (period === "eigen")
      return {
        start: from ? new Date(`${from}T00:00:00`).getTime() : -Infinity,
        end: to ? new Date(`${to}T23:59:59`).getTime() : Infinity,
      };
    return { start: -Infinity, end: Infinity };
  }, [period, from, to]);

  const periodOrders = useMemo(
    () =>
      orders.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= range.start && t <= range.end;
      }),
    [orders, range],
  );

  const stats = useMemo(() => {
    const paid = periodOrders.filter(isPaid);
    // Omzet = betaalde orders minus eventuele (deel)terugbetalingen.
    const omzet = paid.reduce((s, o) => s + o.total - (o.refundedAmount ?? 0), 0);
    // Klanten = unieke e-mails van échte (betaalde) orders.
    const klanten = new Set(paid.map((o) => o.customer.email.toLowerCase())).size;
    const open = periodOrders.filter(isOpen).length;
    const terugbetaald = periodOrders.reduce((s, o) => s + (o.refundedAmount ?? 0), 0);
    const refundedCount = periodOrders.filter(
      (o) => o.paymentStatus === "refunded" || (o.refundedAmount ?? 0) > 0,
    ).length;
    return {
      omzet,
      orders: paid.length,
      klanten,
      open,
      terugbetaald,
      refundedCount,
      gem: paid.length ? omzet / paid.length : 0,
    };
  }, [periodOrders]);

  const recent = periodOrders.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Periodekiezer */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              period === p.id
                ? "bg-klusr-black text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        {period === "eigen" && (
          <div className="flex items-center gap-2 text-sm">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1"
              aria-label="Van"
            />
            <span className="text-muted-foreground">t/m</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-md border border-border bg-card px-2 py-1"
              aria-label="Tot en met"
            />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard icon={Euro} label="Omzet (betaald)" value={formatPrice(stats.omzet)} />
        <StatCard
          icon={ShoppingBag}
          label="Orders (betaald)"
          value={String(stats.orders)}
          hint={`${stats.open} openstaand`}
        />
        <StatCard icon={Users} label="Klanten" value={String(stats.klanten)} />
        <StatCard icon={TrendingUp} label="Gem. orderwaarde" value={formatPrice(stats.gem)} />
        <StatCard
          icon={RotateCcw}
          label="Terugbetaald"
          value={formatPrice(stats.terugbetaald)}
          hint={stats.refundedCount ? `${stats.refundedCount} order(s)` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recente orders</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold">{o.reference}</span>{" "}
                  <span className="text-muted-foreground">
                    · {o.customer.firstName} {o.customer.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                </div>
              </li>
            ))}
            {recent.length === 0 && (
              <li className="py-4 text-center text-sm text-muted-foreground">Nog geen orders.</li>
            )}
          </ul>
          <button
            onClick={() => onGo("orders")}
            className="mt-3 text-sm font-semibold text-primary hover:underline"
          >
            Alle orders &amp; verzending →
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function Reports({ orders }: { orders: Order[] }) {
  const { byStatus, topProducts, maxStatus } = useMemo(() => {
    const byStatus = new Map<OrderStatus, { count: number; omzet: number }>();
    for (const o of orders) {
      const e = byStatus.get(o.paymentStatus) ?? { count: 0, omzet: 0 };
      e.count += 1;
      e.omzet += o.total;
      byStatus.set(o.paymentStatus, e);
    }
    const products = new Map<string, { title: string; qty: number; omzet: number }>();
    for (const o of orders) {
      if (!isPaid(o)) continue;
      for (const i of o.items) {
        const e = products.get(i.title) ?? { title: i.title, qty: 0, omzet: 0 };
        e.qty += i.quantity;
        e.omzet += i.kluspasPrice * i.quantity;
        products.set(i.title, e);
      }
    }
    const topProducts = [...products.values()].sort((a, b) => b.omzet - a.omzet).slice(0, 8);
    const maxStatus = Math.max(1, ...[...byStatus.values()].map((v) => v.omzet));
    return { byStatus: [...byStatus.entries()], topProducts, maxStatus };
  }, [orders]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Omzet per status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {byStatus.length === 0 && <p className="text-sm text-muted-foreground">Nog geen data.</p>}
          {byStatus.map(([status, v]) => (
            <div key={status} className="text-sm">
              <div className="flex justify-between">
                <span className="capitalize">{status} ({v.count})</span>
                <span className="font-semibold">{formatPrice(v.omzet)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(v.omzet / maxStatus) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Best verkochte producten</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 font-semibold">Product</th>
                <th className="py-2 text-right font-semibold">Aantal</th>
                <th className="py-2 text-right font-semibold">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p) => (
                <tr key={p.title} className="border-b border-border">
                  <td className="py-2 pr-2">{p.title}</td>
                  <td className="py-2 text-right">{p.qty}</td>
                  <td className="py-2 text-right font-semibold">{formatPrice(p.omzet)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted-foreground">
                    Nog geen betaalde orders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3.5 w-3.5" /> Op basis van de huidige (demo) orders. Koppel een
            database of de Channable/Tilroy-orders voor volledige rapportage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface InsightsData {
  period: { days: number };
  total: number;
  live: number;
  visitors: number;
  pageviews: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  searchCount: number;
  chatCount: number;
  topSearches: { query: string; count: number }[];
  topViewed: { title: string; count: number }[];
  recentChats: { question: string; ts: number }[];
  topCountries: { code: string; count: number }[];
  topCities: { name: string; count: number }[];
  herkomst: { source: string; count: number }[];
}

interface LiveSession {
  path: string;
  secondsAgo: number;
  checkout: boolean;
  source?: string;
  cart?: { count: number; value: number };
}

interface LiveData {
  count: number;
  sessions: LiveSession[];
  herkomst?: { source: string; count: number }[];
}

/** Maak een pad leesbaar voor de owner ("/" → "Home"). */
function prettyPath(path: string): string {
  if (!path || path === "/") return "Home";
  return path;
}

/**
 * Live-overzicht: aantal + lijst met actieve sessies (huidige pagina + of ze
 * afrekenen). Ververst elke 12s via één fetch.
 */
function LiveSessionsCard() {
  const [data, setData] = useState<LiveData | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/admin/analytics/live", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => active && d && setData(d))
        .catch(() => {});
    load();
    const id = setInterval(load, 12_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const count = data?.count ?? 0;
  const sessions = data?.sessions ?? [];
  const herkomst = data?.herkomst ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-md bg-klusr-stock/10 text-klusr-stock">
            <Radio className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 animate-ping rounded-full bg-klusr-stock" />
            )}
          </span>
          Live nu ({count})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border text-sm">
          {sessions.map((s, i) => {
            // Mandje zonder afrekenpagina + al even op de pagina = mogelijk "aan
            // het afhaken"; markeer dat zodat de owner het mandje opmerkt.
            const dropping = !!s.cart && s.cart.count > 0 && !s.checkout;
            return (
              <li key={i} className="flex items-start justify-between gap-3 py-2">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{prettyPath(s.path)}</span>
                    {s.checkout && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        <ShoppingCart className="h-3 w-3" /> Rekent af
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.source || "Direct"}</span>
                    </span>
                    {s.cart && s.cart.count > 0 && (
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          dropping
                            ? "bg-amber-100 text-amber-800"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        <ShoppingCart className="h-3 w-3" /> {s.cart.count} in mandje ·{" "}
                        {formatPrice(s.cart.value)}
                      </span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {s.secondsAgo} sec geleden
                </span>
              </li>
            );
          })}
          {sessions.length === 0 && (
            <li className="py-3 text-center text-muted-foreground">
              Op dit moment geen actieve bezoekers.
            </li>
          )}
        </ul>

        {/* Herkomst vandaag: top-bronnen met aantallen uit de dagaggregatie. */}
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Herkomst vandaag
          </p>
          {herkomst.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {herkomst.map((h) => (
                <li key={h.source} className="flex items-center justify-between gap-3">
                  <span className="truncate">{h.source}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{h.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nog geen herkomstdata vandaag.</p>
          )}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Toont per actieve bezoeker de huidige pagina, herkomst en winkelmand. Ververst elke 12s.
          Uitgesloten IP&apos;s verschijnen hier niet.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * IP-uitsluiting: IP's die je hier toevoegt tellen niet mee in rapportages en
 * live bezoekers (bijv. je eigen kantoor-IP).
 */
function IpExclusionCard() {
  const [env, setEnv] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [currentIp, setCurrentIp] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (d: { env?: string[]; custom?: string[]; currentIp?: string } | null) => {
    if (!d) return;
    setEnv(d.env ?? []);
    setCustom(d.custom ?? []);
    if (typeof d.currentIp === "string") setCurrentIp(d.currentIp);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/admin/analytics/excluded-ips", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && apply(d))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const add = async (ip: string) => {
    const clean = ip.trim();
    if (!clean || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics/excluded-ips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: clean }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError((d && d.error) || "Toevoegen mislukt.");
      } else {
        apply(d);
        setInput("");
      }
    } catch {
      setError("Toevoegen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (ip: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/analytics/excluded-ips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok) apply(d);
    } catch {
      /* stilletjes: niet de UI breken */
    } finally {
      setBusy(false);
    }
  };

  const currentIpAlreadyExcluded =
    !!currentIp && (custom.includes(currentIp) || env.includes(currentIp));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldOff className="h-4 w-4 text-primary" />
          IP-uitsluiting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          IP-adressen die je hier toevoegt tellen niet mee in de rapportages en live bezoekers
          (bijv. je eigen kantoor-IP).
        </p>

        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs text-muted-foreground">Jouw huidige IP-adres</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-sm font-semibold">{currentIp || "onbekend"}</span>
            <button
              type="button"
              disabled={!currentIp || currentIpAlreadyExcluded || busy}
              onClick={() => add(currentIp)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-klusr-black px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-klusr-black/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              {currentIpAlreadyExcluded ? "Al uitgesloten" : "Mijn huidige IP toevoegen"}
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            add(input);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bijv. 84.12.34.56"
            inputMode="text"
            className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Toevoegen
          </button>
        </form>
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Uitgesloten IP-adressen
          </p>
          <ul className="mt-2 divide-y divide-border text-sm">
            {custom.map((ip) => (
              <li key={ip} className="flex items-center justify-between gap-3 py-2">
                <span className="font-mono">{ip}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(ip)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-destructive transition-colors hover:underline disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Verwijder
                </button>
              </li>
            ))}
            {custom.length === 0 && (
              <li className="py-3 text-center text-muted-foreground">
                Nog geen IP&apos;s uitgesloten.
              </li>
            )}
          </ul>
        </div>

        {env.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Vast ingesteld via omgeving (read-only): <span className="font-mono">{env.join(", ")}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const ANALYTICS_PERIODS: { days: number; label: string }[] = [
  { days: 1, label: "Vandaag" },
  { days: 7, label: "7 dagen" },
  { days: 30, label: "30 dagen" },
  { days: 90, label: "90 dagen" },
];

// Landcode → Nederlandse landnaam (Intl) + vlag-emoji uit regionale-indicators.
const regionNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["nl"], { type: "region" })
    : null;
function countryName(code: string): string {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}
function flagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}

/** Top-lijst met balkjes + percentage (landen, steden, herkomst). */
function BreakdownCard({
  title,
  icon: Icon,
  items,
  empty,
}: {
  title: string;
  icon: typeof Globe;
  items: { label: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.label} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{it.label}</span>
                  <span className="shrink-0 font-semibold tabular-nums">
                    {it.count}
                    {total > 0 && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {Math.round((it.count / total) * 100)}%
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(it.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Insights() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => active && d && setData(d))
        .catch(() => {})
        .finally(() => active && setLoading(false));
    load();
    // Cijfers elke 15s verversen (binnen de gekozen periode).
    const id = setInterval(load, 15_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [days]);

  if (loading && !data)
    return <p className="text-sm text-muted-foreground">Inzichten laden…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Geen inzichten beschikbaar.</p>;

  const countryItems = data.topCountries.map((c) => ({
    label: `${flagEmoji(c.code)} ${countryName(c.code)}`,
    count: c.count,
  }));
  const cityItems = data.topCities.map((c) => ({ label: c.name, count: c.count }));
  const herkomstItems = data.herkomst.map((h) => ({ label: h.source, count: h.count }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight">Bezoekers &amp; statistieken</h2>
        <p className="text-sm text-muted-foreground">
          Live verkeer, conversie, herkomst en geografie — ververst elke 15s.
        </p>
      </div>

      {/* Periodekiezer */}
      <div className="flex flex-wrap items-center gap-2">
        {ANALYTICS_PERIODS.map((p) => (
          <button
            key={p.days}
            type="button"
            onClick={() => setDays(p.days)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              days === p.days
                ? "bg-klusr-black text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Kerncijfers over de periode */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-klusr-stock/10 text-klusr-stock">
              <Radio className="h-5 w-5" />
              {data.live > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-ping rounded-full bg-klusr-stock" />
              )}
            </span>
            <div>
              <p className="text-2xl font-black tabular-nums">{data.live}</p>
              <p className="text-xs text-muted-foreground">Live bezoekers nu</p>
            </div>
          </CardContent>
        </Card>
        <StatCard icon={Users} label="Bezoekers" value={String(data.visitors)} />
        <StatCard icon={Eye} label="Paginaweergaven" value={String(data.pageviews)} />
        <StatCard icon={ShoppingBag} label="Conversies" value={String(data.conversions)} />
        <StatCard icon={TrendingUp} label="Conversieratio" value={`${data.conversionRate}%`} />
        <StatCard icon={Euro} label="Omzet" value={formatPrice(data.revenue)} />
      </div>

      <LiveSessionsCard />

      {/* Geografie */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BreakdownCard
          title="Landen"
          icon={Globe}
          items={countryItems}
          empty="Nog geen landdata in deze periode."
        />
        <BreakdownCard
          title="Steden"
          icon={MapPin}
          items={cityItems}
          empty="Nog geen stedendata in deze periode."
        />
      </div>

      <BreakdownCard
        title="Herkomst (bron)"
        icon={Radio}
        items={herkomstItems}
        empty="Nog geen herkomstdata in deze periode."
      />

      <IpExclusionCard />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Search} label="Zoekopdrachten" value={String(data.searchCount)} />
        <StatCard icon={MessageCircle} label="Chat-vragen" value={String(data.chatCount)} />
        <StatCard icon={TrendingUp} label="Events totaal" value={String(data.total)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top zoekopdrachten</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {data.topSearches.map((s) => (
              <li key={s.query} className="flex justify-between py-1.5">
                <span className="truncate">{s.query}</span>
                <span className="font-semibold">{s.count}×</span>
              </li>
            ))}
            {data.topSearches.length === 0 && (
              <li className="py-3 text-center text-muted-foreground">Nog geen zoekdata.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meest bekeken producten</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {data.topViewed.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                <span className="truncate">{p.title}</span>
                <span className="shrink-0 font-semibold">{p.count}×</span>
              </li>
            ))}
            {data.topViewed.length === 0 && (
              <li className="py-3 text-center text-muted-foreground">Nog geen productweergaven.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recente chat-vragen</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {data.recentChats.map((c, i) => (
              <li key={i} className="rounded-md bg-secondary/40 px-3 py-2">
                {c.question}
              </li>
            ))}
            {data.recentChats.length === 0 && (
              <li className="py-3 text-center text-muted-foreground">Nog geen chat-vragen.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Bezoekers, landen, steden en herkomst zijn per dag geaggregeerd over de gekozen periode;
        zoekopdrachten/weergaven/conversies komen uit de recente events-buffer. Land/stad o.b.v. de
        Vercel geo-headers. Eigen verkeer filter je met <code>INTERNAL_IPS</code> of via
        &quot;IP-uitsluiting&quot;. Zet KV aan voor persistentie over deploys.
      </p>
    </div>
  );
}
