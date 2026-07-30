# KLUSR ⇄ VDM-dashboard — datakoppeling

KLUSR leest productdata uit het interne VDM-dashboard (repo `dashboardvdm`,
live: `https://dashboardvdm-k-evin-s-projects.vercel.app` — het canonieke
projectdomein; de kale alias `dashboardvdm.vercel.app` hangt vast op een
deployment van elf versies terug, zie `src/lib/vdm-dashboard.ts`). Het dashboard praat zelf live met de
Tilroy-API (dagelijkse voorraad-cron om 05:00 UTC) en is daarmee een véél
versere bron dan de oude Tilroy S3-feeds of de (uitgeklede) Channable-feed.

> NB: `dashboardvdm.vercel.app` heeft op 2026-07-27 een halve dag vastgezeten
> op een deployment van 21 juni (oude alias-pin); dat is diezelfde dag
> hersteld. Blijft het domein ooit weer achterlopen, gebruik dan het
> canonieke projectdomein `dashboardvdm-k-evin-s-projects.vercel.app` — alle
> KLUSR-consumers accepteren een override via hun env-var.

**Tilroy-winkel-ids** (uit de live feed): 7827 Nijverdal · 8626 Apeldoorn ·
8627 Emmen · 8628 Deventer · 8629 Zutphen · 8934 Webshop · 8602 TEST. De
webshop-verkoopvoorraad = **7827 + 8934**. Let op: dit wijkt af van de
kolomvolgorde die de oude S3-stock-CSV suggereerde.

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

