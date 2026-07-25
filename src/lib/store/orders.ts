import type { CartItem, Order, OrderCustomer, OrderStatus } from "@/types";
import {
  isKvEnabled,
  kvDel,
  kvGetJSON,
  kvSAdd,
  kvSetJSON,
  kvSetNX,
  kvSMembers,
} from "./kv";

/**
 * Orderstore met persistente opslag via KV (Upstash/Vercel KV) en een in-memory
 * cache als fallback. Met KV blijven orders bewaard tussen serverless-instances
 * en deploys — nodig voor betrouwbare bestelstatus, webhook-afhandeling en het
 * admin-overzicht. Zonder KV draait alles in-memory (demo).
 *
 * Een paar seeded orders blijven bestaan zodat de "Bestelstatus"-pagina out of
 * the box werkt om te demonstreren.
 */

const orders = new Map<string, Order>();

const KEY = {
  order: (id: string) => `order:${id}`,
  ref: (reference: string) => `orderref:${reference.toUpperCase()}`,
  mollie: (paymentId: string) => `ordermollie:${paymentId}`,
  mailLock: (id: string) => `ordermail:${id}`,
  reviewLock: (id: string) => `orderreview:${id}`,
  email: (e: string) => `orders:email:${e.trim().toLowerCase()}`,
  index: "order:index",
};

function generateId(): string {
  return "ord_" + Math.random().toString(36).slice(2, 10);
}

function generateReference(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `KLR-${n}`;
}

/** Schrijf een order weg naar de in-memory cache én (indien aan) naar KV. */
async function persist(order: Order): Promise<void> {
  orders.set(order.id, order);
  if (!isKvEnabled()) return;
  await kvSetJSON(KEY.order(order.id), order);
  await kvSetJSON(KEY.ref(order.reference), order.id);
  await kvSAdd(KEY.index, order.id);
  if (order.customer.email) await kvSAdd(KEY.email(order.customer.email), order.id);
  if (order.molliePaymentId) await kvSetJSON(KEY.mollie(order.molliePaymentId), order.id);
}

/** Laad een order op id: eerst cache, dan KV, dan seeded. */
async function loadById(id: string): Promise<Order | undefined> {
  const mem = orders.get(id);
  if (mem) return mem;
  const kv = await kvGetJSON<Order>(KEY.order(id));
  if (kv) {
    orders.set(kv.id, kv);
    return kv;
  }
  return seededOrders.find((o) => o.id === id || o.reference === id);
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  kluspasSavings: number;
  paymentMethod?: string;
  /** GA4-attributie uit de cookies (voor de server-side `purchase` in de webhook). */
  ga?: Order["ga"];
  /** Verkoopkanaal (default "web"). Zet "pos" voor een kassaverkoop. */
  channel?: Order["channel"];
  /** Kassagegevens (alleen bij channel === "pos"). */
  pos?: Order["pos"];
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const id = generateId();
  const now = new Date();
  const delivery = new Date(now);
  delivery.setDate(delivery.getDate() + 1);

  const order: Order = {
    id,
    reference: generateReference(),
    customer: input.customer,
    items: input.items,
    paymentStatus: "open",
    paymentMethod: input.paymentMethod,
    ...(input.channel ? { channel: input.channel } : {}),
    ...(input.pos ? { pos: input.pos } : {}),
    ...(input.ga ? { ga: input.ga } : {}),
    subtotal: input.subtotal,
    shipping: input.shipping,
    total: input.total,
    kluspasSavings: input.kluspasSavings,
    createdAt: now.toISOString(),
    estimatedDelivery: delivery.toISOString(),
  };
  await persist(order);
  return order;
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return loadById(id);
}

export async function getOrderByReference(reference: string): Promise<Order | undefined> {
  const ref = reference.trim().toUpperCase();
  for (const order of orders.values()) {
    if (order.reference.toUpperCase() === ref) return order;
  }
  if (isKvEnabled()) {
    const id = await kvGetJSON<string>(KEY.ref(ref));
    if (id) {
      const order = await loadById(id);
      if (order) return order;
    }
  }
  return seededOrders.find((o) => o.reference.toUpperCase() === ref);
}

