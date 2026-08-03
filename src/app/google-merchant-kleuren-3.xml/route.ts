import { kleurenFeedResponse } from "@/lib/kleuren-feed";

/** Kleurenfeed, deel 3. Zie lib/kleuren-feed.ts voor waarom hij is opgeknipt. */
export const dynamic = "force-static";

export function GET() {
  return kleurenFeedResponse(3);
}
