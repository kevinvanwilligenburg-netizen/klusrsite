import type { MetadataRoute } from "next";
import {
  categories,
  getSubCategories,
  allProductSlugs,
  articles,
  klushulpTasks,
} from "@/lib/data";
import { brands } from "@/lib/data/brands";

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

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...productPages,
    ...articlePages,
    ...klusPages,
  ];
}
