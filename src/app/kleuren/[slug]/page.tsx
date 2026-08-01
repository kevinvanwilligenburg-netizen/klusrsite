import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Palette, Check } from "lucide-react";
import {
  ralKleuren,
  ralSlug,
  getRal,
  ralCode,
  ralFamilie,
  verwanteRal,
  mengbareProducten,
  productLink,
  type RalKleur,
} from "@/lib/data/ral";
import { isLightColor } from "@/lib/data/colors";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { formatPrice, cn } from "@/lib/utils";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

/**
 * Landingspagina per RAL-kleur.
 *
 * Wie "RAL 7016 verf" zoekt wil geen categorie maar één kleur, en wil weten in
 * wélke verf wij die mengen. Vandaar: de kleur groot in beeld, daaronder de
 * mengbare verf per soort met de kleur al voorgeselecteerd in de link, en een
 * FAQ die alleen dingen beweert die we ook echt weten.
 */

export const revalidate = 86400;

export function generateStaticParams() {
  return ralKleuren.map((k) => ({ slug: ralSlug(k) }));
}

/** Vragen die we kunnen beantwoorden zonder iets te verzinnen. */
function faq(k: RalKleur, aantalProducten: number) {
  return [
    {
      v: `Kan ik ${ralCode(k)} in elke verf krijgen?`,
      a: `Wij mengen ${ralCode(k)} (${k.naam}) in ${aantalProducten} verfsoorten uit ons assortiment — van muurverf tot buitenlak. De kleur komt uit de mengmachine, dus je kiest eerst de verf die bij je klus past en daarna deze kleur.`,
    },
    {
      v: `Wat is ${ralCode(k)} voor kleur?`,
      a: `${k.naam} is een ${ralFamilie(k).toLowerCase()}tint uit de RAL Classic-reeks. RAL-codes zijn internationaal vastgelegd, dus ${ralCode(k)} is overal dezelfde kleur — ongeacht het merk verf.`,
    },
    {
      v: `Wijkt de kleur op mijn scherm af?`,
      a: `Ja, dat kan. Schermen geven kleuren verschillend weer en een verfkleur ziet er op een muur anders uit dan op een beeldscherm. Wij mengen op de officiële RAL-code, dus de verf klopt — maar twijfel je, vraag dan eerst een kleurstaal of proefpotje.`,
    },
    {
      v: `Hoe snel heb ik ${ralCode(k)} in huis?`,
      a: `Wij mengen op bestelling. Besteld vóór 09:00 op een werkdag, dan gaat het dezelfde dag mee en is het 's avonds bij je — DHL bezorgt in de avond door heel Nederland.`,
    },
  ];
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const k = getRal(params.slug);
  if (!k) return { title: "Kleur niet gevonden" };
  const code = ralCode(k);
  return {
    title: `${code} ${k.naam} — verf in deze kleur laten mengen`,
    description: `${code} (${k.naam}) laten mengen in muurverf, lak, beits of grondverf. Wij mengen op de officiële RAL-code, dus de kleur klopt. Voor 09:00 besteld, vanavond in huis.`,
    alternates: { canonical: `/kleuren/${ralSlug(k)}` },
    openGraph: {
      title: `${code} ${k.naam} | KLUSR`,
      description: `Verf laten mengen in ${code} — ${k.naam}.`,
    },
  };
}

export default function RalKleurPage({ params }: { params: { slug: string } }) {
  const k = getRal(params.slug);
  // Alleen echte RAL-slugs; /kleuren/onzin hoort een 404 te zijn en geen lege
  // pagina die Google alsnog indexeert.
  if (!k || ralSlug(k) !== params.slug) notFound();

  const groepen = mengbareProducten();
  const totaal = groepen.reduce((n, g) => n + g.producten.length, 0);
  const verwant = verwanteRal(k);
  const vragen = faq(k, groepen.length);
  const licht = isLightColor(k.hex);

  const kruimels = [
    { label: "Kleuren", href: "/kleuren" },
    { label: "RAL", href: "/kleuren/ral" },
    { label: `${ralCode(k)} ${k.naam}` },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        mainEntity: vragen.map((q) => ({
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

      <header className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className={cn(
            "grid h-28 w-full shrink-0 place-items-center rounded-2xl border shadow-sm sm:h-32 sm:w-32",
            licht ? "border-black/15" : "border-black/5",
          )}
          style={{ backgroundColor: k.hex }}
        >
          <span
            className={cn("text-sm font-black tracking-wide", licht ? "text-black/70" : "text-white/90")}
          >
            {k.hex.toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
            <Palette className="h-3.5 w-3.5" />
            {ralFamilie(k).toUpperCase()}
          </span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-balance sm:text-4xl">
            {ralCode(k)} — {k.naam}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Laat {ralCode(k)} mengen in de verf die bij jouw klus past. Wij mengen op de officiële
            RAL-code, dus de kleur klopt ongeacht het merk.
          </p>
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-xl font-black tracking-tight">
          In welke verf mengen we {ralCode(k)}?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totaal} producten in {groepen.length} verfsoorten. De kleur staat al voor je klaar als je
          doorklikt.
        </p>

        {groepen.map((g) => (
          <div key={g.soort} className="mt-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-primary">{g.soort}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.producten.map((p) => (
                <li key={p.id}>
                  <Link
                    href={productLink(p, k)}
                    className="flex h-full items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                  >
                    <span
                      className="mt-0.5 h-8 w-8 shrink-0 rounded-md border border-black/10"
                      style={{ backgroundColor: k.hex }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold leading-tight">{p.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{p.brand}</span>
                      <span className="mt-1 block text-sm font-extrabold text-primary">
                        vanaf {formatPrice(p.price)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {verwant.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-black tracking-tight">
            Verwante kleuren in {ralFamilie(k).toLowerCase()}
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {verwant.map((x) => (
              <li key={x.nummer}>
                <Link
                  href={`/kleuren/${ralSlug(x)}`}
                  className="block rounded-xl border border-border p-2 transition-colors hover:border-primary/40"
                >
                  <span
                    className="block h-12 w-full rounded-lg border border-black/10"
                    style={{ backgroundColor: x.hex }}
                  />
                  <span className="mt-1.5 block truncate text-xs font-bold">{x.naam}</span>
                  <span className="block text-[10px] text-muted-foreground">{ralCode(x)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className="text-xl font-black tracking-tight">Veelgestelde vragen</h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {vragen.map((q) => (
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
