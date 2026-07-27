import { cn } from "@/lib/utils";

/**
 * Vertrouwens-iconen: betaalmethodes (echte, officiële logo's) + verzendpartner.
 *
 * De betaallogo's zijn de officiële merk-SVG's uit /public/payment
 * (Shopify `activemerchant/payment_icons`, MIT-licentie — zie
 * public/payment/LICENSE.txt). Merken zijn eigendom van hun eigenaren en worden
 * hier uitsluitend getoond als "wij accepteren dit"-indicatie. Elke badge staat
 * op een witte tegel zodat ook de zwarte Apple Pay-badge leesbaar is op de
 * donkere footer.
 */

const METHODS: { id: string; label: string }[] = [
  { id: "ideal", label: "iDEAL" },
  { id: "mastercard", label: "Mastercard" },
  { id: "visa", label: "Visa" },
  { id: "maestro", label: "Maestro" },
  { id: "bancontact", label: "Bancontact" },
  { id: "paypal", label: "PayPal" },
  { id: "klarna", label: "Klarna" },
  { id: "applepay", label: "Apple Pay" },
  { id: "googlepay", label: "Google Pay" },
];

export function PaymentIcons({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {METHODS.map((m) => (
        <span
          key={m.id}
          title={m.label}
          className="inline-flex h-[30px] min-w-[44px] items-center justify-center rounded-[5px] border border-black/10 bg-white px-1.5 shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/payment/${m.id}.svg`}
            alt={m.label}
            width={38}
            height={24}
            loading="lazy"
            className="h-[18px] w-auto"
          />
        </span>
      ))}
    </div>
  );
}

/**
 * Verzendpartner-badge. Sinds de overstap van PostNL naar DHL (2026-07) staat
 * hier de naam als tekst: het officiële DHL-logo zit nog niet in /public. Zodra
 * dat er is, kan dit weer een `<img>` worden — de badge wordt op twee plekken
 * getoond (winkelwagen en footer), dus de vervoerder mag hier nooit afwijken
 * van wat er daadwerkelijk bezorgt.
 */
export function CarrierBadge({ className }: { className?: string }) {
  return (
    <span
      title="DHL"
      aria-label="Verzending met DHL"
      className={cn(
        "inline-flex h-[30px] items-center justify-center rounded-[5px] border border-black/10 bg-white px-2.5 text-[15px] font-extrabold tracking-tight text-[#D40511] shadow-sm",
        className,
      )}
    >
      DHL
    </span>
  );
}
