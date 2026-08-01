import { kvGetJSON, kvSetJSON, kvSAdd, kvSMembers, isKvEnabled } from "@/lib/store/kv";
import { VOUCHER_MAANDEN, testerBedrag } from "@/lib/kleurtester";
import type { Order } from "@/types";

/**
 * Tegoedbonnen voor de kleurtester.
 *
 * De klant betaalt € 2,99 per tester en krijgt dat bedrag na betaling terug als
 * tegoed, inwisselbaar bij een volgende bestelling **mét mengverf**. Zo kost de
 * tester per saldo niets zodra hij de verf ook echt koopt, en betaalt hij wél
 * als hij alleen testers bestelt.
 *
 * Twee dingen bewust zo:
 *
 * - **Uitgeven pas ná betaling.** Een voucher aanmaken bij het plaatsen van de
 *   order zou tegoed uitdelen voor een bestelling die nooit betaald wordt.
 * - **Idempotent per order.** De webhook van Mollie kan meerdere keren langskomen
 *   (dat hóórt zelfs zo bij een statuswijziging), en drie webhooks mogen geen
 *   drie vouchers opleveren.
 */

export interface Voucher {
  code: string;
  /** Bedrag in euro's. */
  bedrag: number;
  /** Order waaruit hij is ontstaan. */
  orderId: string;
  email: string;
  aangemaakt: string;
  /** ISO-datum; daarna niet meer inwisselbaar. */
  verlooptOp: string;
  /** Order waarin hij is ingewisseld, als dat is gebeurd. */
  gebruiktIn?: string;
  /** Is de herinneringsmail (na 2 weken) al gestuurd? */
  herinnerd?: boolean;
}

const sleutel = (code: string) => `voucher:${code.toUpperCase()}`;
/** Index per e-mailadres, zodat de klant z'n tegoed terugziet in zijn account. */
const perKlant = (email: string) => `vouchers:${email.trim().toLowerCase()}`;
/** Alle openstaande vouchers, voor de herinneringscron. */
const OPEN_INDEX = "vouchers:open";

/**
 * Leesbare code zonder tekens die je verkeerd overtypt: geen 0/O, geen 1/I.
 * Mensen typen deze over uit een e-mail, dus dat scheelt echt.
 */
function nieuweCode(): string {
  const alfabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let uit = "";
  for (let i = 0; i < 8; i++) uit += alfabet[Math.floor(Math.random() * alfabet.length)];
  return `KT-${uit.slice(0, 4)}-${uit.slice(4)}`;
}

/**
 * Geef een voucher uit voor de kleurtesters in een betaalde order.
 * Doet niets als er geen testers in zaten of als deze order er al één had.
 */
export async function geefVoucherUit(order: Order): Promise<Voucher | null> {
  if (!isKvEnabled()) return null;

  const bedrag = testerBedrag(order.items);
  if (!(bedrag > 0)) return null;

  // Idempotent: één voucher per order, ongeacht hoe vaak de webhook langskomt.
  const gedaanKey = `voucher:order:${order.id}`;
  const bestaande = await kvGetJSON<string>(gedaanKey);
  if (bestaande) return kvGetJSON<Voucher>(sleutel(bestaande));

  const nu = new Date();
  const verloopt = new Date(nu);
  verloopt.setMonth(verloopt.getMonth() + VOUCHER_MAANDEN);

  const voucher: Voucher = {
    code: nieuweCode(),
    bedrag,
    orderId: order.id,
    email: order.customer.email,
    aangemaakt: nu.toISOString(),
    verlooptOp: verloopt.toISOString(),
  };

  await kvSetJSON(sleutel(voucher.code), voucher);
  await kvSetJSON(gedaanKey, voucher.code);
  await kvSAdd(perKlant(voucher.email), voucher.code);
  await kvSAdd(OPEN_INDEX, voucher.code);
  return voucher;
}

export async function getVoucher(code: string): Promise<Voucher | null> {
  if (!isKvEnabled() || !code?.trim()) return null;
  return kvGetJSON<Voucher>(sleutel(code));
}

export type VoucherOordeel =
  | { geldig: true; voucher: Voucher }
  | { geldig: false; reden: string };

/**
 * Mag deze voucher nu ingewisseld worden?
 *
 * `heeftMengverf` moet de aanroeper aanleveren: de voorwaarde is dat er
 * mengverf in de wagen zit, en dat is precies waarvoor de tester bedoeld was.
 */
export async function beoordeelVoucher(
  code: string,
  heeftMengverf: boolean,
): Promise<VoucherOordeel> {
  const v = await getVoucher(code);
  if (!v) return { geldig: false, reden: "Deze code kennen we niet." };
  if (v.gebruiktIn) return { geldig: false, reden: "Deze code is al gebruikt." };
  if (new Date(v.verlooptOp) < new Date()) {
    return { geldig: false, reden: "Deze code is verlopen." };
  }
  if (!heeftMengverf) {
    return {
      geldig: false,
      reden: "Dit tegoed geldt bij een bestelling met verf die wij op kleur mengen.",
    };
  }
  return { geldig: true, voucher: v };
}

/** Markeer als ingewisseld. Idempotent: een tweede poging levert false op. */
export async function wisselIn(code: string, orderId: string): Promise<boolean> {
  const v = await getVoucher(code);
  if (!v || v.gebruiktIn) return false;
  await kvSetJSON(sleutel(v.code), { ...v, gebruiktIn: orderId });
  return true;
}

/** Vouchers van een klant, nieuwste eerst. */
export async function vouchersVoor(email: string): Promise<Voucher[]> {
  if (!isKvEnabled()) return [];
  const codes = await kvSMembers(perKlant(email));
  const uit: Voucher[] = [];
  for (const c of codes) {
    const v = await kvGetJSON<Voucher>(sleutel(c));
    if (v) uit.push(v);
  }
  return uit.sort((a, b) => b.aangemaakt.localeCompare(a.aangemaakt));
}

/** Openstaande vouchers die nog geen herinnering hebben gehad. */
export async function teHerinneren(naDagen: number): Promise<Voucher[]> {
  if (!isKvEnabled()) return [];
  const grens = Date.now() - naDagen * 24 * 60 * 60 * 1000;
  const codes = await kvSMembers(OPEN_INDEX);
  const uit: Voucher[] = [];
  for (const c of codes) {
    const v = await kvGetJSON<Voucher>(sleutel(c));
    if (!v || v.gebruiktIn || v.herinnerd) continue;
    if (new Date(v.verlooptOp) < new Date()) continue;
    if (new Date(v.aangemaakt).getTime() > grens) continue;
    uit.push(v);
  }
  return uit;
}

export async function markeerHerinnerd(code: string): Promise<void> {
  const v = await getVoucher(code);
  if (v) await kvSetJSON(sleutel(v.code), { ...v, herinnerd: true });
}
