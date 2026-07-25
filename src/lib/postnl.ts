import type { Order } from "@/types";

/**
 * PostNL Send API — verzendlabel aanmaken.
 *
 * Degradeert naar demo (geen echte call) zonder credentials en gooit nooit,
 * zodat de admin-UI altijd een gestructureerd resultaat krijgt.
 *
 * Activeren: POSTNL_API_KEY + POSTNL_CUSTOMER_CODE + POSTNL_CUSTOMER_NUMBER
 * (optioneel POSTNL_COLLECTION_LOCATION, POSTNL_SENDER_NAME, en POSTNL_API_BASE
 * voor de sandbox: https://api-sandbox.postnl.nl).
 */

// Accepteer zowel de Engelse als de Nederlandse env-namen (zoals in Vercel gezet).
const API_KEY = process.env.POSTNL_API_KEY || process.env.POSTNL_API;
const CUSTOMER_CODE = process.env.POSTNL_CUSTOMER_CODE || process.env.POSTNL_KLANTCODE;
const CUSTOMER_NUMBER = process.env.POSTNL_CUSTOMER_NUMBER || process.env.POSTNL_KLANTNUMMER;
const COLLECTION_LOCATION =
  process.env.POSTNL_COLLECTION_LOCATION || process.env.POSTNL_BLS || "000000";
// Barcode-serie/range voor de Barcode-API (bv. "0000000-9999999").
const BARCODE_SERIE = process.env.POSTNL_BARCODE_SERIE;
const SENDER_NAME = process.env.POSTNL_SENDER_NAME || "KLUSR B.V.";
// Afzender-/retouradres (AddressType 02) — PostNL vereist dit naast de ontvanger.
const SENDER_STREET = process.env.POSTNL_SENDER_STREET || "";
const SENDER_HOUSENR = process.env.POSTNL_SENDER_HOUSENR || "";
const SENDER_HOUSENR_EXT = process.env.POSTNL_SENDER_HOUSENR_EXT || "";
const SENDER_ZIPCODE = process.env.POSTNL_SENDER_ZIPCODE || "";
const SENDER_CITY = process.env.POSTNL_SENDER_CITY || "";
const SENDER_COUNTRY = process.env.POSTNL_SENDER_COUNTRY || "NL";
const API_BASE = (process.env.POSTNL_API_BASE || "https://api.postnl.nl").replace(/\/$/, "");

// Productcodes verschillen per PostNL-contract → overschrijfbaar via env. Een
// binnenlandse code naar het buitenland geeft PostNL-fout 1900501 ("Countries in
// receiver and sender address not allowed together for this product").
const PRODUCT_NL = process.env.POSTNL_PRODUCT_CODE_NL || "3085"; // Pakket binnenland
const PRODUCT_NL_BRIEVENBUS = process.env.POSTNL_PRODUCT_CODE_BRIEVENBUS || "2928"; // Brievenbuspakje (NL)
const PRODUCT_EU = process.env.POSTNL_PRODUCT_CODE_EU || "4945"; // Pakket EU (incl. België)

// Barcodetype per bestemming. Binnenland/EU gebruiken "3S"; voor GlobalPack
// (buiten de EU, of contracten die het buitenland als GlobalPack behandelen) een
// S10-type zoals "CD" — overschrijfbaar via env. PostNL-fout 10701 ("not a valid
// S10 barcode") duidt op een bestemming die een S10-barcode vereist. GlobalPack
// gebruikt vaak een aparte klantcode als barcode-Range.
const BARCODE_TYPE_NL = process.env.POSTNL_BARCODE_TYPE || "3S";
// Buitenland/GlobalPack: S10-barcodetype ("CD"), overschrijfbaar via env.
const BARCODE_TYPE_INTL = process.env.POSTNL_BARCODE_TYPE_INTL || "CD";
// Serie (barcode-bereik) per type. POSTNL_BARCODE_NON_EU (bv. "0000-9999") is de
// GlobalPack-serie; binnenland gebruikt POSTNL_BARCODE_SERIE.
const BARCODE_SERIE_INTL = process.env.POSTNL_BARCODE_NON_EU || BARCODE_SERIE;
const GLOBALPACK_RANGE = process.env.POSTNL_GLOBALPACK_RANGE;

export function isPostNLConfigured(): boolean {
  return Boolean(API_KEY && CUSTOMER_CODE && CUSTOMER_NUMBER);
}

export interface LabelResult {
  ok: boolean;
  configured: boolean;
  demo?: boolean;
  status: number;
  message: string;
  barcode?: string;
  trackTrace?: string;
  /** Base64-PDF van het label (indien beschikbaar). */
  labelBase64?: string;
  response?: unknown;
}

function splitStreet(street = ""): { street: string; houseNr: string; houseNrExt?: string } {
  const s = (street || "").trim();
  // Voorkeur: "Straatnaam 12" of "Straatnaam 12a" / "Straatnaam 12 bis".
  let m = s.match(/^(.*?)\s+(\d+)\s*([a-zA-Z][\w-]*)?$/);
  if (m) return { street: m[1].trim(), houseNr: m[2], houseNrExt: m[3]?.trim() || undefined };
  // Terugval: pak het laatste getal in de string (bv. "Dwarsweg9", "Straat12-3").
  m = s.match(/^(.*?)(\d+)\s*([a-zA-Z][\w-]*)?\s*$/);
  if (m && m[2]) {
    return {
      street: (m[1] || "").replace(/[\s,.-]+$/, "").trim(),
      houseNr: m[2],
      houseNrExt: m[3]?.trim() || undefined,
    };
  }
  return { street: s, houseNr: "" };
}

