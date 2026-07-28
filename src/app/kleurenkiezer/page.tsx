import type { Metadata } from "next";
import { products } from "@/lib/data";
import { KleurenkiezerFunnel } from "@/components/color/kleurenkiezer-funnel";

export const metadata: Metadata = {
  title: "Kleurenkiezer — kies eerst je kleur, dan je verf",
  description:
    "In drie simpele stappen naar de juiste verf: kies je kleur, kies je klus en wij mengen de verf exact op kleur. Voor 09:00 besteld, vanavond in huis.",
  alternates: { canonical: "/kleurenkiezer" },
  openGraph: {
    title: "Kleurenkiezer — eerst je kleur, dan je verf | KLUSR",
    description:
      "Kies je kleur, kies je klus en bestel verf die wij exact op jouw kleur mengen.",
  },
};

// Bijverkoop: één gevarieerd item per gereedschapstype ("vergeet je gereedschap
// niet") — voorkomt 5x hetzelfde schuurpapier.
const ACCESSORY_GROUPS: RegExp[] = [
  /kwast/i,
  /roller|verfrol|radiatorrol/i,
  /verfbak|inzetbak|inzetpot|bakje/i,
  /afplak|schilderstape|tape/i,
  /afdek|folie/i,
  /schuur/i,
  /plamuur|spaan|menghulp/i,
];

export default function KleurenkiezerPage() {
  const colorProducts = products.filter((p) => p.colorMatchable === true);

  const seen = new Set<string>();
  const accessories = ACCESSORY_GROUPS.map((re) =>
    products.find((p) => {
      if (p.colorMatchable || p.variants.length === 0) return false;
      const key = p.title.trim().toLowerCase();
      if (seen.has(key)) return false;
      if (!re.test(`${p.title} ${p.category} ${p.subCategory ?? ""}`)) return false;
      seen.add(key);
      return true;
    }),
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return <KleurenkiezerFunnel colorProducts={colorProducts} accessories={accessories} />;
}
