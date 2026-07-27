import type { Metadata } from "next";
import Link from "next/link";
import { Paintbrush, Sparkles, ShieldCheck, Truck, ArrowRight } from "lucide-react";
import { Breadcrumb } from "@/components/plp/breadcrumb";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/dictionaries";

export const metadata: Metadata = {
  title: "Over KLUSR — de beste verf en alles voor de klus",
  description:
    "KLUSR is dé klusspecialist met advies van ex-schilders, professionele kwaliteit en de scherpste KLUSRPAS-prijs. Lees ons verhaal.",
  alternates: { canonical: "/over-klusr" },
};

const VALUES: { icon: typeof Sparkles; titleKey: MessageKey; bodyKey: MessageKey }[] = [
  {
    icon: Sparkles,
    titleKey: "about.value.advice.title",
    bodyKey: "about.value.advice.body",
  },
  {
    icon: Paintbrush,
    titleKey: "about.value.color.title",
    bodyKey: "about.value.color.body",
  },
  {
    icon: ShieldCheck,
    titleKey: "about.value.quality.title",
    bodyKey: "about.value.quality.body",
  },
];

export default function OverKlusrPage() {
  return (
    <div className="flex flex-col gap-12 pb-16 sm:gap-16">
      <div className="container-klusr">
        <Breadcrumb items={[{ label: t("about.breadcrumb") }]} />
      </div>

      {/* Hero */}
      <section className="container-klusr">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
            {t("about.hero.kicker")}
          </span>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t("about.hero.titleLead")}<span className="text-primary">{t("about.hero.titleAccent")}</span>{t("about.hero.titleTail")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("about.hero.intro")}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="container-klusr">
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-base font-bold">{t(titleKey)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="container-klusr">
        <div className="grid gap-8 rounded-2xl border border-border bg-card p-6 shadow-card sm:p-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">{t("about.story.title")}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                {t("about.story.p1")}
              </p>
              <p>
                {t("about.story.p2")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 self-center">
            {["#C90000", "#1F3A5F", "#E0A500", "#5B7553", "#F4F1E8", "#2E2E2E"].map((hex) => (
              <span
                key={hex}
                className="aspect-square rounded-xl border border-black/10 shadow-sm"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Online proposition */}
      <section className="container-klusr">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">{t("about.stores.title")}</h2>
          <Button asChild variant="outline">
            <Link href="/categorie/verf">
              {t("about.stores.all")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Bezorgd door heel Nederland en België",
              body: "Voor 10:00 besteld op werkdagen? Dan ligt je bestelling vanavond in huis.",
            },
            {
              icon: Paintbrush,
              title: "Je kleur exact gemengd",
              body: "Duizenden kleuren uit alle bekende waaiers, professioneel op maat gemengd en klaar voor gebruik.",
            },
            {
              icon: Sparkles,
              title: "Persoonlijk advies, online",
              body: "Onze ex-schilders helpen je via de Klushulp en klantenservice — snel en deskundig.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-bold leading-tight">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-klusr">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary to-klusr-red-dark p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">{t("about.cta.title")}</h2>
            <p className="mt-1 text-sm text-white/90">
              {t("about.cta.text")}
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link href="/kluspas">{t("about.cta.button")}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
