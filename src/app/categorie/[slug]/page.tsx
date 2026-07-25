import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Tag } from "lucide-react";
import { categories, getCategory } from "@/lib/data";
import { getSubCategories } from "@/lib/data";
import { getLocalizedProductsByCategory } from "@/lib/data/products-i18n";
import { getLocale } from "@/lib/i18n/server";
import { localizeCategory, catTitle } from "@/lib/data/categories-i18n";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { ProductListing } from "@/components/plp/product-listing";
import { CategoryIcon } from "@/components/shared/category-icon";
import { TopicImage } from "@/components/shared/topic-image";
import { categoryKeywords } from "@/lib/topic-images";
import { getHeroImage } from "@/lib/store/hero";

interface CategoryPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const category = getCategory(params.slug);
  if (!category) {
    return { title: "Categorie niet gevonden | KLUSR" };
  }
  return {
    title: category.seoTitle,
    description: category.seoDescription,
    alternates: { canonical: `/categorie/${category.slug}` },
    openGraph: {
      title: category.seoTitle,
      description: category.seoDescription,
      type: "website",
      images: [
        { url: `/generated/categorie-${category.slug}.jpg`, width: 1024, height: 1024, alt: category.title },
      ],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const baseCategory = getCategory(params.slug);
  if (!baseCategory) notFound();
  const locale = getLocale();
  const category = localizeCategory(baseCategory, locale);

  const products = getLocalizedProductsByCategory(category.slug);
  const subs = getSubCategories(category.slug).map((s) => ({
    ...s,
    title: catTitle(s.slug, locale, s.title),
  }));
  const isActies = category.slug === "acties";

  // Door de owner gegenereerde fal.ai-hero (gecachet in KV). Ontbreekt 'ie of
  // is KV uit, dan blijft de bestaande gradient-hero hieronder onveranderd.
  const heroImage = await getHeroImage(category.slug);

  const breadcrumbItems = [
    { label: category.title, href: `/categorie/${category.slug}` },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 sm:gap-10">
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="container-klusr">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Hero band */}
      <section className="container-klusr">
        <div className="group relative h-48 overflow-hidden rounded-2xl border border-border shadow-card sm:h-60 lg:h-72">
          <TopicImage
            seed={`cat-${category.slug}`}
            keywords={categoryKeywords(category.slug)}
            src={`/generated/categorie-${category.slug}.jpg`}
          />
          {/* Gegenereerd fal.ai-sfeerbeeld (indien aanwezig) bovenop de fallback,
              maar onder de donkere gradient zodat de witte tekst leesbaar blijft.
              Plain <img> i.p.v. next/image om remote-domain config te vermijden. */}
          {heroImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-klusr-black/85 via-klusr-black/55 to-primary/30" />
          <div className="absolute inset-0 flex flex-col justify-center gap-3 p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                {isActies ? (
                  <Tag className="h-6 w-6" />
                ) : (
                  <CategoryIcon name={category.icon} className="h-6 w-6" />
                )}
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                {category.title}
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-white/90 sm:text-base">
              {category.description}
            </p>
          </div>
        </div>
      </section>

      {/* Acties themed intro */}
      {isActies && (
        <section className="container-klusr">
          <div className="klusr-stripes flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <Tag className="h-5 w-5" />
              <span className="text-sm font-extrabold uppercase tracking-wide">
                Klusvoordeel
              </span>
            </div>
            <h2 className="text-lg font-extrabold sm:text-xl">
              Tijdelijk extra scherp geprijsd
            </h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Profiteer van onze lopende acties op verf, gereedschap en meer. Op
              is op — met je KLUSRPAS pak je bovendien altijd het meeste voordeel.
            </p>
          </div>
        </section>
      )}

      {/* Subcategory chips */}
      {subs.length > 0 && (
        <section className="container-klusr">
          <div className="flex flex-wrap gap-2">
            {subs.slice(0, 12).map((sub) => (
              <Link
                key={sub.slug}
                href={`/categorie/${category.slug}/${sub.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary"
              >
                {sub.title}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Product listing (met AI-productzoeker bovenaan) */}
      <ProductListing products={products} listName={category.title} />

      {/* SEO text block */}
      <section className="container-klusr">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-extrabold sm:text-xl">
            {category.title} kopen bij KLUSR
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>{category.description}</p>
            <p>
              Bij KLUSR vind je {category.title.toLowerCase()} van topmerken,
              scherp geprijsd en met deskundig advies van onze ex-schilders.
              Voor 19:00 besteld is je bestelling morgen in huis, en met de
              gratis KLUSRPAS profiteer je altijd van extra voordeel op je hele
              klus.
            </p>
            {subs.length > 0 && (
              <p>
                Bekijk gericht per categorie:{" "}
                {subs.slice(0, 8).map((sub, i, arr) => (
                  <span key={sub.slug}>
                    <Link
                      href={`/categorie/${category.slug}/${sub.slug}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {sub.title}
                    </Link>
                    {i < arr.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
