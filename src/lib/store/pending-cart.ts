/**
 * "Winkelwagen-vergeten" opslag. We bewaren per e-mailadres een laatste
 * winkelwagen-snapshot zodra de klant op de checkout een geldig e-mailadres
 * invult. Een cron (/api/cron/abandoned-cart) stuurt later een herinnering als
 * de bestelling niet is afgerond.
 *
 * KV wanneer geconfigureerd; anders in-memory (demo). Gooit nooit.
 */

import {
  isKvEnabled,
  kvGetJSON,
  kvSetJSON,
  kvSAdd,
  kvSMembers,
  kvSRem,
  kvDel,
  kvExpire,
} from "./kv";

export interface PendingCartItem {
  title: string;
  quantity: number;
  price: number;
  image?: string;
  slug?: string;
  /** Maat en kleur, bv. "2,5 L · Monumentengroen" — voor de herinneringsmail. */
  variant?: string;
}

export interface PendingCart {
  email: string;
  name?: string;
  items: PendingCartItem[];
  total: number;
  updatedAt: string;
  reminded: boolean;
  /**
   * Wanneer dit adres naar het VDM-dashboard is doorgegeven.
   *
   * Sticky, net als `reminded`: het e-mailveld in de checkout meldt bij elke
   * wijziging opnieuw (met 1,2 s debounce), en zonder deze rem stuur je één
   * bezoeker tien keer door. De vdmsite-sessie meldde dezelfde valkuil aan hun
   * kant.
   */
  leadSentAt?: string;
}

const mem = new Map<string, PendingCart>();
const norm = (e: string) => e.trim().toLowerCase();
const KEY = {
  cart: (e: string) => `cart:pending:${norm(e)}`,
  index: "cart:pending:index",
};

/** Bewaartermijn van een winkelwagen-snapshot in KV: 30 dagen (in seconden). */
const CART_TTL_SECONDS = 30 * 24 * 60 * 60;
/** Maximaal aantal bewaarde winkelwagens — voorkomt onbegrensde KV-groei. */
const MAX_PENDING_CARTS = 1000;

/** Geeft terug of dit adres al eerder is doorgegeven aan het dashboard. */
export async function rememberCart(input: {
  email: string;
  name?: string;
  items: PendingCartItem[];
  total: number;
}): Promise<{ alDoorgegeven: boolean }> {
  const email = norm(input.email);
  if (!email || input.items.length === 0) return { alDoorgegeven: true };
  const existing = (await loadCart(email)) ?? null;
  const cart: PendingCart = {
    email,
    name: input.name || existing?.name,
    items: input.items,
    total: input.total,
    updatedAt: new Date().toISOString(),
    // Reminder-vlag sticky houden: zo sturen we hooguit één herinnering, ook al
    // werkt de klant de winkelwagen daarna nog bij.
    reminded: existing?.reminded ?? false,
    leadSentAt: existing?.leadSentAt,
  };
  mem.set(email, cart);
  if (isKvEnabled()) {
    await kvSetJSON(KEY.cart(email), cart);
    // TTL zodat oude (achtergelaten) mandjes vanzelf opruimen na 30 dagen.
    await kvExpire(KEY.cart(email), CART_TTL_SECONDS);
    await kvSAdd(KEY.index, email);
    // Best-effort: houd het totaal aantal begrensd. Gooit nooit.
    await pruneIfNeeded();
  }
  return { alDoorgegeven: Boolean(existing?.leadSentAt) };
}

/** Stempelt dat dit adres naar het dashboard is doorgegeven. */
export async function markLeadSent(email: string): Promise<void> {
  const key = norm(email);
  const cart = await loadCart(key);
  if (!cart) return;
  const bijgewerkt: PendingCart = { ...cart, leadSentAt: new Date().toISOString() };
  mem.set(key, bijgewerkt);
  if (isKvEnabled()) {
    await kvSetJSON(KEY.cart(key), bijgewerkt);
    await kvExpire(KEY.cart(key), CART_TTL_SECONDS);
  }
}

/**
 * Houd het aantal bewaarde winkelwagens onder MAX_PENDING_CARTS. Alleen actief
 * boven de cap (de meeste calls doen dus niets). De oudste mandjes (op
 * updatedAt) vallen af; verlopen/lege keys (TTL) worden uit de index gehaald.
 * Volledig best-effort en non-throwing — mag de checkout-flow nooit raken.
 */
async function pruneIfNeeded(): Promise<void> {
  if (!isKvEnabled()) return;
  const emails = await kvSMembers(KEY.index);
  if (emails.length <= MAX_PENDING_CARTS) return;
  const loaded = await Promise.all(
    emails.map(async (e) => ({ email: e, cart: await loadCart(e) })),
  );
  // Verlopen keys (geen cart meer) eerst uit de index halen.
  const stale = loaded.filter((l) => !l.cart).map((l) => l.email);
  const live = loaded.filter(
    (l): l is { email: string; cart: PendingCart } => Boolean(l.cart),
  );
  // Oudste mandjes boven de cap verwijderen (nieuwste blijven bewaard).
  live.sort((a, b) => (a.cart.updatedAt < b.cart.updatedAt ? 1 : -1));
  const overflow = live.slice(MAX_PENDING_CARTS).map((l) => l.email);
  for (const e of [...stale, ...overflow]) {
    mem.delete(norm(e));
    await kvDel(KEY.cart(e));
    await kvSRem(KEY.index, e);
  }
}

async function loadCart(email: string): Promise<PendingCart | null> {
  if (isKvEnabled()) {
    const c = await kvGetJSON<PendingCart>(KEY.cart(email));
    if (c) return c;
  }
  return mem.get(norm(email)) ?? null;
}

export async function clearPendingCart(email: string): Promise<void> {
  const key = norm(email);
  if (!key) return;
  mem.delete(key);
  if (isKvEnabled()) await kvDel(KEY.cart(key));
  // Index laten staan is onschadelijk (load geeft dan null terug).
}

export async function markReminded(email: string): Promise<void> {
  const c = await loadCart(email);
  if (!c) return;
  c.reminded = true;
  mem.set(norm(email), c);
  if (isKvEnabled()) await kvSetJSON(KEY.cart(email), c);
}

/** Alle openstaande winkelwagens (KV + in-memory), voor de cron. */
export async function listPendingCarts(): Promise<PendingCart[]> {
  const byEmail = new Map<string, PendingCart>();
  if (isKvEnabled()) {
    const emails = await kvSMembers(KEY.index);
    const loaded = await Promise.all(emails.map((e) => loadCart(e)));
    for (const c of loaded) if (c) byEmail.set(c.email, c);
  }
  for (const c of mem.values()) byEmail.set(c.email, c);
  return [...byEmail.values()];
}
