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
 * **De payload is niet verzonnen maar overgenomen** van wat de VDM-site al
 * maanden verstuurt; het dashboard heeft hier geen geschreven contract voor.
 * Vier dingen die zij zelf de moeite van het melden waard vonden:
 *
 *  - **`shop` én `site`.** Het dashboard splitst de rapportage op `site`,
 *    terwijl de VDM-site aanvankelijk alleen `shop` stuurde. Gevolg: de
 *    verlaten wagens van beide winkels belandden op één hoop. Voor ons is dat
 *    `klusrsite` en `klusr` (kleine letters, door het dashboard bevestigd).
 *  - **Bearer-sleutel.** Zonder sleutel geldt daar een limiet per IP.
 *  - **Bedragen in euro's**, niet in centen. Maximaal 50 regels.
 *  - **Best effort.** Een melding over een verlaten mandje mag een checkout
 *    nooit ophouden; deze functie gooit daarom nooit.
 *
 * Wat het dashboard doet bij twee posts met hetzelfde adres is daar niet
 * bekend, dus wij remmen aan onze kant: één keer per e-mailadres, zie
 * `leadSentAt` in lib/store/pending-cart.ts.
 */

const LEAD_URL = `${VDM_DASHBOARD_BASE}/api/cart/lead`;
const MAX_REGELS = 50;

export async function stuurCartLead(input: {
  email: string;
  items: PendingCartItem[];
  total: number;
}): Promise<boolean> {
  const sleutel = process.env.SITE_API_KEY;
  if (!sleutel) return false;

  try {
    const res = await fetch(LEAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sleutel}`,
      },
      body: JSON.stringify({
        shop: "klusrsite",
        site: "klusr",
        email: input.email,
        items: input.items.slice(0, MAX_REGELS).map((i) => ({
          title: i.title,
          quantity: i.quantity,
          price: i.price,
        })),
        total: input.total,
        at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    // Bewust stil: het dashboard plat laten liggen mag onze checkout niet raken.
    return false;
  }
}
