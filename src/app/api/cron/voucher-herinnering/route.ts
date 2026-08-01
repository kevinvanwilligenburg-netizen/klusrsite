import { NextResponse } from "next/server";
import { teHerinneren, markeerHerinnerd } from "@/lib/store/vouchers";
import { sendVoucherHerinnering } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET;

/** Na hoeveel dagen we herinneren aan een openstaand tegoed. */
const NA_DAGEN = 14;

/**
 * Herinnert klanten aan een kleurtester-tegoed dat nog openstaat.
 *
 * Twee weken na de bestelling: lang genoeg om de tester te hebben uitgeprobeerd,
 * ruim voor de vervaldatum van twaalf maanden.
 *
 * **Eén keer per voucher.** De voucher wordt gemarkeerd zodra de mail eruit is,
 * dus een tweede cron-run stuurt niets meer. Dat is bewust: dit is een dienst
 * aan de klant en geen reeks aanmaningen. Markeren gebeurt pas ná een geslaagde
 * verzending, zodat een mailstoring niet stilzwijgend een herinnering opeet.
 */
export async function GET(req: Request) {
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let verstuurd = 0;
  let mislukt = 0;

  try {
    const vouchers = await teHerinneren(NA_DAGEN);
    for (const v of vouchers) {
      try {
        const res = await sendVoucherHerinnering({
          email: v.email,
          code: v.code,
          bedrag: v.bedrag,
          verlooptOp: v.verlooptOp,
        });
        // Alleen markeren als hij écht weg is; anders proberen we morgen opnieuw.
        if (res.ok) {
          await markeerHerinnerd(v.code);
          verstuurd++;
        } else {
          mislukt++;
        }
      } catch {
        mislukt++;
      }
    }
    console.info(`[voucher-herinnering] verstuurd=${verstuurd} mislukt=${mislukt}`);
    return NextResponse.json({ ok: true, verstuurd, mislukt });
  } catch (err) {
    console.error("[voucher-herinnering] onverwachte fout", err);
    return NextResponse.json({ ok: false, verstuurd, mislukt: mislukt + 1 });
  }
}
