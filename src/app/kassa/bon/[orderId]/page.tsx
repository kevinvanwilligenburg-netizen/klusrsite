import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getAdminSession } from "@/auth";
import { getOrder } from "@/lib/store/orders";
import { receiptDataForOrder } from "@/lib/pos-receipt";
import { PrintTrigger } from "@/components/pos/print-trigger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kassabon",
  robots: { index: false, follow: false },
};

/**
 * Printbare kassabon (80 mm). Geschikt voor een bonprinter die als gewone printer
 * is gekoppeld; voor directe ESC/POS-aansturing gebruikt de kassa de
 * /api/kassa/receipt-route. Geopend met ?print=1 print de pagina automatisch.
 */
export default async function BonPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: { print?: string };
}) {
  if (!(await getAdminSession())) redirect("/inloggen?redirect=/kassa");

  const order = await getOrder(params.orderId);
  if (!order) {
    return (
      <div className="mx-auto max-w-sm p-8 text-center text-sm text-muted-foreground">
        Bon niet gevonden.
      </div>
    );
  }

  const r = receiptDataForOrder(order);

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 p-4">
      {/* Printinstructie: alleen de bon (#bon) is zichtbaar in de printuitvoer. */}
      <style>{`@media print {
        body * { visibility: hidden !important; }
        #bon, #bon * { visibility: visible !important; }
        #bon { position: absolute; left: 0; top: 0; width: 80mm; }
        @page { margin: 4mm; }
      }`}</style>

      <PrintTrigger auto={searchParams.print === "1"} />

      <div
        id="bon"
        className="w-[80mm] rounded-md border border-border bg-white p-3 font-mono text-[11px] leading-tight text-black"
      >
        <div className="text-center">
          <div className="text-base font-black tracking-tight">{r.storeName}</div>
          {r.addressLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        <div className="mt-3 flex justify-between">
          <span>Bon {r.reference}</span>
          <span>{r.dateTime}</span>
        </div>
        {r.cashier && <div>Kassa: {r.cashier}</div>}
        {r.customerLine && <div>{r.customerLine}</div>}

        <div className="my-2 border-t border-dashed border-black/40" />

        {r.lines.map((l, i) => (
          <div key={i} className="mb-1">
            <div className="font-semibold">{l.title}</div>
            <div className="flex justify-between">
              <span>
                {l.qty} × {l.unit}
              </span>
              <span>{l.total}</span>
            </div>
          </div>
        ))}

        <div className="my-2 border-t border-dashed border-black/40" />

        <div className="flex justify-between">
          <span>Subtotaal</span>
          <span>{r.subtotal}</span>
        </div>
        <div className="flex justify-between text-black/70">
          <span>waarvan btw 21%</span>
          <span>{r.vat}</span>
        </div>
        {r.savings && (
          <div className="flex justify-between">
            <span>Je voordeel</span>
            <span>{r.savings}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-sm font-black">
          <span>TOTAAL</span>
          <span>{r.total}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>Betaald met</span>
          <span>{r.paymentLabel}</span>
        </div>
        {r.cashGiven && (
          <div className="flex justify-between">
            <span>Ontvangen</span>
            <span>{r.cashGiven}</span>
          </div>
        )}
        {r.change && (
          <div className="flex justify-between">
            <span>Wisselgeld</span>
            <span>{r.change}</span>
          </div>
        )}

        {r.footerLines?.length ? (
          <>
            <div className="my-2 border-t border-dashed border-black/40" />
            <div className="text-center">
              {r.footerLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
