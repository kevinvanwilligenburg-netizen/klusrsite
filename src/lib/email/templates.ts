import type { CartItem, Order, Product } from "@/types";
import { flagshipStore } from "@/lib/data/stores";
import { products, getBestsellers, getSubCategory } from "@/lib/data/products";
import { getCategoryTitle } from "@/lib/data/categories";
import { COMPANY } from "@/components/shared/legal-page";
import { testimonialStats } from "@/lib/data/testimonials";

/**
 * Gebrande KLUSR e-mailtemplates (HTML + platte tekst).
 *
 * Bewust table-based met inline styles: dat is wat e-mailclients (Gmail,
 * Outlook, Apple Mail) betrouwbaar renderen. De huisstijl volgt de webshop —
 * KLUS-woordmerk met de R in een rood tegeltje, zwarte header, rode CTA.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");
const CONTACT_EMAIL = process.env.EMAIL_REPLY_TO || "klantenservice@klus-r.nl";
// Bestemming voor de reviewverzoek-mail. Zet REVIEW_URL op je review-pagina
// (bv. je Google-bedrijfsreview-link); zonder instelling val je terug op de site.
const REVIEW_URL = (process.env.REVIEW_URL || SITE_URL).replace(/\/$/, "");

/** KLUSR huisstijlkleuren (gespiegeld vanuit tailwind.config.ts). */
const C = {
  red: "#C90000",
  black: "#101010",
  bg: "#F7F7F7",
  card: "#FFFFFF",
  border: "#E5E5E5",
  green: "#16A34A",
  text: "#101010",
  muted: "#6B7280",
};

const euroFmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });
const euro = (n: number) => euroFmt.format(n);

/** Gemiddelde met NL-decimaalkomma, bv. 4.7 -> "4,7". */
const ratingFmt = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatAverage = (n: number) => ratingFmt.format(n);

/** Aantal met NL-duizendtalscheiding (punt), bv. 2847 -> "2.847". */
const countFmt = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });
const formatCount = (n: number) => countFmt.format(n);

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

const PAYMENT_LABELS: Record<string, string> = {
  ideal: "iDEAL",
  bancontact: "Bancontact",
  creditcard: "Creditcard",
  klarna: "Klarna — achteraf betalen",
};

function paymentLabel(method?: string): string {
  if (!method) return "—";
  return PAYMENT_LABELS[method] ?? method;
}

/** KLUS + R-tegel, voor op de zwarte header. */
function wordmark(): string {
  return (
    `<span style="font-size:26px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">KLUS</span>` +
    `<span style="display:inline-block;background:${C.red};color:#ffffff;font-size:22px;font-weight:900;line-height:1;padding:5px 9px;border-radius:6px;margin-left:3px;font-family:Arial,Helvetica,sans-serif;">R</span>`
  );
}

function button(label: string, url: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" bgcolor="${C.red}" style="border-radius:8px;">` +
    `<a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>` +
    `</td></tr></table>`
  );
}

/**
 * Compacte, volle-breedte KLUSR-rode knop voor in een producttegel. Gebruikt een
 * 100%-tabel zodat de knop netjes onderaan de kaart over de volle breedte staat
 * (e-mailveilig: geen flexbox/width:auto-trucs).
 */
function buttonFullSmall(label: string, url: string): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
    `<td align="center" bgcolor="${C.red}" style="border-radius:7px;">` +
    `<a href="${url}" style="display:block;padding:10px 14px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:7px;">${esc(label)}</a>` +
    `</td></tr></table>`
  );
}

function footer(note?: string): string {
  const tel = flagshipStore.phone.replace(/[\s-]/g, "");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr><td style="padding-bottom:14px;border-bottom:1px solid ${C.border};font-family:Arial,Helvetica,sans-serif;">` +
    `<span style="font-size:13px;color:${C.muted};line-height:1.7;">` +
    `<strong style="color:${C.text};">KLUSR B.V.</strong><br>` +
    `${esc(flagshipStore.address)}, ${esc(flagshipStore.postalCode)} ${esc(flagshipStore.city)}<br>` +
    `<a href="tel:${tel}" style="color:${C.muted};text-decoration:none;">${esc(flagshipStore.phone)}</a> &middot; ` +
    `<a href="mailto:${esc(CONTACT_EMAIL)}" style="color:${C.muted};text-decoration:none;">${esc(CONTACT_EMAIL)}</a> &middot; ` +
    `<a href="${SITE_URL}" style="color:${C.red};text-decoration:none;font-weight:bold;">klus-r.nl</a>` +
    `</span></td></tr>` +
    `<tr><td style="padding-top:14px;font-family:Arial,Helvetica,sans-serif;">` +
    `<span style="font-size:11px;color:${C.muted};line-height:1.7;">` +
    (note ? `${esc(note)}<br>` : "") +
    `&copy; ${new Date().getFullYear()} KLUSR B.V. — Alle prijzen incl. btw. ` +
    `<a href="${SITE_URL}/voorwaarden" style="color:${C.muted};">Voorwaarden</a> &middot; ` +
    `<a href="${SITE_URL}/privacy" style="color:${C.muted};">Privacy</a>` +
    `</span></td></tr></table>`
  );
}

/** Merken die we voeren (dynamisch uit de catalogus, met curated fallback). */
const TOP_BRANDS: string[] = (() => {
  try {
    const counts = new Map<string, number>();
    for (const p of products) {
      const b = (p.brand || "").trim();
      if (b) counts.set(b, (counts.get(b) || 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([b]) => b);
    if (top.length) return top;
  } catch {
    /* val terug op curated lijst */
  }
  return ["Histor", "Flexa", "Sikkens", "Sigma", "Dulux", "Hermadix", "Rambo", "Wagner", "Bosch", "Makita"];
})();

function prettyBrand(b: string): string {
  if (b && b === b.toUpperCase() && b.length > 2) return b.charAt(0) + b.slice(1).toLowerCase();
  return b || "KLUSR";
}

function clampText(s: string, max: number): string {
  const t = (s || "").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function productTile(p: Product): string {
  const url = `${SITE_URL}/product/${esc(p.slug)}`;
  const first = p.images?.[0];
  const img =
    first && /^https?:\/\//.test(first)
      ? `<img src="${esc(first)}" width="160" alt="" style="display:block;width:100%;max-width:170px;height:auto;border-radius:8px;border:1px solid ${C.border};background:#fff;">`
      : `<div style="width:100%;height:0;padding-top:75%;border-radius:8px;border:1px solid ${C.border};background:${C.bg};"></div>`;
  return (
    `<td valign="top" width="33%" style="padding:6px;font-family:Arial,Helvetica,sans-serif;">` +
    `<a href="${url}" style="text-decoration:none;color:${C.text};display:block;">` +
    img +
    `<div style="margin-top:8px;font-size:10px;letter-spacing:0.04em;color:${C.muted};text-transform:uppercase;font-weight:bold;">${esc(prettyBrand(p.brand))}</div>` +
    `<div style="font-size:13px;line-height:1.35;color:${C.text};font-weight:bold;">${esc(clampText(p.title, 44))}</div>` +
    `<div style="margin-top:4px;font-size:14px;color:${C.red};font-weight:bold;">${euro(p.kluspasPrice || p.price)}</div>` +
    `</a></td>`
  );
}

/**
 * Promoblok met klustoppers + de merken die we verkopen. Wordt in ELKE mail
 * getoond zodat er altijd een kans op aankoop is.
 */
function promoBlock(): string {
  let items: Product[] = [];
  try {
    items = getBestsellers(6);
    if (items.length < 3) items = items.concat(products.filter((p) => !items.includes(p)));
  } catch {
    /* geen producten beschikbaar */
  }
  const tiles = items.slice(0, 3).map(productTile).join("");
  if (!tiles) return "";
  const brands = TOP_BRANDS.map((b) => esc(prettyBrand(b))).join(" &middot; ");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr><td style="border-top:1px solid ${C.border};padding-top:22px;font-family:Arial,Helvetica,sans-serif;">` +
    `<p style="margin:0 0 2px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;color:${C.red};">Onze klustoppers</p>` +
    `<p style="margin:0 0 14px;font-size:18px;font-weight:900;color:${C.text};">Maak je klus compleet</p>` +
    `</td></tr>` +
    `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${tiles}</tr></table></td></tr>` +
    `<tr><td style="padding:16px 0 6px;font-size:12px;line-height:1.6;color:${C.muted};font-family:Arial,Helvetica,sans-serif;">` +
    `<strong style="color:${C.text};">De merken die we verkopen:</strong> ${brands} en meer.` +
    `</td></tr>` +
    `<tr><td style="padding:10px 0 2px;">${button("Shop het hele assortiment", SITE_URL)}</td></tr>` +
    `</table>`
  );
}

