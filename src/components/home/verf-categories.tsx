import Link from "next/link";
import { getCategory } from "@/lib/data/categories";
import { SectionHeading } from "@/components/shared/section-heading";
import { CategoryIcon } from "@/components/shared/category-icon";
import { t, getLocale } from "@/lib/i18n/server";
import { localizeCategory } from "@/lib/data/categories-i18n";

const groupIcons: Record<string, string> = {
  lakken: "PaintbrushVertical",
  muurverf: "PaintRoller",
  beits: "TreePine",
  "grondverf-primers": "PaintBucket",
  "voorstrijk-grondering": "Layers",
  "beton-vloerverf": "LayoutPanelTop",
  "speciale-verf": "Sparkles",
};

export function VerfCategories() {
  const verf = getCategory("verf");
  const groups = (verf ? localizeCategory(verf, getLocale()).subGroups : undefined) ?? [];
  if (groups.length === 0) return null;

  return (
    <section className="container-klusr">
      <SectionHeading
        title={t("home.verf.title")}
        subtitle={t("home.verf.subtitle")}
        href="/categorie/verf"
      />
      {/* Lichte 'shop op verftype'-strip — bewust anders dan de klus-funnel hierboven */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar">
        {groups.map((group) => (
          <Link
            key={group.slug}
            href={`/categorie/verf/${group.subCategories[0].slug}`}
            className="group flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-card py-2 pl-2 pr-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-card"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <CategoryIcon name={groupIcons[group.slug]} className="h-5 w-5" />
            </span>
            <span className="whitespace-nowrap text-sm font-semibold">{group.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
