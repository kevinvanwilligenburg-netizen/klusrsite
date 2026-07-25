import Link from "next/link";
import {
  PaintBucket,
  Layers,
  Wrench,
  Plug,
  Hammer,
  Sprout,
  Lightbulb,
  LayoutPanelTop,
  type LucideIcon,
} from "lucide-react";
import { navCategories } from "@/lib/data/categories";
import { TopicImage } from "@/components/shared/topic-image";
import { categoryKeywords } from "@/lib/topic-images";
import { SectionHeading } from "@/components/shared/section-heading";
import { t, getLocale } from "@/lib/i18n/server";
import { localizeCategories } from "@/lib/data/categories-i18n";

/** Lucide-icoon per categorie — vult de tegel ook als de foto (nog) niet laadt. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  verf: PaintBucket,
  "afbouw-fijnbouw": Layers,
  ijzerwaren: Wrench,
  elektra: Plug,
  gereedschap: Hammer,
  tuin: Sprout,
  verlichting: Lightbulb,
  "vloeren-raam": LayoutPanelTop,
};

export function CategoryTiles() {
  const tiles = localizeCategories(
    navCategories.filter((c) => c.slug !== "acties"),
    getLocale(),
  );

  return (
    <section className="container-klusr">
      <SectionHeading title={t("home.categories.title")} subtitle={t("home.categories.subtitle")} />
      {/* Altijd één rij: horizontaal scrollen (met snap) op smal scherm, op
          desktop passen alle tegels naast elkaar. Bewust géén grid → geen
          omloop naar meerdere rijen. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:mx-0 sm:px-0">
        {tiles.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categorie/${cat.slug}`}
            className="group relative flex aspect-square w-32 shrink-0 snap-start flex-col justify-end overflow-hidden rounded-xl sm:flex-1 sm:basis-32"
          >
            <TopicImage
              seed={cat.slug}
              keywords={categoryKeywords(cat.slug)}
              icon={CATEGORY_ICONS[cat.slug]}
              // Gegenereerd sfeerbeeld als dat in /generated bestaat, anders het
              // vaste categoriebeeld; faalt ook dat, dan blijft de gradient staan.
              src={`/generated/categorie-${cat.slug}.jpg`}
              fallbackSrc={cat.image}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-klusr-black/85 to-transparent" />
            <span className="relative p-3 text-sm font-bold text-white">{cat.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
