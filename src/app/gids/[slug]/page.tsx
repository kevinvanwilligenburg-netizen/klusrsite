import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Lightbulb, Star, Check } from "lucide-react";
import { GIDSEN, getGids, topProducten } from "@/lib/data/gidsen";
import { getSafetyStock } from "@/lib/store/settings";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { formatPrice } from "@/lib/utils";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

/**
 * Koopgids. De ranglijst komt live uit de catalogus (zie lib/data/gidsen.ts),
 * zodat er nooit een product wordt aanbevolen dat niet meer leverbaar is.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return GIDSEN.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = getGids(params.slug);
  if (!g) return { title: "Gids niet gevonden" };
  return {
    title: g.titel,
    description: g.omschrijving,
    alternates: { canonical: `/gids/${g.slug}` },
    openGraph: { title: `${g.h1} | KLUSR`, description: g.omschrijving },
  };
}

export default async function GidsPage({ params }: { params: { slug: string } }) {
  const g = getGids(params.slug);
  if (!g) notFound();

  const safetyStock = await getSafetyStock();
  const top = topProducten(g, safetyStock);

  const kruimels = [{ label: "Advies", href: "/advies" }, { label: g.h1 }];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: g.h1,
        numberOfItems: top.length,
        itemListElement: top.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/product/${p.slug}`,
          name: `${p.brand} ${p.title}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: g.vragen.map((q) => ({
          "@type": "Question",
          name: q.v,
          acceptedAnswer: { "@type": "Answer", text: q.a },
        })),
      },
    ],
  };

  return (
    <div className="container-klusr py-8">
      <Breadcrumb items={kruimels} />
      <BreadcrumbJsonLd items={kruimels} baseUrl={SITE_URL} />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="mt-2 max-w-3xl">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
          <Lightbulb className="h-3.5 w-3.5" />
          KOOPGIDS
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-balance sm:text-4xl">{g.h1}</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">{g.intro}</p>
      </header>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-xl font-black tracking-tight">Waar let je op?</h2>
        <div className="mt-4 space-y-5">
          {g.waaropLetten.map((w) => (
            <div key={w.kop} className="rounded-2xl border border-border p-4">
              <h3 className="font-black">{w.kop}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.tekst}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-black tracking-tight">
          Best beoordeeld uit ons assortiment
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Op volgorde van hoe klanten ze beoordelen, en alleen wat we op voorraad hebben. Deze
          lijst komt rechtstreeks uit onze catalogus en schuift dus vanzelf mee — geen redactielijst
          die na een paar maanden niet meer klopt. Wij testen deze verf niet zelf; dit is wat
          kopers ervan vinden.
        </p>

        <ol className="mt-5 space-y-3">
          {top.map((p, i) => (
            <li key={p.id}>
              <Link
                href={`/product/${p.slug}`}
                className="flex items-start gap-4 rounded-2xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-white">
                  {i + 1}
                </span>
                {p.images?.[0] && (
                  <Image
                    src={p.images[0]}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 shrink-0 rounded-lg object-contain"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">{p.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.brand}</span>
                  {p.reviewCount > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {p.rating.toFixed(1)}
                      <span className="font-medium text-muted-foreground">
                        ({p.reviewCount} beoordelingen)
                      </span>
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-extrabold text-primary">
                    vanaf {formatPrice(p.price)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>

        {top.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Op dit moment hebben we hier niets van op voorraad. Kijk in de{" "}
            <Link href="/categorie/verf" className="font-semibold text-primary hover:underline">
              verfcategorie
            </Link>{" "}
            voor het volledige assortiment.
          </p>
        )}
      </section>

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-black tracking-tight">Veelgestelde vragen</h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {g.vragen.map((q) => (
            <div key={q.v} className="py-4">
              <dt className="flex items-start gap-2 font-bold">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {q.v}
              </dt>
              <dd className="mt-1.5 pl-6 text-sm leading-relaxed text-muted-foreground">{q.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
