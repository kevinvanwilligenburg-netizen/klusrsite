# KLUSR ⇄ VDM-dashboard — datakoppeling

KLUSR leest productdata uit het interne VDM-dashboard (repo `dashboardvdm`,
live: `https://dashboardvdm.vercel.app`). Het dashboard praat zelf live met de
Tilroy-API (dagelijkse voorraad-cron om 05:00 UTC) en is daarmee een véél
versere bron dan de oude Tilroy S3-feeds of de (uitgeklede) Channable-feed.

## Wat er al werkt

| Data | Endpoint (dashboard) | KLUSR-kant | Status |
| --- | --- | --- | --- |
| **Prijzen** (verkoop + advies) | `GET /api/prijsfeed` — publiek, CSV of `?format=json`; per product `sku` (= Tilroy-artikel-id), `ean`, `normalePrijs`, `adviesPrijs` | `scripts/backfill-prices.mjs` (snapshot) én `scripts/build-price-feed.mjs` via `PRIJSFEED_URL` (runtime-overlay) | ✅ werkt — sku matcht 1-op-1 op onze variant-ids |
| **Voorraad** | `GET /api/voorraad/feed?limit=&offset=` (dashboardvdm PR #283) — live uit de Tilroy Stock API; per item `sku` + `shops` met álle vestigingen (0 = écht uitverkocht); `configured: false` zolang de Tilroy-keys ontbreken | `scripts/backfill-stock.mjs` (`CATALOG_SOURCE=stock` of `vdm`) — pikt `sku` en `shops["7827"]`+`["8934"]` automatisch op | 🕐 klaar aan beide kanten; wacht op merge/deploy van PR #283 + Tilroy-keys in het dashboard |
| **Orders** (andersom) | Dashboard leest KLUSR's order-KV read-only mee (`KLUSR_KV_REST_API_URL/-TOKEN` = de KV-credentials van het klusrsite-Vercel-project) — "Webshop-orders"-pagina, dashboardvdm PR #282 | geen wijziging nodig; keys `order:<id>` + `order:index` en de Order-veldnamen zijn nu een **extern contract** (zie waarschuwing in `src/lib/store/orders.ts`) | ✅ werkt |

Aanzetten op Vercel (KLUSR-project): `CATALOG_SOURCE=vdm` → elke build draait
barcodes → prijzen → voorraad, allemaal non-destructief en fail-soft.

## Voorraadfeed — geïmplementeerd (dashboardvdm PR #283)

De eerdere spec op deze plek is uitgevoerd: het dashboard exposet
`/api/voorraad/feed` met per item `sku` (Tilroy-artikel-id) en een
`shops`-object waarin élke bekende vestiging een key heeft (0 = écht
uitverkocht). De KLUSR-backfill leest Nijverdal als `shops["7827"]`
(winkel) + `shops["8934"]` (magazijn) — dezelfde optelling die de oude Tilroy
stock-CSV hanteerde. `VDM_STOCK_ACCEPT_TOTAL` is voor deze feed niet meer
nodig (dat blijft alleen relevant voor het legacy `/api/stock`-endpoint).

Nog te doen vóór de eerste echte backfill:

1. **Merge/deploy PR #283** en zet de **Tilroy-keys** in het dashboard-project
   (tot die tijd: `configured: false` → de backfill stopt netjes).
2. **Sku-waardenruimte verifiëren**: check éénmalig of Tilroy's `sku.sourceId`
   gelijk is aan onze `tilroy-`-gestripte ids, via
   `/api/voorraad/skus?skus=39985524` (een bekend artikel). De backfill logt
   bij nul matches zelf voorbeelden van beide kanten.

**Later — live beschikbaarheid in de storefront:** hetzelfde
`/api/voorraad/skus`-endpoint (max 200 sku's per call, 30–60 s cache) kan de
checkout/PDP van live voorraad voorzien. Dat lost de verouderde
snapshot-voorraad én het oversell-risico bij het afrekenen structureel op —
eerst de backfill stabiel draaien, dan dit.

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

## Orders → Tilroy (dashboard doet de push, KLUSR levert sku's)

Uit de Tilroy API-docs (dashboardvdm PR #284): webshop-orders kúnnen wel
degelijk in Tilroy worden ingeschoten — `POST saleapi/import/sales`
(orderNumber = webshop-referentie) of de rijkere `POST orderapi/orders`
(reserveert voorraad, mollieReference, dispatches met trackingCode). Die push
gebeurt **centraal vanuit het dashboard** (dat de order-KV toch al leest); de
no-op `pushChannableOrder` in `src/lib/channable.ts` blijft in klusrsite dus
gewoon staan.

Wat KLUSR daarvoor levert: sinds 2026-07 draagt elke orderregel een kaal
`items[].sku`-veld (gezet in `createOrder`, `src/lib/store/orders.ts`).
**Let op bij het mappen in het dashboard:** de sku is afgeleid van het
*variant*-id, niet van `productId` — bij multi-maat-producten is de bestelde
maat een eigen Tilroy-artikel en wijkt het variant-id af van het product-id.
Voor oudere orders zonder sku-veld: val terug op `variantId` (of `productId`)
zonder het `tilroy-`-prefix. Het bezorgadres zit al volledig op
`customer`; `items[].gtin` is het product-niveau-EAN (lead-artikel) en kan bij
multi-variant-producten afwijken van de bestelde variant — gebruik de sku.

FYI voor wie ooit rechtstreeks de Tilroy **Product-bulk-API** aanspreekt:
sku's + costPrice zitten onder `colours[].skus` (niet top-level), `brand` is
een object `{code, descriptions[]}`, en de `fields`-parameter moet `"colours"`
bevatten.

## Verzending: PostNL → DHL (aangekondigd, nog niet bouwen)

Beide sites migreren van PostNL naar de **DHL API**, met nieuwe klokregels van
Kevin: besteld **vóór 10:00 → same-day**, **10:00–23:59 → next-day**. Raakt in
klusrsite: `src/lib/delivery.ts` (cutoff staat nu op 19:00),
`src/lib/shipping.ts` (PostNL-tarieven) en `src/lib/postnl.ts` (Send API +
labels). De label-flow verhuist als onderdeel van de beheer-migratie naar het
dashboard. Afspraak: **voorlopig niets wijzigen aan de verzendcode, en géén
nieuwe PostNL-features meer bouwen.**
