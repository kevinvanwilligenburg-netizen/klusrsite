import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import {
  categories,
  getCategory,
  getSubCategories,
  getSubCategory,
} from "@/lib/data";
import {
  getLocalizedProductsByCategory,
  getLocalizedProductsBySubCategory,
} from "@/lib/data/products-i18n";
import { getLocale } from "@/lib/i18n/server";
import { localizeCategory, catTitle } from "@/lib/data/categories-i18n";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { ProductListing } from "@/components/plp/product-listing";
import { getVerfLeafContent } from "@/lib/data/verf-content";

interface SubPageProps {
  params: { slug: string; sub: string };
}

export function generateStaticParams() {
  return categories.flatMap((c) =>
    getSubCategories(c.slug).map((sub) => ({ slug: c.slug, sub: sub.slug })),
  );
}

function resolve(params: SubPageProps["params"]) {
  const category = getCategory(params.slug);
  const subCategory = getSubCategory(params.slug, params.sub);
  return { category, subCategory };
}

export function generateMetadata({ params }: SubPageProps): Metadata {
  const { category, subCategory } = resolve(params);
  if (!category || !subCategory) {
    return { title: "Pagina niet gevonden | KLUSR" };
  }
  const title = `${subCategory.title} — ${category.title} | KLUSR`;
  const description = `${subCategory.title} kopen bij KLUSR. Onderdeel van ${category.title}. Professionele kwaliteit, scherp geprijsd en met advies van ex-schilders.`;
  return {
    title,
    description,
    alternates: { canonical: `/categorie/${category.slug}/${subCategory.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: category.image, width: 800, height: 600, alt: subCategory.title }],
    },
  };
}

export default function SubCategoryPage({ params }: SubPageProps) {
  const { category: baseCategory, subCategory: baseSub } = resolve(params);
  if (!baseCategory || !baseSub) notFound();
  const locale = getLocale();
  const category = localizeCategory(baseCategory, locale);
  const subCategory = { ...baseSub, title: catTitle(baseSub.slug, locale, baseSub.title) };

  const subProducts = getLocalizedProductsBySubCategory(subCategory.slug);
  const usesFallback = subProducts.length === 0;
  const products = usesFallback ? getLocalizedProductsByCategory(category.slug) : subProducts;
  const seo = getVerfLeafContent(subCategory.slug);

  const breadcrumbItems = [
    { label: category.title, href: `/categorie/${category.slug}` },
    {
      label: subCategory.title,
      href: `/categorie/${category.slug}/${subCategory.slug}`,
    },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 sm:gap-10">
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="container-klusr">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Heading */}
      <section className="container-klusr">
        <span className="text-xs font-bold uppercase tracking-wide text-primary">
          {category.title}
        </span>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {subCategory.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {seo?.intro ??
            `${subCategory.title} van topmerken bij KLUSR — met deskundig advies en voor 19:00 besteld morgen in huis.`}
        </p>
      </section>

      {/* Fallback notice when the subcategory has no dedicated products yet */}
      {usesFallback && (
        <section className="container-klusr">
          <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/60 p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              Er zijn nog geen producten specifiek voor{" "}
              <span className="font-semibold text-foreground">
                {subCategory.title}
              </span>
              . Hieronder tonen we het volledige assortiment uit{" "}
              <span className="font-semibold text-foreground">
                {category.title}
              </span>
              .
            </p>
          </div>
        </section>
      )}

      {/* Product listing */}
      <ProductListing
        products={products}
        listName={usesFallback ? category.title : subCategory.title}
      />

      {/* SEO-landingscontent (alleen voor verf-leaves met content) */}
      {seo && (
        <section className="container-klusr">
          <div className="mx-auto max-w-3xl border-t border-border pt-8">
            <div className="flex flex-col gap-6">
              {seo.sections.map((s) => (
                <div key={s.heading}>
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl">{s.heading}</h2>
                  {s.paragraphs.map((p, i) => (
                    <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                </div>
              ))}

              {seo.faq.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                    Veelgestelde vragen over {subCategory.title.toLowerCase()}
                  </h2>
                  <dl className="mt-3 flex flex-col gap-4">
                    {seo.faq.map((f) => (
                      <div key={f.q}>
                        <dt className="text-sm font-semibold">{f.q}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {/* FAQ structured data */}
          <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: seo.faq.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              }),
            }}
          />
        </section>
      )}
    </div>
  );
}
