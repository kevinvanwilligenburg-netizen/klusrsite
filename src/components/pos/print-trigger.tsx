"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Printknop voor de bonpagina. Print automatisch bij `auto` (geopend met
 * ?print=1 vanuit de kassa). De knop zelf verdwijnt in de printuitvoer.
 */
export function PrintTrigger({ auto }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 350);
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <button
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-klusr-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
    >
      <Printer className="h-4 w-4" />
      Print bon
    </button>
  );
}
