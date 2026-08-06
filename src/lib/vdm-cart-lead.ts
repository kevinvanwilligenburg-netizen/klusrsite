import { createHash } from "node:crypto";
import { VDM_DASHBOARD_BASE } from "@/lib/vdm-dashboard";
import type { PendingCartItem } from "@/lib/store/pending-cart";

/**
 * Achtergelaten winkelwagen doorgeven aan het VDM-dashboard.
 *
 * Het dashboard toont "achtergelaten winkelwagens" voor beide webshops, maar
 * die teller stond voor KLUSR op nul: wij vingen het e-mailadres in de checkout
 * wél op, maar bewaarden het alleen lokaal voor onze eigen herinneringsmail. Er
 * kwam dus niets binnen — geen meetfout, gewoon niets verstuurd.
 *
 * **De vorm is uitgevraagd, niet geraden.** Ik heb 'm twee keer verkeerd gehad
 * voordat ik om de letterlijke body vroeg — beide keren 400, zonder enige
 * aanwijzing wát er mis was, want dat endpoint antwoordt op álles hetzelfde.
 * Wat niet vanzelfsprekend is:
 *
 *  - **`id` staat op het hoogste niveau en is het kenmerk van de héle lead**,
 *    niet van een artikel. Het is de sleutel waarop het dashboard ontdubbelt en
 *    waarmee je 'm later afmeldt. Ontbreekt hij, dan volgt 400.
 *  - **`aantal`, `prijs` en `totaal` zijn strings**, in Nederlandse notatie:
 *    `"1"`, `"€ 22,00"`, `"€ 26,95"`. Getallen worden geweigerd.
 *  - **`shop` én `site`.** Het dashboard splitst de rapportage op `site`,
 *    terwijl de VDM-site aanvankelijk alleen `shop` stuurde; toen belandden de
 *    verlaten wagens van beide winkels op één hoop.
 *  - **`action: "complete"`** hoort verstuurd zodra de bestelling rond is.
 *    Zonder die melding krijgt iemand die net betaald heeft alsnog een mail dat
 *    zijn winkelwagen klaarstaat.
 *
 * Het dashboard eist de bearer-sleutel nu nog niet af (accepteert zonder
 * sleutel ook met 200) maar zegt dat te gaan doen; zonder sleutel geldt daar
 * bovendien een limiet per IP. Dus altijd meesturen.
 *
 * Best effort: gooit nooit. Een melding over een verlaten mandje mag een
 * checkout niet ophouden en een betaling al helemaal niet.
 */

const LEAD_URL = `${VDM_DASHBOARD_BASE}/api/cart/lead`;
const MAX_REGELS = 50;

/** `€ 26,95` — het dashboard wil de bedragen als tekst, Nederlands genoteerd. */
function euro(bedrag: number): string {
  return `€ ${bedrag.toFixed(2).replace(".", ",")}`;
}

/**
 * Stabiel lead-id per e-mailadres.
 *
 * Moet op twee momenten hetzelfde uitkomen: bij het melden van de verlaten
 * wagen én bij het afmelden na betaling. Het adres is op beide momenten
 * bekend, dus daar leiden we 'm uit af — gehasht, zodat er geen e-mailadres in
 * een extern id belandt.
 */
export function leadId(email: string): string {
  const h = createHash("sha1").update(email.trim().toLowerCase()).digest("hex");
  return `klusr-${h.slice(0, 20)}`;
}

async function post(body: unknown): Promise<boolean> {
  const sleutel = process.env.SITE_API_KEY;
  try {
    const res = await fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sleutel ? { Authorization: `Bearer ${sleutel}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      // Wél loggen. Een stille 400 is precies hoe dit maandenlang onopgemerkt
      // bleef bij de VDM-site: hun try/catch ving netwerkfouten, maar een nette
      // weigering liep er dwars doorheen.
      // eslint-disable-next-line no-console
      console.warn(
        `[cart-lead] dashboard weigerde: ${res.status} ${await res.text().catch(() => "")}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cart-lead] niet bereikbaar:", err instanceof Error ? err.message : err);
    return false;
  }
}

export async function stuurCartLead(input: {
  email: string;
  items: PendingCartItem[];
  total: number;
}): Promise<boolean> {
  if (!input.items.length) return false;
  return post({
    id: leadId(input.email),
    shop: "klusrsite",
    site: "klusr",
    email: input.email,
    items: input.items.slice(0, MAX_REGELS).map((i) => ({
      naam: i.title,
      aantal: String(i.quantity),
      prijs: euro(i.price),
      // Maat en kleur: daarmee laat de herinneringsmail zien wélke kleur iemand
      // had uitgezocht. Bij mengverf is dat het hele punt van de bestelling.
      ...(i.variant ? { variant: i.variant } : {}),
    })),
    totaal: euro(input.total),
    checkoutUrl: "https://www.klus-r.nl/winkelwagen",
  });
}

/**
 * Afmelden zodra de bestelling rond is, anders krijgt iemand die net betaald
 * heeft alsnog "je winkelwagen staat klaar".
 */
export async function meldCartLeadCompleet(email: string): Promise<boolean> {
  if (!email) return false;
  return post({ action: "complete", id: leadId(email) });
}
