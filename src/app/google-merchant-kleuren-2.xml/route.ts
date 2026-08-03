import { kleurenFeedResponse } from "@/lib/kleuren-feed";

/** Kleurenfeed, deel 2. Zie lib/kleuren-feed.ts voor waarom hij is opgeknipt. */
export const dynamic = "force-static";

export function GET() {
  return kleurenFeedResponse(2);
}
