import Link from "next/link";
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail } from "lucide-react";
import { Logo } from "./logo";
import { NewsletterForm } from "@/components/marketing/newsletter-form";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { navCategories } from "@/lib/data/categories";
import { PaymentIcons, PostNlBadge } from "@/components/shared/payment-icons";
import { COMPANY } from "@/components/shared/legal-page";
import { t, getLocale } from "@/lib/i18n/server";
import { localizeCategories } from "@/lib/data/categories-i18n";

export function Footer() {
  const serviceLinks = [
    { href: "/klantenservice", label: t("footer.service.customerService") },
    { href: "/faq", label: t("footer.service.faq") },
    { href: "/bestelstatus", label: t("footer.service.orderStatus") },
    { href: "/klantenservice#verzending", label: t("footer.service.shippingReturns") },
    { href: "/retourvoorwaarden", label: t("footer.service.returnPolicy") },
    { href: "/klantenservice#betalen", label: t("footer.service.securePayment") },
    { href: "/garantie", label: t("footer.service.warranty") },
  ];

  const aboutLinks = [
    { href: "/over-klusr", label: t("footer.about.aboutKlusr") },
    { href: "/kluspas", label: t("footer.about.kluspas") },
    { href: "/zakelijk", label: t("footer.about.business") },
    { href: "/mengverf", label: t("footer.about.mixPaint") },
    { href: "/kleuren", label: t("footer.about.colors") },
    { href: "/advies", label: t("footer.about.advice") },
    { href: "/klushulp", label: t("footer.about.klushulp") },
    { href: "/werken-bij", label: t("footer.about.careers") },
  ];

  return (
    <footer className="mt-16 bg-klusr-black text-white/80">
      {/* Newsletter band */}
      <div className="border-b border-white/10">
        <div className="container-klusr flex flex-col items-start justify-between gap-6 py-10 lg:flex-row lg:items-center">
          <div className="max-w-md">
            <h3 className="text-xl font-extrabold text-white">
              {t("footer.newsletter.title")}
            </h3>
            <p className="mt-1 text-sm text-white/70">
              {t("footer.newsletter.text")}
            </p>
          </div>
          <NewsletterForm className="w-full max-w-md" source="footer" />
        </div>
      </div>

      {/* Link columns */}
      <div className="container-klusr grid grid-cols-2 gap-8 py-12 md:grid-cols-4 lg:grid-cols-5">
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <Logo className="[&_span:first-child]:text-white" />
          <p className="mt-4 text-sm text-white/60">{t("footer.tagline")}</p>

          {/* Bedrijfsgegevens / contact — taalneutraal (icoon + waarde) */}
          <address className="mt-5 space-y-2 text-sm not-italic text-white/70">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-semibold text-white/90">{COMPANY.tradeName}</span>
                <br />
                {COMPANY.postalAddress.street}
                <br />
                {COMPANY.postalAddress.postalCode} {COMPANY.postalAddress.city}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              <a
                href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}
                className="min-w-0 break-words transition-colors hover:text-white"
              >
                {COMPANY.phone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
              <a
                href={`mailto:${COMPANY.email}`}
                className="min-w-0 break-words transition-colors hover:text-white"
              >
                {COMPANY.email}
              </a>
            </div>
          </address>

          <div className="mt-5 flex gap-3">
            {[Facebook, Instagram, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                aria-label="Social media"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <FooterColumn title={t("footer.col.assortment")}>
          {localizeCategories(navCategories.slice(0, 6), getLocale()).map((c) => (
            <FooterLink key={c.slug} href={`/categorie/${c.slug}`}>
              {c.title}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t("footer.col.customerService")}>
          {serviceLinks.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>

        <FooterColumn title={t("footer.col.about")}>
          {aboutLinks.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
        </FooterColumn>
      </div>

      {/* Trust-band: betaalmethodes + verzendpartner */}
      <div className="border-t border-white/10">
        <div className="container-klusr flex flex-col gap-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("footer.trust.payTitle")}
            </p>
            <PaymentIcons />
          </div>
          <div className="sm:text-right">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              {t("footer.trust.shipTitle")}
            </p>
            <div className="flex sm:justify-end">
              <PostNlBadge />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-klusr flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/50 sm:flex-row sm:items-start">
          <div className="min-w-0 space-y-1 text-center sm:text-left">
            <p>{t("footer.bottom.copyright", { year: new Date().getFullYear() })}</p>
            <p className="text-white/40">
              KvK {COMPANY.kvk} · BTW {COMPANY.btw} · IBAN {COMPANY.iban}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:justify-end">
            <Link href="/voorwaarden" className="hover:text-white">
              {t("footer.bottom.terms")}
            </Link>
            <Link href="/retourvoorwaarden" className="hover:text-white">
              {t("footer.bottom.returnPolicy")}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {t("footer.bottom.privacy")}
            </Link>
            <Link href="/cookiebeleid" className="hover:text-white">
              {t("footer.bottom.cookies")}
            </Link>
            <Link href="/toegankelijkheid" className="hover:text-white">
              {t("footer.bottom.accessibility")}
            </Link>
            <span className="hidden items-center gap-2 sm:flex">
              {t("footer.bottom.securePaymentVia")}{" "}
              <span className="font-semibold text-white/80">iDEAL · Mollie</span>
            </span>
            <LanguageSwitcher className="border-l border-white/10 pl-4" />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-bold text-white">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-white/60 transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
