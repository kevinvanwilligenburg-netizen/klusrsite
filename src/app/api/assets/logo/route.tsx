import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Branded KLUSR-logo als PNG voor o.a. Google Ads (geen losse PNG voorhanden).
 *
 * Varianten via ?variant=:
 *  - square (1:1, 512×512)        — logo op wit, voor het Ads-logo (1:1)
 *  - wide   (4:1, 1200×300)       — landscape logo (4:1)
 *  - banner (1.91:1, 1200×628)    — sfeer/marketing met rode gradient
 *  - icon   (1:1, 512×512 zwart)  — donkere variant
 *
 * Downloaden: open de URL en sla de afbeelding op.
 */
const SIZES: Record<string, [number, number]> = {
  square: [512, 512],
  wide: [1200, 300],
  banner: [1200, 628],
  icon: [512, 512],
};

export async function GET(req: Request) {
  const variant = new URL(req.url).searchParams.get("variant") || "square";
  const [width, height] = SIZES[variant] || SIZES.square;
  const banner = variant === "banner";
  const dark = variant === "icon" || banner;

  const klusFontSize = banner ? 116 : Math.round(height * 0.32);
  const rFontSize = Math.round(klusFontSize * 0.82);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: banner
            ? "linear-gradient(135deg, #101010 0%, #101010 45%, #C90000 100%)"
            : dark
              ? "#101010"
              : "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              fontSize: klusFontSize,
              fontWeight: 800,
              letterSpacing: -klusFontSize * 0.03,
              color: dark ? "#ffffff" : "#101010",
            }}
          >
            KLUS
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: rFontSize,
              fontWeight: 800,
              color: "#ffffff",
              background: "#C90000",
              borderRadius: klusFontSize * 0.14,
              padding: `${klusFontSize * 0.04}px ${klusFontSize * 0.16}px`,
              marginLeft: klusFontSize * 0.06,
            }}
          >
            R
          </span>
        </div>
        {banner && (
          <span style={{ marginTop: 28, fontSize: 36, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
            Verf · gereedschap · ijzerwaren — voor 09:00 besteld, vanavond in huis
          </span>
        )}
      </div>
    ),
    { width, height },
  );
}
