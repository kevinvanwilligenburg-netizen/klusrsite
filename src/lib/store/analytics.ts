/**
 * Lichtgewicht analytics: registreert events (zoekopdrachten, chat-vragen,
 * conversies, paginaweergaven, productweergaven) in een begrensde KV-lijst (of
 * in-memory zonder KV), plus unieke bezoekers per dag en "live" aanwezigheid.
 * Levert geaggregeerde inzichten voor de admin. Best-effort: gooit nooit.
 */

import {
  isKvEnabled,
  kvLPush,
  kvLTrim,
  kvLRange,
  kvSAdd,
  kvSRem,
  kvSMembers,
  kvSetEx,
  kvSetExNX,
  kvMGet,
  kvGetJSON,
  kvHIncrBy,
  kvHGetAll,
  kvExpire,
} from "./kv";

export interface AnalyticsEvent {
  type: string;
  ts: number;
  query?: string;
  question?: string;
  value?: number;
  reference?: string;
  path?: string;
  productId?: string;
  title?: string;
  [k: string]: unknown;
}

const KEY = "analytics:events";
const MAX = 1000;
const mem: AnalyticsEvent[] = [];

const memVisitors = new Map<string, Set<string>>();

/** Compacte winkelmand-momentopname van een live bezoeker. */
export interface LiveCart {
  /** Totaal aantal stuks in het mandje. */
  count: number;
  /** Brutowaarde (incl. btw) van het mandje in euro's. */
  value: number;
}

// Live sessies (huidige pagina + afreken-vlag + herkomst + mandje) per bezoeker, kortlevend.
const SESSION_TTL_S = 60; // seconden dat een sessie "live" blijft zonder heartbeat
const SESSION_INDEX_KEY = "analytics:sessions"; // set met actieve bezoeker-id's
const sessionKey = (vid: string) => `presence:session:${vid}`;
const CHECKOUT_PATH = "/checkout"; // de afrekenpagina (winkelwagen → "Verder naar afrekenen")
const MAX_SESSIONS = 50;
const SOURCE_MAX_LEN = 80; // veiligheidslimiet op de herkomst-label

interface SessionMem {
  path: string;
  ts: number;
  checkout: boolean;
  ip?: string;
  source?: string;
  cart?: LiveCart;
}
const memSessions = new Map<string, SessionMem>();

// IP-uitsluiting: eigen/intern verkeer telt niet mee in rapportages en live.
const EXCLUDED_IPS_KEY = "analytics:excluded-ips";
const ENV_EXCLUDED_IPS = (process.env.INTERNAL_IPS || "")
  .split(/[\s,;]+/)
  .map((s) => s.trim())
  .filter(Boolean);
const memExcludedIps = new Set<string>();

const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);
const dayKey = (d = new Date()) => `analytics:visitors:${isoDay(d)}`;

// Herkomst (traffic source) per dag: hash bron→aantal, plus de éérste bron per
// bezoeker (zodat de telling stabiel blijft en niet bij elke pageview oploopt).
const HERKOMST_DAY_TTL_S = 60 * 60 * 24 * 40; // ~40 dagen (genoeg voor een 30-daagse periode)
const herkomstDayKey = (d = new Date()) => `analytics:herkomst:${isoDay(d)}`;
const visitorSourceKey = (vid: string, d = new Date()) =>
  `analytics:vsource:${isoDay(d)}:${vid}`;

/** Normaliseer een bron-label naar een korte, schone string (of undefined). */
function cleanSource(source?: string): string | undefined {
  if (!source) return undefined;
  const s = String(source).replace(/\s+/g, " ").trim().slice(0, SOURCE_MAX_LEN);
  return s || undefined;
}

const memHerkomst = new Map<string, Map<string, number>>(); // dag → (bron → aantal)
const memVisitorSource = new Map<string, string>(); // "dag:vid" → bron (eerste)

/** Is een path de afrekenpagina? (start-with, zodat sub-stappen meetellen) */
function isCheckoutPath(path?: string): boolean {
  if (!path) return false;
  const clean = path.split("?")[0];
  return clean === CHECKOUT_PATH || clean.startsWith(`${CHECKOUT_PATH}/`);
}

