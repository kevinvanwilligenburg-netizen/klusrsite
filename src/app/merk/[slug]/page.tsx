import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { brands, getBrand, getBrandProducts, brandDescription } from "@/lib/data/brands";
import { getCategoryTitle } from "@/lib/data/categories";
import { localizeProducts } from "@/lib/data/products-i18n";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { ProductListing } from "@/components/plp/product-listing";

interface BrandPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return brands.map((b) => ({ slug: b.slug }));
}

/** Categorieën van dit merk als leesbare opsomming ("verf, gereedschap en tuin"). */
function categoryList(slugs: string[], max = 3): string {
  const titles = slugs.slice(0, max).map((c) => getCategoryTitle(c).toLowerCase());
  if (titles.length <= 1) return titles[0] ?? "klusmateriaal";
  return `${titles.slice(0, -1).join(", ")} en ${titles[titles.length - 1]}`;
}

export function generateMetadata({ params }: BrandPageProps): Metadata {
  const brand = getBrand(params.slug);
  if (!brand) return { title: "Merk niet gevonden | KLUSR" };

  // De root-layout plakt er al "| KLUSR" achter (title.template), dus niet hier.
  const title = `${brand.name} kopen — ${brand.productCount} producten`;
  const description =
    brandDescription(brand.slug) ??
    `${brand.name} ${categoryList(brand.categories)} koop je bij KLUSR. ${brand.productCount} producten op voorraad, advies van ex-schilders en voor 09:00 besteld vanavond in huis.`;

  return {
    title,
    description,
    alternates: { canonical: `/merk/${brand.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(brand.logo ? { images: [{ url: brand.logo, alt: brand.name }] } : {}),
    },
  };
}

export default function BrandPage({ params }: BrandPageProps) {
  const brand = getBrand(params.slug);
  if (!brand) notFound();

  const products = localizeProducts(getBrandProducts(brand.slug));
  const intro = brandDescription(brand.slug);
  const breadcrumbItems = [
    { label: "Merken", href: "/merken" },
    { label: brand.name, href: `/merk/${brand.slug}` },
  ];

  // Schema.org: de pagina is een merk-collectie. Zo begrijpt Google dat dit
  // over één merk gaat en niet zomaar een filterpagina is.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${brand.name} bij KLUSR`,
    ...(intro ? { description: intro } : {}),
    about: {
      "@type": "Brand",
      name: brand.name,
      ...(brand.logo ? { logo: brand.logo } : {}),
    },
  };

  return (
    <div className="flex flex-col gap-8 pb-12 sm:gap-10">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-klusr">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Merk-hero: logo + korte introductie */}
      <section className="container-klusr">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          {brand.logo && (
            <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-3">
              <Image
                src={brand.logo}
                alt={`${brand.name} logo`}
                width={160}
                height={96}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {brand.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {intro ??
                `${brand.name} bij KLUSR: ${brand.productCount} producten in ${categoryList(brand.categories)}.`}
            </p>
            <p className="mt-3 text-sm font-semibold">
              {brand.productCount} producten op voorraad
            </p>
          </div>
        </div>
      </section>

      <ProductListing products={products} listName={brand.name} />

      {/* SEO-tekstblok: uniek per merk dankzij naam, aantal en categorieën. */}
      <section className="container-klusr">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-extrabold sm:text-xl">
            {brand.name} kopen bij KLUSR
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {intro && <p>{intro}</p>}
            <p>
              Bij KLUSR vind je {brand.productCount} producten van {brand.name} in{" "}
              {categoryList(brand.categories, 4)}. Voor 09:00 besteld is je bestelling
              vanavond in huis, en met de gratis KLUSRPAS profiteer je altijd van extra
              voordeel op je hele klus. Twijfel je welk product je nodig hebt? Onze
              ex-schilders denken met je mee.
            </p>
            {brand.categories.length > 0 && (
              <p>
                Bekijk {brand.name} per categorie:{" "}
                {brand.categories.slice(0, 6).map((c, i, arr) => (
                  <span key={c}>
                    <Link
                      href={`/categorie/${c}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {getCategoryTitle(c)}
                    </Link>
                    {i < arr.length - 1 ? ", " : "."}
                  </span>
                ))}
              </p>
            )}
          </div>
          <Link
            href="/merken"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Alle merken bekijken
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