interface LayoutOpts {
  title: string;
  preheader: string;
  content: string;
  footerNote?: string;
  /** Subtiele link/regel boven de container (bv. "Bekijk deze e-mail online"). */
  topLink?: string;
  /** Volle-breedte blok direct onder de zwarte header (bv. merken-menu). */
  belowHeader?: string;
  /** Verberg het generieke klustoppers-promoblok (nieuwsbrief heeft eigen grid). */
  hidePromo?: boolean;
}

function layout({ title, preheader, content, footerNote, topLink, belowHeader, hidePromo }: LayoutOpts): string {
  const promo = hidePromo ? "" : promoBlock();
  const promoRow = promo
    ? `<tr><td bgcolor="${C.card}" style="background:${C.card};padding:4px 30px 30px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">${promo}</td></tr>`
    : "";
  const belowHeaderRow = belowHeader ? `<tr><td>${belowHeader}</td></tr>` : "";
  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(title)}</title>
<style>
  /* Mobiel: laat de producttegels naar 1 kolom stapelen en de container vullen.
     E-mailclients die geen media queries ondersteunen (o.a. oudere Outlook)
     negeren dit blok en vallen terug op de inline table-styles. */
  @media only screen and (max-width: 480px) {
    .klusr-container { width: 100% !important; }
    .klusr-pad { padding-left: 18px !important; padding-right: 18px !important; }
    .klusr-stack { display: block !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
    .klusr-stack img { max-width: 100% !important; }
    .klusr-center { text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="klusr-container" style="width:600px;max-width:100%;">
    ${topLink ? `<tr><td style="padding:0 0 6px;">${topLink}</td></tr>` : ""}
    <tr><td align="center" bgcolor="${C.black}" style="background:${C.black};border-radius:12px 12px 0 0;padding:24px;">
      ${wordmark()}
    </td></tr>
    ${belowHeaderRow}
    <tr><td bgcolor="${C.card}" class="klusr-pad" style="background:${C.card};padding:34px 30px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};font-family:Arial,Helvetica,sans-serif;color:${C.text};">
      ${content}
    </td></tr>
    ${promoRow}
    <tr><td bgcolor="${C.card}" class="klusr-pad" style="background:${C.card};border:1px solid ${C.border};border-top:none;border-radius:0 0 12px 12px;padding:22px 30px;">
      ${footer(footerNote)}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

// --- Order confirmation -----------------------------------------------------

function itemRow(item: CartItem): string {
  const img =
    item.image && /^https?:\/\//.test(item.image)
      ? `<img src="${esc(item.image)}" width="56" height="56" alt="" style="display:block;border-radius:8px;border:1px solid ${C.border};background:#fff;">`
      : `<div style="width:56px;height:56px;border-radius:8px;border:1px solid ${C.border};background:${C.bg};"></div>`;

  const variant =
    item.variantLabel && item.variantLabel.toLowerCase() !== "standaard"
      ? `<br><span style="color:${C.muted};font-size:12px;">${esc(item.variantLabel)}</span>`
      : "";

  const color = item.selectedColor
    ? `<br><span style="color:${C.muted};font-size:12px;">Kleur: ${esc(item.selectedColor.name)}${
        item.selectedColor.code ? ` (${esc(item.selectedColor.code)})` : ""
      }</span>`
    : "";

  return (
    `<tr>` +
    `<td valign="top" style="padding:12px 0;border-bottom:1px solid ${C.border};width:56px;">${img}</td>` +
    `<td valign="top" style="padding:12px 14px;border-bottom:1px solid ${C.border};font-size:14px;color:${C.text};line-height:1.4;">` +
    `<strong>${esc(item.title)}</strong>${variant}${color}` +
    `<br><span style="color:${C.muted};font-size:12px;">${item.quantity} &times; ${euro(item.price)}</span>` +
    `</td>` +
    `<td valign="top" align="right" style="padding:12px 0;border-bottom:1px solid ${C.border};font-size:14px;font-weight:bold;white-space:nowrap;">${euro(
      item.price * item.quantity,
    )}</td>` +
    `</tr>`
  );
}

function totalsRow(label: string, value: string, opts: { color?: string; strong?: boolean; big?: boolean } = {}): string {
  const color = opts.color ?? C.text;
  const weight = opts.strong ? "bold" : "normal";
  const size = opts.big ? "17px" : "14px";
  return (
    `<tr>` +
    `<td style="padding:5px 0;font-size:${size};color:${C.muted};">${esc(label)}</td>` +
    `<td align="right" style="padding:5px 0;font-size:${size};font-weight:${weight};color:${color};white-space:nowrap;">${value}</td>` +
    `</tr>`
  );
}

export function verificationEmail(
  name: string,
  url: string,
): { subject: string; html: string; text: string } {
  const hi = name ? `Hoi ${esc(name.split(" ")[0])},` : "Hoi,";
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Bevestig je e-mailadres</h1>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">${hi} welkom bij KLUSR! Bevestig je e-mailadres om je account te activeren.</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td>${button("Bevestig e-mailadres", url)}</td></tr></table>` +
    `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${C.muted};">Werkt de knop niet? Plak deze link in je browser:</p>` +
    `<p style="margin:0 0 18px;font-size:13px;line-height:1.6;"><a href="${url}" style="color:${C.red};word-break:break-all;">${esc(url)}</a></p>` +
    `<p style="margin:0;font-size:12px;color:${C.muted};">Deze link is 24 uur geldig. Heb je je niet aangemeld? Dan kun je deze e-mail negeren.</p>`;
  return {
    subject: "Bevestig je e-mailadres voor KLUSR",
    html: layout({ title: "Bevestig je e-mailadres", preheader: "Activeer je KLUSR-account", content }),
    text: `${hi} bevestig je e-mailadres om je KLUSR-account te activeren:\n${url}\n\nDeze link is 24 uur geldig.`,
  };
}

export function magicLinkEmail(
  name: string,
  url: string,
): { subject: string; html: string; text: string } {
  const hi = name ? `Hoi ${esc(name.split(" ")[0])},` : "Hoi,";
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Je inloglink</h1>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">${hi} klik op de knop om direct in te loggen bij KLUSR — geen wachtwoord nodig.</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td>${button("Inloggen bij KLUSR", url)}</td></tr></table>` +
    `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${C.muted};">Werkt de knop niet? Plak deze link in je browser:</p>` +
    `<p style="margin:0 0 18px;font-size:13px;line-height:1.6;"><a href="${url}" style="color:${C.red};word-break:break-all;">${esc(url)}</a></p>` +
    `<p style="margin:0;font-size:12px;color:${C.muted};">Deze link is 30 minuten geldig en werkt één keer. Heb je geen inloglink aangevraagd? Negeer deze e-mail dan.</p>`;
  return {
    subject: "Je inloglink voor KLUSR",
    html: layout({ title: "Je inloglink", preheader: "Log direct in bij KLUSR", content }),
    text: `${hi} log in bij KLUSR via deze link (30 min geldig):\n${url}`,
  };
}

export function passwordResetEmail(
  name: string,
  url: string,
): { subject: string; html: string; text: string } {
  const hi = name ? `Hoi ${esc(name.split(" ")[0])},` : "Hoi,";
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Stel je wachtwoord opnieuw in</h1>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">${hi} je (of iemand anders) heeft gevraagd om je KLUSR-wachtwoord opnieuw in te stellen. Klik op de knop om een nieuw wachtwoord te kiezen.</p>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td>${button("Nieuw wachtwoord instellen", url)}</td></tr></table>` +
    `<p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${C.muted};">Werkt de knop niet? Plak deze link in je browser:</p>` +
    `<p style="margin:0 0 18px;font-size:13px;line-height:1.6;"><a href="${url}" style="color:${C.red};word-break:break-all;">${esc(url)}</a></p>` +
    `<p style="margin:0;font-size:12px;color:${C.muted};">Deze link is 60 minuten geldig en werkt één keer. Heb je dit niet aangevraagd? Negeer deze e-mail dan — je wachtwoord blijft ongewijzigd.</p>`;
  return {
    subject: "Stel je KLUSR-wachtwoord opnieuw in",
    html: layout({ title: "Stel je wachtwoord opnieuw in", preheader: "Kies een nieuw wachtwoord voor je KLUSR-account", content }),
    text: `${hi} stel je KLUSR-wachtwoord opnieuw in via deze link (60 min geldig):\n${url}\n\nHeb je dit niet aangevraagd? Negeer deze e-mail dan — je wachtwoord blijft ongewijzigd.`,
  };
}

// --- Klantenservice / tickets ----------------------------------------------

/** Escape + behoud regelovergangen voor weergave in HTML-mails. */
function nl2br(s: string): string {
  return esc(s).replace(/\r?\n/g, "<br>");
}

/** Ontvangstbevestiging van een klantenservicevraag. */
export function supportConfirmationEmail(
  name: string,
  reference: string,
  subject: string,
  body: string,
): { subject: string; html: string; text: string } {
  const hi = name ? `Hoi ${esc(name.split(" ")[0])},` : "Hoi,";
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">We hebben je bericht ontvangen</h1>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">${hi} bedankt voor je bericht aan de KLUSR-klantenservice. Onze klussers kijken er zo snel mogelijk naar — meestal binnen 1 werkdag.</p>` +
    `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${C.muted};">Je ticketnummer is <strong style="color:${C.text};">${esc(reference)}</strong>. Houd dit nummer in de onderwerpregel als je reageert, dan koppelen we je bericht automatisch.</p>` +
    `<div style="margin:0 0 8px;padding:16px;border:1px solid ${C.border};border-radius:10px;background:${C.bg};">` +
    `<p style="margin:0 0 6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:${C.muted};">${esc(subject)}</p>` +
    `<p style="margin:0;font-size:14px;line-height:1.6;color:${C.text};">${nl2br(body)}</p>` +
    `</div>`;
  return {
    subject: `We hebben je bericht ontvangen [${reference}]`,
    html: layout({
      title: "Bericht ontvangen",
      preheader: `Je ticketnummer is ${reference}`,
      content,
      footerNote: `Reageren? Houd ${reference} in de onderwerpregel.`,
    }),
    text: `${hi} bedankt voor je bericht aan de KLUSR-klantenservice.\nJe ticketnummer is ${reference}. We reageren meestal binnen 1 werkdag.\n\nOnderwerp: ${subject}\n${body}`,
  };
}

/** Interne melding naar de klantenservice-inbox bij een nieuw contactformulier-ticket. */
export function supportTeamNotificationEmail(
  name: string,
  email: string,
  reference: string,
  subject: string,
  body: string,
): { subject: string; html: string; text: string } {
  const who = name ? `${esc(name)} (${esc(email)})` : esc(email);
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Nieuw bericht via de klantenservice</h1>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">Van <strong>${who}</strong> — ticket <strong style="color:${C.text};">${esc(reference)}</strong>.</p>` +
    `<div style="margin:0 0 16px;padding:16px;border:1px solid ${C.border};border-radius:10px;background:${C.bg};">` +
    `<p style="margin:0 0 6px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.04em;color:${C.muted};">${esc(subject)}</p>` +
    `<p style="margin:0;font-size:14px;line-height:1.6;color:${C.text};">${nl2br(body)}</p>` +
    `</div>` +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted};">Beantwoord deze e-mail om direct aan ${esc(email)} te antwoorden, of behandel het ticket in /admin.</p>`;
  return {
    subject: `Klantenservice: ${subject} [${reference}]`,
    html: layout({
      title: "Nieuw klantenservicebericht",
      preheader: `${who}: ${subject}`,
      content,
      footerNote: `Ticket ${reference} — reply-to is de klant.`,
      hidePromo: true,
    }),
    text:
      `Nieuw bericht via de klantenservice — ticket ${reference}.\n` +
      `Van: ${name ? `${name} <${email}>` : email}\n` +
      `Onderwerp: ${subject}\n\n${body}\n\n` +
      `Beantwoord deze e-mail om direct aan de klant te antwoorden.`,
  };
}

/** Antwoord van de klantenservice op een ticket. */
export function supportReplyEmail(
  name: string,
  reference: string,
  replyBody: string,
): { subject: string; html: string; text: string } {
  const hi = name ? `Hoi ${esc(name.split(" ")[0])},` : "Hoi,";
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Antwoord van de klantenservice</h1>` +
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">${hi}</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">${nl2br(replyBody)}</p>` +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:${C.muted};">Heb je nog een vraag? Beantwoord deze e-mail en houd <strong style="color:${C.text};">${esc(reference)}</strong> in de onderwerpregel, dan pakken we het direct weer op.</p>`;
  return {
    subject: `Re: je vraag aan KLUSR [${reference}]`,
    html: layout({
      title: "Antwoord van de klantenservice",
      preheader: replyBody.slice(0, 100),
      content,
      footerNote: `Ticket ${reference}`,
    }),
    text: `${hi}\n\n${replyBody}\n\nHeb je nog een vraag? Beantwoord deze e-mail en houd ${reference} in de onderwerpregel.`,
  };
}

export function abandonedCartEmail(input: {
  name?: string;
  items: { title: string; quantity: number; price: number }[];
  total: number;
}): { subject: string; html: string; text: string } {
  const hi = input.name ? `Hoi ${esc(input.name.split(" ")[0])},` : "Hoi,";
  const cartUrl = `${SITE_URL}/winkelwagen`;
  const rows = input.items
    .slice(0, 8)
    .map(
      (it) =>
        `<tr>` +
        `<td style="padding:8px 0;border-bottom:1px solid ${C.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${C.text};">${esc(it.title)}${it.quantity > 1 ? ` <span style="color:${C.muted};">× ${it.quantity}</span>` : ""}</td>` +
        `<td align="right" style="padding:8px 0;border-bottom:1px solid ${C.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:${C.text};white-space:nowrap;">${euro(it.price * it.quantity)}</td>` +
        `</tr>`,
    )
    .join("");
  const content =
    `<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${C.text};">Je winkelwagen wacht nog op je</h1>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">${hi} je liet wat moois achter in je winkelwagen. We hebben het voor je bewaard — rond je bestelling af voordat het uitverkocht is.</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">${rows}` +
    `<tr><td style="padding:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:900;color:${C.text};">Totaal</td>` +
    `<td align="right" style="padding:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:900;color:${C.red};">${euro(input.total)}</td></tr></table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr><td>${button("Rond je bestelling af", cartUrl)}</td></tr></table>` +
    `<p style="margin:0;font-size:13px;color:${C.muted};">Voor 19:00 besteld, morgen in huis. Met de gratis KLUSRPAS pak je bovendien altijd extra voordeel.</p>`;
  return {
    subject: "Je winkelwagen staat nog klaar bij KLUSR",
    html: layout({
      title: "Je winkelwagen wacht nog op je",
      preheader: "Rond je bestelling af — voor 19:00 besteld, morgen in huis.",
      content,
      footerNote: "Je ontvangt deze herinnering omdat je een bestelling bij KLUSR bent begonnen.",
    }),
    text:
      `${hi} je liet wat moois achter in je winkelwagen bij KLUSR.\n` +
      input.items.map((it) => `- ${it.title}${it.quantity > 1 ? ` x${it.quantity}` : ""}`).join("\n") +
      `\nTotaal: ${euro(input.total)}\n\nRond je bestelling af: ${cartUrl}`,
  };
}

export function orderConfirmationEmail(order: Order): { subject: string; html: string; text: string } {
  const c = order.customer;
  const trackUrl = `${SITE_URL}/bestelstatus`;
  const delivery = formatDate(order.estimatedDelivery);

  const itemsTable =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">` +
    order.items.map(itemRow).join("") +
    `</table>`;

  const totals =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">` +
    totalsRow("Subtotaal", euro(order.subtotal)) +
    (order.kluspasSavings > 0 ? totalsRow("KLUSRPAS-korting", `- ${euro(order.kluspasSavings)}`, { color: C.green }) : "") +
    totalsRow(
      "Verzending",
      order.shipping > 0 ? euro(order.shipping) : "Gratis",
      order.shipping > 0 ? {} : { color: C.green },
    ) +
    `<tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:2px solid ${C.black};"></div></td></tr>` +
    totalsRow("Totaal", euro(order.total), { strong: true, big: true }) +
    `</table>`;

  const addressBlock =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr>` +
    `<td valign="top" width="50%" style="padding:0 10px 0 0;font-size:13px;color:${C.text};line-height:1.6;">` +
    `<strong style="display:block;margin-bottom:4px;color:${C.muted};text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">Bezorgadres</strong>` +
    `${esc(c.firstName)} ${esc(c.lastName)}<br>${esc(c.street)}<br>${esc(c.postalCode)} ${esc(c.city)}` +
    `</td>` +
    `<td valign="top" width="50%" style="padding:0 0 0 10px;font-size:13px;color:${C.text};line-height:1.6;">` +
    `<strong style="display:block;margin-bottom:4px;color:${C.muted};text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">Bezorging</strong>` +
    (delivery ? `Verwacht: <strong>${esc(delivery)}</strong><br>` : "") +
    `Voor 19:00 besteld, morgen in huis<br>` +
    `Betaling: ${esc(paymentLabel(order.paymentMethod))}` +
    `</td>` +
    `</tr></table>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      <tr>
        <td valign="middle" style="width:44px;">
          <div style="width:40px;height:40px;border-radius:50%;background:${C.green};color:#ffffff;text-align:center;line-height:40px;font-size:22px;font-weight:bold;">&#10003;</div>
        </td>
        <td valign="middle" style="padding-left:12px;">
          <h1 style="margin:0;font-size:22px;color:${C.text};font-family:Arial,Helvetica,sans-serif;">Bedankt voor je bestelling!</h1>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">
      Hoi ${esc(c.firstName)}, we hebben je bestelling ontvangen en gaan er direct mee aan de slag.
      Je ontvangt een bericht zodra je pakket onderweg is.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background:${C.bg};border-radius:10px;">
      <tr><td style="padding:14px 18px;font-size:14px;color:${C.text};">
        <span style="color:${C.muted};">Bestelnummer</span><br>
        <strong style="font-size:20px;letter-spacing:0.5px;">${esc(order.reference)}</strong>
      </td></tr>
    </table>

    <h2 style="margin:0 0 4px;font-size:15px;color:${C.text};">Je bestelling</h2>
    ${itemsTable}
    ${totals}

    <div style="height:24px;"></div>
    ${addressBlock}

    <div style="height:28px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      ${button("Volg je bestelling", trackUrl)}
    </td></tr></table>

    <p style="margin:16px 0 0;font-size:13px;line-height:1.6;text-align:center;">
      <a href="${SITE_URL}/factuur/${order.id}" style="color:${C.red};text-decoration:none;font-weight:bold;">Download je factuur (PDF)</a>
    </p>

    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${C.muted};text-align:center;">
      Vragen over je bestelling? Mail naar
      <a href="mailto:${esc(CONTACT_EMAIL)}" style="color:${C.red};text-decoration:none;">${esc(CONTACT_EMAIL)}</a>
      of bel ${esc(flagshipStore.phone)}.
    </p>
  `;

  const text = orderConfirmationText(order);

  return {
    subject: `Bestelbevestiging ${order.reference} — KLUSR`,
    html: layout({
      title: `Bestelbevestiging ${order.reference}`,
      preheader: `Bedankt ${c.firstName}! We hebben je bestelling ${order.reference} ontvangen (${euro(order.total)}).`,
      content,
    }),
    text,
  };
}

function orderConfirmationText(order: Order): string {
  const c = order.customer;
  const lines: string[] = [];
  lines.push("Bedankt voor je bestelling bij KLUSR!");
  lines.push("");
  lines.push(`Hoi ${c.firstName}, we hebben je bestelling ontvangen.`);
  lines.push(`Bestelnummer: ${order.reference}`);
  lines.push("");
  lines.push("Je bestelling:");
  for (const i of order.items) {
    const extra = i.selectedColor ? ` (${i.selectedColor.name})` : "";
    lines.push(`  - ${i.quantity}x ${i.title}${extra} — ${euro(i.price * i.quantity)}`);
  }
  lines.push("");
  lines.push(`Subtotaal:        ${euro(order.subtotal)}`);
  if (order.kluspasSavings > 0) lines.push(`KLUSRPAS-korting: -${euro(order.kluspasSavings)}`);
  lines.push(`Verzending:       ${order.shipping > 0 ? euro(order.shipping) : "Gratis"}`);
  lines.push(`Totaal:           ${euro(order.total)}`);
  lines.push("");
  const delivery = formatDate(order.estimatedDelivery);
  if (delivery) lines.push(`Verwachte bezorging: ${delivery}`);
  lines.push(`Bezorgadres: ${c.firstName} ${c.lastName}, ${c.street}, ${c.postalCode} ${c.city}`);
  lines.push("");
  lines.push(`Volg je bestelling: ${SITE_URL}/bestelstatus`);
  lines.push(`Vragen? ${CONTACT_EMAIL} of ${flagshipStore.phone}`);
  lines.push("");
  lines.push("KLUSR B.V. — De beste verf en alles wat je NÚ nodig hebt voor de klus.");
  return lines.join("\n");
}

/** "Je bestelling is onderweg" — verzonden bij het aanmaken van het label. */
export function shippingConfirmationEmail(order: Order): { subject: string; html: string; text: string } {
  const c = order.customer;
  const ship = order.shipment;
  const trackUrl = ship?.trackTrace || `${SITE_URL}/bestelstatus`;
  const delivery = formatDate(order.estimatedDelivery);

  const itemsTable =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">` +
    order.items.map(itemRow).join("") +
    `</table>`;

  const trackBox =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background:${C.bg};border-radius:10px;">` +
    `<tr><td style="padding:14px 18px;font-size:14px;color:${C.text};">` +
    `<span style="color:${C.muted};">Bestelnummer</span><br>` +
    `<strong style="font-size:20px;letter-spacing:0.5px;">${esc(order.reference)}</strong>` +
    (ship?.barcode
      ? `<br><span style="color:${C.muted};">Track &amp; trace-code</span><br><strong style="font-size:16px;letter-spacing:0.5px;">${esc(ship.barcode)}</strong>`
      : "") +
    `</td></tr></table>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      <tr>
        <td valign="middle" style="width:44px;">
          <div style="width:40px;height:40px;border-radius:50%;background:${C.red};color:#ffffff;text-align:center;line-height:40px;font-size:20px;font-weight:bold;">&#128666;</div>
        </td>
        <td valign="middle" style="padding-left:12px;">
          <h1 style="margin:0;font-size:22px;color:${C.text};font-family:Arial,Helvetica,sans-serif;">Je bestelling is onderweg!</h1>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">
      Hoi ${esc(c.firstName)}, goed nieuws — je bestelling is zojuist met PostNL verzonden${delivery ? "" : " en hard op weg naar je toe"}.
    </p>

    ${
      delivery
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;"><tr>` +
          `<td style="padding:12px 16px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;font-size:15px;color:${C.text};">` +
          `&#128666;&nbsp; Verwachte bezorging: <strong style="color:${C.green};">${esc(delivery)}</strong>` +
          `</td></tr></table>`
        : ""
    }

    ${trackBox}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      ${button("Volg je pakket", trackUrl)}
    </td></tr></table>

    <div style="height:24px;"></div>
    <h2 style="margin:0 0 4px;font-size:15px;color:${C.text};">Wat er onderweg is</h2>
    ${itemsTable}

    <div style="height:24px;"></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td valign="top" style="font-size:13px;color:${C.text};line-height:1.6;">
        <strong style="display:block;margin-bottom:4px;color:${C.muted};text-transform:uppercase;font-size:11px;letter-spacing:0.5px;">Bezorgadres</strong>
        ${esc(c.firstName)} ${esc(c.lastName)}<br>${esc(c.street)}<br>${esc(c.postalCode)} ${esc(c.city)}
      </td></tr>
    </table>

    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${C.muted};text-align:center;">
      Vragen over je bezorging? Mail naar
      <a href="mailto:${esc(CONTACT_EMAIL)}" style="color:${C.red};text-decoration:none;">${esc(CONTACT_EMAIL)}</a>
      of bel ${esc(flagshipStore.phone)}.
    </p>
  `;

  const textLines = [
    "Je bestelling is onderweg!",
    "",
    `Hoi ${c.firstName}, je bestelling ${order.reference} is zojuist met PostNL verzonden.`,
    ship?.barcode ? `Track & trace-code: ${ship.barcode}` : "",
    delivery ? `Verwachte bezorging: ${delivery}` : "",
    "",
    "Wat er onderweg is:",
    ...order.items.map((i) => `  - ${i.quantity}x ${i.title}${i.selectedColor ? ` (${i.selectedColor.name})` : ""}`),
    "",
    `Volg je pakket: ${trackUrl}`,
    `Bezorgadres: ${c.firstName} ${c.lastName}, ${c.street}, ${c.postalCode} ${c.city}`,
    "",
    `Vragen? ${CONTACT_EMAIL} of ${flagshipStore.phone}`,
  ].filter(Boolean);

  return {
    subject: `Je bestelling ${order.reference} is onderweg — KLUSR`,
    html: layout({
      title: `Je bestelling ${order.reference} is onderweg`,
      preheader: `Hoi ${c.firstName}, je pakket is verzonden met PostNL.${delivery ? ` Verwacht: ${delivery}.` : ""}`,
      content,
    }),
    text: textLines.join("\n"),
  };
}

/**
 * Reviewverzoek — verstuurd door /api/cron/review-request, ~3 dagen na het
 * aanmaken van het verzendlabel. Vraagt de klant om een review en toont wat er
 * besteld is. De CTA gaat naar REVIEW_URL (stel die in op je review-pagina).
 */
export function reviewRequestEmail(order: Order): { subject: string; html: string; text: string } {
  const c = order.customer;

  const itemsTable =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">` +
    order.items.map(itemRow).join("") +
    `</table>`;

  const stars =
    `<div style="font-size:30px;letter-spacing:4px;color:#F5B301;line-height:1;">` +
    `&#9733;&#9733;&#9733;&#9733;&#9733;` +
    `</div>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
      <tr>
        <td valign="middle" style="width:44px;">
          <div style="width:40px;height:40px;border-radius:50%;background:${C.red};color:#ffffff;text-align:center;line-height:40px;font-size:22px;font-weight:bold;">&#9733;</div>
        </td>
        <td valign="middle" style="padding-left:12px;">
          <h1 style="margin:0;font-size:22px;color:${C.text};font-family:Arial,Helvetica,sans-serif;">Hoe bevalt je bestelling?</h1>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">
      Hoi ${esc(c.firstName)}, je bestelling <strong>${esc(order.reference)}</strong> is een paar dagen geleden bezorgd. We zijn benieuwd wat je ervan vindt!
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${C.text};">
      Een review kost je een halve minuut en helpt andere klussers enorm bij hun keuze. Alvast bedankt!
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td align="center">
      ${stars}
      <div style="height:14px;"></div>
      ${button("Schrijf een review", REVIEW_URL)}
    </td></tr></table>

    <div style="height:8px;"></div>
    <h2 style="margin:0 0 4px;font-size:15px;color:${C.text};">Wat je hebt besteld</h2>
    ${itemsTable}

    <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:${C.muted};text-align:center;">
      Iets niet helemaal goed? Mail ons eerst op
      <a href="mailto:${esc(CONTACT_EMAIL)}" style="color:${C.red};text-decoration:none;">${esc(CONTACT_EMAIL)}</a>
      — dan lossen we het op.
    </p>
  `;

  const textLines = [
    "Hoe bevalt je bestelling?",
    "",
    `Hoi ${c.firstName}, je bestelling ${order.reference} is een paar dagen geleden bezorgd.`,
    "We zijn benieuwd wat je ervan vindt! Een review helpt andere klussers enorm.",
    "",
    `Schrijf een review: ${REVIEW_URL}`,
    "",
    "Wat je hebt besteld:",
    ...order.items.map(
      (i) => `  - ${i.quantity}x ${i.title}${i.selectedColor ? ` (${i.selectedColor.name})` : ""}`,
    ),
    "",
    `Iets niet goed? Mail ons op ${CONTACT_EMAIL} — dan lossen we het op.`,
  ].filter(Boolean);

  return {
    subject: `Hoe bevalt je bestelling, ${c.firstName}? Laat een review achter — KLUSR`,
    html: layout({
      title: `Hoe bevalt je bestelling, ${c.firstName}?`,
      preheader: `Je bestelling ${order.reference} is bezorgd — we horen graag wat je ervan vindt.`,
      content,
    }),
    text: textLines.join("\n"),
  };
}

// --- Newsletter welcome -----------------------------------------------------

export function welcomeEmail({ firstName }: { firstName?: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const hi = firstName ? `Hoi ${esc(firstName)}, welkom` : "Welkom";

  const content = `
    <h1 style="margin:0 0 16px;font-size:23px;color:${C.text};font-family:Arial,Helvetica,sans-serif;">${hi} bij KLUSR!</h1>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">
      Top dat je erbij bent. Vanaf nu ben je als eerste op de hoogte van klustips van
      onze ex-schilders, inspiratie en de scherpste <strong>KLUSRPAS</strong>-aanbiedingen.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px;background:${C.bg};border-radius:10px;">
      <tr><td style="padding:18px 20px;font-size:14px;line-height:1.7;color:${C.text};">
        <strong>Wat je van ons krijgt:</strong><br>
        &#10003; Advies van ex-schilders &mdash; geen verkooppraatjes<br>
        &#10003; Professionele kwaliteit voor de eerlijkste prijs<br>
        &#10003; Voor 19:00 besteld, morgen in huis
      </td></tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
      ${button("Ontdek het assortiment", SITE_URL)}
    </td></tr></table>
  `;

  const text = [
    `${firstName ? `Hoi ${firstName}, welkom` : "Welkom"} bij KLUSR!`,
    "",
    "Top dat je erbij bent. Vanaf nu ben je als eerste op de hoogte van klustips,",
    "inspiratie en de scherpste KLUSRPAS-aanbiedingen.",
    "",
    `Ontdek het assortiment: ${SITE_URL}`,
    "",
    "KLUSR B.V.",
  ].join("\n");

  return {
    subject: "Welkom bij KLUSR — klustips & KLUSRPAS-deals",
    html: layout({
      title: "Welkom bij KLUSR",
      preheader: "Klustips van ex-schilders en de scherpste KLUSRPAS-aanbiedingen, als eerste in je inbox.",
      content,
      footerNote: "Je ontvangt deze e-mail omdat je je hebt ingeschreven voor de KLUSR-nieuwsbrief.",
    }),
    text,
  };
}

// --- Promotionele nieuwsbrief (admin-tool) ----------------------------------

/** Merklink: er is geen /merk-route, dus we linken naar de zoekpagina (zoals de site). */
function brandUrl(brand: string): string {
  return `${SITE_URL}/zoeken?q=${encodeURIComponent(brand)}`;
}

/** Vaste merken voor het nieuwsbrief-menu (zoals gevraagd, in deze volgorde). */
const NEWSLETTER_BRANDS = ["Sikkens", "Drenth", "Histor", "Benson", "Hammerite"];

/** Horizontaal merken-menu onder de header. Wrapt netjes op mobiel. */
function brandNav(): string {
  const links = NEWSLETTER_BRANDS.map(
    (b) =>
      `<a href="${brandUrl(b)}" style="display:inline-block;padding:4px 2px;margin:0 2px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:${C.text};text-decoration:none;white-space:nowrap;">${esc(b)}</a>`,
  ).join(`<span style="color:${C.border};">&nbsp;|&nbsp;</span>`);
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.card};">` +
    `<tr><td align="center" class="klusr-pad" style="background:${C.card};padding:12px 24px;border-left:1px solid ${C.border};border-right:1px solid ${C.border};border-bottom:1px solid ${C.border};line-height:1.9;">` +
    links +
    `</td></tr></table>`
  );
}

