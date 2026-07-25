// Client-VEILIG: GEEN next/headers. Vertaal-overlay voor de categorie-taxonomie
// (titels + omschrijvingen). Nederlands is de bron in categories.ts; deze overlay
// vult EN/FR/DE/PL en wordt zowel in client- (via useLocale) als server-
// componenten (via getLocale) toegepast. Met de flag UIT / locale NL is dit een
// no-op (byte-identiek aan nu).
import type { Category } from "@/types";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import data from "./i18n/categories-i18n.json";

type CatTr = {
  title?: Partial<Record<Locale, string>>;
  desc?: Partial<Record<Locale, string>>;
};

const MAP = data as unknown as Record<string, CatTr>;

/** Vertaalde categorietitel voor de locale; valt terug op de NL-bron. */
export function catTitle(slug: string, locale: Locale, fallback: string): string {
  if (locale === DEFAULT_LOCALE) return fallback;
  return MAP[slug]?.title?.[locale] || fallback;
}

/** Vertaalde categorie-omschrijving voor de locale; valt terug op de NL-bron. */
export function catDescription(slug: string, locale: Locale, fallback: string): string {
  if (locale === DEFAULT_LOCALE) return fallback;
  return MAP[slug]?.desc?.[locale] || fallback;
}

/** Lokaliseer één categorie: titel, omschrijving, subgroepen en subcategorieën. */
export function localizeCategory<T extends Category>(cat: T, locale: Locale): T {
  if (locale === DEFAULT_LOCALE) return cat;
  return {
    ...cat,
    title: catTitle(cat.slug, locale, cat.title),
    description: cat.description
      ? catDescription(cat.slug, locale, cat.description)
      : cat.description,
    subGroups: cat.subGroups?.map((g) => ({
      ...g,
      title: catTitle(g.slug, locale, g.title),
      subCategories: g.subCategories?.map((s) => ({
        ...s,
        title: catTitle(s.slug, locale, s.title),
      })),
    })),
    subCategories: cat.subCategories?.map((s) => ({
      ...s,
      title: catTitle(s.slug, locale, s.title),
    })),
  } as T;
}

/** Lokaliseer een lijst categorieën (bv. de hoofdnavigatie). */
export function localizeCategories<T extends Category>(list: T[], locale: Locale): T[] {
  if (locale === DEFAULT_LOCALE) return list;
  return list.map((c) => localizeCategory(c, locale));
}
