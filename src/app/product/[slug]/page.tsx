import { notFound, permanentRedirect } from "next/navigation";
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
import { brandSlugFor } from "@/lib/data/brands";
import { productFaq } from "@/lib/product-faq";
import { productNaam } from "@/lib/product-naam";
import { kleurvlakVoor } from "@/lib/kleurvlak";
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

  const title = productNaam(product);
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

  // Een verouderde slug blijft werken (getProduct herkent het stabiele
  // tilroy-id aan het eind), maar dan staat dezelfde pagina op twee URL's.
  // Bij de herimport van vandaag veranderden 230 van de 2.491 slugs — vaak
  // doordat de glansgraad in de titel kwam — dus dat is geen randgeval maar
  // wekelijkse kost. Een permanente redirect naar de actuele URL houdt de
  // linkwaarde bij elkaar en voorkomt dat Merchant Center en Google een
  // stale URL blijven crawlen die alleen via een canonical doorverwijst.
  if (params.slug !== product.slug) {
    permanentRedirect(`/product/${product.slug}`);
  }

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
  // Kleurvlak bij voorgemengde verf; undefined zodra de kleur niet zeker is.
  const kleurvlak = kleurvlakVoor(product);
  // Beschikbaarheid voor schema.org: leverbaar zolang één variant voorraad heeft.
  const totalStock = onlineStock(bestVariantStock(product), safetyStock);

  // Prijsrange over alle maten, zodat de structured data de hele range dekt
  // (AggregateOffer) en Google geen "niet-overeenkomende productprijs" meldt.
  //
  // Let op de samenhang met de feed: die stuurt sinds vandaag `price` = normale
  // prijs en `sale_price` = KLUSRPAS-prijs. Hier staat bewust de normale prijs,
  // want dat is wat een uitgelogde bezoeker betaalt en dus wat een crawler op
  // deze pagina als geldende prijs terugvindt.
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
    name: productNaam(product),
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

  // FAQ-schema, maar alleen voor vragen waarvan de catalogus het antwoord
  // levert (lib/product-faq.ts). Bij een product zonder specificaties staat er
  // dus géén leeg FAQPage-blok — Google straft structured data zonder
  // zichtbare tegenhanger op de pagina af, en verzonnen antwoorden helemaal.
  const faqItems = productFaq(product);
  const faqJsonLd = faqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems.map((f) => ({
          "@type": "Question",
          name: f.vraag,
          acceptedAnswer: { "@type": "Answer", text: f.antwoord },
        })),
      }
    : null;

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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Main: gallery + buybox */}
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div>
          <ProductGallery images={product.images} title={product.title} badges={product.badges} />
          {/* Voorgemengd blik: op de foto zie je alleen het blik, niet de kleur
              waarvoor de klant komt. Alleen als we de kleur zéker weten. */}
          {kleurvlak && (
            <figure className="mt-4 flex items-center gap-4 rounded-lg border border-neutral-200 p-3">
              <span
                aria-hidden="true"
                className="h-16 w-16 shrink-0 rounded border border-neutral-300"
                style={{ backgroundColor: kleurvlak.hex }}
              />
              <figcaption className="text-sm">
                <span className="font-medium text-neutral-900">{kleurvlak.naam}</span>
                {kleurvlak.code && kleurvlak.code !== kleurvlak.naam && (
                  <span className="text-neutral-500"> · {kleurvlak.code}</span>
                )}
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {kleurvlak.transparant
                    ? "Transparant: de houtkleur schijnt erdoorheen. Kleur op je scherm is een indicatie."
                    : "Kleur op je scherm is een indicatie."}
                </span>
              </figcaption>
            </figure>
          )}
        </div>
        <ProductBuybox
          product={product}
          glansVariants={glansVariants}
          safetyStock={safetyStock}
          brandSlug={brandSlugFor(product.brand)}
        />
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
