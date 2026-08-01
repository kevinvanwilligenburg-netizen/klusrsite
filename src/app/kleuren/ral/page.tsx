import type { Metadata } from "next";
import Link from "next/link";
import { Palette } from "lucide-react";
import { ralKleuren, ralSlug, ralFamilie, ralCode } from "@/lib/data/ral";
import { isLightColor } from "@/lib/data/colors";
import { cn } from "@/lib/utils";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

export const metadata: Metadata = {
  title: "RAL-kleuren — alle RAL-verfkleuren op een rij",
  description:
    "Alle RAL-kleuren die wij mengen, per kleurfamilie. Kies je RAL-code en zie meteen in welke verf we hem mengen — muurverf, lak, beits of grondverf. Voor 09:00 besteld, vanavond in huis.",
  alternates: { canonical: "/kleuren/ral" },
  openGraph: {
    title: "Alle RAL-kleuren | KLUSR",
    description: "Kies je RAL-code en zie in welke verf wij hem mengen.",
  },
};

/** Per RAL-hoofdgroep, want dat is hoe mensen zoeken ("een grijstint, RAL 70..."). */
function perFamilie() {
  const map = new Map<string, typeof ralKleuren>();
  for (const k of ralKleuren) {
    const f = ralFamilie(k);
    const lijst = map.get(f);
    if (lijst) lijst.push(k);
    else map.set(f, [k]);
  }
  return [...map.entries()];
}

export default function RalIndexPage() {
  const families = perFamilie();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "RAL-kleuren",
    url: `${SITE_URL}/kleuren/ral`,
    description: `Alle ${ralKleuren.length} RAL-kleuren die KLUSR op maat mengt.`,
  };

  return (
    <div className="container-klusr py-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="max-w-2xl">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
          <Palette className="h-3.5 w-3.5" />
          RAL
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Alle RAL-kleuren
        </h1>
        <p className="mt-3 text-muted-foreground">
          Ken je de RAL-code? Klik hem aan en je ziet meteen in welke verf we hem mengen — van
          muurverf tot buitenlak. Wij mengen op professionele kleurcodes, dus de kleur klopt
          ongeacht welk merk je kiest.
        </p>
      </header>

      {families.map(([familie, kleuren]) => (
        <section key={familie} className="mt-8">
          <h2 className="text-lg font-black tracking-tight">
            {familie}{" "}
            <span className="text-sm font-semibold text-muted-foreground">({kleuren.length})</span>
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {kleuren.map((k) => (
              <li key={k.nummer}>
                <Link
                  href={`/kleuren/${ralSlug(k)}`}
                  className="flex items-center gap-2.5 rounded-xl border border-border p-2 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                >
                  <span
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-lg border shadow-sm",
                      isLightColor(k.hex) ? "border-black/15" : "border-black/5",
                    )}
                    style={{ backgroundColor: k.hex }}
                  />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-bold">{k.naam}</span>
                    <span className="block text-xs text-muted-foreground">{ralCode(k)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-10 text-sm text-muted-foreground">
        Staat jouw RAL-code er niet bij? Wij mengen ook kleuren buiten deze lijst — gebruik de{" "}
        <Link href="/kleurenkiezer" className="font-semibold text-primary hover:underline">
          kleurenkiezer
        </Link>{" "}
        of vraag het onze specialisten.
      </p>
    </div>
  );
}
