import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Phone, Clock } from "lucide-react";
import { stores } from "@/lib/data/stores";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

/**
 * Winkeloverzicht met LocalBusiness-structured-data.
 *
 * Waarom dit er moest komen: we hebben zes fysieke winkels met adres,
 * telefoonnummer en openingstijden in de code staan, maar nergens een pagina
 * die dat toont — en dus ook geen `LocalBusiness`-schema. Iemand die aan een
 * zoekmachine of AI-assistent vraagt "waar kan ik verf kopen in Nijverdal"
 * kreeg ons niet te zien, terwijl juist die winkels het verschil zijn met een
 * online-only concurrent.
 *
 * De openingstijden komen uit dezelfde bron als de rest van de site, dus ze
 * lopen niet uit de pas met wat er op de winkelpagina staat.
 */

export const metadata: Metadata = {
  title: "Onze verfwinkels — adressen en openingstijden",
  description:
    "KLUSR heeft verfwinkels in Nijverdal, Emmen, Apeldoorn, Deventer en Zutphen. Adressen, openingstijden en telefoonnummers. Online bestellen en gratis afhalen in de winkel.",
  alternates: { canonical: "/winkels" },
};

/** "09:00 - 18:00" → { opens, closes }; gesloten dagen laten we weg. */
function tijden(hours: string): { opens: string; closes: string } | null {
  const m = hours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  return m ? { opens: m[1], closes: m[2] } : null;
}

const DAG_EN: Record<string, string> = {
  Maandag: "Monday",
  Dinsdag: "Tuesday",
  Woensdag: "Wednesday",
  Donderdag: "Thursday",
  Vrijdag: "Friday",
  Zaterdag: "Saturday",
  Zondag: "Sunday",
};

export default function WinkelsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": stores.map((s) => ({
      // HardwareStore is een specifiekere LocalBusiness en past bij een
      // verf-/klusspeciaalzaak beter dan het algemene type.
      "@type": "HardwareStore",
      "@id": `${SITE_URL}/winkels#${s.slug}`,
      name: s.name,
      url: `${SITE_URL}/winkels`,
      telephone: s.phone,
      email: s.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: s.address,
        postalCode: s.postalCode,
        addressLocality: s.city,
        addressCountry: "NL",
      },
      ...(s.lat && s.lng
        ? { geo: { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } }
        : {}),
      openingHoursSpecification: (s.openingHours ?? [])
        .map((o) => {
          const t = tijden(o.hours);
          if (!t || !DAG_EN[o.day]) return null;
          return {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${DAG_EN[o.day]}`,
            opens: t.opens,
            closes: t.closes,
          };
        })
        .filter(Boolean),
    })),
  };

  return (
    <div className="container-klusr py-10">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
          Onze verfwinkels
        </h1>
        <p className="mt-3 text-muted-foreground">
          Bij ons staat iemand achter de toonbank die zelf jaren geschilderd heeft. Kom langs met je
          kleur, je vraag of je oude blik — wij mengen op maat terwijl je wacht. Online besteld kun
          je hier ook gratis afhalen.
        </p>
      </header>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => (
          <li
            key={s.id}
            id={s.slug}
            className="scroll-mt-24 rounded-2xl border border-border p-5"
          >
            <h2 className="text-lg font-black tracking-tight">{s.name}</h2>
            {s.opening && (
              <p className="mt-0.5 text-xs font-semibold text-primary">{s.opening}</p>
            )}

            <address className="mt-3 flex items-start gap-2 not-italic text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {s.address}
                <br />
                {s.postalCode} {s.city}
              </span>
            </address>

            {s.phone && (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="hover:text-primary">
                  {s.phone}
                </a>
              </p>
            )}

            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Openingstijden
              </p>
              <dl className="space-y-0.5 text-sm">
                {(s.openingHours ?? []).map((o) => (
                  <div key={o.day} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{o.day}</dt>
                    <dd className="font-medium">{o.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted-foreground">
        Liever laten bezorgen?{" "}
        <Link href="/categorie/verf" className="font-semibold text-primary hover:underline">
          Bestel online
        </Link>{" "}
        — voor 09:00 besteld is het vanavond in huis.
      </p>
    </div>
  );
}
