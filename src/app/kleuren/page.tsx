import type { Metadata } from "next";
import Link from "next/link";
import { Palette, ArrowRight } from "lucide-react";
import { colorCollections, allColors, isLightColor } from "@/lib/data/colors";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Alle verfkleuren & kleurcollecties — op kleur gemengd",
  description:
    "Bekijk alle KLUSR-verfkleuren en kleurcollecties: RAL Classic, trendkleuren en kleurfamilies (wit, grijs, blauw, groen, warm, bruin, pastels). Wij mengen elke kleur exact op maat. Voor 09:00 besteld, vanavond in huis.",
  alternates: { canonical: "/kleuren" },
  openGraph: {
    title: "Alle verfkleuren & kleurcollecties | KLUSR",
    description:
      "Alle kleuren en collecties op één pagina. Wij mengen elke kleur exact op maat.",
  },
};

export default function KleurenPage() {
  return (
    <div className="container-klusr py-10">
      <header className="max-w-2xl">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
          <Palette className="h-3.5 w-3.5" />
          KLEUREN
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Alle verfkleuren &amp; collecties
        </h1>
        <p className="mt-3 text-muted-foreground">
          Een overzicht van alle {allColors.length} kleuren uit onze {colorCollections.length}{" "}
          collecties — van RAL Classic tot trendkleuren. Wij mengen elke kleur exact op maat, klaar
          voor gebruik. Kies eenvoudig je kleur en verf in de{" "}
          <Link href="/kleurenkiezer" className="font-semibold text-primary hover:underline">
            kleurenkiezer
          </Link>
          .
        </p>
      </header>

      {/* Collectie-navigatie */}
      <nav aria-label="Collecties" className="mt-6 flex flex-wrap gap-2">
        {colorCollections.map((c) => (
          <a
            key={c.id}
            href={`#${c.id}`}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {c.name}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-12">
        {colorCollections.map((coll) => (
          <section key={coll.id} id={coll.id} className="scroll-mt-24">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                {coll.name}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  · {coll.colors.length} kleuren
                </span>
              </h2>
              <Link
                href="/kleurenkiezer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Verf in deze kleuren
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {coll.colors.map((c) => {
                const light = isLightColor(c.hex);
                return (
                  <li key={`${coll.id}-${c.code}`}>
                    <div
                      className="flex aspect-[4/3] flex-col justify-end rounded-xl border border-black/5 p-3 shadow-sm"
                      style={{ backgroundColor: c.hex }}
                    >
                      <span
                        className={cn(
                          "rounded-md px-2 py-1 text-xs font-bold backdrop-blur",
                          light ? "bg-black/5 text-black/80" : "bg-white/15 text-white",
                        )}
                      >
                        {c.name}
                        <span className="block text-[10px] font-medium opacity-70">{c.code}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-klusr-black p-6 text-white sm:p-8">
        <h2 className="text-xl font-black sm:text-2xl">Jouw kleur niet gevonden?</h2>
        <p className="mt-2 max-w-2xl text-white/70">
          Geen probleem — wij mengen élke kleur op maat. Heb je een RAL-code of een eigen tint? Voer
          &apos;m in bij de kleurenkiezer en wij maken de verf exact op kleur.
        </p>
        <Link
          href="/kleurenkiezer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Naar de kleurenkiezer
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
