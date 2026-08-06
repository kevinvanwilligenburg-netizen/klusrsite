import type { SelectedColor } from "@/types";
import SIKKENS from "@/lib/data/sikkens-kleuren.generated.json";

export interface ColorCollection {
  id: string;
  name: string;
  colors: SelectedColor[];
}

/**
 * Bouwt een collectie.
 *
 * `name` is puur een **schapkaartje in de kiezer** — "Grijstinten", "Populair
 * 2026". Elke kleur draagt daarnaast zijn eigen `collection`: de waaier waarin
 * de winkel 'm opzoekt. Die twee zijn met opzet uit elkaar getrokken.
 *
 * Hier stond eerst `collection: c.collection ?? name`. Dat leek onschuldig,
 * maar zette bij 78 kleuren het schapkaartje als waaier op de bestelling — de
 * pakbon meldde "Lichtgrijs (RAL 7035) · Grijstinten", en zo'n waaier bestaat
 * niet. De code was wél mengbaar, dus het viel niet om; het maakte alleen het
 * opzoeken onnodig lastig. Geen terugval meer: `collection` is verplicht.
 */
function coll(id: string, name: string, colors: SelectedColor[]): ColorCollection {
  return { id, name, colors };
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
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1", collection: "RAL kleuren" },
    { name: "Gebroken Wit", code: "RAL 9001", hex: "#E9E0D2", collection: "RAL kleuren" },
    { name: "Warm Crème", code: "S 0804-Y30R", hex: "#EBE1D0", collection: "NCS Kleuren" },
    { name: "Greige", code: "080 80 05", hex: "#CCC6BB", collection: "RAL Design" },
    { name: "Mocha", code: "070 60 20", hex: "#A68B6F", collection: "RAL Design" },
    { name: "Saliegroen", code: "130 70 10", hex: "#A5AF9C", collection: "RAL Design" },
    { name: "Olijfgroen", code: "110 50 20", hex: "#777A56", collection: "RAL Design" },
    { name: "Kleibruin", code: "S 4030-Y50R", hex: "#A66F52", collection: "NCS Kleuren" },
    { name: "Mistblauw", code: "S 3010-R90B", hex: "#93A2AB", collection: "NCS Kleuren" },
    { name: "Oudroze", code: "S 1515-Y80R", hex: "#DAB8AD", collection: "NCS Kleuren" },
    { name: "Diep Bosgroen", code: "160 30 15", hex: "#344D3E", collection: "RAL Design" },
    { name: "Warm Antraciet", code: "S 8502-B", hex: "#35383A", collection: "NCS Kleuren" },
  ]),
  coll("klusr-trends", "KLUSR Trendkleuren", [
    { name: "Wolkenwit", code: "S 0300-N", hex: "#F4F3ED", collection: "NCS Kleuren" },
    { name: "Kalkgrijs", code: "S 1502-Y20R", hex: "#DEDBD3", collection: "NCS Kleuren" },
    { name: "Saliegroen", code: "130 70 10", hex: "#A5AF9C", collection: "RAL Design" },
    { name: "Diep Petrol", code: "240 30 20", hex: "#1F4F61", collection: "RAL Design" },
    { name: "Terracotta", code: "S 2050-Y70R", hex: "#C76C54", collection: "NCS Kleuren" },
    { name: "Oker Geel", code: "080 70 60", hex: "#D8A23B", collection: "RAL Design" },
    { name: "Warm Antraciet", code: "S 8502-B", hex: "#35383A", collection: "NCS Kleuren" },
    { name: "Klassiek Taupe", code: "S 5005-Y50R", hex: "#8C7F76", collection: "NCS Kleuren" },
  ]),
  coll("wit-creme", "Wit & Crème", [
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1", collection: "RAL kleuren" },
    { name: "Verkeerswit", code: "RAL 9016", hex: "#F1F0EA", collection: "RAL kleuren" },
    { name: "Signaalwit", code: "RAL 9003", hex: "#F4F8F4", collection: "RAL kleuren" },
    { name: "Grijswit", code: "RAL 9002", hex: "#E7EBDA", collection: "RAL kleuren" },
    { name: "Roomwit", code: "S 0502-Y", hex: "#EFECDF", collection: "NCS Kleuren" },
    { name: "Gebroken Wit", code: "RAL 9001", hex: "#E9E0D2", collection: "RAL kleuren" },
    { name: "Crème", code: "S 0804-Y10R", hex: "#EBE4D3", collection: "NCS Kleuren" },
    { name: "Vanille", code: "S 0907-Y10R", hex: "#E9DEC3", collection: "NCS Kleuren" },
    { name: "Kalkwit", code: "S 1002-Y20R", hex: "#EDEAE1", collection: "NCS Kleuren" },
    { name: "Champagne", code: "S 0907-Y30R", hex: "#EAD9C2", collection: "NCS Kleuren" },
    { name: "Linnen", code: "S 0804-Y50R", hex: "#EADFD1", collection: "NCS Kleuren" },
    { name: "Ivoor", code: "RAL 1014", hex: "#DDC49A", collection: "RAL kleuren" },
  ]),
  coll("grijstinten", "Grijstinten", [
    { name: "Lichtgrijs", code: "RAL 7035", hex: "#CBD0CC", collection: "RAL kleuren" },
    { name: "Zijdegrijs", code: "RAL 7044", hex: "#CAC4B0", collection: "RAL kleuren" },
    { name: "Agaatgrijs", code: "RAL 7038", hex: "#B5B8B1", collection: "RAL kleuren" },
    { name: "Venstergrijs", code: "RAL 7040", hex: "#9DA3A6", collection: "RAL kleuren" },
    { name: "Kiezelgrijs", code: "S 2502-Y", hex: "#B8B6AB", collection: "NCS Kleuren" },
    { name: "Betongrijs", code: "S 4000-N", hex: "#999997", collection: "NCS Kleuren" },
    { name: "Stofgrijs", code: "RAL 7037", hex: "#7D7F7D", collection: "RAL kleuren" },
    { name: "IJzergrijs", code: "RAL 7011", hex: "#52595D", collection: "RAL kleuren" },
    { name: "Basaltgrijs", code: "RAL 7012", hex: "#575D5E", collection: "RAL kleuren" },
    { name: "Leigrijs", code: "RAL 7015", hex: "#434B4D", collection: "RAL kleuren" },
    { name: "Grafietgrijs", code: "RAL 7024", hex: "#45494E", collection: "RAL kleuren" },
    { name: "Antracietgrijs", code: "RAL 7016", hex: "#383E42", collection: "RAL kleuren" },
  ]),
  coll("zwart-donker", "Zwart & Antraciet", [
    { name: "Gitzwart", code: "RAL 9005", hex: "#0A0A0A", collection: "RAL kleuren" },
    { name: "Blauwzwart", code: "S 8505-B", hex: "#0F1D25", collection: "NCS Kleuren" },
    { name: "Warm Antraciet", code: "S 9000-N", hex: "#262626", collection: "NCS Kleuren" },
    { name: "Zwartgrijs", code: "RAL 7021", hex: "#23282B", collection: "RAL kleuren" },
    { name: "Grafiet", code: "260 20 05", hex: "#31363B", collection: "RAL Design" },
  ]),
  coll("blauwtinten", "Blauwtinten", [
    { name: "Pastelblauw", code: "RAL 5024", hex: "#5D9B9B", collection: "RAL kleuren" },
    { name: "Lichtblauw", code: "RAL 5012", hex: "#3B83BD", collection: "RAL kleuren" },
    { name: "Hemelsblauw", code: "RAL 5015", hex: "#2271B3", collection: "RAL kleuren" },
    { name: "Duifblauw", code: "RAL 5014", hex: "#606E8C", collection: "RAL kleuren" },
    { name: "Mistblauw", code: "S 3010-R90B", hex: "#93A2AB", collection: "NCS Kleuren" },
    { name: "Rookblauw", code: "S 3010-R80B", hex: "#94A2AC", collection: "NCS Kleuren" },
    { name: "Jeansblauw", code: "260 40 20", hex: "#41617C", collection: "RAL Design" },
    { name: "Petrol", code: "240 30 20", hex: "#1F4F61", collection: "RAL Design" },
    { name: "Oceaanblauw", code: "RAL 5020", hex: "#1B5583", collection: "RAL kleuren" },
    { name: "Gentiaanblauw", code: "RAL 5010", hex: "#0E4C92", collection: "RAL kleuren" },
    { name: "Staalblauw", code: "RAL 5011", hex: "#1A2B3C", collection: "RAL kleuren" },
  ]),
  coll("groentinten", "Groentinten", [
    { name: "Pastelgroen", code: "RAL 6019", hex: "#BDECB6", collection: "RAL kleuren" },
    { name: "Saliegroen", code: "130 70 10", hex: "#A5AF9C", collection: "RAL Design" },
    { name: "Eucalyptus", code: "S 3020-G20Y", hex: "#8EA185", collection: "NCS Kleuren" },
    { name: "Lindegroen", code: "120 70 30", hex: "#A2B37B", collection: "RAL Design" },
    { name: "Zeegroen", code: "180 60 20", hex: "#649A8E", collection: "RAL Design" },
    { name: "Jadegroen", code: "S 4030-B90G", hex: "#518673", collection: "NCS Kleuren" },
    { name: "Olijfgroen", code: "110 50 20", hex: "#777A56", collection: "RAL Design" },
    { name: "Resedagroen", code: "RAL 6011", hex: "#587246", collection: "RAL kleuren" },
    { name: "Smaragdgroen", code: "170 40 30", hex: "#226C54", collection: "RAL Design" },
    { name: "Mosgroen", code: "RAL 6005", hex: "#2F4538", collection: "RAL kleuren" },
    { name: "Dennengroen", code: "RAL 6009", hex: "#27352A", collection: "RAL kleuren" },
    { name: "Legergroen", code: "S 5540-G40Y", hex: "#4F5827", collection: "NCS Kleuren" },
  ]),
  coll("warme-tinten", "Warm — Rood, Terra & Oker", [
    { name: "Zalm", code: "S 1040-Y60R", hex: "#EC9D79", collection: "NCS Kleuren" },
    { name: "Abrikoos", code: "S 1030-Y40R", hex: "#F0B485", collection: "NCS Kleuren" },
    { name: "Oudroze", code: "S 1515-Y80R", hex: "#DAB8AD", collection: "NCS Kleuren" },
    { name: "Okergeel", code: "080 70 60", hex: "#D8A23B", collection: "RAL Design" },
    { name: "Mosterd", code: "S 2060-Y", hex: "#C69822", collection: "NCS Kleuren" },
    { name: "Karamel", code: "S 3050-Y30R", hex: "#BB773E", collection: "NCS Kleuren" },
    { name: "Terracotta", code: "S 2050-Y70R", hex: "#C76C54", collection: "NCS Kleuren" },
    { name: "Kleibruin", code: "S 4030-Y50R", hex: "#A66F52", collection: "NCS Kleuren" },
    { name: "Roestbruin", code: "S 5040-Y50R", hex: "#884D30", collection: "NCS Kleuren" },
    { name: "Baksteenrood", code: "S 4050-Y80R", hex: "#8A3E32", collection: "NCS Kleuren" },
    { name: "Signaalrood", code: "RAL 3001", hex: "#9B2423", collection: "RAL kleuren" },
    { name: "Wijnrood", code: "RAL 3005", hex: "#5E2129", collection: "RAL kleuren" },
  ]),
  coll("bruin-taupe", "Bruin, Taupe & Greige", [
    { name: "Greige", code: "080 80 05", hex: "#CCC6BB", collection: "RAL Design" },
    { name: "Zandbruin", code: "S 2020-Y20R", hex: "#CFAE82", collection: "NCS Kleuren" },
    { name: "Leem", code: "S 2010-Y20R", hex: "#C9B79A", collection: "NCS Kleuren" },
    { name: "Taupe", code: "S 5005-Y50R", hex: "#8C7F76", collection: "NCS Kleuren" },
    { name: "Hazelnoot", code: "S 5020-Y30R", hex: "#8E6C4F", collection: "NCS Kleuren" },
    { name: "Cappuccino", code: "S 4020-Y40R", hex: "#A68064", collection: "NCS Kleuren" },
    { name: "Mokka", code: "070 60 20", hex: "#A68B6F", collection: "RAL Design" },
    { name: "Notenbruin", code: "RAL 8011", hex: "#5A3A29", collection: "RAL kleuren" },
    { name: "Kleibruin", code: "RAL 8003", hex: "#734222", collection: "RAL kleuren" },
    { name: "Chocoladebruin", code: "RAL 8017", hex: "#45322E", collection: "RAL kleuren" },
    { name: "Walnoot", code: "060 30 20", hex: "#5D412E", collection: "RAL Design" },
    { name: "Espresso", code: "S 8010-Y70R", hex: "#452F27", collection: "NCS Kleuren" },
  ]),
  coll("pastels", "Pastels", [
    { name: "Poederroze", code: "S 1010-Y90R", hex: "#E4CDC5", collection: "NCS Kleuren" },
    { name: "Perzik", code: "S 0515-Y60R", hex: "#F9D4BE", collection: "NCS Kleuren" },
    { name: "Vanillegeel", code: "100 90 20", hex: "#ECE3B9", collection: "RAL Design" },
    { name: "Mintgroen", code: "160 90 10", hex: "#D0E5D5", collection: "RAL Design" },
    { name: "Zacht Salie", code: "S 1510-G20Y", hex: "#C2CDBB", collection: "NCS Kleuren" },
    { name: "Babyblauw", code: "S 0515-R80B", hex: "#CBDDE9", collection: "NCS Kleuren" },
    { name: "Hemelgrijs", code: "S 0804-R90B", hex: "#DCE2E3", collection: "NCS Kleuren" },
    { name: "Lavendel", code: "S 0520-R50B", hex: "#D8D0E2", collection: "NCS Kleuren" },
    { name: "Lila", code: "S 0520-R50B", hex: "#D8D0E2", collection: "NCS Kleuren" },
    { name: "Oudroze Licht", code: "S 0510-R", hex: "#EED9D5", collection: "NCS Kleuren" },
  ]),
  coll("natuurtinten", "Natuurtinten", [
    { name: "Zand", code: "S 1510-Y10R", hex: "#DACAAB", collection: "NCS Kleuren" },
    { name: "Leem", code: "S 2010-Y20R", hex: "#C9B79A", collection: "NCS Kleuren" },
    { name: "Mistgrijs", code: "S 2502-Y20R", hex: "#C4C1B9", collection: "NCS Kleuren" },
    { name: "Olijf", code: "110 50 20", hex: "#777A56", collection: "RAL Design" },
    { name: "Rookblauw", code: "S 3010-R90B", hex: "#93A2AB", collection: "NCS Kleuren" },
    { name: "Mosterd", code: "S 2060-Y", hex: "#C69822", collection: "NCS Kleuren" },
    { name: "Roestbruin", code: "S 5040-Y50R", hex: "#884D30", collection: "NCS Kleuren" },
    { name: "Houtskool", code: "S 8500-N", hex: "#373635", collection: "NCS Kleuren" },
  ]),
  coll("ral-classic", "RAL Classic", [
    { name: "Groenbeige", code: "RAL 1000", hex: "#CDBA88", collection: "RAL kleuren" },
    { name: "Beige", code: "RAL 1001", hex: "#D0B084", collection: "RAL kleuren" },
    { name: "Signaalgeel", code: "RAL 1003", hex: "#F9A800", collection: "RAL kleuren" },
    { name: "Oesterwit", code: "RAL 1013", hex: "#E3D9C6", collection: "RAL kleuren" },
    { name: "Ivoor", code: "RAL 1014", hex: "#DDC49A", collection: "RAL kleuren" },
    { name: "Licht Ivoor", code: "RAL 1015", hex: "#E6D2B5", collection: "RAL kleuren" },
    // #F3DA0B stond hier: citroengeel, en dat is te koud. Twee bronnen die niets
    // met elkaar te maken hebben — verf-plaza (#F8C932) en de Sikkens-omzetting
    // (#F8CA3A) — zitten binnen ΔE 2,3 van elkaar en allebei op ΔE ~16 van ons.
    // Op de andere negen RAL-kleuren die alle drie de bronnen kennen zaten wij
    // wél in lijn, dus dit was een losse fout, geen ander ijkpunt.
    { name: "Zinkgeel", code: "RAL 1018", hex: "#F8C932", collection: "RAL kleuren" },
    { name: "Zuiver Oranje", code: "RAL 2004", hex: "#E25303", collection: "RAL kleuren" },
    { name: "Signaalrood", code: "RAL 3001", hex: "#9B2423", collection: "RAL kleuren" },
    { name: "Wijnrood", code: "RAL 3005", hex: "#5E2129", collection: "RAL kleuren" },
    { name: "Verkeersrood", code: "RAL 3020", hex: "#C1121C", collection: "RAL kleuren" },
    { name: "Blauwlila", code: "RAL 4005", hex: "#6C4675", collection: "RAL kleuren" },
    { name: "Gentiaanblauw", code: "RAL 5010", hex: "#0E4C92", collection: "RAL kleuren" },
    { name: "Staalblauw", code: "RAL 5011", hex: "#1A2B3C", collection: "RAL kleuren" },
    { name: "Lichtblauw", code: "RAL 5012", hex: "#3B83BD", collection: "RAL kleuren" },
    { name: "Duifblauw", code: "RAL 5014", hex: "#606E8C", collection: "RAL kleuren" },
    { name: "Hemelsblauw", code: "RAL 5015", hex: "#2271B3", collection: "RAL kleuren" },
    { name: "Oceaanblauw", code: "RAL 5020", hex: "#1B5583", collection: "RAL kleuren" },
    { name: "Pastelblauw", code: "RAL 5024", hex: "#5D9B9B", collection: "RAL kleuren" },
    { name: "Mosgroen", code: "RAL 6005", hex: "#2F4538", collection: "RAL kleuren" },
    { name: "Dennengroen", code: "RAL 6009", hex: "#27352A", collection: "RAL kleuren" },
    { name: "Resedagroen", code: "RAL 6011", hex: "#587246", collection: "RAL kleuren" },
    { name: "Geelgroen", code: "RAL 6018", hex: "#57A639", collection: "RAL kleuren" },
    { name: "Pastelgroen", code: "RAL 6019", hex: "#BDECB6", collection: "RAL kleuren" },
    { name: "Lichtgrijs", code: "RAL 7035", hex: "#CBD0CC", collection: "RAL kleuren" },
    { name: "Agaatgrijs", code: "RAL 7038", hex: "#B5B8B1", collection: "RAL kleuren" },
    { name: "Venstergrijs", code: "RAL 7040", hex: "#9DA3A6", collection: "RAL kleuren" },
    { name: "Zijdegrijs", code: "RAL 7044", hex: "#CAC4B0", collection: "RAL kleuren" },
    { name: "IJzergrijs", code: "RAL 7011", hex: "#52595D", collection: "RAL kleuren" },
    { name: "Basaltgrijs", code: "RAL 7012", hex: "#575D5E", collection: "RAL kleuren" },
    { name: "Leigrijs", code: "RAL 7015", hex: "#434B4D", collection: "RAL kleuren" },
    { name: "Antracietgrijs", code: "RAL 7016", hex: "#383E42", collection: "RAL kleuren" },
    { name: "Grafietgrijs", code: "RAL 7024", hex: "#45494E", collection: "RAL kleuren" },
    { name: "Zwartgrijs", code: "RAL 7021", hex: "#23282B", collection: "RAL kleuren" },
    { name: "Kleibruin", code: "RAL 8003", hex: "#734222", collection: "RAL kleuren" },
    { name: "Notenbruin", code: "RAL 8011", hex: "#5A3A29", collection: "RAL kleuren" },
    { name: "Chocoladebruin", code: "RAL 8017", hex: "#45322E", collection: "RAL kleuren" },
    { name: "Grijswit", code: "RAL 9002", hex: "#E7EBDA", collection: "RAL kleuren" },
    { name: "Signaalwit", code: "RAL 9003", hex: "#F4F8F4", collection: "RAL kleuren" },
    { name: "Gitzwart", code: "RAL 9005", hex: "#0A0A0A", collection: "RAL kleuren" },
    { name: "Zuiver Wit", code: "RAL 9010", hex: "#F1ECE1", collection: "RAL kleuren" },
    { name: "Verkeerswit", code: "RAL 9016", hex: "#F1F0EA", collection: "RAL kleuren" },
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
