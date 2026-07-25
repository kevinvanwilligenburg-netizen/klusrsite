import { NextResponse } from "next/server";
import { getAdminSession } from "@/auth";
import { getInsights } from "@/lib/store/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin: geaggregeerde inzichten (zoekopdrachten, chat-vragen, conversies). */
export async function GET(req: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const days = Number(new URL(req.url).searchParams.get("days")) || 1;
  return NextResponse.json(await getInsights({ days }));
}