export async function getOrderByMollieId(paymentId: string): Promise<Order | undefined> {
  for (const order of orders.values()) {
    if (order.molliePaymentId === paymentId) return order;
  }
  if (isKvEnabled()) {
    const id = await kvGetJSON<string>(KEY.mollie(paymentId));
    if (id) return loadById(id);
  }
  return undefined;
}

export async function setMolliePaymentId(orderId: string, molliePaymentId: string): Promise<void> {
  const order = await loadById(orderId);
  if (!order) return;
  order.molliePaymentId = molliePaymentId;
  await persist(order);
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  patch?: Partial<Pick<Order, "isTest" | "refundedAmount">>,
): Promise<Order | undefined> {
  const order = await loadById(orderId);
  if (!order) return undefined;
  order.paymentStatus = status;
  if (patch?.isTest != null) order.isTest = patch.isTest;
  if (patch?.refundedAmount != null) order.refundedAmount = patch.refundedAmount;
  await persist(order);
  return order;
}

/**
 * Vul ONTBREKENDE klantgegevens aan (bv. naam/bezorgadres dat pas ná de betaling
 * uit een wallet/Mollie binnenkomt bij express-checkout). Bestaande, niet-lege
 * velden blijven staan zodat een normale checkout nooit wordt overschreven.
 */
export async function updateOrderContact(
  orderId: string,
  partial: Partial<OrderCustomer>,
): Promise<void> {
  const order = await loadById(orderId);
  if (!order) return;
  const c = order.customer;
  const keep = (cur: string | undefined, next: string | undefined): string =>
    cur && cur.trim() ? cur : (next?.trim() || cur || "");
  order.customer = {
    ...c,
    email: c.email?.trim() ? c.email : (partial.email?.trim() || c.email),
    firstName: keep(c.firstName, partial.firstName),
    lastName: keep(c.lastName, partial.lastName),
    street: keep(c.street, partial.street),
    postalCode: keep(c.postalCode, partial.postalCode),
    city: keep(c.city, partial.city),
    country: c.country?.trim() ? c.country : (partial.country?.trim() || c.country),
    phone: c.phone?.trim() ? c.phone : (partial.phone?.trim() || c.phone),
  };
  await persist(order);
}

/**
 * Claim het versturen van de bestelbevestiging — exact één keer per order. Met
 * KV is dit een atomic SET NX (veilig over instances heen); zonder KV een
 * synchrone check-and-set in-memory. Onbekende orders leveren `false`.
 */
export async function claimConfirmationEmail(orderId: string): Promise<boolean> {
  if (isKvEnabled()) {
    const claimed = await kvSetNX(KEY.mailLock(orderId), new Date().toISOString());
    if (!claimed) return false;
    const order = await loadById(orderId);
    if (order) {
      order.confirmationSentAt = new Date().toISOString();
      await persist(order);
    }
    return true;
  }
  const order = orders.get(orderId);
  if (!order || order.confirmationSentAt) return false;
  order.confirmationSentAt = new Date().toISOString();
  return true;
}

/** Geef de claim weer vrij (bv. na een mislukte verzending) zodat een retry mag. */
export async function releaseConfirmationEmail(orderId: string): Promise<void> {
  if (isKvEnabled()) await kvDel(KEY.mailLock(orderId));
  const order = orders.get(orderId) ?? (await loadById(orderId));
  if (order) {
    order.confirmationSentAt = undefined;
    if (isKvEnabled()) await persist(order);
  }
}

/**
 * Claim het versturen van het reviewverzoek — exact één keer per order (zoals de
 * bestelbevestiging). Voorkomt dat de dagelijkse cron dezelfde order meerdere
 * keren mailt, ook over serverless-instances heen. Onbekende of al-aangeschreven
 * orders leveren `false`.
 */
export async function claimReviewRequest(orderId: string): Promise<boolean> {
  if (isKvEnabled()) {
    const claimed = await kvSetNX(KEY.reviewLock(orderId), new Date().toISOString());
    if (!claimed) return false;
    const order = await loadById(orderId);
    if (order) {
      order.reviewRequestedAt = new Date().toISOString();
      await persist(order);
    }
    return true;
  }
  const order = orders.get(orderId) ?? (await loadById(orderId));
  if (!order || order.reviewRequestedAt) return false;
  order.reviewRequestedAt = new Date().toISOString();
  return true;
}

