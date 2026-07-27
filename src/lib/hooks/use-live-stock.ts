"use client";

import { useEffect, useState } from "react";

/**
 * Live verkoopbare voorraad per variant-id (Nijverdal, ná de
 * veiligheidsvoorraadregel) via /api/stock/live — dezelfde bronnen als de
 * checkout-guard (eigen grootboek + live Tilroy via het VDM-dashboard).
 *
 * Retourneert null tot de eerste respons binnen is; bij een fout blijft het
 * null zodat de UI gewoon op de (dagelijks ververste) snapshot-stand draait.
 */
export function useLiveStock(variantIds: string[]): Map<string, number> | null {
  const [stock, setStock] = useState<Map<string, number> | null>(null);
  const key = variantIds.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const ctl = new AbortController();
    fetch(`/api/stock/live?ids=${encodeURIComponent(key)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d?.stock) return;
        setStock(new Map(Object.entries(d.stock as Record<string, number>)));
      })
      .catch(() => {
        /* fail-open: snapshot-stand blijft staan */
      });
    return () => {
      alive = false;
      ctl.abort();
    };
  }, [key]);

  return stock;
}