/**
 * USP-balk (vertrouwen) — compact. Vijf USP's verdeeld over 20%-cellen op
 * desktop; op mobiel stapelen ze via `.klusr-stack` netjes onder elkaar.
 */
function uspBar(): string {
  const usps = [
    "Gratis verzending vanaf € 50",
    "Vóór 19:00 besteld, morgen in huis",
    "30.000 kleuren op maat gemengd",
    "Advies van ex-schilders",
    "5% met KLUSRPAS",
  ];
  const cells = usps
    .map(
      (u) =>
        `<td valign="top" align="center" class="klusr-stack" width="20%" style="padding:8px 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;color:${C.text};">` +
        `<span style="color:${C.green};font-weight:bold;">&#10003;</span> ${esc(u)}` +
        `</td>`,
    )
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};border-radius:10px;margin:0 0 18px;">` +
    `<tr>${cells}</tr></table>`
  );
}

/** Reviews-badge met het site-brede rating uit testimonialStats. */
function storeReviewsBadge(): string {
  const avg = formatAverage(testimonialStats.average);
  const count = formatCount(testimonialStats.count);
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 18px;">` +
    `<tr><td align="center" style="background:${C.bg};border:1px solid ${C.border};border-radius:999px;padding:7px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${C.text};white-space:nowrap;">` +
    `<span style="color:#F5A623;font-size:14px;">&#9733;</span> ` +
    `<strong>${avg}</strong> <span style="color:${C.muted};">&middot; ${count} klantbeoordelingen</span>` +
    `</td></tr></table>`
  );
}