/** Geef de review-claim weer vrij (bv. na een mislukte verzending) voor een retry. */
export async function releaseReviewRequest(orderId: string): Promise<void> {
  if (isKvEnabled()) await kvDel(KEY.reviewLock(orderId));
  const order = orders.get(orderId) ?? (await loadById(orderId));
  if (order) {
    order.reviewRequestedAt = undefined;
    if (isKvEnabled()) await persist(order);
  }
}

export async function markChannable(
  orderId: string,
  status: NonNullable<Order["channableStatus"]>,
  channableOrderId?: string,
): Promise<void> {
  const order = await loadById(orderId);
  if (!order) return;
  order.channableStatus = status;
  if (channableOrderId) order.channableOrderId = channableOrderId;
  await persist(order);
}

/** Orders van één klant (op e-mailadres), nieuwste eerst — voor "Mijn account". */
export async function listOrdersByEmail(email: string): Promise<Order[]> {
  const target = email.trim().toLowerCase();
  if (!target) return [];
  const byId = new Map<string, Order>();
  if (isKvEnabled()) {
    const ids = await kvSMembers(KEY.email(target));
    const loaded = await Promise.all(ids.map((id) => loadById(id)));
    for (const o of loaded) if (o) byId.set(o.id, o);
  }
  for (const o of orders.values()) {
    if (o.customer.email.trim().toLowerCase() === target) byId.set(o.id, o);
  }
  for (const o of seededOrders) {
    if (o.customer.email.trim().toLowerCase() === target && !byId.has(o.id)) byId.set(o.id, o);
  }
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Alle orders (KV + in-memory + seeded), nieuwste eerst — voor het admin-overzicht. */
export async function listOrders(): Promise<Order[]> {
  const byId = new Map<string, Order>();
  if (isKvEnabled()) {
    const ids = await kvSMembers(KEY.index);
    const loaded = await Promise.all(ids.map((id) => loadById(id)));
    for (const o of loaded) if (o) byId.set(o.id, o);
  }
  for (const o of orders.values()) byId.set(o.id, o);
  const live = [...byId.values()];
  const liveIds = new Set(live.map((o) => o.id));
  return [...live, ...seededOrders.filter((o) => !liveIds.has(o.id))].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}

/** Markeer een order als verzonden en bewaar de PostNL-verzendgegevens. */
export async function setShipped(
  orderId: string,
  shipment: NonNullable<Order["shipment"]>,
): Promise<Order | undefined> {
  const order = (await loadById(orderId)) ?? seededOrders.find((o) => o.id === orderId);
  if (!order) return undefined;
  order.shipment = shipment;
  if (order.paymentStatus === "paid" || order.paymentStatus === "authorized") {
    order.paymentStatus = "shipped";
  }
  await persist(order);
  return order;
}

/** Seeded example orders for the bestelstatus lookup page. */
export const seededOrders: Order[] = [
  {
    id: "ord_demo123",
    isTest: true,
    reference: "KLR-204815",
    customer: {
      email: "klant@voorbeeld.nl",
      firstName: "Demo",
      lastName: "Klant",
      street: "Grotestraat 1",
      postalCode: "7443 BR",
      city: "Nijverdal",
    },
    items: [],
    paymentStatus: "shipped",
    paymentMethod: "ideal",
    subtotal: 95.4,
    shipping: 0,
    total: 95.4,
    kluspasSavings: 15,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "ord_demo456",
    isTest: true,
    reference: "KLR-309184",
    customer: {
      email: "test@klus-r.nl",
      firstName: "Jan",
      lastName: "Bakker",
      street: "Van den Bergsweg 3",
      postalCode: "7442 CK",
      city: "Nijverdal",
      phone: "06 12345678",
    },
    items: [
      {
        key: "seed-1",
        productId: "tilroy-demo",
        variantId: "tilroy-demo-1",
        title: "Histor Exterior Zijdeglans",
        brand: "Histor",
        image: "",
        variantLabel: "Wit · 2,5 L",
        slug: "histor-exterior-zijdeglans-demo",
        quantity: 2,
        price: 34.95,
        kluspasPrice: 31.95,
      },
    ],
    paymentStatus: "paid",
    paymentMethod: "ideal",
    subtotal: 69.9,
    shipping: 0,
    total: 69.9,
    kluspasSavings: 6,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
  },
];