function trackTraceUrl(barcode: string, postalCode: string, country = "NL"): string {
  const zip = postalCode.replace(/\s/g, "").toUpperCase();
  const dest = (country || "NL").toUpperCase().slice(0, 2);
  return `https://postnl.nl/tracktrace/?B=${encodeURIComponent(barcode)}&P=${encodeURIComponent(zip)}&D=${encodeURIComponent(dest)}&T=C`;
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function generateBarcode(
  type: string,
  range: string,
  serie?: string,
  customerCode: string = CUSTOMER_CODE!,
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      CustomerCode: customerCode,
      CustomerNumber: CUSTOMER_NUMBER!,
      Type: type,
      Range: range,
    });
    if (serie) params.set("Serie", serie);
    const res = await fetch(`${API_BASE}/shipment/v1_1/barcode?${params.toString()}`, {
      headers: { apikey: API_KEY!, Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { Barcode?: string };
    return data?.Barcode ?? null;
  } catch {
    return null;
  }
}

export async function createLabel(
  order: Order,
  opts?: { brievenbus?: boolean },
): Promise<LabelResult> {
  const c = order.customer;

  if (!isPostNLConfigured()) {
    const demoBarcode = `3SDEMO${order.reference.replace(/\D/g, "")}`;
    return {
      ok: true,
      configured: false,
      demo: true,
      status: 0,
      barcode: demoBarcode,
      trackTrace: trackTraceUrl(demoBarcode, c.postalCode, c.country),
      message: "PostNL niet geconfigureerd — demo-label aangemaakt (geen echte verzending).",
    };
  }

  try {
    const { street, houseNr, houseNrExt } = splitStreet(c.street);
    if (!houseNr) {
      return {
        ok: false,
        configured: true,
        status: 422,
        message: `Adres mist een herkenbaar huisnummer ("${c.street || "—"}"). Controleer het bezorgadres en maak het label opnieuw aan.`,
      };
    }
    const receiverCountry = (c.country || "NL").toUpperCase().slice(0, 2);
    const isDomestic = receiverCountry === "NL";
    // Binnenland (NL) → pakket/brievenbus; buitenland (België e.d.) → EU-pakket.
    const productCode = isDomestic
      ? opts?.brievenbus
        ? PRODUCT_NL_BRIEVENBUS
        : PRODUCT_NL
      : PRODUCT_EU;
    // Barcodetype/-range volgt de bestemming (zie env-uitleg bovenaan).
    const barcodeType = isDomestic ? BARCODE_TYPE_NL : BARCODE_TYPE_INTL;
    const barcodeSerie = isDomestic ? BARCODE_SERIE : BARCODE_SERIE_INTL;
    // GlobalPack gebruikt vaak een aparte klantcode (als Range én CustomerCode).
    const barcodeCustomer = (isDomestic ? CUSTOMER_CODE : GLOBALPACK_RANGE || CUSTOMER_CODE)!;
    const barcode =
      (await generateBarcode(barcodeType, barcodeCustomer, barcodeSerie, barcodeCustomer)) ||
      `${barcodeType}${barcodeCustomer}${Date.now()}`;

    const body = {
      Customer: {
        CustomerCode: CUSTOMER_CODE,
        CustomerNumber: CUSTOMER_NUMBER,
        CollectionLocation: COLLECTION_LOCATION,
        ContactPerson: SENDER_NAME,
        Name: SENDER_NAME,
      },
      Message: {
        MessageID: order.reference,
        MessageTimeStamp: nowStamp(),
        Printertype: "GraphicFile|PDF",
      },
      Shipments: [
        {
          Addresses: [
            {
              AddressType: "01",
              FirstName: c.firstName,
              Name: c.lastName,
              Street: street,
              HouseNr: houseNr,
              ...(houseNrExt ? { HouseNrExt: houseNrExt } : {}),
              Zipcode: c.postalCode.replace(/\s/g, "").toUpperCase(),
              City: c.city,
              Countrycode: receiverCountry,
            },
            {
              AddressType: "02",
              CompanyName: SENDER_NAME,
              Name: SENDER_NAME,
              Street: SENDER_STREET,
              HouseNr: SENDER_HOUSENR,
              ...(SENDER_HOUSENR_EXT ? { HouseNrExt: SENDER_HOUSENR_EXT } : {}),
              Zipcode: SENDER_ZIPCODE.replace(/\s/g, "").toUpperCase(),
              City: SENDER_CITY,
              Countrycode: SENDER_COUNTRY,
            },
          ],
          Barcode: barcode,
          Dimension: { Weight: "2000" },
          ProductCodeDelivery: productCode,
          Reference: order.reference,
        },
      ],
    };

    const res = await fetch(`${API_BASE}/shipment/v2_2/label?confirm=true`, {
      method: "POST",
      headers: { apikey: API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ResponseShipments?: { Barcode?: string; Labels?: { Content?: string }[] }[];
    };

    if (!res.ok) {
      return {
        ok: false,
        configured: true,
        status: res.status,
        message: `PostNL gaf een fout (HTTP ${res.status}). Controleer de credentials en het adres.`,
        response: data,
      };
    }

    const shp = data?.ResponseShipments?.[0];
    const finalBarcode = shp?.Barcode || barcode;
    return {
      ok: true,
      configured: true,
      status: res.status,
      barcode: finalBarcode,
      trackTrace: trackTraceUrl(finalBarcode, c.postalCode, receiverCountry),
      labelBase64: shp?.Labels?.[0]?.Content,
      message: `Verzendlabel aangemaakt (barcode ${finalBarcode}).`,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      status: 0,
      message: "Aanmaken van het PostNL-label is mislukt (netwerk/timeout).",
      response: String(err),
    };
  }
}
