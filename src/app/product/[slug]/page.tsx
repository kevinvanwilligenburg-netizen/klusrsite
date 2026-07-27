import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  allProductSlugs,
  getRelatedProducts,
  getFrequentlyBoughtTogether,
  getGlansVariants,
} from "@/lib/data/products";
import { getLocalizedProduct } from "@/lib/data/products-i18n";
import { getCategory } from "@/lib/data/categories";
import { relatedArticles } from "@/lib/data/articles";
import { ArticleCard } from "@/components/content/article-card";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/plp/breadcrumb";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductBuybox } from "@/components/product/product-buybox";
import { onlineStock, bestVariantStock } from "@/lib/stock";
import { getSafetyStock } from "@/lib/store/settings";
import { ProductTabs } from "@/components/product/product-tabs";
import { FrequentlyBoughtTogether } from "@/components/product/frequently-bought-together";
import { AiProductAdvice } from "@/components/product/ai-product-advice";
import { PublishedContent } from "@/components/product/published-content";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { ViewItemTracker } from "@/components/analytics/view-item-tracker";
import { ProductCarousel } from "@/components/shared/product-carousel";
import { SectionHeading } from "@/components/shared/section-heading";
import { getProductContent } from "@/lib/store/product-content";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

// ISR: ververs periodiek zodat gepubliceerde AI-content (uit KV) zichtbaar wordt.
export const revalidate = 600;

// Prerender a representative subset at build time; the remaining product pages
// render on demand (dynamicParams defaults to true). Keeps builds fast with the
// full ~600-product Tilroy catalogus.
export function generateStaticParams() {
  return allProductSlugs.slice(0, 60).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = getLocalizedProduct(params.slug);
  if (!product) return { title: "Product niet gevonden" };

  const title = `${product.brand} ${product.title}`;
  const description =
    product.description.length > 160
      ? `${product.description.slice(0, 157).trimEnd()}…`
      : product.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.images.slice(0, 1),
    },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = getLocalizedProduct(params.slug);
  if (!product) notFound();

  const publishedContent = await getProductContent(product.id);
  const glansVariants = getGlansVariants(product);
  const category = getCategory(product.category);
  const companions = getFrequentlyBoughtTogether(product);
  const alternatives = getRelatedProducts(product, 8).filter(
    (p) => !companions.some((c) => c.id === p.id),
  );
  const klustips = relatedArticles(product.category, 3);

  const breadcrumbItems = [
    ...(category ? [{ label: category.title, href: `/categorie/${category.slug}` }] : []),
    ...(product.subCategory && category
      ? [
          {
            label: product.subCategory,
            href: `/categorie/${category.slug}/${product.subCategory}`,
          },
        ]
      : []),
    { label: product.title },
  ];

  const safetyStock = await getSafetyStock();
  // Beschikbaarheid voor schema.org: leverbaar zolang één variant voorraad heeft.
  const totalStock = onlineStock(bestVariantStock(product), safetyStock);

  // Prijsrange over alle maten: de Merchant-feed stuurt per maat de NORMALE prijs
  // (de 5% KLUSRPAS-korting is een ingelogd voordeel en hoort niet in de feed),
  // dus de structured data moet díe hele range dekken (AggregateOffer) om een
  // "niet-overeenkomende productprijs" in Google te voorkomen.
  const variantPrices = product.variants
    .map((v) => (v.price > 0 ? v.price : v.kluspasPrice))
    .filter((p) => p > 0);
  const lowPrice = variantPrices.length ? Math.min(...variantPrices) : product.price;
  const highPrice = variantPrices.length ? Math.max(...variantPrices) : product.price;
  const multiPrice = highPrice > lowPrice;

  // Product structured data (schema.org/Product)
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.brand} ${product.title}`,
    image: product.images,
    description: product.description,
    brand: { "@type": "Brand", name: product.brand },
    sku: product.id,
    // Alleen een aggregateRating/review meegeven als er écht reviews zijn —
    // anders triggert ratingValue:0 / reviewCount:0 een "ongeldige structured
    // data"-melding in Google. Producten zonder reviews laten deze velden weg.
    ...(product.reviewCount > 0 && product.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
          review: (product.reviews ?? []).slice(0, 3).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            author: { "@type": "Person", name: r.author },
            datePublished: r.date,
            reviewBody: r.body,
          })),
        }
      : {}),
    offers: {
      "@type": multiPrice ? "AggregateOffer" : "Offer",
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: "EUR",
      ...(multiPrice
        ? {
            lowPrice: lowPrice.toFixed(2),
            highPrice: highPrice.toFixed(2),
            offerCount: product.variants.length,
          }
        : {
            price: lowPrice.toFixed(2),
            priceValidUntil: `${new Date().getFullYear()}-12-31`,
          }),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        totalStock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      // Merchant listings: retour- en verzendbeleid expliciet meegeven.
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "NL",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 30,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "4.95",
          currency: "EUR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "NL",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "DAY",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 1,
            maxValue: 2,
            unitCode: "DAY",
          },
        },
      },
    },
  };

  return (
    <div className="container-klusr pb-12">
      <ViewItemTracker product={product} />
      <Breadcrumb items={breadcrumbItems} />
      <BreadcrumbJsonLd items={breadcrumbItems} baseUrl={SITE_URL} />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Main: gallery + buybox */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <ProductGallery images={product.images} title={product.title} badges={product.badges} />
        <ProductBuybox product={product} glansVariants={glansVariants} safetyStock={safetyStock} />
      </div>

      {/* Tabs */}
      <div className="mt-10">
        <ProductTabs product={product} publishedFaq={publishedContent?.faqs?.content} />
      </div>

      {/* Gepubliceerde AI-content (admin) */}
      {publishedContent && (
        <div className="mt-10">
          <PublishedContent content={publishedContent} />
        </div>
      )}

      {/* Vaak samen gekocht */}
      {companions.length > 0 && (
        <div className="mt-10">
          <FrequentlyBoughtTogether product={product} companions={companions} />
        </div>
      )}

      {/* AI advice */}
      <div className="mt-8">
        <AiProductAdvice
          productId={product.id}
          productTitle={product.title}
          category={product.category}
        />
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <section className="mt-12">
          <SectionHeading title="Alternatieven" subtitle="Vergelijkbare producten" />
          <ProductCarousel products={alternatives} listName="Alternatieven" />
        </section>
      )}

      {/* Handige klustips — relevante blogartikelen bij dit product */}
      {klustips.length > 0 && (
        <section className="mt-12">
          <SectionHeading
            title="Handige klustips"
            subtitle="Lees hoe je dit product als een pro gebruikt"
            href="/advies"
            linkLabel="Alle adviezen"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {klustips.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <div className="mt-12">
        <RecentlyViewed currentId={product.id} />
      </div>
    </div>
  );
}
