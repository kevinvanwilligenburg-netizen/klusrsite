import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/store/orders";
import { flagshipStore } from "@/lib/data/stores";
import { InvoicePrintButton } from "@/components/checkout/invoice-print-button";

export const metadata: Metadata = {
  title: "Pakbon | KLUSR",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const KLUSR = {
  name: "KLUSR B.V.",
  address: flagshipStore.address,
  postalCode: flagshipStore.postalCode,
  city: flagshipStore.city,
  email: process.env.EMAIL_REPLY_TO || "klantenservice@klus-r.nl",
  phone: flagshipStore.phone,
};

export default async function PakbonPage({ params }: { params: { orderId: string } }) {
  const order = await getOrder(params.orderId);
  if (!order) notFound();

  const c = order.customer;
  const date = new Date(order.createdAt).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const totalItems = order.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:px-0 print:py-0">
      <style>{`@media print { @page { margin: 16mm; } body { background:#fff; } header, footer, nav { display:none !important; } }`}</style>

      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-black">Pakbon {order.reference}</h1>
        <InvoicePrintButton />
      </div>

      <div className="rounded-2xl border border-border bg-white p-8 text-sm text-black shadow-card print:border-0 print:shadow-none">
        {/* Kop */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-2xl font-black tracking-tight">
              KLUS<span className="rounded bg-primary px-1.5 text-white">R</span>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-neutral-600">
              {KLUSR.name}
              <br />
              {KLUSR.address}
              <br />
              {KLUSR.postalCode} {KLUSR.city}
              <br />
              {KLUSR.email} · {KLUSR.phone}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black uppercase tracking-wide">Pakbon</p>
            <p className="mt-2 text-xs text-neutral-600">
              Ordernr.: <span className="font-semibold text-black">{order.reference}</span>
              <br />
              Datum: <span className="font-semibold text-black">{date}</span>
              <br />
              Artikelen: <span className="font-semibold text-black">{totalItems}</span>
            </p>
          </div>
        </div>

        {/* Verzendadres */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Verzendadres
            </p>
            <p className="mt-1 leading-relaxed">
              {c.company && (
                <span className="font-semibold">
                  {c.company}
                  <br />
                </span>
              )}
              <span className="font-semibold">
                {c.firstName} {c.lastName}
              </span>
              <br />
              {c.street}
              <br />
              {c.postalCode} {c.city}
            </p>
          </div>
          <div className="rounded-lg bg-neutral-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500">
              Verzending
            </p>
            <p className="mt-1 leading-relaxed">
              {order.shipment ? (
                <>
                  PostNL · <span className="font-semibold">{order.shipment.barcode}</span>
                  <br />
                  {order.shipment.trackTrace && (
                    <span className="break-all text-xs text-neutral-600">
                      {order.shipment.trackTrace}
                    </span>
                  )}
                </>
              ) : (
                <>
                  Nog niet verzonden
                  <br />
                  <span className="text-xs text-neutral-600">
                    Voor 19:00 besteld, morgen in huis
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Regels — picklijst */}
        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-neutral-200 text-[11px] uppercase tracking-wide text-neutral-500">
              <th className="w-8 py-2 text-center">✓</th>
              <th className="py-2">Artikel</th>
              <th className="py-2 text-right">Barcode</th>
              <th className="py-2 text-center">Aantal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.key} className="border-b border-neutral-100 align-top">
                <td className="py-2.5 text-center">
                  <span className="inline-block h-3.5 w-3.5 rounded-sm border border-neutral-400" />
                </td>
                <td className="py-2.5">
                  <span className="font-semibold">{it.title}</span>
                  {it.variantLabel && it.variantLabel !== "Standaard" ? ` · ${it.variantLabel}` : ""}
                  {it.selectedColor ? (
                    <span className="text-neutral-600">
                      {" "}· kleur{" "}
                      <strong className="text-black">{it.selectedColor.name}</strong>
                      {it.selectedColor.code ? ` (${it.selectedColor.code})` : ""}
                      {it.selectedColor.collection ? (
                        <> · <strong className="text-black">{it.selectedColor.collection}</strong></>
                      ) : null}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 text-right font-mono text-xs text-black">
                  {it.gtin?.trim() ? (
                    it.gtin.trim()
                  ) : (
                    <span className="text-neutral-500">
                      art. {String(it.productId).replace(/^tilroy-/, "")}
                    </span>
                  )}
                </td>
                <td className="py-2.5 text-center text-base font-black">{it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-8 rounded-lg bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-600">
          Bedankt voor je bestelling bij KLUSR! Iets retourneren? Dat kan gratis binnen 30 dagen —
          houd het ordernummer <span className="font-semibold text-black">{order.reference}</span>{" "}
          bij de hand. Vragen? Mail {KLUSR.email} of bel {KLUSR.phone}.
        </p>
      </div>
    </div>
  );
}