/** "Bekijk deze e-mail online" — subtiele link bovenaan (geen web-archief, dus → /acties). */
function viewOnlineLink(): string {
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">` +
    `<tr><td align="center" style="padding:0 12px 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.muted};">` +
    `<a href="${SITE_URL}/acties" style="color:${C.muted};text-decoration:underline;">Bekijk deze e-mail online</a>` +
    `</td></tr></table>`
  );
}

/** Klantenservice-blok — altijd, vlak voor de footer. Hergebruikt COMPANY. */
function customerServiceBlock(): string {
  const tel = COMPANY.phone.replace(/[\s-]/g, "");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};border-radius:10px;margin:26px 0 0;">` +
    `<tr><td align="center" class="klusr-pad" style="padding:18px 22px;font-family:Arial,Helvetica,sans-serif;">` +
    `<p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:${C.text};">Hulp nodig?</p>` +
    `<p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:${C.muted};">Onze klantenservice helpt je graag — ook met kleuradvies.</p>` +
    `<p style="margin:0;font-size:14px;line-height:1.7;color:${C.text};">` +
    `<a href="tel:${tel}" style="color:${C.red};text-decoration:none;font-weight:bold;">${esc(COMPANY.phone)}</a>` +
    `<span style="color:${C.muted};">&nbsp;&middot;&nbsp;</span>` +
    `<a href="mailto:${esc(COMPANY.email)}" style="color:${C.red};text-decoration:none;font-weight:bold;">${esc(COMPANY.email)}</a>` +
    `</p>` +
    `</td></tr></table>`
  );
}

