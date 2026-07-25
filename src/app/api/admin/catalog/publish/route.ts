import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOOK = (process.env.DEPLOY_HOOK_URL || "").trim();

/** Is er een deploy-hook geconfigureerd om de overlay live te zetten? */
export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ configured: Boolean(HOOK) });
}

/**
 * Publiceer de catalogus-overlay: trigger een (Vercel) deploy-hook zodat de build
 * de overlay opnieuw vastlegt en de webshop de wijzigingen toont. Zonder
 * DEPLOY_HOOK_URL geven we een nette melding terug.
 */
export async function POST() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!HOOK) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Geen DEPLOY_HOOK_URL ingesteld. Wijzigingen gaan live bij de eerstvolgende deploy.",
      },
      { status: 400 },
    );
  }
  try {
    const res = await fetch(HOOK, { method: "POST", signal: AbortSignal.timeout(15000) });
    return NextResponse.json({ ok: res.ok, status: res.status });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Deploy-hook mislukt" },
      { status: 502 },
    );
  }
}
