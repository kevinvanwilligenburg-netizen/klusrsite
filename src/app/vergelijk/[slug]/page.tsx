import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star, Info } from "lucide-react";
import {
  ALTERNATIEVEN,
  getAlternatief,
  onzeTegenhangers,
  voerenWijDit,
} from "@/lib/data/merkalternatieven";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { formatPrice } from "@/lib/utils";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

/**
 * Alternatievenpagina voor een merk dat wij niet voeren.
 *
 * Bewust nuchter van toon: we zeggen eerlijk dat we het merk niet hebben en
 * laten zien wat we wél voeren in dezelfde soort verf. Geen vergelijkende
 * kwaliteitsclaims — wij hebben die andere verf niet getest.
 */

export const revalidate = 86400;

export function generateStaticParams() {
  return ALTERNATIEVEN.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getAlternatief(params.slug);
  if (!a) return { title: "Niet gevonden" };
  return {
    // Geen "bij KLUSR" in de titel: de root-layout plakt er al "| KLUSR"
    // achter, en twee keer de merknaam in één titelbalk oogt als spam.
    title: `${a.merk} alternatief — vergelijkbare verf`,
    description: `Wij voeren ${a.merk} niet. Zoek je ${a.waarvoor}? Bekijk welke verf wij daarvoor hebben — in elke kleur op maat gemengd, voor 09:00 besteld vanavond in huis.`,
    alternates: { canonical: `/vergelijk/${a.slug}` },
    // Geen merkzoekwoord in de OG-titel: dit is onze pagina, niet die van hen.
    openGraph: {
      title: `Alternatief voor ${a.merk} | KLUSR`,
      description: `Wat wij voeren in ${a.waarvoor}.`,
    },
  };
}

export default function AlternatiefPage({ params }: { params: { slug: string } }) {
  const a = getAlternatief(params.slug);
  if (!a) notFound();

  // Zouden we het merk inmiddels tóch voeren, dan klopt deze pagina niet meer
  // en hoort de bezoeker op de merkpagina te landen.
  if (voerenWijDit(a.merk)) notFound();

  const groepen = onzeTegenhangers(a);
  const kruimels = [{ label: "Vergelijken", href: "/vergelijk" }, { label: `${a.merk} alternatief` }];

  return (
    <div className="container-klusr py-8">
      <Breadcrumb items={kruimels} />
      <BreadcrumbJsonLd items={kruimels} baseUrl={SITE_URL} />

      <header className="mt-2 max-w-3xl">
        <h1 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Op zoek naar {a.merk}?
        </h1>
        <div className="mt-4 flex gap-3 rounded-2xl border border-border bg-secondary/40 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed">
            <strong>Wij voeren {a.merk} niet.</strong> Wel hebben we {a.waarvoor} van merken die we
            zelf verkopen en kennen. Hieronder staat per soort wat wij daarvoor hebben — dan kun je
            zelf beoordelen of daar iets bij zit dat past.
          </p>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Wat er bij ons niet uitmaakt: de kleur. Wij mengen elke kleur op maat, dus je zit nooit
          vast aan het standaardrijtje van een merk. Ken je de RAL-code, dan kun je die{" "}
          <Link href="/kleuren/ral" className="font-semibold text-primary hover:underline">
            hier opzoeken
          </Link>
          .
        </p>
      </header>

      {groepen.map((g) => (
        <section key={g.kop} className="mt-10">
          <h2 className="text-xl font-black tracking-tight">{g.kop}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {g.producten.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/product/${p.slug}`}
                  className="flex h-full flex-col gap-2 rounded-2xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                >
                  {p.images?.[0] && (
                    <Image
                      src={p.images[0]}
                      alt=""
                      width={120}
                      height={120}
                      className="mx-auto h-24 w-24 object-contain"
                    />
                  )}
                  <span className="text-sm font-bold leading-tight">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.brand}</span>
                  {p.reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {p.rating.toFixed(1)}
                      <span className="font-medium text-muted-foreground">({p.reviewCount})</span>
                    </span>
                  )}
                  <span className="mt-auto text-sm font-extrabold text-primary">
                    vanaf {formatPrice(p.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="mt-12 rounded-2xl bg-klusr-black p-6 text-white sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">Twijfel je welke verf past?</h2>
        <p className="mt-2 max-w-2xl text-white/70">
          Onze mensen hebben zelf jaren geschilderd. Vertel wat je gaat doen en welke ondergrond je
          hebt, dan zeggen we wat er op moet — ook als dat een goedkopere verf is dan je zocht.
        </p>
        <Link
          href="/klantenservice"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Stel je vraag
        </Link>
      </div>
    </div>
  );
}
