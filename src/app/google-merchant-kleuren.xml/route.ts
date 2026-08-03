import { kleurenFeedResponse } from "@/lib/kleuren-feed";

/**
 * Shopping-feed met kleurvarianten voor mengbare Sikkens-verf.
 *
 * Los van /google-merchant.xml en bewust ook een aparte bron in Merchant
 * Center: de hoofdfeed draait goed en die zetten we niet op het spel voor een
 * proef. Weghalen is één klik.
 */
export const dynamic = "force-static";

export function GET() {
  return kleurenFeedResponse();
}
