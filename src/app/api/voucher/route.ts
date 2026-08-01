import { NextResponse } from "next/server";
import { z } from "zod";
import { beoordeelVoucher } from "@/lib/store/vouchers";
import { bevatMengverf } from "@/lib/kleurtester";
import { cartItemSchema } from "@/lib/checkout-schema";
import type { CartItem } from "@/types";

export const runtime = "nodejs";

/**
 * Controleert een tegoedbon uit de kleurtester-actie.
 *
 * De voorwaarde — er moet mengverf in de wagen zitten — beoordelen we hier
 * server-side op de méégestuurde winkelwagen, en niet op een vlaggetje van de
 * client. Anders kan iemand het tegoed op een willekeurige bestelling zetten
 * door één veld te veranderen; dezelfde klasse fout als het prijslek.
 *
 * Deze route zégt alleen of de bon geldig is. Het daadwerkelijk inwisselen
 * gebeurt bij het aanmaken van de betaling, zodat een bon niet verdwijnt door
 * een checkout die de klant afbreekt.
 */

const schema = z.object({
  code: z.string().min(3).max(40),
  items: z.array(cartItemSchema).min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ geldig: false, reden: "Ongeldig verzoek." }, { status: 400 });
  }

  const heeftMengverf = bevatMengverf(parsed.data.items as CartItem[]);
  const oordeel = await beoordeelVoucher(parsed.data.code, heeftMengverf);

  if (!oordeel.geldig) {
    return NextResponse.json({ geldig: false, reden: oordeel.reden });
  }
  return NextResponse.json({
    geldig: true,
    bedrag: oordeel.voucher.bedrag,
    verlooptOp: oordeel.voucher.verlooptOp,
  });
}
