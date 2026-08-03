import type { NextRequest } from "next/server";

/**
 * Een vierkant kleurvlak als SVG: /api/kleurplaatje?hex=&naam=&code=
 *
 * Voor de tweede productfoto bij voorgemengde verf, en voor
 * `g:additional_image_link` in de Shopping-feed — daar staan tientallen
 * kleurvarianten met exact dezelfde blikfoto naast elkaar.
 *
 * SVG en geen PNG: een paar honderd bytes in plaats van tientallen kB, en
 * scherp op elk scherm. Vierkant, want de productfoto's zijn dat ook en Google
 * rekent af op afwijkende verhoudingen.
 *
 * De randgevallen die het ontwerp bepalen:
 *
 *  - **een wit vlak op een witte pagina is onzichtbaar.** Vandaar altijd een
 *    dunne grijze rand, ook bij donkere kleuren;
 *  - **zwarte tekst op een donkere kleur is onleesbaar.** De bijschrifttekst
 *    wordt wit zodra de kleur donker genoeg is (gewogen helderheid, want het
 *    oog ziet groen veel sterker dan blauw).
 */

export const runtime = "edge";

/** Gewogen helderheid 0–1. Groen telt het zwaarst, blauw het lichtst. */
function helderheid(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  // Strikt valideren: deze waarde gaat rechtstreeks een SVG-attribuut in.
  const hex = String(q.get("hex") ?? "").trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(hex)) {
    return new Response("hex ontbreekt of is ongeldig", { status: 400 });
  }

  const naam = esc(String(q.get("naam") ?? "").trim().slice(0, 40));
  const code = esc(String(q.get("code") ?? "").trim().slice(0, 20));
  const donker = helderheid(hex) < 0.6;
  const tekst = donker ? "#ffffff" : "#1a1a1a";

  const bijschrift = [naam, code && naam !== code ? code : ""].filter(Boolean).join(" · ");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800" role="img" aria-label="${naam || "Kleurvlak"}">` +
    `<rect width="800" height="800" fill="${hex}"/>` +
    // Rand aan de binnenkant, zodat een wit vlak op wit toch een contour houdt.
    `<rect x="0.5" y="0.5" width="799" height="799" fill="none" stroke="#d4d4d4" stroke-width="1"/>` +
    (bijschrift
      ? `<text x="400" y="742" text-anchor="middle" fill="${tekst}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="34">${bijschrift}</text>`
      : "") +
    `</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Een kleur verandert niet.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
