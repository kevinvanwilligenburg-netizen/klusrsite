import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { brands } from "@/lib/data/brands";
import { getCategoryTitle } from "@/lib/data/categories";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";

export const metadata: Metadata = {
  // Root-layout voegt "| KLUSR" toe via title.template.
  title: "Alle merken",
  description:
    "Van Sikkens en Histor tot Anza, Alabastine en Pattex: bekijk het complete merkenaanbod van KLUSR. Op voorraad, scherp geprijsd en met advies van ex-schilders.",
  alternates: { canonical: "/merken" },
};

export default function BrandsPage() {
  const breadcrumbItems = [{ label: "Merken", href: "/merken" }];

  return (
    <div className="flex flex-col gap-8 pb-12 sm:gap-10">
      <BreadcrumbJsonLd items={breadcrumbItems} />

      <div className="container-klusr">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      <section className="container-klusr">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Alle merken
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          We werken met merken die onze ex-schilders zelf gebruiken. Kies een merk om
          het complete aanbod te bekijken — alles wat je ziet ligt op voorraad.
        </p>
      </section>

      <section className="container-klusr">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/merk/${brand.slug}`}
                className="group flex h-full flex-col items-center gap-3 rounded-xl border border-border bg-card p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
              >
                {brand.logo && (
                  <span className="flex h-16 w-full items-center justify-center rounded-lg bg-white p-2">
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={140}
                      height={64}
                      loading="lazy"
                      className="h-full w-auto object-contain"
                    />
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-bold group-hover:text-primary">
                    {brand.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {brand.productCount} producten
                    {brand.categories[0] ? ` · ${getCategoryTitle(brand.categories[0])}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
