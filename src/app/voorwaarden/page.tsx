import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, COMPANY } from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Algemene voorwaarden | KLUSR",
  description:
    "De algemene voorwaarden van KLUSR: bestellen, betalen, levering, herroepingsrecht, garantie en meer.",
  alternates: { canonical: "/voorwaarden" },
};

export default function VoorwaardenPage() {
  return (
    <LegalPage
      title="Algemene voorwaarden"
      updated="15 juni 2026"
      intro="Deze voorwaarden zijn van toepassing op elk aanbod van KLUSR en op elke tot stand gekomen overeenkomst op afstand tussen KLUSR en de consument."
      sections={[
        {
          heading: "1. Bedrijfsgegevens",
          body: (
            <ul>
              <li>
                <strong>{COMPANY.legalName}</strong>, handelend onder de naam {COMPANY.tradeName}
              </li>
              <li>{COMPANY.address}</li>
              <li>
                E-mail: <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · Telefoon:{" "}
                {COMPANY.phone}
              </li>
              <li>
                KvK: {COMPANY.kvk} · Btw: {COMPANY.btw} · IBAN: {COMPANY.iban}
              </li>
            </ul>
          ),
        },
        {
          heading: "2. Toepasselijkheid",
          body: (
            <p>
              Deze algemene voorwaarden zijn van toepassing op elk aanbod van KLUSR en op elke
              overeenkomst op afstand tussen KLUSR en de klant. Voordat de overeenkomst wordt
              gesloten, wordt de tekst van deze voorwaarden beschikbaar gesteld en kun je deze
              opslaan of afdrukken.
            </p>
          ),
        },
        {
          heading: "3. Aanbod en prijzen",
          body: (
            <p>
              Alle prijzen zijn in euro&apos;s en inclusief btw, tenzij anders vermeld. De
              KLUSRPAS-prijs geldt voor houders van een (gratis) KLUSRPAS. Kennelijke
              vergissingen of fouten in het aanbod binden KLUSR niet. Een aanbod is geldig zolang
              de voorraad strekt.
            </p>
          ),
        },
        {
          heading: "4. De overeenkomst",
          body: (
            <p>
              De overeenkomst komt tot stand op het moment dat je de bestelling plaatst en KLUSR
              de ontvangst daarvan langs elektronische weg bevestigt. KLUSR kan zich binnen de
              wettelijke kaders op de hoogte stellen of je aan je betalingsverplichtingen kunt
              voldoen en kan een bestelling weigeren of aan voorwaarden verbinden.
            </p>
          ),
        },
        {
          heading: "5. Betaling",
          body: (
            <p>
              Betalen kan veilig via onze betaalpartner Mollie, onder andere met iDEAL,
              creditcard en — waar beschikbaar — achteraf betalen. Bij betaling achteraf gelden
              de aanvullende voorwaarden van de betreffende kredietverstrekker. Betaling dient te
              geschieden volgens de bij de bestelling gekozen methode.
            </p>
          ),
        },
        {
          heading: "6. Levering en uitvoering",
          body: (
            <p>
              Voor 09:00 uur op werkdagen besteld, is je bestelling vanavond in huis
              (tenzij anders vermeld). Verzending is gratis vanaf € 59; daaronder rekenen we
              € 4,95 verzendkosten. We bezorgen door heel Nederland en België. Het risico van
              beschadiging en/of vermissing van producten gaat over op de klant op het moment van
              bezorging.
            </p>
          ),
        },
        {
          heading: "7. Mengverf en op maat gemaakte producten",
          body: (
            <p>
              Verf die wij op jouw gekozen kleur mengen, en andere op maat gemaakte of
              gepersonaliseerde producten, worden speciaal voor jou samengesteld. Op deze
              producten is het herroepingsrecht <strong>uitgesloten</strong> (zie artikel 8): ze
              kunnen niet worden geretourneerd, tenzij er sprake is van een gebrek.
            </p>
          ),
        },
        {
          heading: "8. Herroepingsrecht",
          body: (
            <>
              <p>
                Bij de aankoop van producten heb je als consument de mogelijkheid de overeenkomst
                zonder opgave van redenen te ontbinden gedurende <strong>14 dagen</strong> na
                ontvangst. Tijdens deze bedenktijd ga je zorgvuldig om met het product en de
                verpakking.
              </p>
              <p>Het herroepingsrecht geldt niet voor onder meer:</p>
              <ul>
                <li>op kleur gemengde verf en andere op maat gemaakte producten;</li>
                <li>
                  producten die door hun aard niet kunnen worden teruggezonden of snel bederven;
                </li>
                <li>
                  verzegelde producten die om redenen van hygiëne niet geschikt zijn voor
                  retour en waarvan de verzegeling is verbroken.
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "9. Retourneren en terugbetaling",
          body: (
            <p>
              Wil je gebruikmaken van je herroepingsrecht, meld dit dan binnen de bedenktijd via{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. Je ontvangt dan het
              retourlabel en de retourinstructies.
              Stuur het product compleet en, indien redelijkerwijs mogelijk, in originele staat
              en verpakking retour. KLUSR betaalt het aankoopbedrag binnen 14 dagen terug,
              eventueel onder inhouding van een waardevermindering bij gebruik dat verder gaat
              dan nodig om het product te beoordelen.
            </p>
          ),
        },
        {
          heading: "10. Garantie en conformiteit",
          body: (
            <p>
              KLUSR staat ervoor in dat de producten voldoen aan de overeenkomst, de in het
              aanbod vermelde specificaties en de wettelijke bepalingen. Je hebt naast eventuele
              fabrieks- of merkgarantie altijd de wettelijke (niet-)conformiteitsrechten.
            </p>
          ),
        },
        {
          heading: "11. Klachten",
          body: (
            <p>
              Klachten over de uitvoering van de overeenkomst dienen volledig en duidelijk
              omschreven te worden ingediend bij KLUSR via{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>. We reageren binnen 14
              dagen. Kom je er met ons niet uit, dan kun je je geschil voorleggen via het{" "}
              <a href="https://ec.europa.eu/consumers/odr" rel="noreferrer nofollow">
                Europees ODR-platform
              </a>
              .
            </p>
          ),
        },
        {
          heading: "12. KLUSRPAS en ProfPas",
          body: (
            <p>
              De KLUSRPAS is gratis en geeft recht op de KLUSRPAS-prijs en op exclusieve acties.
              Voor zakelijke klanten is er de ProfPas: 10% korting op de hele collectie, met
              prijzen exclusief btw. Aan het gebruik van een pas kunnen aanvullende voorwaarden
              worden verbonden. KLUSR mag een programma wijzigen of beëindigen; bestaande rechten
              blijven daarbij gerespecteerd voor zover wettelijk vereist.
            </p>
          ),
        },
        {
          heading: "13. Eigendomsvoorbehoud",
          body: (
            <p>
              Alle geleverde producten blijven eigendom van KLUSR totdat je de volledige koopprijs,
              inclusief eventuele kosten, hebt voldaan. Tot dat moment mag je de producten niet
              bezwaren, doorverkopen of aan derden overdragen.
            </p>
          ),
        },
        {
          heading: "14. Overmacht",
          body: (
            <p>
              Bij overmacht — omstandigheden buiten onze redelijke controle, zoals storingen bij
              leveranciers of bezorgdiensten, brand of extreem weer — mag KLUSR de uitvoering
              opschorten. Duurt de overmacht langer dan 30 dagen, dan mogen beide partijen de
              overeenkomst ontbinden; reeds betaalde bedragen voor niet-geleverde producten worden
              dan terugbetaald.
            </p>
          ),
        },
        {
          heading: "15. Intellectueel eigendom",
          body: (
            <p>
              Alle inhoud op deze website — teksten, foto&apos;s, het KLUSR-logo en de vormgeving —
              is eigendom van KLUSR of haar licentiegevers en auteursrechtelijk beschermd.
              Overnemen of hergebruiken zonder voorafgaande schriftelijke toestemming is niet
              toegestaan.
            </p>
          ),
        },
        {
          heading: "16. Aansprakelijkheid",
          body: (
            <p>
              De aansprakelijkheid van KLUSR is beperkt tot hetgeen in deze voorwaarden is
              geregeld en tot maximaal het bedrag van de betreffende bestelling, behoudens opzet
              of bewuste roekeloosheid en behoudens dwingrechtelijke aansprakelijkheid.
              Verwerkingsadviezen zijn vrijblijvend; volg altijd de instructies van de fabrikant.
            </p>
          ),
        },
        {
          heading: "17. Toepasselijk recht",
          body: (
            <p>
              Op overeenkomsten tussen KLUSR en de klant is uitsluitend Nederlands recht van
              toepassing. Vragen over deze voorwaarden? Neem contact op met onze{" "}
              <Link href="/klantenservice">klantenservice</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
