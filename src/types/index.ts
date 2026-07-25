/**
 * KLUSR domain types.
 * These model the webshop data described in the project brief.
 */

export type AiContentStatus = "complete" | "missing" | "suggested" | "approved";

export interface StoreStock {
  storeId: string;
  /** Units available in this store. */
  quantity: number;
}

export interface ProductVariant {
  id: string;
  /** Human label e.g. "2.5L", "5L", "10L". */
  label: string;
  /** Content size in liters / units, for "per liter" calculations. */
  size?: number;
  unit?: "L" | "kg" | "st" | "m";
  price: number;
  compareAtPrice?: number;
  kluspasPrice: number;
  /** Stock per store for this specific variant. */
  stockByStore: StoreStock[];
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  date: string;
  verified?: boolean;
}

export interface Specification {
  group: string;
  items: { label: string; value: string }[];
}

export interface ProductFaq {
  question: string;
  answer: string;
}

export type ProductBadge = "ACTIE" | "BESTSELLER" | "PRO KEUZE" | "NIEUW" | "BUNDEL";

export interface Product {
  id: string;
  title: string;
  slug: string;
  brand: string;
  /** Short benefit bullets shown high on the PDP. */
  highlights: string[];
  description: string;
  images: string[];
  /** Base price (mirrors the default variant). */
  price: number;
  compareAtPrice?: number;
  kluspasPrice: number;
  category: string; // category slug
  subCategory?: string;
  badges?: ProductBadge[];
  rating: number;
  reviewCount: number;
  reviews?: Review[];
  /** EAN/GTIN — sterk signaal voor Google Shopping. */
  gtin?: string;
  specifications: Specification[];
  faqs?: ProductFaq[];
  processingAdvice?: string;
  variants: ProductVariant[];
  stockByStore: StoreStock[];
  /** Product ids frequently bought together. */
  frequentlyBoughtTogether: string[];
  /** Whether this product can be colour-matched (paint). */
  colorMatchable?: boolean;
  aiGeneratedContentStatus: AiContentStatus;
  /** Whether description/specs/faqs were AI generated (for the admin view). */
  contentFlags?: {
    description?: AiContentStatus;
    specifications?: AiContentStatus;
    faqs?: AiContentStatus;
    seo?: AiContentStatus;
  };
}

export interface Category {
  id: string;
  title: string;
  slug: string;
  image: string;
  icon?: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  subCategories?: { title: string; slug: string }[];
  /** Optionele groepering van subcategorieën voor het mega-menu (SEO-structuur). */
  subGroups?: { title: string; slug: string; subCategories: { title: string; slug: string }[] }[];
  /** Whether products in this category are paint (enables colour picker). */
  paint?: boolean;
}

/** The tinting base a colour is mixed in (light colours vs deep colours use a
 * different base, which affects price and available stock). */
export interface PaintBaseSelection {
  id: "wit" | "medium" | "deep";
  label: string;
  /** Per-unit surcharge on top of the variant price (EUR). */
  surcharge: number;
}

export interface SelectedColor {
  name: string;
  code: string; // e.g. RAL 9010
  hex: string;
  collection?: string;
  /** Portal-bron, bv. "kleurenwaaier-gamma" of "akzo" (voor zoeken/filteren). */
  provider?: string;
  /** Resolved tinting base for this colour. */
  base?: PaintBaseSelection;
}

export interface CartItem {
  /** Stable line key (product + variant + color). */
  key: string;
  productId: string;
  variantId: string;
  title: string;
  brand: string;
  image: string;
  variantLabel: string;
  slug: string;
  /** EAN/GTIN — getoond op de orderregel in het admin-overzicht. */
  gtin?: string;
  quantity: number;
  price: number;
  kluspasPrice: number;
  selectedColor?: SelectedColor;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  openingHours: { day: string; hours: string }[];
  lat: number;
  lng: number;
  image: string;
  isFlagship?: boolean;
  opening?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  category: string;
  readingTime: number;
  date: string;
  author: string;
  body: string[];
  /** Interne links naar relevante producten/categorieën — SEO-interlinking + conversie. */
  relatedLinks?: { label: string; href: string }[];
  /** Veelgestelde vragen — rendert op de pagina én levert FAQPage structured data. */
  faq?: { question: string; answer: string }[];
}