/** Sterren (★) voor een rating, met (reviewCount). E-mailveilig via glyphs. */
function starRating(rating: number, reviewCount: number): string {
  // Geen reviews → geen (nep) sterren, maar een nette muted melding.
  if (reviewCount <= 0 || rating <= 0) {
    return `<span style="font-size:12px;color:${C.muted};white-space:nowrap;">Nog geen reviews</span>`;
  }
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  const full = "&#9733;".repeat(r);
  const empty = "&#9733;".repeat(5 - r);
  return (
    `<span style="font-size:12px;white-space:nowrap;">` +
    `<span style="color:#F5A623;letter-spacing:1px;">${full}</span>` +
    `<span style="color:${C.border};letter-spacing:1px;">${empty}</span>` +
    (reviewCount > 0 ? `<span style="color:${C.muted};">&nbsp;(${formatCount(reviewCount)})</span>` : "") +
    `</span>`
  );
}

/**
 * Spec-labels die we in de nieuwsbrief NOOIT tonen — ruis die niets toevoegt
 * (het merk staat al boven de titel, EAN/conditie zijn voor de PDP). Matcht
 * case-insensitive als substring op het label.
 */
const SPEC_EXCLUDE = [
  "ean",
  "gtin",
  "barcode",
  "conditie",
  "artikelnummer",
  "sku",
  "merk",
  "fabrikant",
  "garantie",
];

