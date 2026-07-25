# KLUSR — Webshop

> **De beste VERF en alles wat je NÚ nodig hebt voor de klus.**

KLUSR is een nieuwe generatie verfspeciaalzaak + lichte bouwmarkt. Deze repo bevat
de volledige webshop: mobiel‑first, sterk conversiegericht en doordrenkt met AI‑hulp
(productadvies, content‑generatie en een klushulp‑chatbot).

Gebouwd met **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** en
**shadcn/ui**.

---

## ✨ Functionaliteit

### Pagina's
- **Homepage** – hero, klushulp‑funnel, verfcategorieën, populaire producten, Kluspas, acties, inspiratie
- **Categorie‑ & subcategoriepagina's** – met filters, sortering en SEO‑teksten
- **Product listing (PLP)** – filters als bottom‑sheet op mobiel, sidebar op desktop
- **Productdetail (PDP)** – galerij, varianten, kleurkiezer, voorraad per winkel, tabs (omschrijving/specificaties/reviews/FAQ/verwerking), "vaak samen gekocht", alternatieven, recent bekeken, AI‑productadvies, sticky add‑to‑cart op mobiel
- **Winkelwagen** – gratis‑verzending progressbar, Kluspas‑voordeel, "vaak vergeten", upsell, bewaar voor later
- **Checkout** – one‑page, Mollie‑betaalmethoden, orderoverzicht, trust badges
- **Bedankt** – orderbevestiging + tracking
- **Klushulp AI** – funnel, stappenplannen per klus, ingebedde chat
- **Kleurkiezer** – losse pagina + popup op verfproducten (kleur opgeslagen op cart line item)
- **Advies/inspiratie** – artikelen + detail
- **Winkels** – Nijverdal (flagship), Emmen, Zutphen, Apeldoorn, Deventer
- **Kluspas, Account, Favorieten, Bestelstatus, Klantenservice**
- **AI‑beheer dashboard** (`/admin`) – ontbrekende content signaleren, AI‑suggesties genereren, goed-/afkeuren, bulk genereren, SEO & FAQ

### Integraties
| Integratie | Gebruik | Demo‑modus zonder key |
| --- | --- | --- |
| **Channable / Tilroy** | _Optionele_ import-bron voor productdata + voorraad (`CATALOG_SOURCE`). Standaard UIT — de eigen snapshot is de master | Catalogus uit eigen snapshot, beheer via `/admin` |
| **Claude AI** (`@anthropic-ai/sdk`) | Productadvies, content‑generatie, klushulp‑chat | Heuristische fallback‑antwoorden |
| **Mollie** (`@mollie/api-client`) | Betalingen (iDEAL, Bancontact, Creditcard, Klarna) | Gesimuleerde betaling → bedanktpagina |
| **Mailchimp** (`@mailchimp/mailchimp_marketing`) | Nieuwsbrief, abandoned cart | No‑op (logt naar console) |
| **Resend** (REST API) | Transactionele e‑mail: bestelbevestiging + nieuwsbrief‑welkomstmail (gebrande KLUSR‑template) | No‑op (logt naar console) |
| **fal.ai** (FLUX, REST) | Sfeerbeelden (hero, categorie‑tegels, winkel) → `public/generated/` in de build | Branded gradient + categorie‑icoon als fallback |
| **Google Tag Manager** | E‑commerce tracking | dataLayer werkt lokaal voor debugging |

> De webshop draait **volledig zonder secrets** in demo‑modus, zodat je direct kunt ontwikkelen.

#### Catalogus-bron — eigen master (Tilroy-ontkoppeld)
- **Eigen master**: de gecommitte snapshot
  `src/lib/data/feed-products.generated.json` is de bron‑van‑waarheid voor de
  catalogus. De build haalt **standaard niets** bij Tilroy/Channable op —
  prijzen, eigen producten en voorraad beheer je in `/admin` (overlay‑laag +
  voorraad‑grootboek). De `tilroy-…`‑artikel‑ids blijven stabiel maar zijn puur
  historisch (zie `skuOf()` in `src/lib/data/products.ts`).
- **Optioneel (her)importeren** uit een externe bron via `CATALOG_SOURCE`
  (`scripts/feed-prebuild.mjs`, draait vóór `next build`): `channable` (publieke
  Google‑feed), `channable-api` (items‑API, vereist `CHANNABLE_*`) of `tilroy`
  (directe S3‑feeds). Los kan ook met `npm run feed:channable` /
  `npm run feed:tilroy`. Een import mag de deploy nooit breken: faalt 'ie, dan
  blijft de bestaande snapshot staan.
- **Orders**: webshop‑orders blijven in de eigen orderstore; Channable kent geen
  endpoint om ze in te schieten (`pushChannableOrder` is bewust een no‑op).
  Channable is wél de inbound‑route voor marketplace‑orders (bol/Amazon) en
  `pushShipment()` koppelt PostNL‑tracking terug.
- Endpoints/schema zijn volledig override‑baar via env
  (`CHANNABLE_ITEMS_URL` / `CHANNABLE_ORDERS_URL`) voor account‑specifieke paden.