**Voorraad-ijkpunt (belangrijk bij wijzigingen aan het grootboek):** het
voorraad-grootboek telt verkopen "sinds de feed". Nu de voorraad dagelijks uit
Tilroy ververst, is dat ijkpunt niet meer vast, dus de tellers zijn eraan
gekoppeld: `scripts/backfill-stock.mjs` schrijft bij elke verse stand de `asOf`
naar `src/lib/data/stock-baseline.generated.json`, en
`src/lib/store/stock-ledger.ts` neemt die op in zijn KV-sleutels
(`stock:sold:<asOf>`). Een nieuwe stand betekent dus automatisch nieuwe tellers.
Zonder die koppeling zou een verkoop dubbel worden afgetrokken zodra Tilroy 'm
óók heeft uitgeboekt — en dat gebeurt sinds de order-push (dashboardvdm #287)
automatisch. Bij een ongewijzigde Tilroy-stand blijft het ijkpunt bewust staan,
zodat eigen verkopen die Tilroy nog niet kent blijven meetellen.

**Live beschikbaarheid — checkout-guard staat al klaar:** alle vier de
web-orderroutes (checkout, express, Apple Pay ×2) valideren de voorraad nu
server-side vóór het aanmaken van de betaling (`src/lib/live-stock.ts`). De
guard rekent met min(eigen grootboek, dashboard-live) — het grootboek kent
onze eigen webverkopen, het dashboard de winkelverkopen — en gebruikt
`/api/voorraad/skus?skus=…` (max 200 per call, 45 s cache) automatisch zodra
dat endpoint deployt; tot die tijd draait hij volledig op het grootboek.
Fail-open: een storing in de check blokkeert nooit een checkout. Bij een
tekort krijgt de klant een 409 met een duidelijke melding. De PDP live voorraad
laten tonen kan later via dezelfde helper.

## Beveiliging

⚠️ **Bot-challenge op het dashboard.** Het dashboard-project heeft Vercel's
Attack Challenge Mode aanstaan. Die blokkeert élke machine-to-machine call met
een 403 (`x-vercel-mitigated: challenge`) — een script kan de JS-challenge niet
oplossen. Er staat daarom een firewall-regel met actie **Bypass** op de
publieke feed-paden (`/api/voorraad/*`, `/api/prijsfeed`, `/api/kleurenkiezer/*`,
`/api/mailchimp/klanten`). Zonder die regel vallen stil: de dagelijkse
voorraad-/prijssync, de live checkout-guard (fail-open) en de kleurkiezer
(valt terug op de ingebouwde collecties). Herken je het: de feed antwoordt met
HTML in plaats van JSON, of meldt onterecht `configured: false` — die melding
kwam bij ons uit de challenge-pagina, niet uit ontbrekende Tilroy-keys.

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

## Producten / catalogus — via de Tilroy-feed (Channable-vrij)

De volledige catalogus komt sinds 2026-07-27 weer rechtstreeks uit de publieke
Tilroy Google-feed (`npm run feed:tilroy`, incl. native EAN's per artikel);
daarna zetten de backfills prijzen/adviesprijzen en de live Nijverdal-voorraad
erbovenop. De herimport draait **wekelijks** (maandag 04:15 UTC,
`import-catalogus.yml`) met een gezondheidscheck die de bestaande snapshot
behoudt bij een kapotte of verschoven feed (te weinig producten/afbeeldingen,
rommelige titels, hard zakkend aantal of een instortende categorie); de
dagelijkse cron (05:45 UTC) ververst alleen voorraad + prijzen.

**Rol van Channable is daarmee beperkt tot marketplace-orders** (bol/Amazon
inbound + tracking-terugkoppeling via `pushShipment`). De catalogus-, prijs-,
barcode- en voorraadpaden gebruiken Channable hooguit nog als stille terugval.

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

## Mengverf: basissen zijn losse Tilroy-artikelen

**Wat we fout deden.** De productpagina leidde de tinting-basis af uit de
lichtheid van de kleur en rekende daar een toeslag bij van € 0 / € 2,00 /
€ 4,50, plus een voorraadfactor van 1 / 0,6 / 0,35. Beide getallen waren
verzonnen en hadden geen bron. Het dashboard heeft in de Tilroy-prijslijst
nagemeten: in 8 van de 10 lijn+maat-paren kost een donkere basis **exact
hetzelfde** als een lichte. Er is dus geen toeslag; wij rekenden op donkere
kleuren zo'n 10% te veel. De voorraadfactor was nog duurder: 143 van de 212
leverbare mengverf-varianten (67%) waren daardoor niet in een donkere kleur te
bestellen, en sinds de checkout-guard erop blokkeerde was dat een geweigerde
bestelling in plaats van een weergavefoutje.

**Gecorrigeerd (2026-07-30):** toeslag en voorraadfactor staan op 0 resp. 1.

Het dashboard levert `GET /api/mengverf` met per verflijn + maat de basissen die
echt bestaan: sku, basiscode (N00/W05/LN/ZX…), label, prijs, kluspasprijs en
voorraad per vestiging, plus `zelfdePrijs`, `voorraadSamen` en `perWinkelSamen`.

Drie afspraken bij het aansluiten:
1. **Toon de prijs van het basisartikel, tel niets bij.** Bij
   `zelfdePrijs: true` (het normale geval) hoef je in de basiskeuze helemaal
   geen prijs te tonen. Bij `false` — Sikkens Alphadur, 24,95 om 31,95 op
   2,5 L — toon je de prijs per optie; dat zijn twee artikelen, geen opslag.
2. **Voorraad tonen mag opgeteld** (`voorraadSamen` / `perWinkelSamen`): de
   klant wil weten of de winkel zijn kleur kan mengen, en dat kan met beide
   basissen.
3. **Afboeken moet per basis.** Zet in de bestelregel de **sku van de gekozen
   basis**, niet die van het product waarop de klant klikte. De orderpush van
   het dashboard neemt die sku één-op-één over naar Tilroy, dus een verkeerde
   sku laat de voorraad daar scheeflopen — en dat zie je pas maanden later
   terug in de inkoop.

**Afspraak 3 is gedaan (2026-07-30):** `src/lib/mengverf.ts` zoekt bij het
afrekenen het basisartikel op en zet die sku in `items[].baseSku`; `createOrder`
gebruikt 'm als sku van de regel. Alle vier de routes die een order aanmaken
(create-payment, express, applepay-cart, applepay-pay) doen dat nu, en die
laatste drie deden ook de kleurcontrole nog niet — daar kwam de kleur van de
client ongezien op de order. Wij kennen drie basisniveaus (wit/medium/deep),
Tilroy meestal twee; bestaat ons niveau niet, dan pakken we de eerstvolgende
**donkerdere** basis: te licht draagt het pigment niet, te donker kost hooguit
wat meer colorant. Fail-safe: geen sleutel, geen bron of geen herkenbare basis →
de regel houdt de variant-sku die hij vandaag ook heeft.

**Afspraak 1 en 2 staan nog open.** Die raken de getoonde prijs, en dus ook
`verifyOrderTotal`: toont de productpagina straks de prijs van het basisartikel,
dan moet de servercontrole dezelfde bron gebruiken — anders weigert de checkout
bestellingen zodra `/api/mengverf` even hapert. Dat vraagt een prijsval die
niet fail-open mag zijn, en die keuze is groter dan een weergavewijziging. Tot
die tijd rekenen we de variantprijs, wat op lijnen met `zelfdePrijs: false`
(Alphadur 2,5 L: 24,95 om 31,95) te weinig is.

⚠️ **Niet hard blokkeren op nul voor mengverf.** De voorraadadministratie klopt
niet op de hardlopers: van de vijftien best verkopende artikelen staat Deventer
er op tien negatief, en de webshopvestiging op vijf. `voorraadSamen` valt
daardoor lager uit dan wat er fysiek ligt. Blokkeer pas bij een duidelijk
tekort over álle vestigingen samen, tot die telling is rechtgezet.

## Google-categorieën: nummers, geen paden

Het dashboard deelt zijn categorie-mapping via `/api/google/categorie-mapping`.
`scripts/sync-google-categories.mjs` haalt die op bij de import en legt 'm
lokaal vast (meegecommit), zodat onze feed blijft werken als het dashboard
hapert.

**We sturen het nummer, niet het pad.** Google accepteert allebei, maar een pad
is een letterlijke tekst die exact moet matchen — en een waarde die Google niet
kent, wordt stílzwijgend genegeerd. Merchant Center gaat dan alsnog zelf raden
en je ziet nergens dat je categorie is weggegooid.

Dat gebeurde hier ook, aan beide kanten. In onze eigen tabel stonden drie paden
die niet bestaan: `Hardware > Paint & Wall Covering > Paint`, `… > Wallpaper` en
`Hardware > Fasteners` — samen 40% van de feed, met verf als grootste categorie.
In de gedeelde mapping bestonden vijf van de twaalf paden niet, en wezen vier
nummers naar iets heel anders dan het pad ernaast (`elektra` → 2422 =
espressomachines, `vloeren` → 503751 = zwembadfolie, `ijzerwaren` → 1974 =
Locks & Keys, `gereedschap` → 632 = de hoofdcategorie Hardware).

Daarom:

- het syncscript zoekt bij elk **pad** zélf het juiste nummer op in Google's
  officiële taxonomiebestand, en negeert het meegeleverde nummer;
- regels die het niet kan thuisbrengen worden zónder nummer opgeslagen; de feed
  slaat die over — liever geen categorie dan een verkeerde;
- `scripts/check-google-categories.mjs` toetst zowel onze eigen tabel als de
  gedeelde mapping en geeft exit 1 bij een fout, zodat dit in CI kan.

Onze eigen tabel in `src/lib/google-feed.ts` blijft leidend; de gedeelde mapping
is het vangnet voor hoofdgroepen die wij nog niet kennen.

## Verzending: PostNL → DHL (webshop-kant af)

**Gedaan (2026-07-27):** de bezorgklok in `src/lib/delivery.ts` volgt de
DHL-regels — cutoff **09:00**, vóór die tijd same-day, daarna de volgende dag, en
DHL bezorgt 's avonds door heel Nederland. Maandag is met DHL wél een gewone
bezorgdag (anders dan bij PostNL, waar zondag én maandag afvielen). Het weekend
kent twee aparte begrippen, elk met een eigen constante in `delivery.ts`:

- `NON_DELIVERY_DAYS` (zondag) — dagen waarop niemand bezorgt.
- `NO_SAME_DAY_DAYS` (zaterdag) — zaterdag rijden we de vrijdagorders zélf uit,
  dus zaterdag ís een bezorgdag, maar wat op zaterdag binnenkomt gaat mee met
  maandag.

Vandaar: vrijdag ná 09:00 → zaterdag (eigen rit), zaterdag → maandag, zondag →
maandag. De cutoff staat op 09:00 en niet op 10:00 omdat de pakketten vóór
10:00 bij het DHL-depot in Hengelo moeten liggen — de klant heeft dus tot 09:00. De `sameDay`-vlag wordt afgeleid uit de uitkomst (is de bezorgdatum
vandaag?), niet uit de klok — anders zou de site op zondagochtend een aftelling
tonen naar een deadline die de bezorgdag toch niet vervroegt. Alle beloftes in de UI, SEO-teksten, e-mails, AI-prompts en
de vijf talen zijn meegegaan, en de vervoerder-badge in winkelwagen/footer toont
DHL in plaats van PostNL.

**Same-day als betaalde optie (gelijk aan de VDM-site):** de klant kiest in de
checkout voor bezorging vandaag tegen **€ 1,25** toeslag. Die toeslag zit in
het `shipping`-veld van de order (zodat de omzetoverzichten kloppen) en de
order draagt `delivery: { type, surcharge }` met type `same-day` /
`next-day` / `next-workday`. Het dashboard bepaalt daarmee of het DHL-label de
**SDD**-optie meekrijgt. Het type wordt **server-side** afgeleid uit de klok:
een client die buiten de cutoff `sameDay: true` meestuurt krijgt gewoon
`next-day`.

**Nog open aan de webshop-kant:**
- Vrijdag ná 09:00 levert `next-day` op, terwijl wij die zaterdagrit **zelf**
  rijden. Als het dashboard daar een DHL-label voor aanmaakt, klopt dat niet —
  afstemmen of daar een aparte behandeling voor nodig is.
- De same-day-eis "voorraad in Tilroy-vestiging **7827**" is bij ons impliciet:
  de webshopvoorraad is gedefinieerd als 7827 **+ 8934** (magazijn/webshop).
  Ligt een artikel alleen in 8934 en is dat fysiek niet Nijverdal, dan bieden we
  same-day aan waar het niet kan — bevestigen of 8934 op dezelfde locatie zit.
- Het officiële DHL-logo ontbreekt in `/public`; de badge is nu tekst.
  Zodra het bestand er is, kan `CarrierBadge` weer een `<img>` worden.
- `src/lib/postnl.ts` en de PostNL-labelknop in `/admin` bestaan nog naast de
  DHL-labelflow van het dashboard (`/api/dhl/label`). Zolang beide bestaan kan
  er per ongeluk een PostNL-label gemaakt worden — opruimen zodra het dashboard
  de labels definitief overneemt.
- Verzendtarieven in `src/lib/shipping.ts` zijn bewust ongewijzigd gebleven.

## Oude aankondiging (ter referentie)

Beide sites migreren van PostNL naar de **DHL API**, met nieuwe klokregels van
Kevin: besteld **vóór 10:00 → same-day**, **10:00–23:59 → next-day**. Raakt in
klusrsite: `src/lib/delivery.ts` (cutoff staat nu op 19:00),
`src/lib/shipping.ts` (PostNL-tarieven) en `src/lib/postnl.ts` (Send API +
labels). De label-flow verhuist als onderdeel van de beheer-migratie naar het
dashboard. Afspraak: **voorlopig niets wijzigen aan de verzendcode, en géén
nieuwe PostNL-features meer bouwen.**
