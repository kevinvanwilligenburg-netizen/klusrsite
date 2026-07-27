# KLUSR ⇄ VDM-dashboard — datakoppeling

KLUSR leest productdata uit het interne VDM-dashboard (repo `dashboardvdm`,
live: `https://dashboardvdm.vercel.app`). Het dashboard praat zelf live met de
Tilroy-API (dagelijkse voorraad-cron om 05:00 UTC) en is daarmee een véél
versere bron dan de oude Tilroy S3-feeds of de (uitgeklede) Channable-feed.

## Wat er al werkt

| Data | Endpoint (dashboard) | KLUSR-kant | Status |
| --- | --- | --- | --- |
| **Prijzen** (verkoop + advies) | `GET /api/prijsfeed` — publiek, CSV of `?format=json`; per product `sku` (= Tilroy-artikel-id), `ean`, `normalePrijs`, `adviesPrijs` | `scripts/backfill-prices.mjs` (snapshot) én `scripts/build-price-feed.mjs` via `PRIJSFEED_URL` (runtime-overlay) | ✅ werkt — sku matcht 1-op-1 op onze variant-ids |
| **Voorraad** | `GET /api/stock?limit=&offset=` — publiek, JSON; per item `ean`, `description`, `qty` | `scripts/backfill-stock.mjs` (`CATALOG_SOURCE=stock` of `vdm`) | ⚠️ beperkt — zie hieronder |
| **Orders** (andersom) | Dashboard leest KLUSR's order-KV read-only mee (`KLUSR_KV_REST_API_URL/-TOKEN` = de KV-credentials van het klusrsite-Vercel-project) — "Webshop-orders"-pagina, dashboardvdm PR #282 | geen wijziging nodig; keys `order:<id>` + `order:index` en de Order-veldnamen zijn nu een **extern contract** (zie waarschuwing in `src/lib/store/orders.ts`) | ✅ werkt |

Aanzetten op Vercel (KLUSR-project): `CATALOG_SOURCE=vdm` → elke build draait
barcodes → prijzen → voorraad, allemaal non-destructief en fail-soft.

## Wat het dashboard nog moet toevoegen (taak voor de dashboard-sessie)

De stock-API is nu nog niet bruikbaar als verkoopvoorraad voor KLUSR, om twee
redenen:

1. **Geen `sku`** — items dragen alleen een EAN. KLUSR's catalogus is op
   Tilroy-artikel-id gebouwd (`tilroy-<id>`); EAN's zitten er alleen
   product-niveau in (en pas na de barcode-backfill). Met een `sku`-veld matcht
   élke variant exact, net als bij de prijsfeed. De mapping EAN ↔ sku heeft het
   dashboard al (de prijsfeed levert beide).
2. **Alleen bedrijfstotalen** — `qty` is de som over álle vestigingen, terwijl
   de KLUSR-webshop uitsluitend de Nijverdal-voorraad voert en toont. Totalen
   zouden de online voorraad overschatten. De voorraad-cron haalt per-winkel
   data uit Tilroy (`qty.available` per shop), dus de uitsplitsing bestaat al
   in het dashboard.

**Voorstel** — breid `/api/stock` uit (of maak `/api/stock/klusr`):

```jsonc
{
  "asOf": "2026-07-27T05:00:00Z",   // uit de dagelijkse Tilroy-cron, niet de handmatige upload
  "items": [
    {
      "sku": "39985524",            // Tilroy-artikel-id  ← NIEUW
      "ean": "8711113071819",
      "qty": 262,                    // totaal (blijft voor het dashboard zelf)
      "nijverdal": 118               // winkel 7827 + magazijn 8934  ← NIEUW
    }
  ]
}
```

- `nijverdal` = Tilroy-shops **7827** (winkel Nijverdal) + **8934**
  (magazijn/webvoorraad) — dezelfde optelling die de oude Tilroy stock-CSV
  hanteerde (kolom 0 + kolom 5 → nijverdal in `scripts/lib/catalog-map.mjs`).
- Bron bij voorkeur de **dagelijkse Tilroy-cron-snapshot** (live API) in plaats
  van de handmatige stock-upload; die laatste liep al eens 13 dagen achter.
- Een heel `shops`-object (`{"7827": 90, "8934": 28, …}`) mag ook — de
  KLUSR-backfill begrijpt beide vormen (zie `nijverdalQty()` in
  `scripts/backfill-stock.mjs`).

De KLUSR-consument (`backfill-stock.mjs`) pikt deze velden automatisch op zodra
ze bestaan; tot die tijd weigert hij bedrijfstotalen (tenzij expliciet
`VDM_STOCK_ACCEPT_TOTAL=1`).

## Beveiliging

Beide feeds zijn nu publiek (bewust: CORS + CDN-cache; de dashboard-middleware
gate't `/api/*` niet). Prijzen en voorraad zijn niet gevoelig
(consument-prijzen), maar wil je het dichtzetten: geef beide routes een
`Authorization: Bearer <token>`-check en zet dezelfde token in KLUSR als env
(`VDM_FEED_TOKEN`) — de backfills sturen die header dan mee (nog toe te voegen,
triviaal).

De order-koppeling gebruikt KLUSR's KV-credentials in het dashboard-project.
Let op: een standaard Upstash REST-token kan óók schrijven. Maak voor het
dashboard bij voorkeur het **read-only token** van de Upstash-database aan
(dashboard → database → REST API → "Read-Only Token") in plaats van het
volwaardige token te kopiëren — het dashboard hoeft alleen te lezen.

## Toekomst: producten

"Producten enz." kan dezelfde route volgen: het dashboard heeft de volledige
feed-catalogus (`lib/productFeed`) plus handmatige producten
(`/api/manual-products`). Een publieke product-feed (id, titel, merk, prijs,
EAN, afbeelding, categorie) zou de Channable-/Tilroy-importscripts in KLUSR
volledig kunnen vervangen. Nog niet gebouwd — eerst voorraad + prijzen stabiel.
