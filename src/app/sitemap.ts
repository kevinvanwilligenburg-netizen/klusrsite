import type { MetadataRoute } from "next";
import {
  categories,
  getSubCategories,
  allProductSlugs,
  articles,
  klushulpTasks,
} from "@/lib/data";
import { brands } from "@/lib/data/brands";
import { ralKleuren, ralSlug } from "@/lib/data/ral";
import { GIDSEN } from "@/lib/data/gidsen";
import { ALTERNATIEVEN } from "@/lib/data/merkalternatieven";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (
    path: string,
    opts: Partial<Omit<MetadataRoute.Sitemap[number], "url">> = {},
  ): MetadataRoute.Sitemap[number] => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
    ...opts,
  });

  const staticPages: MetadataRoute.Sitemap = [
    entry("/", { priority: 1, changeFrequency: "daily" }),
    entry("/mengverf", { priority: 0.9 }),
    entry("/kleurkiezer", { priority: 0.9 }),
    entry("/kleurenkiezer", { priority: 0.9 }),
    entry("/kleuren", { priority: 0.8 }),
    entry("/kluspas", { priority: 0.7 }),
    entry("/zakelijk", { priority: 0.7 }),
    entry("/advies", { priority: 0.7 }),
    entry("/klushulp", { priority: 0.6 }),
    entry("/over-klusr", { priority: 0.5 }),
    entry("/werken-bij", { priority: 0.4 }),
    entry("/klantenservice", { priority: 0.5 }),
    entry("/faq", { priority: 0.5 }),
    entry("/voorwaarden", { priority: 0.3, changeFrequency: "yearly" }),
    entry("/retourvoorwaarden", { priority: 0.3, changeFrequency: "yearly" }),
    entry("/privacy", { priority: 0.3, changeFrequency: "yearly" }),
    entry("/cookiebeleid", { priority: 0.3, changeFrequency: "yearly" }),
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.flatMap((c) => [
    entry(`/categorie/${c.slug}`, { priority: 0.8 }),
    ...getSubCategories(c.slug).map((s) =>
      entry(`/categorie/${c.slug}/${s.slug}`, { priority: 0.7 }),
    ),
  ]);

  const productPages: MetadataRoute.Sitemap = allProductSlugs.map((slug) =>
    entry(`/product/${slug}`, { priority: 0.6 }),
  );

  const articlePages: MetadataRoute.Sitemap = articles.map((a) =>
    entry(`/advies/${a.slug}`, { priority: 0.6, lastModified: new Date(a.date) }),
  );

  const klusPages: MetadataRoute.Sitemap = klushulpTasks.map((t) =>
    entry(`/klushulp/${t.slug}`, { priority: 0.5 }),
  );

  // Merkpagina's: sterke landingspagina's voor merk-zoekopdrachten
  // ("sikkens rubbol kopen"), daarom net onder de categorieën geprioriteerd.
  const brandPages: MetadataRoute.Sitemap = [
    entry("/merken", { priority: 0.6 }),
    ...brands.map((b) => entry(`/merk/${b.slug}`, { priority: 0.7 })),
  ];

  // RAL-kleurpagina's: sterke landingspagina's voor kleur-zoekopdrachten
  // ("RAL 7016 verf"). Bewust alleen RAL en niet elke merkkleur — de portalfeed
  // heeft er 54.222, en zoveel bijna-identieke pagina's straft Google af.
  const ralPages: MetadataRoute.Sitemap = [
    entry("/kleuren/ral", { priority: 0.6 }),
    ...ralKleuren.map((k) => entry(`/kleuren/${ralSlug(k)}`, { priority: 0.6 })),
  ];

  // Koopgidsen: mikken op "beste muurverf"-achtige zoektermen, waar nu
  // vergelijkingssites en concurrenten staan.
  const gidsPages: MetadataRoute.Sitemap = GIDSEN.map((g) =>
    entry(`/gids/${g.slug}`, { priority: 0.7 }),
  );

  return [
    ...staticPages,
    ...gidsPages,
    ...ALTERNATIEVEN.map((a) => entry("/vergelijk/" + a.slug, { priority: 0.5 })),
    ...categoryPages,
    ...brandPages,
    ...ralPages,
    ...productPages,
    ...articlePages,
    ...klusPages,
  ];
}
