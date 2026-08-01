import { Check, Sparkles } from "lucide-react";
import type { Product } from "@/types";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StarRating } from "./star-rating";
import { formatDate } from "@/lib/utils";
import { getProductReviews } from "@/lib/reviews";
import { t } from "@/lib/i18n/server";
import { productFaq } from "@/lib/product-faq";

export function ProductTabs({
  product,
  publishedFaq,
}: {
  product: Product;
  publishedFaq?: string;
}) {
  const reviews = getProductReviews(product);
  // FAQ-bron: de catalogus-FAQ, of anders de gepubliceerde (AI-)FAQ uit KV.
  const redactie: { question: string; answer: string }[] =
    product.faqs && product.faqs.length > 0
      ? product.faqs.map((f) => ({ question: f.question, answer: f.answer }))
      : publishedFaq
        ? parsePublishedFaqs(publishedFaq)
        : [];
  // Daarnaast vragen die rechtstreeks uit de specificaties komen (rendement,
  // droogtijd, ondergrond, maten). Die verschijnen alléén als de catalogus het
  // antwoord levert — zie lib/product-faq.ts. Dubbele vragen vallen af, zodat
  // een redactievraag altijd wint van de automatische variant.
  const gesteld = new Set(redactie.map((f) => f.question.trim().toLowerCase()));
  const uitSpecs = productFaq(product)
    .filter((f) => !gesteld.has(f.vraag.trim().toLowerCase()))
    .map((f) => ({ question: f.vraag, answer: f.antwoord }));
  const faqItems = [...redactie, ...uitSpecs];
  const hasFaq = faqItems.length > 0;
  return (
    <Tabs defaultValue="omschrijving" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="omschrijving">{t("pdp.tab.description")}</TabsTrigger>
        <TabsTrigger value="specificaties">{t("pdp.tab.specs")}</TabsTrigger>
        {hasFaq && <TabsTrigger value="faq">{t("faq.title")}</TabsTrigger>}
        <TabsTrigger value="reviews">{t("pdp.tab.reviews")} ({product.reviewCount})</TabsTrigger>
        {product.processingAdvice && (
          <TabsTrigger value="verwerking">{t("pdp.tab.processing")}</TabsTrigger>
        )}
      </TabsList>

      {/* Omschrijving */}
      <TabsContent value="omschrijving">
        <div className="max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{product.description}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {product.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-klusr-stock" strokeWidth={3} />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </TabsContent>

      {/* Specificaties */}
      <TabsContent value="specificaties">
        <div className="max-w-2xl space-y-6">
          {product.specifications.map((group) => (
            <div key={group.group}>
              <h4 className="mb-2 text-sm font-bold">{group.group}</h4>
              <dl className="overflow-hidden rounded-lg border border-border">
                {group.items.map((item, i) => (
                  <div
                    key={item.label}
                    className={i % 2 === 0 ? "flex bg-secondary/40" : "flex bg-card"}
                  >
                    <dt className="w-1/2 px-3 py-2 text-sm text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="w-1/2 px-3 py-2 text-sm font-medium">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </TabsContent>

      {/* Reviews */}
      <TabsContent value="reviews">
        <div id="reviews" className="max-w-2xl">
          {product.reviewCount > 0 && reviews.length > 0 ? (
            <>
              <div className="mb-5 flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="text-center">
                  <p className="text-3xl font-black">{product.rating.toFixed(1)}</p>
                  <StarRating rating={product.rating} showCount={false} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("pdp.reviews.basedOnPre")}<strong className="text-foreground">{product.reviewCount}</strong>{t("pdp.reviews.basedOnPost")}
                </div>
              </div>
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StarRating rating={r.rating} size="sm" showCount={false} />
                        {r.title && <span className="text-sm font-semibold">{r.title}</span>}
                      </div>
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 text-xs text-klusr-stock">
                          <Check className="h-3 w-3" strokeWidth={3} /> {t("pdp.reviews.verified")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.author} · {formatDate(r.date)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            // Lege staat: nieuw/niche product zonder reviews. Geen verzonnen
            // reviews of een nep 0,0-gemiddelde — alleen een nette uitnodiging.
            <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">{t("pdp.reviews.empty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("pdp.reviews.beFirst")}</p>
            </div>
          )}
        </div>
      </TabsContent>

      {/* FAQ — catalogus-FAQ of gepubliceerde AI-FAQ uit KV */}
      {hasFaq && (
        <TabsContent value="faq">
          <Accordion type="single" collapsible className="max-w-2xl">
            {faqItems.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-semibold">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                    {f.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      )}

      {/* Verwerking & advies */}
      {product.processingAdvice && (
        <TabsContent value="verwerking">
          <div className="max-w-2xl rounded-lg border border-border bg-secondary/30 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("pdp.processing.title")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.processingAdvice}
            </p>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}

/**
 * Parse de gepubliceerde AI-FAQ ("V: …\nA: …") naar losse vraag/antwoord-paren,
 * zodat we ze net als de catalogus-FAQ in een nette accordion kunnen tonen.
 */
function parsePublishedFaqs(text: string): { question: string; answer: string }[] {
  const strip = (s: string) => s.replace(/\*\*/g, "").trim();
  const items: { question: string; answer: string }[] = [];
  let cur: { question: string; answer: string } | null = null;
  let mode: "q" | "a" | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const q = line.match(/^(?:\*\*)?\s*(?:Vraag|V|Q)\s*[:.\-]\s*(.*)$/i);
    const a = line.match(/^(?:\*\*)?\s*(?:Antwoord|A)\s*[:.\-]\s*(.*)$/i);
    if (q) {
      if (cur) items.push(cur);
      cur = { question: strip(q[1]), answer: "" };
      mode = "q";
    } else if (a && cur) {
      cur.answer = strip(a[1]);
      mode = "a";
    } else if (cur) {
      if (mode === "a") cur.answer += (cur.answer ? " " : "") + strip(line);
      else cur.question += " " + strip(line);
    }
  }
  if (cur) items.push(cur);
  return items.filter((i) => i.question && i.answer);
}
