import type { Metadata } from "next";
import { TopicImage } from "@/components/shared/topic-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Clock, Sparkles } from "lucide-react";
import { getBlogPost, listBlogPosts } from "@/lib/store/blog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

// Posts worden door de cron in KV geschreven, dus altijd vers ophalen.
export const dynamic = "force-dynamic";

interface BlogPageProps {
  params: { slug: string };
}

const KEYWORDS = "painting,wall,roller";

function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 180));
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const post = await getBlogPost(params.slug);
  if (!post) return { title: "Blog niet gevonden" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
    },
  };
}

/** Inline **vet** binnen een tekstregel omzetten naar <strong>. */
function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-bold text-foreground">
          {bold[1]}
        </strong>
      );
    }
    return <span key={`${keyBase}-${i}`}>{part}</span>;
  });
}

/** AI-body (alinea's, tussenkopjes en opsommingen) naar nette JSX. */
function renderBody(body: string) {
  const lines = body
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="mt-5 list-disc space-y-2 pl-5 text-base leading-relaxed text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i}>{renderInline(b, `ul-${nodes.length}-${i}`)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((line, i) => {
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
      return;
    }
    flushBullets();

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const boldHeading = line.match(/^\*\*(.+?)\*\*:?$/);
    if (heading || boldHeading) {
      nodes.push(
        <h2 key={`h-${i}`} className="mt-10 text-xl font-extrabold tracking-tight text-foreground first:mt-0 sm:text-2xl">
          {(heading?.[1] || boldHeading?.[1] || "").trim()}
        </h2>,
      );
      return;
    }

    nodes.push(
      <p key={`p-${i}`} className="mt-6 text-base leading-relaxed text-muted-foreground first:mt-0">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
  });

  flushBullets();
  return nodes;
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const post = await getBlogPost(params.slug);
  if (!post) notFound();

  const all = await listBlogPosts();
  const related = all.filter((p) => p.slug !== post.slug).slice(0, 3);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.klus-r.nl").replace(/\/$/, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    articleSection: post.category,
    author: { "@type": "Organization", name: "KLUSR" },
    publisher: { "@type": "Organization", name: "KLUSR" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/advies/blog/${post.slug}` },
  };

  return (
    <article className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-klusr">
        {/* Breadcrumb */}
        <nav
          aria-label="Kruimelpad"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          <Link href="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <Link href="/advies" className="hover:text-primary">
            Advies
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          <span className="line-clamp-1 text-foreground">{post.title}</span>
        </nav>

        {/* Header */}
        <header className="mx-auto mt-6 max-w-2xl">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {post.category}
          </span>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-balance sm:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>KLUSR redactie</span>
            <span aria-hidden>·</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {readingMinutes(post.body)} min leestijd
            </span>
          </div>
        </header>

        {/* Hero image */}
        <div className="relative mx-auto mt-8 aspect-[16/9] max-w-4xl overflow-hidden rounded-2xl">
          <TopicImage seed={post.slug} keywords={KEYWORDS} />
        </div>

        {/* Body */}
        <div className="mx-auto mt-10 max-w-2xl">{renderBody(post.body)}</div>

        {/* CTA naar de producten */}
        <aside className="mx-auto mt-10 max-w-2xl rounded-2xl border border-border bg-secondary/40 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">Direct aan de slag</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Alles voor deze klus vind je in ons assortiment — op kleur gemengd en
            voor 09:00 besteld, vanavond in huis.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <li>
              <Link
                href="/categorie/verf"
                className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                Bekijk alle verf
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
            <li>
              <Link
                href="/klushulp"
                className="group flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                Vraag onze klushulp om advies
                <ArrowRight className="h-4 w-4 shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          </ul>
        </aside>
      </div>

      {/* Meer blogs */}
      {related.length > 0 && (
        <section className="container-klusr mt-16">
          <h2 className="mb-5 text-xl font-extrabold tracking-tight sm:text-2xl">
            Lees ook
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/advies/blog/${item.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <TopicImage seed={item.slug} keywords={KEYWORDS} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <Badge variant="muted" className="w-fit">
                    {item.category}
                  </Badge>
                  <h3 className="font-extrabold leading-tight tracking-tight group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Klushulp CTA */}
      <section className="container-klusr mt-16">
        <div className="overflow-hidden rounded-2xl bg-klusr-black p-6 text-white sm:p-10">
          <div className="grid items-center gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-2xl font-black sm:text-3xl">
                Zelf aan de slag met jouw klus?
              </h2>
              <p className="mt-2 text-white/70">
                Beschrijf je klus en onze klushulp stelt direct het juiste
                stappenplan en de juiste producten voor.
              </p>
            </div>
            <div className="flex lg:justify-end">
              <Button asChild size="lg">
                <Link href="/klushulp">
                  Start de klushulp
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </article>
  );
}
