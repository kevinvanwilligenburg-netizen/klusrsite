# Tilroy eruit — cutover-draaiboek

Doel: KLUSR volledig onafhankelijk maken van Tilroy. Tilroy was de bovenliggende
bron-van-waarheid; we verschuiven dat eigenaarschap stap voor stap naar onze
eigen laag (catalogus-snapshot + overlay + voorraad-grootboek + POS).

## Stap 1 — Catalogus & voorraad in eigen beheer ✅ (deze stap)

De gecommitte snapshot `src/lib/data/feed-products.generated.json` is nu de
**eigen master**. De build haalt standaard **niets** meer bij Tilroy/Channable.

- `scripts/feed-prebuild.mjs`: importeert alleen nog op expliciete
  `CATALOG_SOURCE` (`channable` / `channable-api` / `tilroy`). Default = `owned`.
- Prijzen + eigen producten → overlay (`/admin`, KV → `*-overrides.generated.json`).
- Voorraad → het gedeelde grootboek (`src/lib/store/stock-ledger.ts`): de
  snapshot-stand is de **openingsbalans**, elke web-/kassaverkoop en correctie
  boekt eroverheen.
- Id-schema bron-agnostisch gemaakt via `skuOf()`; `tilroy-…`-ids blijven stabiel
  (orders/overlays/slugs verwijzen ernaar) maar zijn puur historisch.

**Resteert in deze stap (afronding):**
- [x] **Productmaster-editor** in `/admin` — titel, merk, categorie, subcategorie,
      EAN, afbeeldingen, USP's en omschrijving van álle (ook geïmporteerde)
      producten zijn nu bewerkbaar via de overlay (potlood in de catalogus-lijst),
      met "herstel naar bron". De `tilroy-…`-ids blijven de stabiele sleutel.
- [x] **Telling (stocktake)** in `/admin` → Voorraad: tel de fysieke voorraad per
      variant, het verschil met het grootboek wordt vastgelegd (kind "count"). De
      getelde stand is daarmee de waarheid i.p.v. de uit de feed gesynthetiseerde
      stand; web- en kassaverkopen tellen er overheen. De admin-voorraadlijst toont
      nu de live grootboekstand (met de feed-stand als referentie).
- [ ] **Per-vestiging** tellen/voorraad — vergt een per-winkel grootboek (nu is de
      stand één gedeelde pool per variant; de telling zet de totale live-stand).
- [ ] **Storefront-availability** op het grootboek i.p.v. de feed-stand: de
      webshop is statisch/ISR en leest nu de feed-basis; live-stand erin wringen
      vergt een client-side live-stockfetch of een stock-overlay bij publiceren.
- [ ] Zichtbaarheid (uit de schappen halen / weer tonen) in de productmaster-editor.
- [ ] **Foto-hosting** verzelfstandigen: beelden staan nu op
      `channableusercontent`/S3 (Tilroy-keten) → naar eigen CDN/opslag.

## Stap 2 — Financiële afsluiting (Tilroy-functie, ontbreekt nog)

- [ ] Dagafsluiting / Z-rapport per kassa (contant + pin tellen, kasverschil).
- [ ] BTW-overzicht (hoog/laag/0) over web + kassa.
- [ ] Export naar boekhouding (Exact Online / Twinfield / e-Boekhouden).

## Stap 3 — OMS: facturen & retouren (deels Tilroy)

- [ ] Factuur/creditnota genereren (PDF) — nu alleen pakbon + PostNL-label.
- [ ] Retouren/RMA-flow met voorraad-terugboeking op het grootboek.

## Stap 4 — Channable behouden, van eigen data voorzien

Channable ≠ Tilroy en kan blijven voor marktplaatsen (bol/Amazon).
- [ ] Onze catalogus + grootboek-voorraad naar Channable pushen i.p.v. Tilroy's.
- [ ] Marketplace-orders (`fetchChannableOrders`) → eigen orderstore/fulfilment.

## Stap 5 — In-store & multi-store

- [ ] In-winkel klant-/spaarhistorie (KLUSRPAS/ProfPas) migreren uit Tilroy.
- [ ] POS uitrollen op alle 5 vestigingen (terminals, lade, offline-gedrag).
- [ ] Schaplabels/ESL + barcodebeheer.

---

### Terugdraaien / opnieuw importeren
Eén deploy met `CATALOG_SOURCE=channable` (of `tilroy`) ververst de snapshot weer
uit de externe bron; los kan met `npm run feed:channable` / `npm run feed:tilroy`.
De eigen overlay en het grootboek blijven daarbij intact.
