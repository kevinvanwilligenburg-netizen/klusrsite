import { NextResponse } from "next/server";
import { isExcludedIp, logEvent, recordVisit } from "@/lib/store/analytics";

export const runtime = "nodejs";

// Client-events die we serverside vastleggen.
const ALLOWED = new Set([
  "search",
  "view",
  "color_selected",
  "pageview",
  "heartbeat",
  "view_item",
]);

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "";
}

/** Land (ISO-2) + stad uit de Vercel geo-headers (best-effort). */
function geoOf(req: Request): { country?: string; city?: string } {
  const country = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase() || "";
  const cityRaw = req.headers.get("x-vercel-ip-city")?.trim() || "";
  let city = "";
  try {
    city = cityRaw ? decodeURIComponent(cityRaw) : "";
  } catch {
    city = cityRaw;
  }
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : undefined,
    city: city ? city.slice(0, 80) : undefined,
  };
}

export async function POST(req: Request) {
  // Eigen/uitgesloten verkeer niet meetellen (env INTERNAL_IPS + admin-lijst in KV).
  const ip = clientIp(req);
  if (ip && (await isExcludedIp(ip))) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    query?: string;
    path?: string;
    visitorId?: string;
    productId?: string;
    title?: string;
    source?: string;
    cart?: { count?: unknown; value?: unknown };
  };
  const type = String(body.type || "");
  if (!ALLOWED.has(type)) return NextResponse.json({ ok: false }, { status: 400 });

  const visitorId = body.visitorId ? String(body.visitorId).slice(0, 64) : undefined;
  const path = body.path ? String(body.path).slice(0, 200) : undefined;
  // Herkomst-label (alleen op de eerste pageview) en compacte winkelmand.
  const source = body.source ? String(body.source).slice(0, 80) : undefined;
  const cart =
    body.cart && typeof body.cart === "object"
      ? { count: Number(body.cart.count) || 0, value: Number(body.cart.value) || 0 }
      : undefined;

  if (type === "pageview" || type === "view") {
    await recordVisit({ visitorId, path, ip, source, cart, ...geoOf(req), logType: "pageview" });
  } else if (type === "heartbeat") {
    await recordVisit({ visitorId, path, ip, cart, logType: null });
  } else if (type === "view_item") {
    await recordVisit({
      visitorId,
      path,
      ip,
      ...geoOf(req),
      productId: body.productId ? String(body.productId).slice(0, 64) : undefined,
      title: body.title ? String(body.title).slice(0, 160) : undefined,
      logType: "view_item",
    });
  } else {
    await logEvent(type, {
      query: body.query ? String(body.query).slice(0, 120) : undefined,
      path,
    });
  }

  return NextResponse.json({ ok: true });
}