/**
 * Voorkeursspecs (op aflopende prioriteit). Elke entry is een lijst synoniemen
 * die we als substring in het label zoeken; we pakken de eerste 2–3 die het
 * product écht heeft. Zo zie je relevante info (inhoud, maat, glansgraad, kleur)
 * in plaats van EAN/Conditie/Merk.
 */
const SPEC_PREFER: string[][] = [
  ["inhoud", "volume"],
  ["afmeting", "maat", "lengte", "breedte", "hoogte"],
  ["glansgraad"],
  ["kleur"],
  ["materiaal"],
  ["toepassing"],
  ["rendement"],
  ["basis"],
  ["korrel"],
  ["gewicht"],
];

const SPEC_MAX = 3;

/** Mag dit spec-label getoond worden? (niet op de uitsluit-lijst). */
function specAllowed(label: string): boolean {
  const l = label.toLowerCase();
  return !SPEC_EXCLUDE.some((bad) => l.includes(bad));
}

/**
 * 2–3 RELEVANTE specs als "Label: Waarde · …"-regel. Voorkeur voor inhoud/maat/
 * glansgraad/kleur/etc.; daarna overige niet-uitgesloten specs; als laatste
 * redmiddel de ingekorte omschrijving. EAN/Conditie/Merk verschijnen nooit.
 */
