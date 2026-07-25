/**
 * ESC/POS-bonopbouw voor een thermische bonprinter (58/80 mm) en de kassalade.
 *
 * We genereren ruwe ESC/POS-bytes die een lokale print-agent (of WebUSB/QZ Tray
 * op de kassa-pc) ongewijzigd naar de printer stuurt. De kassalade opent via de
 * standaard "drawer kick" die de printer aan de la-poort doorgeeft — dus de la
 * gaat open zodra de printer de bon (of een losse kick) ontvangt.
 *
 * Tekst wordt als Windows-1252 (CP1252) gecodeerd en we selecteren codepagina 16
 * (WPC1252) op de printer, zodat het euroteken en Nederlandse accenten kloppen op
 * de meeste Epson-compatibele printers. Pas de codepagina aan via opts indien
 * jouw printer een andere tabel gebruikt.
 */

// --- ESC/POS commando's -----------------------------------------------------
const ESC = 0x1b;
const GS = 0x1d;
const INIT = [ESC, 0x40]; // ESC @  — reset
const ALIGN_L = [ESC, 0x61, 0x00];
const ALIGN_C = [ESC, 0x61, 0x01];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const SIZE_DBL = [GS, 0x21, 0x11]; // dubbele hoogte + breedte
const SIZE_NORMAL = [GS, 0x21, 0x00];
const FEED = (n: number) => [ESC, 0x64, Math.max(0, Math.min(255, n))]; // ESC d n
const CUT = [GS, 0x56, 0x42, 0x00]; // GS V 66 0 — feed + partial cut
const DRAWER_KICK = [ESC, 0x70, 0x00, 0x19, 0xfa]; // ESC p 0 25 250 — la-poort 1

/** CP1252-encoder: Latin-1 dekt de meeste accenten; € en een paar tekens apart. */
const CP1252_EXTRA: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "™": 0x99,
};

function cp1252(str: string): number[] {
  const out: number[] = [];
  for (const ch of str) {
    const code = ch.codePointAt(0) ?? 0x3f;
    if (code <= 0xff) out.push(code);
    else if (CP1252_EXTRA[ch] != null) out.push(CP1252_EXTRA[ch]);
    else out.push(0x3f); // '?'
  }
  return out;
}

/** Eén regel met links/rechts uitgelijnde tekst binnen de bonbreedte. */
export function twoCol(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length);
  if (left.length + right.length >= width) {
    // Knip links af zodat rechts altijd compleet blijft.
    const max = Math.max(0, width - right.length - 1);
    return left.slice(0, max) + " " + right;
  }
  return left + " ".repeat(space) + right;
}

export interface ReceiptLine {
  title: string;
  qty: number;
  unit: string; // geformatteerd, bv. "12,34"
  total: string; // geformatteerd
}

export interface ReceiptData {
  storeName: string;
  addressLines: string[];
  reference: string;
  dateTime: string;
  cashier?: string;
  /** Klant + lidmaatschap, bv. "Klant: Jan Bakker · KLUSRPAS". */
  customerLine?: string;
  lines: ReceiptLine[];
  subtotal: string;
  vat: string;
  total: string;
  paymentLabel: string;
  cashGiven?: string;
  change?: string;
  savings?: string;
  footerLines?: string[];
}

export interface EscPosOptions {
  /** Tekenbreedte van de bon (48 voor 80 mm Font A, 32 voor 58 mm). */
  width?: number;
  /** Codepagina-id voor ESC t (16 = WPC1252). */
  codepage?: number;
  /** Open de kassalade aan het eind (drawer kick). */
  openDrawer?: boolean;
  /** Knip de bon af aan het eind. */
  cut?: boolean;
}

/** Bouw de volledige bon als ruwe ESC/POS-bytes. */
export function buildReceiptEscPos(
  data: ReceiptData,
  opts: EscPosOptions = {},
): Uint8Array<ArrayBuffer> {
  const width = opts.width ?? 48;
  const codepage = opts.codepage ?? 16;
  const bytes: number[] = [];
  const push = (...b: number[]) => bytes.push(...b);
  const text = (s: string) => push(...cp1252(s));
  const nl = () => push(0x0a);
  const rule = () => {
    text("-".repeat(width));
    nl();
  };

  push(...INIT);
  push(ESC, 0x74, codepage); // ESC t n — selecteer codepagina

  // Kop
  push(...ALIGN_C, ...SIZE_DBL, ...BOLD_ON);
  text(data.storeName);
  nl();
  push(...SIZE_NORMAL, ...BOLD_OFF);
  for (const l of data.addressLines) {
    text(l);
    nl();
  }
  nl();
  push(...ALIGN_L);
  text(twoCol(`Bon ${data.reference}`, data.dateTime, width));
  nl();
  if (data.cashier) {
    text(`Kassa: ${data.cashier}`);
    nl();
  }
  if (data.customerLine) {
    text(data.customerLine.slice(0, width));
    nl();
  }
  rule();

  // Regels
  for (const l of data.lines) {
    push(...BOLD_ON);
    text(l.title.slice(0, width));
    nl();
    push(...BOLD_OFF);
    text(twoCol(`  ${l.qty} x ${l.unit}`, l.total, width));
    nl();
  }
  rule();

  // Totalen
  text(twoCol("Subtotaal", data.subtotal, width));
  nl();
  text(twoCol("waarvan btw 21%", data.vat, width));
  nl();
  if (data.savings) {
    text(twoCol("Je voordeel", data.savings, width));
    nl();
  }
  push(...BOLD_ON, ...SIZE_DBL);
  text(twoCol("TOTAAL", data.total, Math.floor(width / 2)));
  nl();
  push(...SIZE_NORMAL, ...BOLD_OFF);
  text(twoCol("Betaald met", data.paymentLabel, width));
  nl();
  if (data.cashGiven) {
    text(twoCol("Ontvangen", data.cashGiven, width));
    nl();
  }
  if (data.change) {
    text(twoCol("Wisselgeld", data.change, width));
    nl();
  }

  // Voettekst
  if (data.footerLines?.length) {
    nl();
    push(...ALIGN_C);
    for (const l of data.footerLines) {
      text(l);
      nl();
    }
    push(...ALIGN_L);
  }

  push(...FEED(3));
  if (opts.openDrawer) push(...DRAWER_KICK);
  if (opts.cut !== false) push(...CUT);

  return new Uint8Array(bytes);
}

/** Losse "open de kassalade"-bytes (drawer kick) voor een handmatige la-opening. */
export function drawerKickBytes(): Uint8Array<ArrayBuffer> {
  return new Uint8Array([...INIT, ...DRAWER_KICK]);
}