export async function logEvent(
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    const ev: AnalyticsEvent = { type, ts: Date.now(), ...payload };
    mem.unshift(ev);
    if (mem.length > MAX) mem.length = MAX;
    if (isKvEnabled()) {
      await kvLPush(KEY, ev);
      await kvLTrim(KEY, 0, MAX - 1);
    }
  } catch {
    /* analytics mag nooit een flow breken */
  }
}

/* ------------------------------------------------------------------ */
/* IP-uitsluiting                                                      */
/* ------------------------------------------------------------------ */

/** Door de admin beheerde (KV) lijst met uitgesloten IP's. */
async function getCustomExcludedIps(): Promise<string[]> {
  try {
    if (isKvEnabled()) return await kvSMembers(EXCLUDED_IPS_KEY);
    return [...memExcludedIps];
  } catch {
    return [];
  }
}

/**
 * Telt dit IP NIET mee in rapportages/live? Snelle env-check eerst, daarna de
 * door de admin beheerde KV-lijst. Best-effort: faalt KV, dan alleen env.
 */
export async function isExcludedIp(ip: string): Promise<boolean> {
  if (!ip) return false;
  if (ENV_EXCLUDED_IPS.includes(ip)) return true;
  const custom = await getCustomExcludedIps();
  return custom.includes(ip);
}

/** Alle uitgesloten IP's (env + admin-lijst) als set — voor read-time filtering. */
async function getExcludedSet(): Promise<Set<string>> {
  return new Set<string>([...ENV_EXCLUDED_IPS, ...(await getCustomExcludedIps())]);
}

/** Env-IP's (read-only) + door admin toegevoegde IP's (KV). */
export async function listExcludedIps(): Promise<{ env: string[]; custom: string[] }> {
  return { env: [...ENV_EXCLUDED_IPS], custom: await getCustomExcludedIps() };
}

/** Voeg een IP toe aan de KV-uitsluitlijst. */
export async function addExcludedIp(ip: string): Promise<void> {
  const clean = ip.trim();
  if (!clean) return;
  try {
    if (isKvEnabled()) await kvSAdd(EXCLUDED_IPS_KEY, clean);
    else memExcludedIps.add(clean);
  } catch {
    /* best-effort */
  }
}

