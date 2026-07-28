import type { Metadata } from "next";
import { Percent, Receipt, Truck, Headphones } from "lucide-react";
import { ProfpasRegistration } from "@/components/zakelijk/profpas-registration";

export const metadata: Metadata = {
  title: "Zakelijk bestellen — KLUSR ProfPas",
  description:
    "Bestel zakelijk bij KLUSR met de ProfPas: 10% korting op de hele collectie, prijzen excl. btw, op factuur en met persoonlijk advies van ex-schilders.",
  alternates: { canonical: "/zakelijk" },
};

const BENEFITS = [
  { icon: Percent, title: "10% ProfPas-korting", text: "Op de hele collectie verf, gereedschap en ijzerwaren — automatisch verrekend." },
  { icon: Receipt, title: "Prijzen excl. btw", text: "Zakelijke weergave excl. btw, met btw netjes gespecificeerd op je factuur." },
  { icon: Truck, title: "Snel op de bouw", text: "Voor 09:00 besteld, vanavond in huis — bezorgd door heel Nederland en België." },
  { icon: Headphones, title: "Vaste aanspreekpunt", text: "Persoonlijk advies van ex-schilders en hulp bij grotere projecten." },
];

export default function ZakelijkPage() {
  return (
    <div className="container-klusr py-8 lg:py-12">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-klusr-black p-8 text-white sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide">
          KLUSR ProfPas
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
          Zakelijk bestellen met <span className="text-primary">10% korting</span> op de
          hele collectie
        </h1>
        <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
          Voor zzp&apos;ers, schilders, klusbedrijven en aannemers. Prijzen excl. btw,
          op factuur, met professioneel advies. Gratis registreren.
        </p>
      </div>

      {/* Benefits + form */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(380px,420px)]">
        <div>
          <h2 className="text-xl font-extrabold">Waarom de ProfPas?</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-card p-4 shadow-card"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Al een ProfPas? Zet bovenaan de pagina de schakelaar op{" "}
            <strong className="text-foreground">Zakelijk</strong> om je prijzen excl.
            btw en met ProfPas-korting te zien.
          </div>
        </div>

        <ProfpasRegistration />
      </div>
    </div>
  );
}
