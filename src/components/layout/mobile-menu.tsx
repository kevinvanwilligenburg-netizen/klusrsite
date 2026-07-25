"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Menu, ChevronRight, Headphones, User, CreditCard, Palette } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "./logo";
import { navCategories } from "@/lib/data/categories";
import { getSubCategories } from "@/lib/data/products";
import { localizeCategories, catTitle } from "@/lib/data/categories-i18n";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { i18nEnabled } from "@/lib/i18n/config";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const close = () => setOpen(false);
  const t = useT();
  const locale = useLocale();
  const nav = useMemo(() => localizeCategories(navCategories, locale), [locale]);

  const quickLinks = [
    { href: "/kluspas", label: "KLUSRPAS", icon: CreditCard },
    { href: "/klantenservice", label: t("nav.customerService"), icon: Headphones },
    { href: "/account", label: "Mijn account", icon: User },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Menu openen"
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-secondary lg:hidden"
      >
        <Menu className="h-6 w-6" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[88%] max-w-sm flex-col p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle asChild>
            <Logo onClick={close} />
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Assortiment
            </p>
            <ul>
              {nav.map((cat) => {
                const subs = getSubCategories(cat.slug).map((s) => ({
                  ...s,
                  title: catTitle(s.slug, locale, s.title),
                }));
                const isOpen = expanded === cat.slug;
                if (subs.length === 0) {
                  return (
                    <li key={cat.slug}>
                      <Link
                        href={`/categorie/${cat.slug}`}
                        onClick={close}
                        className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-semibold hover:bg-secondary"
                      >
                        {cat.title}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={cat.slug}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : cat.slug)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-semibold hover:bg-secondary"
                    >
                      {cat.title}
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-90",
                        )}
                      />
                    </button>
                    {isOpen && (
                      <ul className="mb-1 ml-4 border-l border-border pl-2">
                        {cat.slug === "verf" && (
                          <li>
                            <Link
                              href="/kleurenkiezer"
                              onClick={close}
                              className="mb-1 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/10"
                            >
                              <Palette className="h-4 w-4" />
                              Kleurenkiezer
                            </Link>
                          </li>
                        )}
                        <li>
                          <Link
                            href={`/categorie/${cat.slug}`}
                            onClick={close}
                            className="block rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-secondary"
                          >
                            Bekijk alles
                          </Link>
                        </li>
                        {subs.slice(0, 14).map((sub) => (
                          <li key={sub.slug}>
                            <Link
                              href={`/categorie/${cat.slug}/${sub.slug}`}
                              onClick={close}
                              className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-secondary"
                            >
                              {sub.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Handig
            </p>
            <ul>
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Taalschakelaar — alleen zichtbaar als i18n aan staat. */}
            {i18nEnabled() && (
              <>
                <p className="px-3 pb-1 pt-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("lang.label")}
                </p>
                <div className="px-3 pb-2">
                  <LanguageSwitcher variant="light" afterSwitch={close} />
                </div>
              </>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