/** Verwijder een IP uit de KV-uitsluitlijst. */
export async function removeExcludedIp(ip: string): Promise<void> {
  const clean = ip.trim();
  if (!clean) return;
  try {
    if (isKvEnabled()) await kvSRem(EXCLUDED_IPS_KEY, clean);
    else memExcludedIps.delete(clean);
  } catch {
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Aanwezigheid (live)                                                 */
/* ------------------------------------------------------------------ */

/** Aantal live bezoekers nu = aantal actieve sessies (excl. uitgesloten IP's). */
export async function getLiveCount(): Promise<number> {
  return (await getLiveSessions()).length;
}

interface SessionRecord {
  path: string;
  ts: number;
  checkout: boolean;
  /** IP van de bezoeker — alleen serverside; om live op het laatste moment te
   *  filteren wanneer een IP later wordt uitgesloten. Kort bewaard via de TTL. */
  ip?: string;
  /** Herkomst-label van deze bezoeker (bijv. "Google Ads", "Direct"). */
  source?: string;
  /** Compacte winkelmand-momentopname (aantal stuks + brutowaarde). */
  cart?: LiveCart;
}

/** Wat de admin per live bezoeker te zien krijgt. */
export interface LiveSession {
  path: string;
  secondsAgo: number;
  checkout: boolean;
  source?: string;
  cart?: LiveCart;
}

/** Valideer/normaliseer een aangeleverd winkelmandje (defensief tegen rommel). */
function cleanCart(cart?: { count?: unknown; value?: unknown }): LiveCart | undefined {
  if (!cart || typeof cart !== "object") return undefined;
  const count = Math.max(0, Math.min(9999, Math.round(Number(cart.count) || 0)));
  if (count <= 0) return undefined;
  const value = Math.max(0, Math.round((Number(cart.value) || 0) * 100) / 100);
  return { count, value };
}

/**
 * Werk de live-sessie van een bezoeker bij: huidige pagina + afreken-vlag +
 * herkomst + winkelmand, met korte TTL. Houdt daarnaast een index-set bij zodat
 * we sessies kunnen oplijsten.
 */
async function touchSession(
  visitorId: string,
  path?: string,
  ip?: string,
  source?: string,
  cart?: LiveCart,
): Promise<void> {
  const rec: SessionRecord = {
    path: path || "/",
    ts: Date.now(),
    checkout: isCheckoutPath(path),
    ip,
    source: cleanSource(source),
    cart,
  };
  try {
    if (isKvEnabled()) {
      await kvSetEx(sessionKey(visitorId), JSON.stringify(rec), SESSION_TTL_S);
      // Index met een ruime marge zodat verlopen sessie-keys eruit gefilterd worden.
      await kvSAdd(SESSION_INDEX_KEY, visitorId);
    } else {
      memSessions.set(visitorId, rec);
    }
  } catch {
    /* best-effort */
  }
}

/**
 * Actieve live-sessies: per niet-verlopen bezoeker de huidige pagina, hoe lang
 * geleden, of die afrekent, de herkomst en het winkelmandje. Verlopen sessies
 * (TTL) worden overgeslagen en uit de index opgeruimd. Begrensd tot
 * MAX_SESSIONS. Best-effort: leeg bij storing.
 */
export async function getLiveSessions(): Promise<LiveSession[]> {
  const now = Date.now();
  const toView = (rec: SessionRecord | SessionMem): LiveSession => ({
    path: rec.path,
    secondsAgo: Math.floor((now - rec.ts) / 1000),
    checkout: Boolean(rec.checkout),
    source: rec.source,
    cart: rec.cart,
  });
  try {
    const excluded = await getExcludedSet();
    if (!isKvEnabled()) {
      const out: LiveSession[] = [];
      for (const [vid, rec] of memSessions) {
        if (now - rec.ts > SESSION_TTL_S * 1000) {
          memSessions.delete(vid);
          continue;
        }
        if (rec.ip && excluded.has(rec.ip)) continue; // sinds kort uitgesloten IP
        out.push(toView(rec));
      }
      return out
        .sort((a, b) => a.secondsAgo - b.secondsAgo)
        .slice(0, MAX_SESSIONS);
    }

    const ids = await kvSMembers(SESSION_INDEX_KEY);
    if (ids.length === 0) return [];
    const raws = await kvMGet(ids.map(sessionKey));
    const out: LiveSession[] = [];
    const stale: string[] = [];
    ids.forEach((vid, i) => {
      const raw = raws[i];
      if (raw == null) {
        stale.push(vid); // sessie-key is verlopen (TTL) → uit de index halen
        return;
      }
      try {
        const rec = JSON.parse(raw) as SessionRecord;
        if (now - rec.ts > SESSION_TTL_S * 1000) {
          stale.push(vid);
          return;
        }
        if (rec.ip && excluded.has(rec.ip)) return; // sinds kort uitgesloten IP
        out.push(toView(rec));
      } catch {
        stale.push(vid);
      }
    });
    // Opruimen (best-effort, niet awaiten zodat de respons snel blijft).
    for (const vid of stale) void kvSRem(SESSION_INDEX_KEY, vid);
    return out.sort((a, b) => a.secondsAgo - b.secondsAgo).slice(0, MAX_SESSIONS);
  } catch {
    return [];
  }
}

/**
 * Leg de herkomst van een bezoeker vast voor de dagaggregatie. Telt de bron maar
 * ÉÉN keer per bezoeker per dag (de eerste pageview wint), zodat het overzicht
 * stabiel blijft en niet bij elke pageview/heartbeat oploopt. Best-effort.
 */
async function recordHerkomst(visitorId: string, source?: string): Promise<void> {
  const src = cleanSource(source);
  if (!src) return;
  const day = isoDay();
  try {
    if (isKvEnabled()) {
      // NX-claim van de bron per bezoeker per dag → alleen de eerste keer tellen.
      // JSON-gecodeerd opslaan zodat kvGetJSON het later correct teruglezen kan.
      const first = await kvSetExNX(
        visitorSourceKey(visitorId),
        JSON.stringify(src),
        HERKOMST_DAY_TTL_S,
      );
      if (first) {
        await kvHIncrBy(herkomstDayKey(), src, 1);
        await kvExpire(herkomstDayKey(), HERKOMST_DAY_TTL_S);
      }
    } else {
      const vKey = `${day}:${visitorId}`;
      if (!memVisitorSource.has(vKey)) {
        memVisitorSource.set(vKey, src);
        const counts = memHerkomst.get(day) ?? new Map<string, number>();
        counts.set(src, (counts.get(src) || 0) + 1);
        memHerkomst.set(day, counts);
      }
    }
  } catch {
    /* best-effort */
  }
}

/** De vastgelegde (eerste) herkomstbron van een bezoeker vandaag, indien bekend. */
async function getVisitorSource(visitorId: string): Promise<string | undefined> {
  try {
    if (isKvEnabled()) {
      return (await kvGetJSON<string>(visitorSourceKey(visitorId))) ?? undefined;
    }
    return memVisitorSource.get(`${isoDay()}:${visitorId}`);
  } catch {
    return undefined;
  }
}

/**
 * Herkomst vandaag: top-bronnen met aantallen, aflopend gesorteerd. Best-effort:
 * leeg bij storing. Wordt door het live-endpoint meegestuurd naar de admin.
 */
export async function getHerkomstToday(
  limit = 12,
): Promise<{ source: string; count: number }[]> {
  try {
    let entries: [string, number][];
    if (isKvEnabled()) {
      const hash = await kvHGetAll(herkomstDayKey());
      entries = Object.entries(hash).map(([s, c]) => [s, Number(c) || 0]);
    } else {
      entries = [...(memHerkomst.get(isoDay()) ?? new Map()).entries()];
    }
    return entries
      .filter(([s, c]) => s && c > 0)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Geografie (land/stad) — per dag, één keer per bezoeker              */
/* ------------------------------------------------------------------ */

const GEO_TTL_S = 60 * 60 * 24 * 40; // ~40 dagen (genoeg voor een 30-daagse periode)
const geoCountryKey = (ds: string) => `analytics:geo:country:${ds}`;
const geoCityKey = (ds: string) => `analytics:geo:city:${ds}`;
const visitorGeoKey = (vid: string, ds = isoDay()) => `analytics:vgeo:${ds}:${vid}`;
const memGeoCountry = new Map<string, Map<string, number>>(); // dag → (land → aantal)
const memGeoCity = new Map<string, Map<string, number>>(); // dag → (stad → aantal)
const memVisitorGeo = new Set<string>(); // "dag:vid" → al geteld

function cleanCity(city?: string): string | undefined {
  if (!city) return undefined;
  const s = String(city).replace(/\s+/g, " ").trim().slice(0, 60);
  return s || undefined;
}

/**
 * Leg land/stad van een bezoeker vast voor de dagaggregatie — één keer per
 * bezoeker per dag (NX-claim), net als de herkomst. Best-effort.
 */
async function recordGeo(visitorId: string, country?: string, city?: string): Promise<void> {
  const cc = country && /^[A-Z]{2}$/.test(country) ? country : undefined;
  const city2 = cleanCity(city);
  if (!cc && !city2) return;
  const day = isoDay();
  try {
    if (isKvEnabled()) {
      const first = await kvSetExNX(visitorGeoKey(visitorId, day), "1", GEO_TTL_S);
      if (!first) return;
      if (cc) {
        await kvHIncrBy(geoCountryKey(day), cc, 1);
        await kvExpire(geoCountryKey(day), GEO_TTL_S);
      }
      if (city2) {
        await kvHIncrBy(geoCityKey(day), city2, 1);
        await kvExpire(geoCityKey(day), GEO_TTL_S);
      }
    } else {
      const vKey = `${day}:${visitorId}`;
      if (memVisitorGeo.has(vKey)) return;
      memVisitorGeo.add(vKey);
      if (cc) {
        const m = memGeoCountry.get(day) ?? new Map<string, number>();
        m.set(cc, (m.get(cc) || 0) + 1);
        memGeoCountry.set(day, m);
      }
      if (city2) {
        const m = memGeoCity.get(day) ?? new Map<string, number>();
        m.set(city2, (m.get(city2) || 0) + 1);
        memGeoCity.set(day, m);
      }
    }
  } catch {
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Periode-aggregaties (meerdere dagen)                                */
/* ------------------------------------------------------------------ */

/** isoDay-strings van de laatste `days` dagen (incl. vandaag). */
function dayStrsForRange(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(isoDay(d));
  }
  return out;
}

/** Begin (ms, UTC-middernacht) van de periode van `days` dagen incl. vandaag. */
function periodStartTs(days: number): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.getTime();
}

const visitorsKey = (ds: string) => `analytics:visitors:${ds}`;

/** Unieke bezoekers over de periode (union van de dag-sets). */
async function getVisitorsForRange(days: number): Promise<number> {
  const dayStrs = dayStrsForRange(days);
  try {
    const set = new Set<string>();
    if (isKvEnabled()) {
      const lists = await Promise.all(dayStrs.map((ds) => kvSMembers(visitorsKey(ds))));
      for (const list of lists) for (const v of list) set.add(v);
    } else {
      for (const ds of dayStrs) {
        const s = memVisitors.get(visitorsKey(ds));
        if (s) for (const v of s) set.add(v);
      }
    }
    return set.size;
  } catch {
    return 0;
  }
}

/** Som van een per-dag telhash (land/stad/herkomst) over de periode. */
async function sumDayHashes(
  keyFor: (ds: string) => string,
  memFor: Map<string, Map<string, number>>,
  days: number,
): Promise<Map<string, number>> {
  const dayStrs = dayStrsForRange(days);
  const sum = new Map<string, number>();
  if (isKvEnabled()) {
    const hashes = await Promise.all(dayStrs.map((ds) => kvHGetAll(keyFor(ds))));
    for (const hash of hashes) {
      for (const [k, c] of Object.entries(hash)) sum.set(k, (sum.get(k) || 0) + (Number(c) || 0));
    }
  } else {
    for (const ds of dayStrs) {
      const m = memFor.get(ds);
      if (m) for (const [k, c] of m) sum.set(k, (sum.get(k) || 0) + c);
    }
  }
  return sum;
}

function topEntries(m: Map<string, number>, limit: number): [string, number][] {
  return [...m.entries()]
    .filter(([k, c]) => k && c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

/** Top landen + steden over de periode. */
export async function getGeoForRange(
  days: number,
  limit = 12,
): Promise<{
  countries: { code: string; count: number }[];
  cities: { name: string; count: number }[];
}> {
  try {
    const [country, city] = await Promise.all([
      sumDayHashes(geoCountryKey, memGeoCountry, days),
      sumDayHashes(geoCityKey, memGeoCity, days),
    ]);
    return {
      countries: topEntries(country, limit).map(([code, count]) => ({ code, count })),
      cities: topEntries(city, limit).map(([name, count]) => ({ name, count })),
    };
  } catch {
    return { countries: [], cities: [] };
  }
}

/** Herkomst (traffic source) over de periode. */
export async function getHerkomstForRange(
  days: number,
  limit = 12,
): Promise<{ source: string; count: number }[]> {
  try {
    const sum = await sumDayHashes((ds) => `analytics:herkomst:${ds}`, memHerkomst, days);
    return topEntries(sum, limit).map(([source, count]) => ({ source, count }));
  } catch {
    return [];
  }
}

/**
 * Registreert een bezoek: unieke bezoeker (per dag), live-aanwezigheid en
 * eventueel een event (pageview/productweergave). `logType=null` (heartbeat)
 * houdt alleen de aanwezigheid vers zonder de eventlijst te vervuilen.
 */
export async function recordVisit(input: {
  visitorId?: string;
  path?: string;
  ip?: string;
  productId?: string;
  title?: string;
  /** Herkomst-label, alleen meegestuurd bij de eerste pageview van een sessie. */
  source?: string;
  /** Compacte winkelmand-momentopname (pageview én heartbeat). */
  cart?: LiveCart;
  /** Land (ISO-2) en stad uit de Vercel geo-headers (alleen bij pageview). */
  country?: string;
  city?: string;
  logType?: "pageview" | "view_item" | null;
}): Promise<void> {
  const { visitorId, path, ip, productId, title, source, cart, country, city, logType } = input;
  try {
    if (visitorId) {
      // Herkomst is alleen bij de éérste pageview aanwezig; leg 'm vast voor de
      // dagaggregatie en hergebruik 'm zodat de live-sessie de bron blijft tonen
      // ook als latere events (heartbeat) geen bron meesturen.
      if (source) await recordHerkomst(visitorId, source);
      const liveSource = cleanSource(source) ?? (await getVisitorSource(visitorId));
      await touchSession(visitorId, path, ip, liveSource, cleanCart(cart));
      if (country || city) await recordGeo(visitorId, country, city);
      if (isKvEnabled()) {
        await kvSAdd(dayKey(), visitorId);
      } else {
        const k = dayKey();
        const set = memVisitors.get(k) ?? new Set<string>();
        set.add(visitorId);
        memVisitors.set(k, set);
      }
    }
    if (logType === "pageview") await logEvent("pageview", { path });
    else if (logType === "view_item") await logEvent("view_item", { productId, title, path });
  } catch {
    /* best-effort */
  }
}

export async function getEvents(limit = MAX): Promise<AnalyticsEvent[]> {
  if (isKvEnabled()) {
    const kv = await kvLRange<AnalyticsEvent>(KEY, 0, limit - 1);
    if (kv.length) return kv;
  }
  return mem.slice(0, limit);
}

/** Geaggregeerde inzichten voor het admin-dashboard, over een periode in dagen. */
export async function getInsights(opts: { days?: number } = {}) {
  const days = Math.max(1, Math.min(90, Math.floor(opts.days || 1)));
  const sinceTs = periodStartTs(days);
  const events = await getEvents();
  // Event-gebaseerde cijfers (zoek/chat/views/conversies/pageviews) over de
  // gekozen periode; begrensd door de event-buffer (laatste ~1000 events).
  const inPeriod = events.filter((e) => typeof e.ts === "number" && e.ts >= sinceTs);

  const searches = new Map<string, number>();
  const viewed = new Map<string, { title: string; count: number }>();
  const recentChats: { question: string; ts: number }[] = [];
  let conversions = 0;
  let revenue = 0;
  let searchCount = 0;
  let chatCount = 0;
  let pageviews = 0;

  for (const e of inPeriod) {
    if (e.type === "search" && e.query) {
      searchCount++;
      const q = String(e.query).toLowerCase().trim();
      if (q) searches.set(q, (searches.get(q) || 0) + 1);
    } else if (e.type === "chat" && e.question) {
      chatCount++;
      if (recentChats.length < 40) recentChats.push({ question: String(e.question), ts: e.ts });
    } else if (e.type === "conversion") {
      conversions++;
      revenue += Number(e.value) || 0;
    } else if (e.type === "pageview") {
      pageviews++;
    } else if (e.type === "view_item" && (e.productId || e.title)) {
      const id = String(e.productId || e.title);
      const cur = viewed.get(id) ?? { title: String(e.title || id), count: 0 };
      cur.count++;
      viewed.set(id, cur);
    }
  }

  const topSearches = [...searches.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const topViewed = [...viewed.values()].sort((a, b) => b.count - a.count).slice(0, 20);

  // Bezoekers + geo + herkomst komen uit de dag-aggregaties (volledige periode).
  const [live, visitors, geo, herkomst] = await Promise.all([
    getLiveCount(),
    getVisitorsForRange(days),
    getGeoForRange(days, 12),
    getHerkomstForRange(days, 12),
  ]);

  // Conversieratio = conversies (events) / unieke bezoekers (dag-sets) × 100.
  const conversionRate = visitors > 0 ? Math.round((conversions / visitors) * 1000) / 10 : 0;

  return {
    period: { days },
    total: inPeriod.length,
    live,
    visitors,
    pageviews,
    conversions,
    revenue: Math.round(revenue * 100) / 100,
    conversionRate,
    searchCount,
    chatCount,
    topSearches,
    topViewed,
    recentChats,
    topCountries: geo.countries,
    topCities: geo.cities,
    herkomst,
  };
}