function pickSpecs(p: Product): { label: string; value: string }[] {
  const all: { label: string; value: string }[] = [];
  for (const group of p.specifications || []) {
    for (const it of group.items || []) {
      if (it?.label && it?.value && specAllowed(it.label)) all.push(it);
    }
  }
  const picked: { label: string; value: string }[] = [];
  const used = new Set<number>();
  // 1) Voorkeursspecs in prioriteitsvolgorde.
  for (const synonyms of SPEC_PREFER) {
    if (picked.length >= SPEC_MAX) break;
    const idx = all.findIndex(
      (it, i) => !used.has(i) && synonyms.some((s) => it.label.toLowerCase().includes(s)),
    );
    if (idx >= 0) {
      used.add(idx);
      picked.push(all[idx]);
    }
  }
  // 2) Aanvullen met overige toegestane specs (oorspronkelijke volgorde).
  for (let i = 0; i < all.length && picked.length < SPEC_MAX; i++) {
    if (!used.has(i)) {
      used.add(i);
      picked.push(all[i]);
    }
  }
  return picked;
}

function specLineText(p: Product): string {
  const picked = pickSpecs(p);
  if (picked.length) {
    return picked.map((it) => `${it.label}: ${clampText(it.value, 28)}`).join(" · ");
  }
  return p.description ? clampText(p.description, 90) : "";
}

function productSpecLine(p: Product): string {
  const picked = pickSpecs(p);
  let line = "";
  if (picked.length) {
    line = picked
      .map(
        (it) =>
          `<strong style="color:${C.text};font-weight:bold;">${esc(it.label)}:</strong> ${esc(clampText(it.value, 28))}`,
      )
      .join(` <span style="color:${C.border};">&middot;</span> `);
  } else if (p.description) {
    line = esc(clampText(p.description, 90));
  }
  if (!line) return "";
  return `<div style="margin-top:8px;font-size:11px;line-height:1.5;color:${C.muted};min-height:16px;">${line}</div>`;
}

/**
 * "Bekijk alle <type>"-bestemming voor een product. Het type komt uit de
 * subcategorie (menselijke titel); de URL volgt de site-routing:
 *   1. `/categorie/<categorie>/<subcategorie>` als die subcategorie-route bestaat
 *      (geverifieerd via getSubCategory — die voedt ook generateStaticParams);
 *   2. anders `/categorie/<categorie>` als de categorie bestaat;
 *   3. anders een zoek-fallback `/zoeken?q=<titel>`.
 * Label: "Bekijk alle <type-titel in kleine letters>", bv. "Bekijk alle vliegenramen".
 */
function typeLanding(p: Product): { label: string; url: string } {
  const catSlug = (p.category || "").trim();
  const subSlug = (p.subCategory || "").trim();
  const sub = subSlug && catSlug ? getSubCategory(catSlug, subSlug) : undefined;
  const catTitle = catSlug ? getCategoryTitle(catSlug) : "";
  // Categorie bestaat als getCategoryTitle een echte titel teruggeeft (!= slug).
  const catExists = !!catSlug && catTitle !== catSlug;

  const typeTitle = sub?.title || (catExists ? catTitle : "") || "het assortiment";
  const label = `Bekijk alle ${typeTitle.toLowerCase()}`;

  let url: string;
  if (sub) {
    url = `${SITE_URL}/categorie/${encodeURIComponent(catSlug)}/${encodeURIComponent(subSlug)}`;
  } else if (catExists) {
    url = `${SITE_URL}/categorie/${encodeURIComponent(catSlug)}`;
  } else {
    url = `${SITE_URL}/zoeken?q=${encodeURIComponent(typeTitle)}`;
  }
  return { label, url };
}

/**
 * Prijsblok: adviesprijs (doorgestreept) + KLUSRPAS-prijs prominent. NIET de
 * normale prijs. Zit in een eigen, visueel afgescheiden paneeltje (lichte
 * achtergrond + lijn erboven) zodat de prijs binnen de tegel opvalt.
 */
function newsletterPriceBlock(p: Product): string {
  const advies = p.compareAtPrice;
  const pas = p.kluspasPrice || p.price;
  const struck =
    advies && advies > pas
      ? `<span style="font-size:12px;color:${C.muted};text-decoration:line-through;">Adviesprijs ${euro(advies)}</span><br>`
      : "";
  return (
    `<div style="margin-top:12px;padding:10px 12px;background:${C.bg};border:1px solid ${C.border};border-radius:8px;">` +
    struck +
    `<span style="display:inline-block;background:${C.red};color:#ffffff;font-size:10px;font-weight:bold;line-height:1;padding:3px 6px;border-radius:4px;vertical-align:middle;">KLUSRPAS</span>` +
    `<span style="font-size:19px;font-weight:900;color:${C.red};vertical-align:middle;">&nbsp;${euro(pas)}</span>` +
    `</div>`
  );
}

/**
 * Rijke producttegel voor de nieuwsbrief. Verticaal ritme van boven naar onder:
 * foto → merk → titel → sterren → relevante specs → (afgescheiden) prijs →
 * volle-breedte "Bekijk product"-knop → subtiele "Bekijk alle <type>"-link.
 *
 * De kaart is één bordered tabel (geen alles-omvattende <a>, want dan zouden de
 * twee CTA's geneste anchors worden — niet e-mailveilig). Foto en titel linken
 * elk apart naar de PDP.
 */