export type OrderStatus =
  | "open"
  | "pending"
  | "paid"
  | "authorized"
  | "shipped"
  | "delivered"
  | "canceled"
  | "failed"
  | "expired"
  | "refunded";

export interface OrderCustomer {
  email: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  /** ISO-landcode (NL, BE, …). Standaard NL. */
  country?: string;
  phone?: string;
  /** Zakelijke gegevens (alleen bij zakelijke bestellingen). */
  company?: string;
  cocNumber?: string;
  vatNumber?: string;
  /** Afwijkend factuuradres (optioneel). */
  billing?: {
    company?: string;
    street: string;
    postalCode: string;
    city: string;
  };
}

/** Verkoopkanaal van een order: webshop of de fysieke kassa (POS). */
export type OrderChannel = "web" | "pos";

/** Kassa-(POS)-specifieke gegevens bij een toonbankverkoop. */
export interface PosMeta {
  /** Vestiging waar de verkoop plaatsvond (store-id, bv. "nijverdal"). */
  storeId: string;
  /** Naam/initialen van de kassamedewerker (optioneel). */
  cashier?: string;
  /** Betaalwijze aan de kassa. */
  method: "cash" | "terminal" | "pin" | "manual";
  /** Bij contant: ontvangen bedrag en teruggegeven wisselgeld. */
  cashGiven?: number;
  change?: number;
  /** Mollie-terminal waarop gepind is (indien van toepassing). */
  terminalId?: string;
}

export interface Order {
  id: string;
  reference: string;
  customer: OrderCustomer;
  items: CartItem[];
  paymentStatus: OrderStatus;
  paymentMethod?: string;
  molliePaymentId?: string;
  /** Verkoopkanaal (default "web"). POS-orders komen van de fysieke kassa. */
  channel?: OrderChannel;
  /** Kassagegevens (alleen bij channel === "pos"). */
  pos?: PosMeta;
  /** Testbestelling (Mollie test-mode of demo-seed) — telt niet mee in de rapportage. */
  isTest?: boolean;
  /** (Deels) terugbetaald bedrag via Mollie (in euro's). */
  refundedAmount?: number;
  /**
   * GA4-attributie, op de client uit de cookies gehaald bij het afrekenen. Wordt
   * gebruikt voor de server-side `purchase` (Measurement Protocol) vanuit de
   * webhook, zodat élke betaalde order in GA4 (en via de Ads-koppeling in Google
   * Ads) telt — los van of de klant terugkeert naar /bedankt of cookies accepteert.
   */
  ga?: {
    /** GA4 client-id (uit het `_ga`-cookie). */
    clientId?: string;
    /** GA4 sessie-id (uit het `_ga_<meet-id>`-cookie). */
    sessionId?: string;
    /** Google Ads click-id (uit het `_gcl_aw`-cookie). */
    gclid?: string;
    /** Analytics-toestemming op het moment van afrekenen. */
    consent?: boolean;
  };
  subtotal: number;
  shipping: number;
  total: number;
  kluspasSavings: number;
  createdAt: string;
  estimatedDelivery?: string;
  /** Fulfilment via Channable → Tilroy. */
  channableStatus?: "pending" | "sent" | "failed" | "demo";
  channableOrderId?: string;
  /** Tijdstip waarop de bestelbevestiging is verstuurd (voorkomt dubbele mails). */
  confirmationSentAt?: string;
  /** Tijdstip waarop het reviewverzoek is verstuurd (~3 dagen na verzending). */
  reviewRequestedAt?: string;
  /** Verzending (PostNL-label). */
  shipment?: {
    carrier: "postnl";
    barcode: string;
    trackTrace?: string;
    labelCreatedAt: string;
  };
}

/** Betaalmethode zoals getoond op de checkout (uit Mollie of de fallback). */
export interface PaymentMethodInfo {
  /** Mollie method-id (bv. "ideal", "bancontact", "creditcard", "klarna"). */
  id: string;
  /** Weergavenaam (Mollie `description`). */
  label: string;
  /** Officieel logo (SVG-URL). */
  image?: string;
  /** iDEAL-banken (alleen aanwezig wanneer Mollie issuers teruggeeft). */
  issuers?: { id: string; name: string; image?: string }[];
}

export interface KlushulpTask {
  id: string;
  title: string;
  slug: string;
  icon: string;
  description: string;
  /** Suggested category slugs / product ids for this job. */
  relatedCategories: string[];
}
