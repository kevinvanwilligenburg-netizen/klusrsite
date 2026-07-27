import { NextResponse } from "next/server";
import { chat } from "@/lib/ai/client";
import { saveBlogPost, type BlogPost } from "@/lib/store/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

// Roterende klus-onderwerpen (eigen, originele invulling — niet overgeschreven).
const TOPICS = [
  "Hoeveel verf heb ik nodig? Zo reken je het uit",
  "Binnenmuren schilderen: stappenplan voor een strak resultaat",
  "Welke kwast of roller kies je voor welke verf?",
  "Houten kozijnen schilderen en beschermen",
  "Beits of dekkende verf voor je schutting?",
  "De juiste primer kiezen voor elke ondergrond",
  "Badkamer schilderen: schimmelwerend en vochtbestendig",
  "Buiten schilderen: het beste seizoen en de juiste temperatuur",
  "Behang verwijderen en de muur voorbereiden",
  "Interieurkleuren combineren: zo kies je een palet",
  "Plafond schilderen zonder strepen",
  "Radiatoren en verwarmingsbuizen schilderen",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const topic = TOPICS[Math.floor(Date.now() / 86_400_000) % TOPICS.length];
  const system =
    "Je bent een ervaren ex-schilder die SEO-blogs schrijft voor KLUSR, een Nederlandse verf- en klusspecialist. Schrijf in het Nederlands, praktisch, vriendelijk en concreet. Verzin geen prijzen. Noem waar logisch KLUSR-troeven (advies van ex-schilders, op kleur gemengde verf, voor 10:00 besteld vanavond in huis).";
  const prompt = `Schrijf een origineel blogartikel over: "${topic}".
Formaat:
- Regel 1: een pakkende titel (zonder "Titel:" ervoor).
- Regel 2: een korte samenvatting in 1 zin.
- Daarna 4-6 alinea's met praktische uitleg en concrete tips; korte tussenkopjes mogen.
Houd het rond de 400-500 woorden.`;

  let text = "";
  try {
    const res = await chat({ system, messages: [{ role: "user", content: prompt }] });
    text = res.text || "";
  } catch {
    return NextResponse.json({ ok: false, error: "ai-failed" });
  }
  if (!text.trim()) return NextResponse.json({ ok: false, error: "empty" });

  const lines = text.trim().split("\n").map((l) => l.trim());
  const title = (lines[0] || topic).replace(/^#+\s*/, "").replace(/^titel:\s*/i, "").slice(0, 120);
  const excerpt = (lines[1] || "").slice(0, 240);
  const body = lines.slice(2).join("\n").trim() || text.trim();

  const post: BlogPost = {
    slug: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    excerpt,
    body,
    category: "Klustips",
    date: new Date().toISOString(),
  };
  await saveBlogPost(post);
  return NextResponse.json({ ok: true, slug: post.slug, title: post.title });
}