function newsletterProductTile(p: Product): string {
  const url = `${SITE_URL}/product/${esc(p.slug)}`;
  const { label: allLabel, url: allUrl } = typeLanding(p);
  const first = p.images?.[0];
  const img =
    first && /^https?:\/\//.test(first)
      ? `<a href="${url}" style="display:block;text-decoration:none;"><img src="${esc(first)}" width="280" alt="" style="display:block;width:100%;max-width:100%;height:auto;border-radius:8px 8px 0 0;border:0;background:#fff;"></a>`
      : `<a href="${url}" style="display:block;text-decoration:none;"><div style="width:100%;height:0;padding-top:66%;border-radius:8px 8px 0 0;background:${C.bg};"></div></a>`;
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:9px;background:${C.card};overflow:hidden;">` +
    `<tr><td style="padding:0;font-family:Arial,Helvetica,sans-serif;">${img}</td></tr>` +
    `<tr><td style="padding:13px 14px 4px;font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="font-size:10px;letter-spacing:0.04em;color:${C.muted};text-transform:uppercase;font-weight:bold;">${esc(prettyBrand(p.brand))}</div>` +
    `<a href="${url}" style="text-decoration:none;color:${C.text};"><div style="margin-top:3px;font-size:14px;line-height:1.35;color:${C.text};font-weight:bold;">${esc(clampText(p.title, 54))}</div></a>` +
    `<div style="margin-top:6px;">${starRating(p.rating, p.reviewCount)}</div>` +
    productSpecLine(p) +
    newsletterPriceBlock(p) +
    `</td></tr>` +
    `<tr><td style="padding:12px 14px 14px;font-family:Arial,Helvetica,sans-serif;">` +
    buttonFullSmall("Bekijk product", url) +
    `<div style="margin-top:9px;text-align:center;font-size:12px;line-height:1.4;">` +
    `<a href="${allUrl}" style="color:${C.muted};text-decoration:underline;">${esc(allLabel)}</a>` +
    `</div>` +
    `</td></tr>` +
    `</table>`
  );
}

/**
 * Productgrid voor de nieuwsbrief: 2 tegels per rij op desktop, stapelt naar
 * 1 kolom op mobiel via de `.klusr-stack`-class (media query in de head).
 * Elke tegel zit in een `width:50%`-cel die op mobiel `width:100%` wordt.
 */
function productGrid(items: Product[]): string {
  if (!items.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const cells = items
      .slice(i, i + 2)
      .map(
        (p) =>
          `<td valign="top" width="50%" class="klusr-stack" style="padding:6px;font-family:Arial,Helvetica,sans-serif;">${newsletterProductTile(p)}</td>`,
      );
    if (cells.length < 2) {
      cells.push(`<td width="50%" class="klusr-stack" style="padding:6px;">&nbsp;</td>`);
    }
    rows.push(`<tr>${cells.join("")}</tr>`);
  }
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">` +
    rows.join("") +
    `</table>`
  );
}

/**
 * Promotionele nieuwsbrief naar de "KLUSR Nieuwsbrief"-audience.
 *
 * `intro` is platte tekst (AI-gegenereerd): lege regels worden alinea's. De
 * uitschrijflink in de footer gebruikt de letterlijke Resend-variabele
 * `{{{RESEND_UNSUBSCRIBE_URL}}}` — die wordt door Resend bij de broadcast per
 * ontvanger ingevuld (en is bij test/preview onschuldig).
 */
export function newsletterEmail({
  subject,
  preheader,
  intro,
  products: featured,
  ctaLabel,
  ctaUrl,
}: {
  subject: string;
  preheader: string;
  intro: string;
  products: Product[];
  ctaLabel?: string;
  ctaUrl?: string;
}): { subject: string; html: string; text: string } {
  const url = ctaUrl || `${SITE_URL}/categorie/acties`;
  const label = ctaLabel || "Bekijk alle aanbiedingen";

  // Intro → alinea's: lege regel = nieuwe alinea, enkele regelafbreking = <br>.
  const paragraphs = (intro || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.text};">${nl2br(block)}</p>`,
    )
    .join("");

  const grid = productGrid(featured);
  const gridBlock = grid
    ? `<h2 style="margin:18px 0 6px;font-size:16px;color:${C.text};">In de aanbieding</h2>` +
      `<p style="margin:0 0 8px;font-size:12px;color:${C.muted};">Met KLUSRPAS-prijs &mdash; activeer gratis je pas in je account.</p>` +
      grid
    : "";

  // Uitschrijflink: VERPLICHT voor Resend broadcasts (CAN-SPAM/AVG).
  const unsubscribe =
    `<a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${C.muted};text-decoration:underline;">Uitschrijven</a>`;

  const content =
    uspBar() +
    storeReviewsBadge() +
    paragraphs +
    gridBlock +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px;"><tr><td align="center">` +
    button(label, url) +
    `</td></tr></table>` +
    customerServiceBlock() +
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center;">` +
    `Je ontvangt deze nieuwsbrief omdat je je hebt ingeschreven bij KLUSR. ` +
    `Geen nieuwsbrieven meer ontvangen? ${unsubscribe}.` +
    `</p>`;

  const tel = COMPANY.phone.replace(/[\s-]/g, "");
  const textLines = [
    (intro || "").trim(),
    "",
    `Klantbeoordelingen: ${formatAverage(testimonialStats.average)} sterren (${formatCount(testimonialStats.count)} reviews)`,
    "Gratis verzending vanaf 50 euro | Voor 19:00 besteld, morgen in huis | 30.000 kleuren op maat gemengd | Advies van ex-schilders | 5% met KLUSRPAS",
    "",
    ...(featured.length
      ? [
          "In de aanbieding (KLUSRPAS-prijs):",
          ...featured.flatMap((p) => {
            const naam = [prettyBrand(p.brand), p.title].filter(Boolean).join(" ");
            const pas = p.kluspasPrice || p.price;
            const advies =
              p.compareAtPrice && p.compareAtPrice > pas ? ` (adviesprijs ${euro(p.compareAtPrice)})` : "";
            const specs = specLineText(p);
            const { label: allLabel, url: allUrl } = typeLanding(p);
            const lines = [`  - ${naam}: ${euro(pas)}${advies}`];
            if (specs) lines.push(`    ${specs}`);
            lines.push(`    Bekijk product: ${SITE_URL}/product/${p.slug}`);
            lines.push(`    ${allLabel}: ${allUrl}`);
            return lines;
          }),
          "",
        ]
      : []),
    `${label}: ${url}`,
    "",
    `Hulp nodig? Onze klantenservice helpt je graag: ${COMPANY.phone} (tel:${tel}) of ${COMPANY.email}`,
    "",
    "Je ontvangt deze nieuwsbrief omdat je je hebt ingeschreven bij KLUSR.",
    "Uitschrijven kan via de link onderaan de e-mail: {{{RESEND_UNSUBSCRIBE_URL}}}",
  ];

  return {
    subject,
    html: layout({
      title: subject,
      preheader,
      content,
      topLink: viewOnlineLink(),
      belowHeader: brandNav(),
      hidePromo: true,
      footerNote: "Je ontvangt deze e-mail omdat je je hebt ingeschreven voor de KLUSR-nieuwsbrief.",
    }),
    text: textLines.filter((l) => l !== undefined).join("\n"),
  };
}
