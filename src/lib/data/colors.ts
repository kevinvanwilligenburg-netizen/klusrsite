import type { SelectedColor } from "@/types";
import SIKKENS from "@/lib/data/sikkens-kleuren.generated.json";

export interface ColorCollection {
  id: string;
  name: string;
  colors: SelectedColor[];
}

/** Bouwt een collectie en zet automatisch de collectienaam op elke kleur. */
function coll(
  id: string,
  name: string,
  colors: Omit<SelectedColor, "collection">[],
): ColorCollection {
  return { id, name, colors: colors.map((c) => ({ ...c, collection: name })) };
}

/**
 * Kleurcollecties voor de KLUSR-kleurkiezer. Een ruime, praktische selectie:
 * trendcollecties, kleurfamilies (wit, grijs, blauw, groen, warm, bruin,
 * pastels) en een brede RAL Classic-set. Wij mengen elke kleur op maat, dus de
 * collecties zijn vooral bedoeld om snel te kiezen/inspireren.
 *
 * Kleuren op een scherm wijken licht af van het echte resultaat.
 */
export const colorCollections: ColorCollection[] = [
  coll("populair-2026", "Populair 2026", [
    // Wit blijft veruit de meest gekozen kleur — daarom bovenaan.
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1" },
    { name: "Gebroken Wit", code: "RAL 9001", hex: "#E9E0D2" },
    { name: "Warm Crème", code: "PP-26-01", hex: "#EDE3D1" },
    { name: "Greige", code: "PP-26-02", hex: "#CFC6B8" },
    { name: "Mocha", code: "PP-26-03", hex: "#A0826D" },
    { name: "Saliegroen", code: "PP-26-04", hex: "#A7B5A0" },
    { name: "Olijfgroen", code: "PP-26-05", hex: "#7A7A52" },
    { name: "Kleibruin", code: "PP-26-06", hex: "#B07458" },
    { name: "Mistblauw", code: "PP-26-07", hex: "#8FA3AD" },
    { name: "Oudroze", code: "PP-26-08", hex: "#D8B9AE" },
    { name: "Diep Bosgroen", code: "PP-26-09", hex: "#2F4538" },
    { name: "Warm Antraciet", code: "PP-26-10", hex: "#3A3A3C" },
  ]),
  coll("klusr-trends", "KLUSR Trendkleuren", [
    { name: "Wolkenwit", code: "KL-001", hex: "#F4F1EC" },
    { name: "Kalkgrijs", code: "KL-002", hex: "#D9D6CF" },
    { name: "Saliegroen", code: "KL-003", hex: "#A7B5A0" },
    { name: "Diep Petrol", code: "KL-004", hex: "#1F4E5F" },
    { name: "Terracotta", code: "KL-005", hex: "#C16A4F" },
    { name: "Oker Geel", code: "KL-006", hex: "#D9A441" },
    { name: "Warm Antraciet", code: "KL-007", hex: "#3A3A3C" },
    { name: "Klassiek Taupe", code: "KL-008", hex: "#8C8178" },
  ]),
  coll("wit-creme", "Wit & Crème", [
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1" },
    { name: "Verkeerswit", code: "RAL 9016", hex: "#F1F0EA" },
    { name: "Signaalwit", code: "RAL 9003", hex: "#F4F8F4" },
    { name: "Grijswit", code: "RAL 9002", hex: "#E7EBDA" },
    { name: "Roomwit", code: "WC-01", hex: "#F3EEE3" },
    { name: "Gebroken Wit", code: "RAL 9001", hex: "#E9E0D2" },
    { name: "Crème", code: "WC-02", hex: "#EFE6D3" },
    { name: "Vanille", code: "WC-03", hex: "#EFE3C8" },
    { name: "Kalkwit", code: "WC-04", hex: "#EDEAE0" },
    { name: "Champagne", code: "WC-05", hex: "#E6D9C3" },
    { name: "Linnen", code: "WC-06", hex: "#E7DFD0" },
    { name: "Ivoor", code: "RAL 1014", hex: "#DDC49A" },
  ]),
  coll("grijstinten", "Grijstinten", [
    { name: "Lichtgrijs", code: "RAL 7035", hex: "#CBD0CC" },
    { name: "Zijdegrijs", code: "RAL 7044", hex: "#CAC4B0" },
    { name: "Agaatgrijs", code: "RAL 7038", hex: "#B5B8B1" },
    { name: "Venstergrijs", code: "RAL 7040", hex: "#9DA3A6" },
    { name: "Kiezelgrijs", code: "GR-01", hex: "#B7B3A8" },
    { name: "Betongrijs", code: "GR-02", hex: "#9A9C9B" },
    { name: "Stofgrijs", code: "RAL 7037", hex: "#7D7F7D" },
    { name: "IJzergrijs", code: "RAL 7011", hex: "#52595D" },
    { name: "Basaltgrijs", code: "RAL 7012", hex: "#575D5E" },
    { name: "Leigrijs", code: "RAL 7015", hex: "#434B4D" },
    { name: "Grafietgrijs", code: "RAL 7024", hex: "#45494E" },
    { name: "Antracietgrijs", code: "RAL 7016", hex: "#383E42" },
  ]),
  coll("zwart-donker", "Zwart & Antraciet", [
    { name: "Gitzwart", code: "RAL 9005", hex: "#0A0A0A" },
    { name: "Diepzwart", code: "ZW-01", hex: "#111111" },
    { name: "Roetzwart", code: "ZW-02", hex: "#1B1B1B" },
    { name: "Blauwzwart", code: "ZW-03", hex: "#1A1F24" },
    { name: "Warm Antraciet", code: "ZW-04", hex: "#2B2B2D" },
    { name: "Zwartgrijs", code: "RAL 7021", hex: "#23282B" },
    { name: "Grafiet", code: "ZW-05", hex: "#2E3133" },
  ]),
  coll("blauwtinten", "Blauwtinten", [
    { name: "Pastelblauw", code: "RAL 5024", hex: "#5D9B9B" },
    { name: "Lichtblauw", code: "RAL 5012", hex: "#3B83BD" },
    { name: "Hemelsblauw", code: "RAL 5015", hex: "#2271B3" },
    { name: "Duifblauw", code: "RAL 5014", hex: "#606E8C" },
    { name: "Mistblauw", code: "BL-01", hex: "#8FA3AD" },
    { name: "Rookblauw", code: "BL-02", hex: "#8AA0AD" },
    { name: "Jeansblauw", code: "BL-03", hex: "#4A6A82" },
    { name: "Petrol", code: "BL-04", hex: "#1F4E5F" },
    { name: "Oceaanblauw", code: "RAL 5020", hex: "#1B5583" },
    { name: "Gentiaanblauw", code: "RAL 5010", hex: "#0E4C92" },
    { name: "Staalblauw", code: "RAL 5011", hex: "#1A2B3C" },
    { name: "Nachtblauw", code: "BL-05", hex: "#1C2A40" },
  ]),
  coll("groentinten", "Groentinten", [
    { name: "Pastelgroen", code: "RAL 6019", hex: "#BDECB6" },
    { name: "Saliegroen", code: "GN-01", hex: "#A7B5A0" },
    { name: "Eucalyptus", code: "GN-02", hex: "#93A98F" },
    { name: "Lindegroen", code: "GN-03", hex: "#9CB071" },
    { name: "Zeegroen", code: "GN-04", hex: "#6FA294" },
    { name: "Jadegroen", code: "GN-05", hex: "#4E8975" },
    { name: "Olijfgroen", code: "GN-06", hex: "#7A7A52" },
    { name: "Resedagroen", code: "RAL 6011", hex: "#587246" },
    { name: "Smaragdgroen", code: "GN-07", hex: "#1F6F54" },
    { name: "Mosgroen", code: "RAL 6005", hex: "#2F4538" },
    { name: "Dennengroen", code: "RAL 6009", hex: "#27352A" },
    { name: "Legergroen", code: "GN-08", hex: "#4B5320" },
  ]),
  coll("warme-tinten", "Warm — Rood, Terra & Oker", [
    { name: "Zalm", code: "WT-01", hex: "#E9A07A" },
    { name: "Abrikoos", code: "WT-02", hex: "#E8B07D" },
    { name: "Oudroze", code: "WT-03", hex: "#D8B9AE" },
    { name: "Okergeel", code: "WT-04", hex: "#D9A441" },
    { name: "Mosterd", code: "WT-05", hex: "#C99A2E" },
    { name: "Karamel", code: "WT-06", hex: "#B5793B" },
    { name: "Terracotta", code: "WT-07", hex: "#C16A4F" },
    { name: "Kleibruin", code: "WT-08", hex: "#B07458" },
    { name: "Roestbruin", code: "WT-09", hex: "#8A4B2F" },
    { name: "Baksteenrood", code: "WT-10", hex: "#8E4035" },
    { name: "Signaalrood", code: "RAL 3001", hex: "#9B2423" },
    { name: "Wijnrood", code: "RAL 3005", hex: "#5E2129" },
  ]),
  coll("bruin-taupe", "Bruin, Taupe & Greige", [
    { name: "Greige", code: "BT-01", hex: "#CFC6B8" },
    { name: "Zandbruin", code: "BT-02", hex: "#C9A87C" },
    { name: "Leem", code: "BT-03", hex: "#C9B59B" },
    { name: "Taupe", code: "BT-04", hex: "#8C8178" },
    { name: "Hazelnoot", code: "BT-05", hex: "#8B6B4A" },
    { name: "Cappuccino", code: "BT-06", hex: "#9C7A5B" },
    { name: "Mokka", code: "BT-07", hex: "#A0826D" },
    { name: "Notenbruin", code: "RAL 8011", hex: "#5A3A29" },
    { name: "Kleibruin", code: "RAL 8003", hex: "#734222" },
    { name: "Chocoladebruin", code: "RAL 8017", hex: "#45322E" },
    { name: "Walnoot", code: "BT-08", hex: "#5C4433" },
    { name: "Espresso", code: "BT-09", hex: "#3E2C25" },
  ]),
  coll("pastels", "Pastels", [
    { name: "Poederroze", code: "PA-01", hex: "#EAD3CB" },
    { name: "Perzik", code: "PA-02", hex: "#F2D3BE" },
    { name: "Vanillegeel", code: "PA-03", hex: "#F0E6BE" },
    { name: "Mintgroen", code: "PA-04", hex: "#CFE5D6" },
    { name: "Zacht Salie", code: "PA-05", hex: "#C7D2BE" },
    { name: "Babyblauw", code: "PA-06", hex: "#CDE0EC" },
    { name: "Hemelgrijs", code: "PA-07", hex: "#DCE2E4" },
    { name: "Lavendel", code: "PA-08", hex: "#D7CDE6" },
    { name: "Lila", code: "PA-09", hex: "#D9CBE0" },
    { name: "Oudroze Licht", code: "PA-10", hex: "#ECD7D2" },
  ]),
  coll("natuurtinten", "Natuurtinten", [
    { name: "Zand", code: "NT-01", hex: "#D8C7A8" },
    { name: "Leem", code: "NT-02", hex: "#C9B59B" },
    { name: "Mistgrijs", code: "NT-03", hex: "#BEBCB4" },
    { name: "Olijf", code: "NT-04", hex: "#7A7A52" },
    { name: "Rookblauw", code: "NT-05", hex: "#8FA3AD" },
    { name: "Mosterd", code: "NT-06", hex: "#C99A2E" },
    { name: "Roestbruin", code: "NT-07", hex: "#8A4B2F" },
    { name: "Houtskool", code: "NT-08", hex: "#33312E" },
  ]),
  coll("ral-classic", "RAL Classic", [
    { name: "Groenbeige", code: "RAL 1000", hex: "#CDBA88" },
    { name: "Beige", code: "RAL 1001", hex: "#D0B084" },
    { name: "Signaalgeel", code: "RAL 1003", hex: "#F9A800" },
    { name: "Oesterwit", code: "RAL 1013", hex: "#E3D9C6" },
    { name: "Ivoor", code: "RAL 1014", hex: "#DDC49A" },
    { name: "Licht Ivoor", code: "RAL 1015", hex: "#E6D2B5" },
    { name: "Zinkgeel", code: "RAL 1018", hex: "#F3DA0B" },
    { name: "Zuiver Oranje", code: "RAL 2004", hex: "#E25303" },
    { name: "Signaalrood", code: "RAL 3001", hex: "#9B2423" },
    { name: "Wijnrood", code: "RAL 3005", hex: "#5E2129" },
    { name: "Verkeersrood", code: "RAL 3020", hex: "#C1121C" },
    { name: "Blauwlila", code: "RAL 4005", hex: "#6C4675" },
    { name: "Gentiaanblauw", code: "RAL 5010", hex: "#0E4C92" },
    { name: "Staalblauw", code: "RAL 5011", hex: "#1A2B3C" },
    { name: "Lichtblauw", code: "RAL 5012", hex: "#3B83BD" },
    { name: "Duifblauw", code: "RAL 5014", hex: "#606E8C" },
    { name: "Hemelsblauw", code: "RAL 5015", hex: "#2271B3" },
    { name: "Oceaanblauw", code: "RAL 5020", hex: "#1B5583" },
    { name: "Pastelblauw", code: "RAL 5024", hex: "#5D9B9B" },
    { name: "Mosgroen", code: "RAL 6005", hex: "#2F4538" },
    { name: "Dennengroen", code: "RAL 6009", hex: "#27352A" },
    { name: "Resedagroen", code: "RAL 6011", hex: "#587246" },
    { name: "Geelgroen", code: "RAL 6018", hex: "#57A639" },
    { name: "Pastelgroen", code: "RAL 6019", hex: "#BDECB6" },
    { name: "Lichtgrijs", code: "RAL 7035", hex: "#CBD0CC" },
    { name: "Agaatgrijs", code: "RAL 7038", hex: "#B5B8B1" },
    { name: "Venstergrijs", code: "RAL 7040", hex: "#9DA3A6" },
    { name: "Zijdegrijs", code: "RAL 7044", hex: "#CAC4B0" },
    { name: "IJzergrijs", code: "RAL 7011", hex: "#52595D" },
    { name: "Basaltgrijs", code: "RAL 7012", hex: "#575D5E" },
    { name: "Leigrijs", code: "RAL 7015", hex: "#434B4D" },
    { name: "Antracietgrijs", code: "RAL 7016", hex: "#383E42" },
    { name: "Grafietgrijs", code: "RAL 7024", hex: "#45494E" },
    { name: "Zwartgrijs", code: "RAL 7021", hex: "#23282B" },
    { name: "Kleibruin", code: "RAL 8003", hex: "#734222" },
    { name: "Notenbruin", code: "RAL 8011", hex: "#5A3A29" },
    { name: "Chocoladebruin", code: "RAL 8017", hex: "#45322E" },
    { name: "Grijswit", code: "RAL 9002", hex: "#E7EBDA" },
    { name: "Signaalwit", code: "RAL 9003", hex: "#F4F8F4" },
    { name: "Gitzwart", code: "RAL 9005", hex: "#0A0A0A" },
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1" },
    { name: "Verkeerswit", code: "RAL 9016", hex: "#F1F0EA" },
  ]),
];