### Conversie & marketing
Gratis‑verzending progressbar · Kluspasprijzen · schaarste ("Nog 4 op voorraad in
Nijverdal") · urgentie ("Voor 19:00 besteld, morgen in huis") · social proof
(reviews) · cross‑sell ("vaak samen gekocht") · upsell (voordeliger per liter) ·
exit‑intent popup (5% korting) · nieuwsbrief · recent bekeken · sticky add‑to‑cart ·
trust badges · bundels.

---

## 🚀 Aan de slag

```bash
npm install
cp .env.example .env.local   # optioneel — vul keys in voor live integraties
npm run dev                  # http://localhost:3000
```

### Scripts
- `npm run dev` – ontwikkelserver
- `npm run build` – productie‑build
- `npm run start` – productieserver
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript check

### Environment variables
Zie [`.env.example`](./.env.example). Alle keys zijn optioneel; ontbrekende keys
activeren de demo‑modus per integratie.

---

## 🎨 Design

| Token | Hex | Tailwind |
| --- | --- | --- |
| KLUSR rood | `#C90000` | `bg-primary` / `text-primary` |
| Donkerrood | `#990000` | `klusr-red-dark` |
| Zwart/donker | `#101010` | `klusr-black` |
| Achtergrond | `#F7F7F7` | `bg-background` |
| Cards | `#FFFFFF` | `bg-card` |
| Border | `#E5E5E5` | `border-border` |
| Voorraad groen | `#16A34A` | `klusr-stock` |
| Actiegeel | `#FFC400` | `klusr-action` |

Mobiel is leidend: het ontwerp schaalt van mobiel naar desktop, met een sticky
bottom‑bar (Home / Zoeken / Klushulp / Favorieten / Winkelwagen) op mobiel.

---

## 🏗️ Architectuur

```
src/
├─ app/                 # App Router pagina's + API routes
│  ├─ api/              # ai/chat, ai/product-advice, ai/generate-content,
│  │                    # checkout/create-payment, checkout/webhook, newsletter
│  ├─ categorie/ product/ winkelwagen/ checkout/ bedankt/ ...
├─ components/
│  ├─ ui/               # shadcn/ui primitives
│  ├─ layout/ home/ product/ cart/ checkout/ color/ ai/ content/ account/ admin/ plp/
├─ lib/
│  ├─ data/             # mock catalogus (producten, categorieën, winkels, kleuren, artikelen)
│  ├─ store/            # Zustand: cart, favorites, ui, orders
│  ├─ ai/               # Claude client (met fallback)
│  ├─ payments.ts mailchimp.ts tracking.ts utils.ts
└─ types/               # domeinmodellen (Product, Category, CartItem, Order, ...)
```

### Tracking
Eén centrale helper: `trackEvent(eventName, payload)` (`src/lib/tracking.ts`) pusht
GA4‑e‑commerce events naar de GTM `dataLayer` (`view_item`, `add_to_cart`,
`begin_checkout`, `purchase`, `color_selected`, `klusadvies_started`, enz.).

### Betaalflow
`POST /api/checkout/create-payment` maakt een order + Mollie‑betaling →
redirect naar Mollie (of bedanktpagina in demo) → `POST /api/checkout/webhook`
verwerkt de status. Orders worden in‑memory bewaard (vervang door een database
voor productie).

### SEO, indexering & feeds
- **Indexeerbaar**: `app/robots.ts` (sitemap + `host`), `app/sitemap.ts` (home,
  categorieën, ~alle producten, blog, winkels, klushulp) en `robots: index/follow`
  + `googleBot` snippet‑directives in de root‑metadata. Canonicals staan per
  template (product/categorie/legal).
- **Google Search Console**: zet `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (token uit
  de HTML‑tag‑methode) → Next rendert de verificatie‑meta. Dien daarna
  `/sitemap.xml` in.
- **Google Merchant Center**: `/google-merchant.xml` is een RSS‑productfeed
  (g:‑namespace) uit de live catalogus — één item per variant, met de
  **KLUSRPAS‑prijs** (ledenprijs). Gebruik 'm als geplande ophaal‑URL in Merchant
  Center. Tip: voeg later GTIN's toe voor betere matching.

### AI‑governance
AI mag **alleen suggesties** doen. Gevoelige velden (prijs, voorraad,
betaalinformatie) worden nooit automatisch aangepast — content gaat via het
`/admin` dashboard eerst langs goedkeuring.

---

## 📦 Productdata
De catalogus (~600 producten over 8 categorieën) staat als **eigen master** in
`src/lib/data/feed-products.generated.json` en wordt in `/admin` beheerd
(prijzen/eigen producten via de overlay, voorraad via het grootboek). De build
verandert 'm niet — Tilroy/Channable zijn losgekoppeld.

Eenmalig (her)importeren uit een externe bron kan expliciet:

```bash
npm run feed:channable   # import — productdata + voorraad uit de Channable-feed
npm run feed:tilroy      # import — directe Tilroy Google-feed + stock-CSV
```

Varianten worden gegroepeerd per `item_group_id`, de bron‑taxonomie wordt op de
KLUSR‑categorieën gemapt en voorraad komt per winkel uit de snapshot. Winkels,
kleurcollecties en adviesartikelen staan als verzorgde dataset in `src/lib/data`.
Client‑componenten halen losse productkaarten op via `/api/products` zodat de
volledige catalogus niet in de browser‑bundle belandt.

## 🎨 Kleurkiezer & basislogica
Gemengde verf volgt het mengsysteem (`src/lib/paint-bases.ts`): de gekozen kleur
bepaalt de **tinting‑basis** — lichte kleuren → *Basis Wit*, donkere kleuren →
*Basis Deep*. De basis beïnvloedt de **prijs** (deep = duurder, meer pigment) én
de **voorraad** (elke basis is een eigen blik). Kleur, basis, prijs en voorraad
worden getoond op de productpagina en bewaard op het cart line item (en
meegestuurd naar Channable/Tilroy).