export const allColors: SelectedColor[] = colorCollections.flatMap((c) => c.colors);

/** Meest gekozen kleuren van dit jaar (wit voorop) — voor de kleurkiezer. */
export const popularColors2026: ColorCollection = colorCollections[0];

export const defaultColor: SelectedColor = colorCollections[0].colors[0]; // Zuiver Wit

/**
 * Zoek een kleur op code (of naam), tolerant voor schrijfwijze.
 *
 * Dit stond op een exacte tekstvergelijking, en dat is precies de val waar de
 * VDM-webshop tegenaan liep: `?kleur=RAL9010` en `?kleur=ral 9010` vonden dan
 * niets, en de klant landde op de productpagina zónder kleur — zonder enige
 * melding, dus je ziet het alleen als je het toevallig probeert. Onze eigen
 * kleurcodes staan als "RAL 9010" met een spatie, en elke link van buiten
 * (Shopping, een gedeelde URL, een handmatig getypte parameter) schrijft het
 * anders.
 *
 * Zelfde normalisatie als `paint-color-resolve.ts` bij het afrekenen: alleen
 * letters en cijfers, kleine letters. Valt terug op de naam, zodat
 * `?kleur=gitzwart` ook werkt.
 */
function normCode(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * De benoemde Sikkens-kleuren uit de kleurenfeed, zodat de deeplinks daaruit
 * óók een kleur voorselecteren.
 *
 * Zonder deze set kent `findColor` alleen de 159 gecureerde kleuren, en dan
 * vindt `?kleur=N0.15.10` (Monumentengroen) niets — 170 van de 176 kleuren uit
 * de feed landden zo op een productpagina zónder kleur. Precies de val waar de
 * VDM-webshop op vastliep, en zonder melding, dus alleen zichtbaar als je 'm
 * probeert.
 *
 * Het bestand is klein (176 kleuren) en wordt bij de import gegenereerd; het
 * groeit dus mee met de feed.
 */
const sikkensKleuren: SelectedColor[] = (
  SIKKENS.kleuren as { naam: string; code: string; hex: string; collectie: string }[]
).map((k) => ({ name: k.naam, code: k.code, hex: k.hex, collection: k.collectie }));

export function findColor(code: string): SelectedColor | undefined {
  const q = normCode(code ?? "");
  if (!q) return undefined;
  // Eigen gecureerde set eerst: die heeft Nederlandse namen en is met de hand
  // samengesteld.
  return (
    allColors.find((c) => normCode(c.code) === q) ??
    allColors.find((c) => normCode(c.name) === q) ??
    sikkensKleuren.find((c) => normCode(c.code) === q) ??
    sikkensKleuren.find((c) => normCode(c.name) === q)
  );
}

/** Simple readable-contrast helper for swatch labels. */
export function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
