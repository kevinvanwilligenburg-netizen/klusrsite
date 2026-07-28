import type { Locale } from "./config";
import plOverlay from "./messages.pl.json";

/**
 * Getypeerde berichtencatalogus voor de GLOBALE CHROME (topbar, footer, header).
 *
 * STADIUM 1: bewust alléén de globale chrome. Alle pagina-inhoud, product-/
 * categoriedata en losse contentpagina's blijven (voorlopig) hardcoded NL en
 * komen in een later stadium aan bod.
 *
 * Nederlands is de bron van waarheid. De NL-waarden hieronder zijn byte-identiek
 * aan de huidige hardcoded teksten in de componenten, zodat de site met de
 * feature-flag UIT exact hetzelfde rendert als nu.
 */
export type Messages = {
  // Top-USP-balk
  "usp.advice": string;
  "usp.quality": string;
  "usp.everything": string;
  "usp.delivery": string;

  // Header / site-brede labels
  "nav.customerService": string;
  "nav.cart": string;
  "nav.cartAria": string; // {count}
  "search.placeholder": string;

  // Footer — nieuwsbrief
  "footer.newsletter.title": string;
  "footer.newsletter.text": string;

  // Footer — merk-tagline
  "footer.tagline": string;

  // Footer — kolomtitels
  "footer.col.assortment": string;
  "footer.col.customerService": string;
  "footer.col.about": string;

  // Footer — klantenservice-links
  "footer.service.customerService": string;
  "footer.service.faq": string;
  "footer.service.orderStatus": string;
  "footer.service.shippingReturns": string;
  "footer.service.returnPolicy": string;
  "footer.service.securePayment": string;
  "footer.service.warranty": string;

  // Footer — over-KLUSR-links
  "footer.about.aboutKlusr": string;
  "footer.about.kluspas": string;
  "footer.about.business": string;
  "footer.about.mixPaint": string;
  "footer.about.colors": string;
  "footer.about.advice": string;
  "footer.about.klushulp": string;
  "footer.about.careers": string;

  // Footer — onderbalk
  "footer.bottom.copyright": string; // {year}
  "footer.bottom.terms": string;
  "footer.bottom.returnPolicy": string;
  "footer.bottom.privacy": string;
  "footer.bottom.cookies": string;
  "footer.bottom.accessibility": string;
  "footer.bottom.securePaymentVia": string;
  "footer.trust.payTitle": string;
  "footer.trust.shipTitle": string;

  // Taalschakelaar & voorstel-banner
  "lang.label": string;
  "lang.continueIn": string; // {language}
  "lang.dismiss": string;

  // ── Homepage ──────────────────────────────────────────────────────────────
  // Hero
  "home.hero.badge": string;
  "home.hero.titleLead": string; // "De beste " (vóór VERF)
  "home.hero.titlePaint": string; // "VERF" (gekleurd accentwoord)
  "home.hero.titleMid": string; // " en alles wat je " (tussen VERF en NÚ)
  "home.hero.titleNow": string; // "NÚ" (gekleurd accentwoord)
  "home.hero.titleTail": string; // " nodig hebt voor de klus!" (na NÚ)
  "home.hero.subtitle": string;
  "home.hero.cta": string;
  "home.hero.klushulp": string;

  // Hero AI-kaart
  "home.heroAi.chip": string;
  "home.heroAi.title": string;
  "home.heroAi.text": string;
  "home.heroAi.placeholder": string;
  "home.heroAi.inputAria": string;
  "home.heroAi.submitAria": string;
  "home.heroAi.example.bedroom": string;
  "home.heroAi.example.liters": string;
  "home.heroAi.example.primer": string;

  // Klushulp-funnel
  "home.funnel.title": string;
  "home.funnel.subtitle": string;

  // Verf-categorieën
  "home.verf.title": string;
  "home.verf.subtitle": string;

  // Populaire producten
  "home.popular.title": string;
  "home.popular.subtitle": string;
  "home.popular.link": string;

  // Acties
  "home.acties.title": string;
  "home.acties.subtitle": string;

  // KLUSRPAS-banner
  "home.kluspas.badge": string;
  "home.kluspas.title": string;
  "home.kluspas.text": string;
  "home.kluspas.cta": string;
  "home.kluspas.benefit1": string;
  "home.kluspas.benefit2": string;
  "home.kluspas.benefit3": string;
  "home.kluspas.benefit4": string;

  // Inspiratie
  "home.inspiration.title": string;
  "home.inspiration.subtitle": string;

  // Categorie-tegels
  "home.categories.title": string;
  "home.categories.subtitle": string;

  // Trending
  "home.trending.link": string;

  // Voor jou
  "home.forYou.title": string;
  "home.forYou.subtitle": string;
  "home.viewed.title": string;
  "home.viewed.subtitle": string;

  // ── Winkelwagen ───────────────────────────────────────────────────────────
  "cart.title": string;
  "cart.loading": string;
  "cart.empty.title": string;
  "cart.empty.drawerText": string;
  "cart.empty.viewText": string;
  "cart.empty.startPaint": string;
  "cart.empty.viewPaint": string;
  "cart.empty.klushulp": string;

  // Vrije-verzending-balk
  "cart.freeShipping.reachedPre": string;
  "cart.freeShipping.reachedBold": string;
  "cart.freeShipping.reachedPost": string;
  "cart.freeShipping.remainingPre": string;
  "cart.freeShipping.remainingPost": string;

  // Item-acties
  "cart.item.remove": string;
  "cart.item.save": string;
  "cart.item.removeLabel": string;
  "cart.item.add": string;
  "cart.forgotten": string;
  "cart.moveToCart": string;
  "cart.savedForLater": string; // {count}

  // Overzicht / totalen
  "cart.summary.title": string;
  "cart.kluspasDiscount": string;
  "cart.kluspas.nudge": string; // {amount} — login-nudge voor gasten
  "cart.profpasDiscount": string;
  "cart.subtotal": string;
  "cart.exclVat": string; // " (excl. btw)" — achtervoegsel
  "cart.shipping": string;
  "cart.free": string;
  "cart.vat": string;
  "cart.total": string;
  "cart.vatIncluded": string;
  "cart.vatIncludedBusiness": string;
  "cart.checkout": string;
  "cart.continueShopping": string;
  "cart.toCart": string;

  // USP's in het overzicht
  "cart.usp.returns": string;
  "cart.usp.payment": string;

  // Upsell
  "cart.upsell.title": string;
  "cart.upsell.subtitle": string;

  // ── Afrekenen (checkout) ──────────────────────────────────────────────────
  "checkout.title": string;
  "checkout.backToCart": string;
  "checkout.empty.text": string;
  "checkout.empty.toRange": string;

  // Particulier / zakelijk
  "checkout.private": string;
  "checkout.business": string;

  // Nabestel-/gratis-verzending-melding
  "checkout.reorderFree": string;

  // Account-funnel
  "checkout.loggedInPre": string; // vóór het e-mailadres
  "checkout.loggedInPost": string; // ná het e-mailadres
  "checkout.guest.title": string;
  "checkout.guest.text": string;
  "checkout.guest.haveAccount": string;
  "checkout.login.emailPlaceholder": string;
  "checkout.login.passwordPlaceholder": string;
  "checkout.login.submit": string;
  "checkout.login.error": string;
  "checkout.login.forgotPre": string; // vóór de inloglink
  "checkout.login.forgotLink": string;

  // Stap-koppen
  "checkout.section.contact": string;
  "checkout.section.delivery": string;
  "checkout.section.shipping": string;
  "checkout.section.payment": string;

  // Contactgegevens
  "checkout.field.email": string;
  "checkout.field.emailPlaceholder": string;
  "checkout.createAccount.labelBold": string;
  "checkout.createAccount.labelRest": string;
  "checkout.createAccount.optional": string;
  "checkout.createAccount.passwordPlaceholder": string;
  "checkout.createAccount.passwordHint": string;
  "checkout.field.company": string;
  "checkout.field.companyPlaceholder": string;
  "checkout.field.coc": string;
  "checkout.field.vat": string;

  // Bezorgadres
  "checkout.field.country": string;
  "checkout.country.outsideNote": string;
  "checkout.field.firstName": string;
  "checkout.field.lastName": string;
  "checkout.field.postalCode": string;
  "checkout.field.houseNumber": string;
  "checkout.field.addition": string;
  "checkout.field.street": string;
  "checkout.field.streetLookup": string;
  "checkout.field.autofill": string;
  "checkout.field.city": string;
  "checkout.field.phone": string;
  "checkout.billing.toggle": string;
  "checkout.billing.companyOptional": string;
  "checkout.billing.streetAndNumber": string;
  "checkout.billing.streetPlaceholder": string;

  // Verzendmethode
  "checkout.delivery.title": string;

  // Overzicht
  "checkout.summary.title": string;
  "checkout.billieSurcharge": string;
  "checkout.terms.pre": string; // "Ik ga akkoord met de "
  "checkout.terms.termsLink": string;
  "checkout.terms.mid": string; // " en het "
  "checkout.terms.privacyLink": string;
  "checkout.terms.post": string; // "."
  "checkout.newsletter": string;
  "checkout.pay": string; // {amount}
  "checkout.chooseBankHint": string;
  "checkout.choosePaymentHint": string;
  "checkout.usp.freeReturn": string;
  "checkout.usp.fastDelivery": string;

  // Vertrouwen / klantbeoordelingen (trust-panel op de checkout)
  "checkout.trust.heading": string;
  "checkout.trust.based": string; // {average} {count}
  "checkout.trust.verified": string;

  // Validatie / fouten (binnen de component bereikbaar)
  "checkout.error.choosePayment": string;
  "checkout.error.chooseBank": string;
  "checkout.error.accountPassword": string;
  "checkout.error.card": string;
  "checkout.error.paymentFailed": string;
  "checkout.error.generic": string;

  // Betaalmethoden (zichtbare labels)
  "checkout.payment.chooseBank": string;
  "checkout.payment.hint.ideal": string;
  "checkout.payment.hint.creditcard": string;
  "checkout.payment.hint.klarna": string;
  "checkout.payment.hint.bancontact": string;

  // Reorder-upsell ("Iets vergeten?")
  "checkout.reorder.title": string;
  "checkout.reorder.textPre": string; // "Bestel binnen "
  "checkout.reorder.textMinutes": string; // "15 minuten"
  "checkout.reorder.textMid": string; // " nog iets en betaal "
  "checkout.reorder.textBold": string; // "geen extra verzendkosten"
  "checkout.reorder.textPost": string; // " — we sturen het in één pakket."
  "checkout.reorder.added": string;
  "checkout.reorder.addAria": string; // {title}
  "checkout.reorder.toCart": string;
  "checkout.reorder.continueShopping": string;

  // Bedankpagina
  "checkout.thanks.title": string;
  "checkout.thanks.text": string;
  "checkout.thanks.confirmationSentPre": string; // " Een bevestiging is verstuurd naar "
  "checkout.thanks.confirmationSentPost": string; // "."
  "checkout.thanks.orderNumber": string;
  "checkout.thanks.orderDate": string;
  "checkout.thanks.subtotal": string;
  "checkout.thanks.shipping": string;
  "checkout.thanks.totalPaid": string;
  "checkout.thanks.free": string;
  "checkout.thanks.expectedDelivery": string; // {date}
  "checkout.thanks.step.confirmation.title": string;
  "checkout.thanks.step.confirmation.hint": string;
  "checkout.thanks.step.packing.title": string;
  "checkout.thanks.step.packing.hint": string;
  "checkout.thanks.step.onTheWay.title": string;
  "checkout.thanks.step.onTheWay.hint": string;
  "checkout.thanks.trackOrder": string;
  "checkout.thanks.continueShopping": string;
  "checkout.thanks.downloadInvoice": string;
  "checkout.thanks.deliveryAddress": string;
  "checkout.thanks.loadError": string;
  "checkout.thanks.backHome": string;
  // Bedankpagina — statusafhankelijke koppen (succes / verwerken / mislukt)
  "checkout.thanks.successBadge": string; // klein label boven de titel bij betaald
  "checkout.thanks.orderSummary": string; // koptitel boven de orderkaart
  "checkout.thanks.needHelp.title": string; // trust-blok: hulp nodig?
  "checkout.thanks.needHelp.text": string;
  "checkout.thanks.needHelp.cta": string;
  // ── Bedankpagina — betaling in verwerking (open/pending) ───────────────────
  "checkout.pending.title": string;
  "checkout.pending.text": string;
  "checkout.pending.hint": string;
  "checkout.pending.refreshNow": string;
  "checkout.pending.backHome": string;
  // ── Bedankpagina — betaling niet gelukt (failed/canceled/expired) ──────────
  "checkout.failed.title": string; // mislukt
  "checkout.failed.canceledTitle": string; // geannuleerd
  "checkout.failed.expiredTitle": string; // verlopen
  "checkout.failed.text": string;
  "checkout.failed.cartKept": string; // "je winkelwagen is bewaard gebleven"
  "checkout.failed.retry": string; // CTA → checkout
  "checkout.failed.toCart": string; // CTA → winkelwagen
  "checkout.failed.help": string; // link → klantenservice
  "checkout.failed.orderRef": string; // {ref}

  // ── Checkout — validatie (zod-schema, binnen de component) ─────────────────
  "checkout.validation.required": string;
  "checkout.validation.email": string;
  "checkout.validation.postalCode": string;
  "checkout.validation.street": string;
  "checkout.validation.terms": string;
  "checkout.validation.postalCodeNl": string; // ook placeholder "Bijv. 7443 BR"
  "checkout.validation.coc": string;
  "checkout.validation.vat": string;

  // ── Klantenservice ────────────────────────────────────────────────────────
  "service.hero.kicker": string;
  "service.hero.title": string;
  "service.hero.subtitle": string;

  // Trust-balk
  "service.trust.delivery": string;
  "service.trust.returns": string;
  "service.trust.payment": string;
  "service.trust.advice": string;
  "service.trust.warranty": string;

  // Snelle contactkaarten
  "service.contact.call.title": string;
  "service.contact.call.description": string;
  "service.contact.mail.title": string;
  "service.contact.mail.description": string;
  "service.contact.store.title": string;
  "service.contact.store.description": string;
  "service.contact.store.action": string;
  "service.contact.ai.title": string;
  "service.contact.ai.description": string;
  "service.contact.ai.action": string;

  // Verzendkosten-tabel
  "service.shipping.title": string;
  "service.shipping.subtitle": string; // {amount}
  "service.shipping.rowNl": string;
  "service.shipping.freeFrom": string; // {amount}
  "service.shipping.mailbox": string;
  "service.shipping.mailboxHint": string;
  "service.shipping.rowBe": string;
  "service.shipping.outsideNote": string;

  // FAQ-groepen (intro's)
  "service.group.shipping.title": string;
  "service.group.shipping.intro": string; // {free} {eu}
  "service.group.payment.title": string;
  "service.group.payment.intro": string;
  "service.group.warranty.title": string;
  "service.group.warranty.intro": string;
  "service.group.mengverf.title": string;
  "service.group.mengverf.intro": string;
  "service.group.kluspas.title": string;
  "service.group.kluspas.intro": string;

  // FAQ — verzending & retour
  "service.faq.shipping.when.q": string;
  "service.faq.shipping.when.a": string;
  "service.faq.shipping.cost.q": string;
  "service.faq.shipping.cost.a": string; // {nlFree} {nlPrice} {bePrice} {mailbox} {eu}
  "service.faq.shipping.abroad.q": string;
  "service.faq.shipping.abroad.a": string; // {beFree} {eu}
  "service.faq.shipping.return.q": string;
  "service.faq.shipping.return.a": string;

  // FAQ — betalen
  "service.faq.payment.methods.q": string;
  "service.faq.payment.methods.a": string;
  "service.faq.payment.afterwards.q": string;
  "service.faq.payment.afterwards.a": string;
  "service.faq.payment.safe.q": string;
  "service.faq.payment.safe.a": string;

  // FAQ — garantie
  "service.faq.warranty.products.q": string;
  "service.faq.warranty.products.a": string;
  "service.faq.warranty.damaged.q": string;
  "service.faq.warranty.damaged.a": string;
  "service.faq.warranty.store.q": string;
  "service.faq.warranty.store.a": string;

  // FAQ — mengverf
  "service.faq.mengverf.return.q": string;
  "service.faq.mengverf.return.a": string;
  "service.faq.mengverf.match.q": string;
  "service.faq.mengverf.match.a": string;
  "service.faq.mengverf.amount.q": string;
  "service.faq.mengverf.amount.a": string;
  "service.faq.mengverf.instore.q": string;
  "service.faq.mengverf.instore.a": string;

  // FAQ — KLUSRPAS & zakelijk
  "service.faq.kluspas.what.q": string;
  "service.faq.kluspas.what.a": string;
  "service.faq.kluspas.business.q": string;
  "service.faq.kluspas.business.a": string;
  "service.faq.kluspas.invoice.q": string;
  "service.faq.kluspas.invoice.a": string;

  // FAQ — bestellen & account (general)
  "service.general.title": string;
  "service.faq.general.order.q": string;
  "service.faq.general.order.a": string;
  "service.faq.general.account.q": string;
  "service.faq.general.account.a": string;
  "service.faq.general.mix.q": string;
  "service.faq.general.mix.a": string;

  // Niet goed = geld terug
  "service.guarantee.title": string;
  "service.guarantee.text": string;
  "service.guarantee.cta": string;

  // Contactblok
  "service.contactBlock.title": string;
  "service.contactBlock.text": string;
  "service.contactBlock.preferPre": string;
  "service.contactBlock.preferLink": string;
  "service.contactBlock.preferPost": string;
  "service.contactBlock.viewStorePage": string;

  // ── FAQ-pagina ────────────────────────────────────────────────────────────
  "faq.meta.breadcrumb": string;
  "faq.badge": string;
  "faq.title": string;
  "faq.subtitle": string;
  "faq.more.title": string;
  "faq.more.text": string;
  "faq.more.cta": string;

  // FAQ-groepstitels
  "faq.group.ordering": string;
  "faq.group.delivery": string;
  "faq.group.mengverf": string;
  "faq.group.kluspas": string;

  // Bestellen & betalen
  "faq.order.how.q": string;
  "faq.order.how.a": string;
  "faq.order.payment.q": string;
  "faq.order.payment.a": string;
  "faq.order.account.q": string;
  "faq.order.account.a": string;
  "faq.order.account.text": string;

  // Levering & retour
  "faq.delivery.when.q": string;
  "faq.delivery.when.a": string;
  "faq.delivery.pickup.q": string;
  "faq.delivery.pickup.aPre": string;
  "faq.delivery.pickup.aLink": string;
  "faq.delivery.pickup.aPost": string;
  "faq.delivery.pickup.text": string;
  "faq.delivery.return.q": string;
  "faq.delivery.return.aPre": string;
  "faq.delivery.return.aLink": string;
  "faq.delivery.return.aMid": string;
  "faq.delivery.return.aTermsLink": string;
  "faq.delivery.return.aPost": string;
  "faq.delivery.return.text": string;

  // Mengverf & kleur
  "faq.mengverf.any.q": string;
  "faq.mengverf.any.aPre": string;
  "faq.mengverf.any.aLink": string;
  "faq.mengverf.any.aPost": string;
  "faq.mengverf.any.text": string;
  "faq.mengverf.how.q": string;
  "faq.mengverf.how.aPre": string;
  "faq.mengverf.how.aLink": string;
  "faq.mengverf.how.aPost": string;
  "faq.mengverf.how.text": string;
  "faq.mengverf.exchange.q": string;
  "faq.mengverf.exchange.a": string;

  // KLUSRPAS
  "faq.kluspas.what.q": string;
  "faq.kluspas.what.aPre": string;
  "faq.kluspas.what.aLink": string;
  "faq.kluspas.what.aPost": string;
  "faq.kluspas.what.text": string;
  "faq.kluspas.cost.q": string;
  "faq.kluspas.cost.a": string;

  // ── Over KLUSR ────────────────────────────────────────────────────────────
  "about.breadcrumb": string;
  "about.hero.kicker": string;
  "about.hero.titleLead": string; // vóór "nú"
  "about.hero.titleAccent": string; // "nú"
  "about.hero.titleTail": string; // na "nú"
  "about.hero.intro": string;

  "about.value.advice.title": string;
  "about.value.advice.body": string;
  "about.value.color.title": string;
  "about.value.color.body": string;
  "about.value.quality.title": string;
  "about.value.quality.body": string;

  "about.story.title": string;
  "about.story.p1": string;
  "about.story.p2": string;

  "about.stores.title": string;
  "about.stores.all": string;

  "about.cta.title": string;
  "about.cta.text": string;
  "about.cta.button": string;

  // ── 404 / niet gevonden ───────────────────────────────────────────────────
  "notFound.code": string;
  "notFound.title": string;
  "notFound.text": string;
  "notFound.searchPlaceholder": string;
  "notFound.searchSubmit": string;
  "notFound.searchAria": string;
  "notFound.popular": string;
  "notFound.popular.paint": string;
  "notFound.popular.colorPicker": string;
  "notFound.popular.tools": string;
  "notFound.popular.advice": string;
  "notFound.toHome": string;
  "notFound.customerService": string;

  // ── Productoverzicht (PLP) ────────────────────────────────────────────────
  "plp.filters": string;
  "plp.clearFilters": string;
  "plp.clearFiltersCount": string; // {count}
  "plp.clearAll": string;
  "plp.resultCount": string; // zelfstandig naamwoord; aantal staat in een aparte <span>
  "plp.resultCountOne": string;
  "plp.show": string; // {count}
  "plp.showOne": string; // {count}
  "plp.sortAria": string;
  "plp.sort.populair": string;
  "plp.sort.priceAsc": string;
  "plp.sort.priceDesc": string;
  "plp.sort.rating": string;
  "plp.sort.newest": string;

  // PLP — filtergroep-titels (statisch)
  "plp.group.mengverf": string;
  "plp.group.productType": string;
  "plp.group.price": string;
  "plp.group.volume": string;
  "plp.group.rating": string;
  "plp.group.dealsLabels": string;
  "plp.group.brand": string;

  // PLP — attribuut-facet-titels (statisch)
  "plp.facet.glans": string;
  "plp.facet.materiaal": string;
  "plp.facet.fitting": string;
  "plp.facet.dessin": string;
  "plp.facet.toepassing": string;
  "plp.facet.korrel": string;
  "plp.facet.lichtkleur": string;
  "plp.facet.type": string;

  // PLP — prijsbuckets (statisch; € blijft)
  "plp.priceBucket.lt25": string;
  "plp.priceBucket.mid": string;
  "plp.priceBucket.high": string;
  "plp.priceBucket.top": string;

  // PLP — beoordeling-facet + chip
  "plp.rating.min4": string;
  "plp.rating.min45": string;
  "plp.ratingChip": string; // {rating}

  // PLP — badge-filterlabels (UI-chrome, geen productdata)
  "plp.badge.actie": string;
  "plp.badge.bestseller": string;
  "plp.badge.proKeuze": string;
  "plp.badge.nieuw": string;
  "plp.badge.bundel": string;

  "plp.colorMixable": string;
  "plp.viewAria": string;
  "plp.viewGrid": string;
  "plp.viewList": string;
  "plp.empty.title": string;
  "plp.empty.text": string;
  "plp.favorite": string;

  // ── AI-productzoeker ──────────────────────────────────────────────────────
  "finder.title": string;
  "finder.subtitle": string;
  "finder.placeholder": string;
  "finder.inputAria": string;
  "finder.submit": string;
  "finder.submitShort": string;
  "finder.applied": string;
  "finder.none": string;
  "finder.error": string;

  // ── Productdetail (PDP) ───────────────────────────────────────────────────
  "pdp.addToCart": string;
  "pdp.buyNow": string;
  "pdp.reviewsLink": string; // {rating} {count}
  "pdp.sizeLabel": string;
  "pdp.color": string;
  "pdp.chooseColor": string;
  "pdp.changeColor": string;
  "pdp.anyColor": string;
  "pdp.mixed.pre": string;
  "pdp.mixed.bold": string;
  "pdp.mixed.inBase": string; // {base}
  "pdp.mixed.post": string;
  "pdp.chooseColorTitle": string;
  "pdp.chooseColorBuy": string;
  "pdp.chooseColorAdd": string;
  "pdp.addedToCart": string;
  "pdp.favAdded": string;
  "pdp.favRemoved": string;
  "pdp.favSave": string;
  "pdp.favSaved": string;
  "pdp.kluspasPrice": string;
  "pdp.profpasPrice": string;
  "pdp.normalPrice": string;
  "pdp.withoutAccount": string;
  "pdp.kluspas.title": string;
  "pdp.kluspas.body": string;
  "pdp.kluspas.link": string;
  "pdp.kluspas.drawer.intro": string;
  "pdp.kluspas.drawer.benefit1": string;
  "pdp.kluspas.drawer.benefit2": string;
  "pdp.kluspas.drawer.benefit3": string;
  "pdp.kluspas.drawer.benefit4": string;
  "pdp.kluspas.drawer.how": string;
  "pdp.kluspas.drawer.cta": string;
  "pdp.kluspas.drawer.more": string;
  // KLUSRPAS-teaser voor gasten (de pasprijs is een ingelogd voordeel).
  "pdp.kluspas.teaserTitle": string; // {price}
  "pdp.kluspas.teaserCta": string;
  "pdp.kluspas.teaserSave": string; // {amount}, {pct}
  "pdp.surcharge": string; // {base} {amount}
  "pdp.perLiter": string; // {price}
  "pdp.discountBadge": string; // {pct}
  "pdp.withPass": string; // {pass}
  "pdp.passExplain": string; // {pct} {pass}
  // Ingelogd (pasprijs toegepast): "jouw prijs"-framing i.p.v. de marketingpitch.
  "pdp.yourPrice": string;
  "pdp.yourPassPrice": string; // {pass}
  "pdp.passApplied": string; // {pass}, {pct}
  "pdp.perLiterCheaper": string;
  "pdp.stockForBasePre": string;
  "pdp.stockForBasePost": string;

  // PDP — USP's in de buybox
  "pdp.usp.freeShipping": string;
  "pdp.usp.returns": string;
  "pdp.usp.afterpay": string;

  // PDP — tabbladen + secties
  "pdp.tab.description": string;
  "pdp.tab.specs": string;
  "pdp.tab.reviews": string;
  "pdp.tab.processing": string;
  "pdp.reviews.basedOnPre": string;
  "pdp.reviews.basedOnPost": string;
  "pdp.reviews.verified": string;
  "pdp.reviews.none": string;
  "pdp.reviews.empty": string;
  "pdp.reviews.beFirst": string;
  /** Korte "nog geen reviews"-status naast sterren (cards, lijst, PDP). */
  "rating.none": string;
  "pdp.processing.title": string;

  // ── Prijsblok (price.tsx + buybox) ────────────────────────────────────────
  "price.advies": string; // map van pricing.ts "Adviesprijs"
  "price.normal": string; // map van pricing.ts "Normaal"
  "price.inclVat": string; // map van pricing.ts "incl. btw"
  "price.exclVat": string; // map van pricing.ts "excl. btw"
  "price.from": string;
  "price.save": string; // {amount}
  "price.savePct": string; // {pct}
  "price.vsAdvies": string;
  "price.vsAccount": string;

  // ── Proactieve chat-teaser (ai-assistant-widget.tsx) ─────────────────────
  "chat.teaser.product": string;
  "chat.teaser.category": string;
  "chat.teaser.cart": string;
  "chat.teaser.general": string;
  "chat.teaser.cta": string;
  "chat.teaser.openAria": string;
  "chat.teaser.dismissAria": string;

  // ── Bezorgklok (delivery-countdown.tsx) ──────────────────────────────────
  "delivery.beforeCutoff": string; // {time} {day}
  "delivery.afterCutoff": string; // {day}
  "delivery.today": string;
  "delivery.tomorrow": string;
  "delivery.dayAfter": string;
  "delivery.countdown": string; // {h} {m}
};

const nl: Messages = {
  "usp.advice": "Advies van ex-schilders",
  "usp.quality": "Professionele kwaliteit",
  "usp.everything": "Alles voor jouw klus",
  "usp.delivery": "Voor 09:00 besteld, vanavond in huis",

  "nav.customerService": "Klantenservice",
  "nav.cart": "Winkelwagen",
  "nav.cartAria": "Winkelwagen, {count} artikelen",
  "search.placeholder": "Waar ben je naar op zoek?",

  "footer.newsletter.title": "Mis geen enkele actie",
  "footer.newsletter.text":
    "Schrijf je in voor de nieuwsbrief en ontvang klustips, inspiratie en de scherpste KLUSRPAS-aanbiedingen.",

  "footer.tagline":
    "De beste VERF en alles wat je NÚ nodig hebt voor de klus. Advies van ex-schilders, professionele kwaliteit.",

  "footer.col.assortment": "Assortiment",
  "footer.col.customerService": "Klantenservice",
  "footer.col.about": "Over KLUSR",

  "footer.service.customerService": "Klantenservice",
  "footer.service.faq": "Veelgestelde vragen",
  "footer.service.orderStatus": "Bestelstatus volgen",
  "footer.service.shippingReturns": "Verzending & retour",
  "footer.service.returnPolicy": "Retourvoorwaarden",
  "footer.service.securePayment": "Veilig betalen",
  "footer.service.warranty": "Garantie & service",

  "footer.about.aboutKlusr": "Over KLUSR",
  "footer.about.kluspas": "KLUSRPAS",
  "footer.about.business": "Zakelijk & ProfPas",
  "footer.about.mixPaint": "Mengverf",
  "footer.about.colors": "Alle kleuren & collecties",
  "footer.about.advice": "Advies & inspiratie",
  "footer.about.klushulp": "Klushulp",
  "footer.about.careers": "Werken bij KLUSR",

  "footer.bottom.copyright": "© {year} KLUSR B.V. — Alle prijzen incl. btw.",
  "footer.bottom.terms": "Algemene voorwaarden",
  "footer.bottom.returnPolicy": "Retourvoorwaarden",
  "footer.bottom.privacy": "Privacy",
  "footer.bottom.cookies": "Cookiebeleid",
  "footer.bottom.accessibility": "Toegankelijkheid",
  "footer.bottom.securePaymentVia": "Veilig betalen via",
  "footer.trust.payTitle": "Veilig betalen",
  "footer.trust.shipTitle": "Verzonden met",

  "lang.label": "Taal",
  "lang.continueIn": "Verdergaan in het {language}?",
  "lang.dismiss": "Sluiten",

  "home.hero.badge": "Advies van ex-schilders",
  "home.hero.titleLead": "De beste ",
  "home.hero.titlePaint": "VERF",
  "home.hero.titleMid": " en alles wat je ",
  "home.hero.titleNow": "NÚ",
  "home.hero.titleTail": " nodig hebt voor de klus!",
  "home.hero.subtitle":
    "Professionele kwaliteit, op kleur gemengd. Van binnen- en buitenverf tot gereedschap, ijzerwaren en elektra.",
  "home.hero.cta": "Bekijk ons assortiment",
  "home.hero.klushulp": "Klushulp",

  "home.heroAi.chip": "Klushulp · advies van ex-schilders",
  "home.heroAi.title": "Wat ga je klussen?",
  "home.heroAi.text":
    "Stel direct je vraag — onze klushulp helpt je met verf, hoeveelheden en het juiste gereedschap.",
  "home.heroAi.placeholder": "Bijv. welke verf voor mijn badkamer?",
  "home.heroAi.inputAria": "Stel je klusvraag aan de klushulp",
  "home.heroAi.submitAria": "Vraag de klushulp",
  "home.heroAi.example.bedroom": "Welke verf voor mijn slaapkamer?",
  "home.heroAi.example.liters": "Hoeveel liter heb ik nodig?",
  "home.heroAi.example.primer": "Welke primer op kaal hout?",

  "home.funnel.title": "Wat ga je doen?",
  "home.funnel.subtitle": "Kies je klus en wij helpen je met de juiste producten en advies.",

  "home.verf.title": "Verf — onze specialiteit",
  "home.verf.subtitle": "Op kleur gemengd, professionele kwaliteit",

  "home.popular.title": "Populaire producten",
  "home.popular.subtitle": "De favorieten van onze klussers",
  "home.popular.link": "Meer producten",

  "home.acties.title": "Acties & aanbiedingen",
  "home.acties.subtitle": "Tijdelijk extra voordeel",

  "home.kluspas.badge": "KLUSPAS",
  "home.kluspas.title": "Word lid en betaal altijd de laagste prijs",
  "home.kluspas.text":
    "Met de gratis KLUSRPAS profiteer je direct van KLUSRPAS-prijzen op het hele assortiment en mis je geen enkele actie.",
  "home.kluspas.cta": "Vraag je KLUSRPAS aan",
  "home.kluspas.benefit1": "Altijd de scherpste KLUSRPAS-prijs",
  "home.kluspas.benefit2": "Exclusieve acties en voorrang bij uitverkoop",
  "home.kluspas.benefit3": "Gratis kleuradvies via de Klushulp",
  "home.kluspas.benefit4": "Spaar voor klustegoed",

  "home.inspiration.title": "Inspiratie & advies",
  "home.inspiration.subtitle": "Klustips en stappenplannen van onze experts",

  "home.categories.title": "Shop per categorie",
  "home.categories.subtitle": "Alles voor jouw klus onder één dak",

  "home.trending.link": "Bekijk alles",

  "home.forYou.title": "Speciaal voor jou",
  "home.forYou.subtitle": "Aanbevolen op basis van wat je bekeek en bestelde",
  "home.viewed.title": "Verder kijken",
  "home.viewed.subtitle": "Onlangs door jou bekeken",

  "cart.title": "Winkelwagen",
  "cart.loading": "Laden…",
  "cart.empty.title": "Je winkelwagen is leeg",
  "cart.empty.drawerText": "Voeg producten toe om je klus compleet te maken.",
  "cart.empty.viewText": "Bekijk ons assortiment en maak je klus compleet.",
  "cart.empty.startPaint": "Begin met verf",
  "cart.empty.viewPaint": "Bekijk verf",
  "cart.empty.klushulp": "Klushulp",

  "cart.freeShipping.reachedPre": "Gefeliciteerd! Je krijgt ",
  "cart.freeShipping.reachedBold": "gratis verzending",
  "cart.freeShipping.reachedPost": ".",
  "cart.freeShipping.remainingPre": "Nog ",
  "cart.freeShipping.remainingPost": " tot gratis verzending",

  "cart.item.remove": "Verwijder",
  "cart.item.save": "Bewaar",
  "cart.item.removeLabel": "Verwijder",
  "cart.item.add": "Toevoegen",
  "cart.forgotten": "Vaak vergeten",
  "cart.moveToCart": "In winkelwagen",
  "cart.savedForLater": "Bewaard voor later ({count})",

  "cart.summary.title": "Overzicht",
  "cart.kluspasDiscount": "KLUSRPAS-voordeel",
  "cart.kluspas.nudge": "Bespaar {amount} met KLUSRPAS — log in of maak gratis een account",
  "cart.profpasDiscount": "ProfPas-korting",
  "cart.subtotal": "Subtotaal",
  "cart.exclVat": " (excl. btw)",
  "cart.shipping": "Verzendkosten",
  "cart.free": "Gratis",
  "cart.vat": "Btw (21%)",
  "cart.total": "Totaal",
  "cart.vatIncluded": "Incl. btw",
  "cart.vatIncludedBusiness": "Incl. btw · zakelijke prijzen excl. btw getoond",
  "cart.checkout": "Verder naar afrekenen",
  "cart.continueShopping": "Verder winkelen",
  "cart.toCart": "Naar winkelwagen",

  "cart.usp.returns": "Retourneren binnen 14 dagen",
  "cart.usp.payment": "Veilig betalen via Mollie",

  "cart.upsell.title": "Maak je klus compleet",
  "cart.upsell.subtitle": "Klussers kochten hier vaak ook",

  "checkout.title": "Afrekenen",
  "checkout.backToCart": "Terug naar winkelwagen",
  "checkout.empty.text": "Voeg eerst producten toe om af te rekenen.",
  "checkout.empty.toRange": "Naar het assortiment",

  "checkout.private": "Particulier",
  "checkout.business": "Zakelijk (excl. btw)",

  "checkout.reorderFree":
    "Gratis verzending — je bestelt binnen 15 minuten na je vorige bestelling.",

  "checkout.loggedInPre": "Je bent ingelogd als ",
  "checkout.loggedInPost": ". Je bestelling wordt aan je account gekoppeld.",
  "checkout.guest.title": "Je rekent af als gast — supersnel, geen account nodig",
  "checkout.guest.text":
    "Vul je gegevens in en bestel direct. Onderaan maak je met één vinkje een account aan voor je bestelhistorie.",
  "checkout.guest.haveAccount": "Heb je al een account? Inloggen",
  "checkout.login.emailPlaceholder": "E-mailadres",
  "checkout.login.passwordPlaceholder": "Wachtwoord",
  "checkout.login.submit": "Inloggen",
  "checkout.login.error": "Inloggen mislukt. Controleer je e-mailadres en wachtwoord.",
  "checkout.login.forgotPre": "Wachtwoord vergeten of liever een inloglink? ",
  "checkout.login.forgotLink": "Ga naar inloggen",

  "checkout.section.contact": "Contactgegevens",
  "checkout.section.delivery": "Bezorgadres",
  "checkout.section.shipping": "Verzendmethode",
  "checkout.section.payment": "Betaalmethode",

  "checkout.field.email": "E-mailadres",
  "checkout.field.emailPlaceholder": "jij@voorbeeld.nl",
  "checkout.createAccount.labelBold": "Maak meteen een account aan",
  "checkout.createAccount.labelRest": " — bewaar je gegevens en bekijk later je bestellingen. ",
  "checkout.createAccount.optional": "(optioneel)",
  "checkout.createAccount.passwordPlaceholder": "Kies een wachtwoord (min. 8 tekens)",
  "checkout.createAccount.passwordHint": "Minimaal 8 tekens.",
  "checkout.field.company": "Bedrijfsnaam",
  "checkout.field.companyPlaceholder": "Bedrijfsnaam B.V.",
  "checkout.field.coc": "KVK-nummer",
  "checkout.field.vat": "BTW-nummer",

  "checkout.field.country": "Land",
  "checkout.country.outsideNote":
    "Buiten NL en BE gelden vaste verzendkosten (geen gratis verzending).",
  "checkout.field.firstName": "Voornaam",
  "checkout.field.lastName": "Achternaam",
  "checkout.field.postalCode": "Postcode",
  "checkout.field.houseNumber": "Huisnr.",
  "checkout.field.addition": "Toevoeging",
  "checkout.field.street": "Straat",
  "checkout.field.streetLookup": "Straat (adres ophalen…)",
  "checkout.field.autofill": "Wordt automatisch ingevuld",
  "checkout.field.city": "Plaats",
  "checkout.field.phone": "Telefoon (optioneel)",
  "checkout.billing.toggle": "Factuuradres wijkt af van het bezorgadres",
  "checkout.billing.companyOptional": "Bedrijfsnaam (optioneel)",
  "checkout.billing.streetAndNumber": "Straat en huisnummer",
  "checkout.billing.streetPlaceholder": "Straatnaam 1",

  "checkout.delivery.title": "Bezorgen",

  "checkout.summary.title": "Je bestelling",
  "checkout.billieSurcharge": "Billie-toeslag",
  "checkout.terms.pre": "Ik ga akkoord met de ",
  "checkout.terms.termsLink": "algemene voorwaarden",
  "checkout.terms.mid": " en het ",
  "checkout.terms.privacyLink": "privacybeleid",
  "checkout.terms.post": ".",
  "checkout.newsletter":
    "Houd me op de hoogte van klustips en KLUSRPAS-aanbiedingen (nieuwsbrief).",
  "checkout.pay": "Betaal {amount}",
  "checkout.chooseBankHint": "Kies je bank om verder te gaan.",
  "checkout.choosePaymentHint": "Kies eerst een betaalmethode.",
  "checkout.usp.freeReturn": "Retourneren binnen 14 dagen",
  "checkout.usp.fastDelivery": "Snelle levering",

  "checkout.trust.heading": "Wat klanten over KLUSR zeggen",
  "checkout.trust.based": "{average} — gebaseerd op {count} beoordelingen",
  "checkout.trust.verified": "Geverifieerde aankoop",

  "checkout.error.choosePayment": "Kies eerst een betaalmethode.",
  "checkout.error.chooseBank": "Kies eerst je bank voor iDEAL.",
  "checkout.error.accountPassword":
    "Kies een wachtwoord van minimaal 8 tekens voor je account.",
  "checkout.error.card": "Controleer je kaartgegevens en probeer het opnieuw.",
  "checkout.error.paymentFailed": "Betaling aanmaken mislukt",
  "checkout.error.generic": "Er ging iets mis",

  "checkout.payment.chooseBank": "Kies je bank",
  "checkout.payment.hint.ideal": "Betaal direct met je eigen bank",
  "checkout.payment.hint.creditcard": "Visa, Mastercard",
  "checkout.payment.hint.klarna": "Achteraf betalen — binnen 14 dagen",
  "checkout.payment.hint.bancontact": "Betaal met je Bancontact-kaart",

  "checkout.reorder.title": "Iets vergeten?",
  "checkout.reorder.textPre": "Bestel binnen ",
  "checkout.reorder.textMinutes": "15 minuten",
  "checkout.reorder.textMid": " nog iets en betaal ",
  "checkout.reorder.textBold": "geen extra verzendkosten",
  "checkout.reorder.textPost": " — we sturen het in één pakket.",
  "checkout.reorder.added": "Toegevoegd — geen extra verzendkosten",
  "checkout.reorder.addAria": "Voeg {title} toe",
  "checkout.reorder.toCart": "Naar winkelwagen",
  "checkout.reorder.continueShopping": "Verder winkelen",

  "checkout.thanks.title": "Bedankt voor je bestelling!",
  "checkout.thanks.text":
    "We hebben je bestelling ontvangen en gaan er direct mee aan de slag.",
  "checkout.thanks.confirmationSentPre": " Een bevestiging is verstuurd naar ",
  "checkout.thanks.confirmationSentPost": ".",
  "checkout.thanks.orderNumber": "Bestelnummer",
  "checkout.thanks.orderDate": "Besteldatum",
  "checkout.thanks.subtotal": "Subtotaal",
  "checkout.thanks.shipping": "Verzendkosten",
  "checkout.thanks.totalPaid": "Totaal betaald",
  "checkout.thanks.free": "Gratis",
  "checkout.thanks.expectedDelivery": "Verwachte bezorging: {date}",
  "checkout.thanks.step.confirmation.title": "Bevestiging",
  "checkout.thanks.step.confirmation.hint": "Check je inbox",
  "checkout.thanks.step.packing.title": "Wordt ingepakt",
  "checkout.thanks.step.packing.hint": "Vandaag nog",
  "checkout.thanks.step.onTheWay.title": "Onderweg",
  "checkout.thanks.step.onTheWay.hint": "Volg je pakket",
  "checkout.thanks.trackOrder": "Volg je bestelling",
  "checkout.thanks.continueShopping": "Verder winkelen",
  "checkout.thanks.downloadInvoice": "Download je factuur (PDF)",
  "checkout.thanks.deliveryAddress": "Bezorgadres",
  "checkout.thanks.loadError":
    "We konden de bestelgegevens niet laden, maar je betaling is in goede orde ontvangen. Je ontvangt een bevestiging per e-mail.",
  "checkout.thanks.backHome": "Terug naar home",
  "checkout.thanks.successBadge": "Betaling geslaagd",
  "checkout.thanks.orderSummary": "Je bestelling",
  "checkout.thanks.needHelp.title": "Vragen over je bestelling?",
  "checkout.thanks.needHelp.text":
    "Onze klushulp staat voor je klaar — van levertijd tot productadvies.",
  "checkout.thanks.needHelp.cta": "Naar de klantenservice",
  "checkout.pending.title": "We verwerken je betaling…",
  "checkout.pending.text":
    "Je betaling wordt nog bevestigd door je bank. Dit duurt meestal maar een paar seconden.",
  "checkout.pending.hint":
    "Deze pagina ververst automatisch zodra je betaling rond is. Je hoeft niets te doen.",
  "checkout.pending.refreshNow": "Status nu verversen",
  "checkout.pending.backHome": "Terug naar home",
  "checkout.failed.title": "Je betaling is niet gelukt",
  "checkout.failed.canceledTitle": "Je betaling is geannuleerd",
  "checkout.failed.expiredTitle": "Je betaling is verlopen",
  "checkout.failed.text":
    "Er is geen bedrag afgeschreven. Je kunt het zonder zorgen opnieuw proberen.",
  "checkout.failed.cartKept": "Je winkelwagen is bewaard gebleven.",
  "checkout.failed.retry": "Opnieuw proberen",
  "checkout.failed.toCart": "Naar winkelwagen",
  "checkout.failed.help": "Hulp nodig? Neem contact op met de klantenservice",
  "checkout.failed.orderRef": "Bestelnummer: {ref}",

  "checkout.validation.required": "Verplicht",
  "checkout.validation.email": "Vul een geldig e-mailadres in",
  "checkout.validation.postalCode": "Vul je postcode in",
  "checkout.validation.street": "Vul je straatnaam in",
  "checkout.validation.terms": "Ga akkoord met de algemene voorwaarden om te bestellen.",
  "checkout.validation.postalCodeNl": "Bijv. 7443 BR",
  "checkout.validation.coc": "Een KVK-nummer bestaat uit 8 cijfers.",
  "checkout.validation.vat": "Voer een geldig btw-nummer in, bijv. NL000000000B00.",

  "service.hero.kicker": "Klantenservice",
  "service.hero.title": "Waarmee kunnen we je helpen?",
  "service.hero.subtitle":
    "Vind hieronder snel antwoord op de meestgestelde vragen, of neem direct contact met ons op. Onze klussers staan voor je klaar.",

  "service.trust.delivery": "Voor 09:00 besteld, vanavond in huis",
  "service.trust.returns": "14 dagen bedenktijd",
  "service.trust.payment": "Veilig betalen via Mollie",
  "service.trust.advice": "Advies van ex-schilders",
  "service.trust.warranty": "Wettelijke garantie op alles",

  "service.contact.call.title": "Bel ons",
  "service.contact.call.description": "Ma t/m vr 09:00 - 18:00",
  "service.contact.mail.title": "Mail ons",
  "service.contact.mail.description": "Reactie binnen 1 werkdag",
  "service.contact.store.title": "Kleuradvies",
  "service.contact.store.description": "Gratis advies van onze ex-schilders",
  "service.contact.store.action": "Naar de kleurkiezer",
  "service.contact.ai.title": "Klushulp",
  "service.contact.ai.description": "Direct antwoord, dag en nacht",
  "service.contact.ai.action": "Stel je vraag",

  "service.shipping.title": "Verzendkosten",
  "service.shipping.subtitle":
    "Gratis verzending vanaf {amount} in Nederland en België. Voor 09:00 besteld op werkdagen? Dan ligt je pakket vanavond in huis.",
  "service.shipping.rowNl": "Nederland",
  "service.shipping.freeFrom": "· gratis vanaf {amount}",
  "service.shipping.mailbox": "Brievenbuspakje (NL)",
  "service.shipping.mailboxHint": "Kleine, platte artikelen die door de brievenbus passen",
  "service.shipping.rowBe": "België",
  "service.shipping.outsideNote":
    "We leveren binnen de hele EU. Buiten Nederland en België is er geen gratis verzending. Buiten de EU — waaronder Zwitserland en het Verenigd Koninkrijk — verzenden we niet, vanwege de douane.",

  "service.group.shipping.title": "Verzending & retour",
  "service.group.shipping.intro":
    "Gratis verzending vanaf {free} in NL en BE, voor 09:00 besteld is vanavond in huis, en retourneren kan per post met retourlabel — de retourkosten zijn voor eigen rekening. Naar de rest van de EU vanaf {eu}.",
  "service.group.payment.title": "Veilig betalen",
  "service.group.payment.intro":
    "Betaal eenvoudig en veilig met iDEAL, Bancontact, creditcard of achteraf met Klarna via Mollie.",
  "service.group.warranty.title": "Garantie & service",
  "service.group.warranty.intro":
    "Wettelijke garantie op alles, plus persoonlijke service van onze ex-schilders.",
  "service.group.mengverf.title": "Mengverf & kleuradvies",
  "service.group.mengverf.intro":
    "Elke kleur op maat gemengd met een exacte kleurmatch. Let op: op kleur gemengde verf is maatwerk en kan niet retour.",
  "service.group.kluspas.title": "KLUSRPAS & zakelijk",
  "service.group.kluspas.intro":
    "Gratis KLUSRPAS-voordeel voor particulieren, en de ProfPas met 10% korting (excl. btw) voor zakelijke klanten.",

  "service.faq.shipping.when.q": "Wanneer wordt mijn bestelling bezorgd?",
  "service.faq.shipping.when.a":
    "Bestel je op werkdagen vóór 09:00? Dan ligt je bestelling vanavond in huis. Je ontvangt een track & trace-code zodra je pakket onderweg is.",
  "service.faq.shipping.cost.q": "Wat kost de verzending?",
  "service.faq.shipping.cost.a":
    "In Nederland en België is verzending gratis vanaf {nlFree}. Daaronder betaal je {nlPrice} in Nederland en {bePrice} in België. Kleine, platte artikelen sturen we als brievenbuspakje voor {mailbox} (alleen NL). Naar de overige EU-landen bezorgen we vanaf {eu}; daar geldt geen gratis verzending. De exacte verzendkosten zie je altijd tijdens het afrekenen.",
  "service.faq.shipping.abroad.q": "Leveren jullie ook naar het buitenland?",
  "service.faq.shipping.abroad.a":
    "We bezorgen in de hele EU. Naar België is verzending gratis vanaf {beFree}; naar de overige EU-landen geldt een vast tarief per land vanaf {eu}, dat je tijdens het afrekenen ziet. Buiten de EU — waaronder Zwitserland en het Verenigd Koninkrijk — verzenden we niet, vanwege de douane.",
  "service.faq.shipping.return.q": "Hoe retourneer ik een product?",
  "service.faq.shipping.return.a":
    "Retourneren kan per post met een retourlabel; de retourkosten zijn voor eigen rekening. Meld je retour aan via je account of de klantenservice, dan ontvang je het retourlabel en de instructies. Je hebt 14 dagen bedenktijd.",

  "service.faq.payment.methods.q": "Welke betaalmethodes accepteren jullie?",
  "service.faq.payment.methods.a":
    "Je betaalt veilig met iDEAL, Bancontact, creditcard of achteraf via Klarna. Alle betalingen verlopen versleuteld via onze betaalpartner Mollie.",
  "service.faq.payment.afterwards.q": "Kan ik achteraf betalen?",
  "service.faq.payment.afterwards.a":
    "Ja, met Klarna betaal je veilig achteraf. Je rekent pas af nadat je je bestelling hebt ontvangen en gecontroleerd.",
  "service.faq.payment.safe.q": "Is online betalen veilig?",
  "service.faq.payment.safe.a":
    "Absoluut. Alle transacties lopen via Mollie, een gecertificeerde betaaldienst. Wij slaan zelf geen betaalgegevens op.",

  "service.faq.warranty.products.q": "Welke garantie krijg ik op producten?",
  "service.faq.warranty.products.a":
    "Op al onze producten geldt de wettelijke garantie. Daarnaast hanteren veel merken hun eigen fabrieksgarantie. Is er iets mis met je product? Neem contact op, dan zoeken we samen naar een oplossing.",
  "service.faq.warranty.damaged.q": "Mijn product is beschadigd aangekomen, wat nu?",
  "service.faq.warranty.damaged.a":
    "Vervelend! Neem binnen 48 uur contact op met onze klantenservice en stuur een foto mee. We sturen kosteloos een vervangend product of storten het bedrag terug.",
  "service.faq.warranty.store.q": "Hoe krijg ik service of advies?",
  "service.faq.warranty.store.a":
    "KLUSR is volledig online. Onze ex-schilders helpen je graag verder met advies of vragen over je aankoop via de klantenservice of de Klushulp — je krijgt snel persoonlijk antwoord.",

  "service.faq.mengverf.return.q": "Kan ik op kleur gemengde verf retourneren?",
  "service.faq.mengverf.return.a":
    "Op kleur gemengde verf mengen we speciaal voor jou op maat. Daarom is deze — net als andere op maat gemaakte producten — wettelijk uitgesloten van het herroepingsrecht en kunnen we mengverf niet terugnemen. Is er onverhoopt iets mis met de kleur of het product? Neem dan contact op, dan lossen we het samen kosteloos op.",
  "service.faq.mengverf.match.q": "Hoe nauwkeurig is de kleurmatch?",
  "service.faq.mengverf.match.a":
    "We mengen op basis van professionele kleurcodes (o.a. RAL, Gamma en AkzoNobel) voor een exacte match. Twijfel je over een kleur? Bestel eerst een kleurtester of proefpotje voordat je de hele hoeveelheid laat mengen — houd er rekening mee dat schermkleuren licht kunnen afwijken.",
  "service.faq.mengverf.amount.q": "Hoeveel verf heb ik nodig?",
  "service.faq.mengverf.amount.a":
    "Reken globaal op 1 liter per 8–10 m² per laag. Op de productpagina en via onze Klushulp rekenen we het exact voor je uit, zodat je niet te veel of te weinig bestelt.",
  "service.faq.mengverf.instore.q": "Hoe laat ik verf op kleur mengen?",
  "service.faq.mengverf.instore.a":
    "Kies online je kleur in de kleurkiezer en bestel de bijbehorende verf. Onze kleurspecialisten mengen je verf vakkundig op de exacte kleur en we bezorgen 'm klaar voor gebruik bij je thuis.",

  "service.faq.kluspas.what.q": "Wat is de KLUSRPAS en wat kost het?",
  "service.faq.kluspas.what.a":
    "De KLUSRPAS is helemaal gratis en geeft je direct de scherpere KLUSRPAS-prijs op de hele collectie, plus exclusieve acties. Je activeert 'm bij het aanmaken van een account.",
  "service.faq.kluspas.business.q": "Ik bestel zakelijk — kan dat ook?",
  "service.faq.kluspas.business.a":
    "Ja. Voor zzp'ers, schilders en bedrijven hebben we de KLUSR ProfPas: 10% korting op de hele collectie en prijzen excl. btw, op factuur. Gratis registreren kan via de zakelijk-pagina.",
  "service.faq.kluspas.invoice.q": "Krijg ik een factuur met btw?",
  "service.faq.kluspas.invoice.a":
    "Ja, bij elke bestelling ontvang je een nette factuur met btw gespecificeerd. Zakelijke klanten zien de prijzen excl. btw en betalen op factuur.",

  "service.general.title": "Bestellen & account",
  "service.faq.general.order.q": "Hoe plaats ik een bestelling?",
  "service.faq.general.order.a":
    "Voeg producten toe aan je winkelmandje, ga naar de kassa en doorloop de stappen. Je hebt geen account nodig om te bestellen, maar met een account gaat het de volgende keer sneller.",
  "service.faq.general.account.q": "Heb ik een account nodig?",
  "service.faq.general.account.a":
    "Nee, je kunt als gast bestellen. Met een account bewaar je wel je gegevens, bestelhistorie en je KLUSRPAS-voordelen op één plek.",
  "service.faq.general.mix.q": "Kan ik verf op kleur laten mengen?",
  "service.faq.general.mix.a":
    "Ja! Wij mengen elke gewenste kleur op maat. Kies online je kleur in de kleurkiezer, dan mengen onze kleurspecialisten je verf vakkundig op de exacte kleur en bezorgen we 'm klaar voor gebruik.",

  "service.guarantee.title": "Niet goed? Geld terug.",
  "service.guarantee.text":
    "We willen dat je met een gerust hart de klus in gaat. Daarom: 14 dagen bedenktijd, retourneren kan per post met retourlabel (de retourkosten zijn voor eigen rekening) en wettelijke garantie op alles. Op kleur gemengde verf is maatwerk en daarom uitgezonderd van retour — maar bij een gebrek lossen we het altijd kosteloos op.",
  "service.guarantee.cta": "Lees de retourvoorwaarden",

  "service.contactBlock.title": "Staat je vraag er niet bij?",
  "service.contactBlock.text":
    "Stuur ons een bericht. Je ontvangt direct een ticketnummer en een bevestiging per e-mail — we reageren meestal binnen 1 werkdag.",
  "service.contactBlock.preferPre": "Liever meteen antwoord? ",
  "service.contactBlock.preferLink": "Vraag de Klushulp",
  "service.contactBlock.preferPost": " — 24/7 beschikbaar.",
  "service.contactBlock.viewStorePage": "Stel je vraag aan de Klushulp",

  "faq.meta.breadcrumb": "Veelgestelde vragen",
  "faq.badge": "Hulp & uitleg",
  "faq.title": "Veelgestelde vragen",
  "faq.subtitle": "Niet gevonden wat je zoekt? Onze klantenservice helpt je graag verder.",
  "faq.more.title": "Nog een vraag?",
  "faq.more.text": "We helpen je graag persoonlijk verder.",
  "faq.more.cta": "Naar klantenservice",

  "faq.group.ordering": "Bestellen & betalen",
  "faq.group.delivery": "Levering & retour",
  "faq.group.mengverf": "Mengverf & kleur",
  "faq.group.kluspas": "KLUSRPAS",

  "faq.order.how.q": "Hoe plaats ik een bestelling?",
  "faq.order.how.a":
    "Voeg producten toe aan je winkelwagen en reken veilig af. Voor verf kies je eerst je kleur — die mengen wij exact voor je.",
  "faq.order.payment.q": "Welke betaalmethoden accepteren jullie?",
  "faq.order.payment.a":
    "Je betaalt veilig via Mollie met onder andere iDEAL, creditcard en — waar beschikbaar — achteraf betalen.",
  "faq.order.account.q": "Heb ik een account nodig?",
  "faq.order.account.a":
    "Nee, je kunt als gast bestellen. Met een (gratis) account en KLUSRPAS profiteer je wel van extra voordeel en bewaar je je bestellingen en kleuren.",
  "faq.order.account.text":
    "Nee, je kunt als gast bestellen. Met een gratis account en KLUSRPAS profiteer je van extra voordeel en bewaar je je bestellingen en kleuren.",

  "faq.delivery.when.q": "Wanneer is mijn bestelling in huis?",
  "faq.delivery.when.a":
    "Voor 09:00 uur op werkdagen besteld, vanavond in huis. Verzending is gratis vanaf € 50, daaronder rekenen we € 4,95.",
  "faq.delivery.pickup.q": "Kan ik mijn bestelling afhalen?",
  "faq.delivery.pickup.aPre": "KLUSR is volledig online — we bezorgen door heel Nederland en België. Vragen over je bezorging? Onze ",
  "faq.delivery.pickup.aLink": "klantenservice",
  "faq.delivery.pickup.aPost": " helpt je graag.",
  "faq.delivery.pickup.text": "KLUSR is volledig online — we bezorgen door heel Nederland en België. Afhalen is niet mogelijk.",
  "faq.delivery.return.q": "Hoe retourneer ik een product?",
  "faq.delivery.return.aPre": "Je hebt 14 dagen bedenktijd. Meld je retour bij onze ",
  "faq.delivery.return.aLink": "klantenservice",
  "faq.delivery.return.aMid": ". Let op: op kleur gemengde verf is uitgesloten van retour (zie ",
  "faq.delivery.return.aTermsLink": "voorwaarden",
  "faq.delivery.return.aPost": ").",
  "faq.delivery.return.text":
    "Je hebt 14 dagen bedenktijd. Meld je retour bij onze klantenservice. Op kleur gemengde verf is uitgesloten van retour.",

  "faq.mengverf.any.q": "Kan ik elke kleur laten mengen?",
  "faq.mengverf.any.aPre":
    "Ja. Kies uit duizenden kleuren (Gamma, Sikkens, RAL, AkzoNobel) of je eigen tint in onze ",
  "faq.mengverf.any.aLink": "kleurkiezer",
  "faq.mengverf.any.aPost": ". Wij mengen de verf exact op kleur.",
  "faq.mengverf.any.text":
    "Ja. Kies uit duizenden kleuren (Gamma, Sikkens, RAL, AkzoNobel) of je eigen tint in onze kleurkiezer. Wij mengen de verf exact op kleur.",
  "faq.mengverf.how.q": "Hoe werkt mengverf precies?",
  "faq.mengverf.how.aPre":
    "Je kiest een kleur, wij mengen die professioneel in de juiste basis. Meer lees je op ",
  "faq.mengverf.how.aLink": "de mengverf-pagina",
  "faq.mengverf.how.aPost": ".",
  "faq.mengverf.how.text":
    "Je kiest een kleur, wij mengen die professioneel in de juiste basis. Meer lees je op de mengverf-pagina.",
  "faq.mengverf.exchange.q": "Kan ik gemengde verf ruilen?",
  "faq.mengverf.exchange.a":
    "Op kleur gemengde verf maken we speciaal voor jou en is daarom uitgesloten van het herroepingsrecht, tenzij er sprake is van een gebrek.",

  "faq.kluspas.what.q": "Wat is de KLUSRPAS?",
  "faq.kluspas.what.aPre":
    "De gratis KLUSRPAS geeft je altijd de scherpste prijs en exclusieve acties. Lees er alles over op de ",
  "faq.kluspas.what.aLink": "KLUSRPAS-pagina",
  "faq.kluspas.what.aPost": ".",
  "faq.kluspas.what.text":
    "De gratis KLUSRPAS geeft je altijd de scherpste prijs en exclusieve acties.",
  "faq.kluspas.cost.q": "Wat kost de KLUSRPAS?",
  "faq.kluspas.cost.a": "Niets — de KLUSRPAS is gratis aan te vragen en te gebruiken.",

  "about.breadcrumb": "Over KLUSR",
  "about.hero.kicker": "Over KLUSR",
  "about.hero.titleLead": "De beste verf en alles wat je ",
  "about.hero.titleAccent": "nú",
  "about.hero.titleTail": " nodig hebt voor de klus",
  "about.hero.intro":
    "KLUSR is ontstaan uit een simpele frustratie: te vaak liep je de bouwmarkt uit met de verkeerde verf en zonder goed advies. Dat kan beter. Bij KLUSR krijg je professionele kwaliteit, de scherpste prijs én advies van mensen die het vak echt kennen — ex-schilders.",

  "about.value.advice.title": "Advies van ex-schilders",
  "about.value.advice.body":
    "Onze mensen hebben zelf jarenlang met de kwast gestaan. Dat advies krijg jij er gratis bij.",
  "about.value.color.title": "Elke kleur, exact gemengd",
  "about.value.color.body":
    "Duizenden kleuren uit alle bekende waaiers — professioneel op kleur gemengd, klaar voor gebruik.",
  "about.value.quality.title": "Professionele kwaliteit",
  "about.value.quality.body":
    "Topmerken, scherp geprijsd, en met de gratis KLUSRPAS altijd het meeste voordeel op je hele klus.",

  "about.story.title": "Ons verhaal",
  "about.story.p1":
    "Wat begon met een mengmachine en een hoop kennis, groeide uit tot dé online klusspecialist voor doe-het-zelvers en vakmensen. De rode draad bleef hetzelfde: het beste advies en de juiste materialen, voor zowel de doe-het-zelver als de vakman.",
  "about.story.p2":
    "Vandaag brengen we die kennis samen in een complete webshop. Online de scherpste KLUSRPAS-prijs, je kleur exact gemengd en bezorgd tot aan je voordeur, met persoonlijk advies van onze ex-schilders via de Klushulp en klantenservice.",

  "about.stores.title": "Online, door heel Nederland",
  "about.stores.all": "Bekijk het assortiment",

  "about.cta.title": "Aan de slag?",
  "about.cta.text": "Vraag gratis je KLUSRPAS aan en pak meteen voordeel.",
  "about.cta.button": "Meer over KLUSRPAS",

  "notFound.code": "404",
  "notFound.title": "Deze pagina konden we niet vinden",
  "notFound.text":
    "De pagina is verplaatst of bestaat niet meer. Zoek hieronder verder — grote kans dat we vinden wat je zoekt.",
  "notFound.searchPlaceholder": "Zoek een product, merk of kleur…",
  "notFound.searchSubmit": "Zoeken",
  "notFound.searchAria": "Zoeken",
  "notFound.popular": "Populair bij KLUSR",
  "notFound.popular.paint": "Verf",
  "notFound.popular.colorPicker": "Kleurenkiezer",
  "notFound.popular.tools": "Gereedschap",
  "notFound.popular.advice": "Klusadvies",
  "notFound.toHome": "Naar de homepagina",
  "notFound.customerService": "Klantenservice",

  "plp.filters": "Filters",
  "plp.clearFilters": "Wis filters",
  "plp.clearFiltersCount": "Wis filters ({count})",
  "plp.clearAll": "Wis alle filters",
  "plp.resultCount": "producten",
  "plp.resultCountOne": "product",
  "plp.show": "Toon {count} producten",
  "plp.showOne": "Toon {count} product",
  "plp.sortAria": "Sorteren",
  "plp.sort.populair": "Populair",
  "plp.sort.priceAsc": "Prijs oplopend",
  "plp.sort.priceDesc": "Prijs aflopend",
  "plp.sort.rating": "Best beoordeeld",
  "plp.sort.newest": "Nieuwste",

  "plp.group.mengverf": "Mengverf",
  "plp.group.productType": "Productsoort",
  "plp.group.price": "Prijs",
  "plp.group.volume": "Inhoud",
  "plp.group.rating": "Beoordeling",
  "plp.group.dealsLabels": "Acties & labels",
  "plp.group.brand": "Merk",

  "plp.facet.glans": "Glansgraad",
  "plp.facet.materiaal": "Materiaal",
  "plp.facet.fitting": "Fitting",
  "plp.facet.dessin": "Dessin",
  "plp.facet.toepassing": "Toepassing",
  "plp.facet.korrel": "Korrel",
  "plp.facet.lichtkleur": "Lichtkleur",
  "plp.facet.type": "Type",

  "plp.priceBucket.lt25": "Tot € 25",
  "plp.priceBucket.mid": "€ 25 – € 50",
  "plp.priceBucket.high": "€ 50 – € 100",
  "plp.priceBucket.top": "Vanaf € 100",

  "plp.rating.min4": "4 sterren & hoger",
  "plp.rating.min45": "4,5 sterren & hoger",
  "plp.ratingChip": "{rating}+ sterren",

  "plp.badge.actie": "Actie",
  "plp.badge.bestseller": "Bestseller",
  "plp.badge.proKeuze": "Pro keuze",
  "plp.badge.nieuw": "Nieuw",
  "plp.badge.bundel": "Voordeelbundel",

  "plp.colorMixable": "Op kleur te mengen",
  "plp.viewAria": "Weergave",
  "plp.viewGrid": "Rasterweergave",
  "plp.viewList": "Lijstweergave",
  "plp.empty.title": "Geen producten gevonden",
  "plp.empty.text": "Pas je filters aan om meer resultaten te zien.",
  "plp.favorite": "Bewaar als favoriet",

  "finder.title": "Niet zeker wat je nodig hebt?",
  "finder.subtitle": "Vertel kort je klus, dan zoeken we meteen de juiste producten voor je.",
  "finder.placeholder": "Bijv. verf voor mijn houten kozijnen buiten",
  "finder.inputAria": "Beschrijf je klus",
  "finder.submit": "Vind producten",
  "finder.submitShort": "Vind",
  "finder.applied": "Filters toegepast op je klus.",
  "finder.none": "Geen specifiek filter gevonden — verfijn je vraag of gebruik de filters.",
  "finder.error": "Dat lukte even niet. Probeer het opnieuw of gebruik de filters links.",

  "pdp.addToCart": "In winkelwagen",
  "pdp.buyNow": "Direct afrekenen",
  "pdp.reviewsLink": "{rating} · {count} reviews",
  "pdp.sizeLabel": "Maat / inhoud:",
  "pdp.color": "Kleur",
  "pdp.chooseColor": "Kies je kleur",
  "pdp.changeColor": "Kleur wijzigen",
  "pdp.anyColor":
    "Elke kleur mogelijk — wij mengen de verf exact op jouw gekozen tint. Kies een kleur om 'm op de muur te zien.",
  "pdp.mixed.pre": "Wordt ",
  "pdp.mixed.bold": "professioneel op kleur gemengd",
  "pdp.mixed.inBase": " in {base}",
  "pdp.mixed.post": ". Exacte match, klaar voor gebruik.",
  "pdp.chooseColorTitle": "Kies eerst een kleur",
  "pdp.chooseColorBuy": "Selecteer een kleur voordat je deze verf bestelt.",
  "pdp.chooseColorAdd": "Selecteer een kleur voordat je deze verf toevoegt.",
  "pdp.addedToCart": "Toegevoegd aan winkelwagen",
  "pdp.favAdded": "Toegevoegd aan favorieten",
  "pdp.favRemoved": "Verwijderd uit favorieten",
  "pdp.favSave": "Bewaar voor later",
  "pdp.favSaved": "Bewaard in favorieten",
  "pdp.kluspasPrice": "KLUSRPAS-prijs",
  "pdp.profpasPrice": "ProfPas-prijs",
  "pdp.normalPrice": "Normale prijs",
  "pdp.withoutAccount": "— zonder account",
  "pdp.kluspas.title": "KLUSRPAS-prijs — gratis voor iedereen",
  "pdp.kluspas.body":
    "Kies bij het afrekenen voor een gratis account, dan wordt de KLUSRPAS-korting direct verrekend. Geen abonnement, geen verplichtingen.",
  "pdp.kluspas.link": "Wat is de KLUSRPAS?",
  "pdp.kluspas.drawer.intro":
    "De KLUSRPAS is de gratis voordeelpas van KLUSR. Pashouders betalen altijd de laagste prijs op het hele assortiment.",
  "pdp.kluspas.drawer.benefit1": "Altijd de laagste KLUSRPAS-prijs",
  "pdp.kluspas.drawer.benefit2": "Exclusieve acties en aanbiedingen",
  "pdp.kluspas.drawer.benefit3": "Gratis persoonlijk kleuradvies",
  "pdp.kluspas.drawer.benefit4": "Klustegoed sparen bij elke aankoop",
  "pdp.kluspas.drawer.how":
    "Maak gratis een account aan; de korting wordt bij het afrekenen direct verrekend. Geen verplichtingen.",
  "pdp.kluspas.drawer.cta": "Account aanmaken",
  "pdp.kluspas.drawer.more": "Lees meer over de KLUSRPAS",
  "pdp.kluspas.teaserTitle": "{price} met KLUSRPAS",
  "pdp.kluspas.teaserCta": "Log in of maak gratis een account",
  "pdp.kluspas.teaserSave": "Bespaar {amount} · {pct}% korting",
  "pdp.surcharge": "Incl. {base} (+{amount} voor donkere kleur)",
  "pdp.perLiter": "{price} per liter",
  "pdp.discountBadge": "{pct}% KORTING",
  "pdp.withPass": "met {pass}",
  "pdp.passExplain": "{pct}% korting op de hele collectie met je gratis {pass}.",
  "pdp.yourPrice": "Jouw prijs",
  "pdp.yourPassPrice": "met {pass}",
  "pdp.passApplied": "{pct}% korting, automatisch verrekend met je {pass}.",
  "pdp.perLiterCheaper": "grotere bus is voordeliger per liter",
  "pdp.stockForBasePre": "Voorraad getoond voor ",
  "pdp.stockForBasePost": " — elke basis heeft een eigen voorraad.",

  "pdp.usp.freeShipping": "Gratis verzending vanaf €50",
  "pdp.usp.returns": "Retourneren binnen 14 dagen",
  "pdp.usp.afterpay": "Achteraf betalen mogelijk",

  "pdp.tab.description": "Omschrijving",
  "pdp.tab.specs": "Specificaties",
  "pdp.tab.reviews": "Reviews",
  "pdp.tab.processing": "Verwerking & advies",
  "pdp.reviews.basedOnPre": "Gebaseerd op ",
  "pdp.reviews.basedOnPost": " reviews van geverifieerde klussers.",
  "pdp.reviews.verified": "Geverifieerd",
  "pdp.reviews.none": "Nog geen reviews.",
  "pdp.reviews.empty": "Nog geen reviews voor dit product.",
  "pdp.reviews.beFirst": "Wees de eerste die een review schrijft.",
  "rating.none": "Nog geen reviews",
  "pdp.processing.title": "Advies van onze ex-schilders",

  "price.advies": "Adviesprijs",
  "price.normal": "Normaal",
  "price.inclVat": "incl. btw",
  "price.exclVat": "excl. btw",
  "price.from": "vanaf",
  "price.save": "Je bespaart {amount}",
  "price.savePct": " ({pct}%)",
  "price.vsAdvies": " op de adviesprijs",
  "price.vsAccount": " met je gratis KLUSR-account",

  "chat.teaser.product": "Vragen over dit product? Ik help je graag.",
  "chat.teaser.category": "Hulp bij het kiezen? Vraag het de Klushulp.",
  "chat.teaser.cart": "Nog twijfels voor je afrekent? Ik denk mee.",
  "chat.teaser.general": "Hoi! 👋 Vragen over je klus? Stel ze gerust.",
  "chat.teaser.cta": "Chat met de Klushulp",
  "chat.teaser.openAria": "Open de chat met de Klushulp",
  "chat.teaser.dismissAria": "Sluit de chatuitnodiging",

  "delivery.beforeCutoff": "Vóór {time} besteld, {day} in huis",
  "delivery.afterCutoff": "Besteld → {day} in huis",
  "delivery.today": "vanavond",
  "delivery.tomorrow": "morgen",
  "delivery.dayAfter": "overmorgen",
  "delivery.countdown": "nog {h} u {m} m",
};

const en: Messages = {
  "usp.advice": "Advice from former painters",
  "usp.quality": "Professional quality",
  "usp.everything": "Everything for your project",
  "usp.delivery": "Order before 09:00, delivered this evening",

  "nav.customerService": "Customer service",
  "nav.cart": "Cart",
  "nav.cartAria": "Cart, {count} items",
  "search.placeholder": "What are you looking for?",

  "footer.newsletter.title": "Never miss a deal",
  "footer.newsletter.text":
    "Sign up for the newsletter and receive DIY tips, inspiration and the sharpest KLUSRPAS offers.",

  "footer.tagline":
    "The best PAINT and everything you need RIGHT NOW for the job. Advice from former painters, professional quality.",

  "footer.col.assortment": "Range",
  "footer.col.customerService": "Customer service",
  "footer.col.about": "About KLUSR",

  "footer.service.customerService": "Customer service",
  "footer.service.faq": "Frequently asked questions",
  "footer.service.orderStatus": "Track your order",
  "footer.service.shippingReturns": "Shipping & returns",
  "footer.service.returnPolicy": "Return policy",
  "footer.service.securePayment": "Secure payment",
  "footer.service.warranty": "Warranty & service",

  "footer.about.aboutKlusr": "About KLUSR",
  "footer.about.kluspas": "KLUSRPAS",
  "footer.about.business": "Business & ProfPas",
  "footer.about.mixPaint": "Mixed paint",
  "footer.about.colors": "All colours & collections",
  "footer.about.advice": "Advice & inspiration",
  "footer.about.klushulp": "Klushulp",
  "footer.about.careers": "Careers at KLUSR",

  "footer.bottom.copyright": "© {year} KLUSR B.V. — All prices incl. VAT.",
  "footer.bottom.terms": "Terms & conditions",
  "footer.bottom.returnPolicy": "Return policy",
  "footer.bottom.privacy": "Privacy",
  "footer.bottom.cookies": "Cookie policy",
  "footer.bottom.accessibility": "Accessibility",
  "footer.bottom.securePaymentVia": "Secure payment via",
  "footer.trust.payTitle": "Secure payment",
  "footer.trust.shipTitle": "Shipped with",

  "lang.label": "Language",
  "lang.continueIn": "Continue in {language}?",
  "lang.dismiss": "Dismiss",

  "home.hero.badge": "Advice from former painters",
  "home.hero.titleLead": "The best ",
  "home.hero.titlePaint": "PAINT",
  "home.hero.titleMid": " and everything you ",
  "home.hero.titleNow": "RIGHT NOW",
  "home.hero.titleTail": " need for the job!",
  "home.hero.subtitle":
    "Professional quality, mixed to colour. From interior and exterior paint to tools, hardware and electrical.",
  "home.hero.cta": "Browse our range",
  "home.hero.klushulp": "Klushulp",

  "home.heroAi.chip": "Klushulp · advice from former painters",
  "home.heroAi.title": "What's your project?",
  "home.heroAi.text":
    "Ask your question right away — our Klushulp helps you with paint, quantities and the right tools.",
  "home.heroAi.placeholder": "E.g. which paint for my bathroom?",
  "home.heroAi.inputAria": "Ask your project question to Klushulp",
  "home.heroAi.submitAria": "Ask Klushulp",
  "home.heroAi.example.bedroom": "Which paint for my bedroom?",
  "home.heroAi.example.liters": "How many litres do I need?",
  "home.heroAi.example.primer": "Which primer on bare wood?",

  "home.funnel.title": "What are you up to?",
  "home.funnel.subtitle": "Choose your project and we'll help you with the right products and advice.",

  "home.verf.title": "Paint — our speciality",
  "home.verf.subtitle": "Mixed to colour, professional quality",

  "home.popular.title": "Popular products",
  "home.popular.subtitle": "Our DIYers' favourites",
  "home.popular.link": "More products",

  "home.acties.title": "Deals & offers",
  "home.acties.subtitle": "Extra savings for a limited time",

  "home.kluspas.badge": "KLUSPAS",
  "home.kluspas.title": "Become a member and always pay the lowest price",
  "home.kluspas.text":
    "With the free KLUSRPAS you instantly get KLUSRPAS prices across the entire range and never miss a deal.",
  "home.kluspas.cta": "Apply for your KLUSRPAS",
  "home.kluspas.benefit1": "Always the sharpest KLUSRPAS price",
  "home.kluspas.benefit2": "Exclusive deals and priority during sales",
  "home.kluspas.benefit3": "Free colour advice via the Klushulp",
  "home.kluspas.benefit4": "Save up for project credit",

  "home.inspiration.title": "Inspiration & advice",
  "home.inspiration.subtitle": "DIY tips and step-by-step guides from our experts",

  "home.categories.title": "Shop by category",
  "home.categories.subtitle": "Everything for your project under one roof",

  "home.trending.link": "View all",

  "home.forYou.title": "Just for you",
  "home.forYou.subtitle": "Recommended based on what you viewed and ordered",
  "home.viewed.title": "Keep browsing",
  "home.viewed.subtitle": "Recently viewed by you",

  "cart.title": "Cart",
  "cart.loading": "Loading…",
  "cart.empty.title": "Your cart is empty",
  "cart.empty.drawerText": "Add products to complete your project.",
  "cart.empty.viewText": "Browse our range and complete your project.",
  "cart.empty.startPaint": "Start with paint",
  "cart.empty.viewPaint": "Browse paint",
  "cart.empty.klushulp": "Klushulp",

  "cart.freeShipping.reachedPre": "Congratulations! You get ",
  "cart.freeShipping.reachedBold": "free shipping",
  "cart.freeShipping.reachedPost": ".",
  "cart.freeShipping.remainingPre": "Just ",
  "cart.freeShipping.remainingPost": " to go for free shipping",

  "cart.item.remove": "Remove",
  "cart.item.save": "Save",
  "cart.item.removeLabel": "Remove",
  "cart.item.add": "Add",
  "cart.forgotten": "Often forgotten",
  "cart.moveToCart": "Add to cart",
  "cart.savedForLater": "Saved for later ({count})",

  "cart.summary.title": "Summary",
  "cart.kluspasDiscount": "KLUSRPAS benefit",
  "cart.kluspas.nudge": "Save {amount} with KLUSRPAS — log in or create a free account",
  "cart.profpasDiscount": "ProfPas discount",
  "cart.subtotal": "Subtotal",
  "cart.exclVat": " (excl. VAT)",
  "cart.shipping": "Shipping",
  "cart.free": "Free",
  "cart.vat": "VAT (21%)",
  "cart.total": "Total",
  "cart.vatIncluded": "Incl. VAT",
  "cart.vatIncludedBusiness": "Incl. VAT · business prices shown excl. VAT",
  "cart.checkout": "Proceed to checkout",
  "cart.continueShopping": "Continue shopping",
  "cart.toCart": "Go to cart",

  "cart.usp.returns": "Return within 14 days",
  "cart.usp.payment": "Secure payment via Mollie",

  "cart.upsell.title": "Complete your project",
  "cart.upsell.subtitle": "DIYers often also bought",

  "checkout.title": "Checkout",
  "checkout.backToCart": "Back to cart",
  "checkout.empty.text": "Add products first to check out.",
  "checkout.empty.toRange": "Go to the range",

  "checkout.private": "Personal",
  "checkout.business": "Business (excl. VAT)",

  "checkout.reorderFree":
    "Free shipping — you're ordering within 15 minutes of your previous order.",

  "checkout.loggedInPre": "You're logged in as ",
  "checkout.loggedInPost": ". Your order will be linked to your account.",
  "checkout.guest.title": "You're checking out as a guest — super fast, no account needed",
  "checkout.guest.text":
    "Enter your details and order straight away. At the bottom you can create an account with a single tick for your order history.",
  "checkout.guest.haveAccount": "Already have an account? Log in",
  "checkout.login.emailPlaceholder": "Email address",
  "checkout.login.passwordPlaceholder": "Password",
  "checkout.login.submit": "Log in",
  "checkout.login.error": "Login failed. Please check your email address and password.",
  "checkout.login.forgotPre": "Forgot your password or prefer a login link? ",
  "checkout.login.forgotLink": "Go to log in",

  "checkout.section.contact": "Contact details",
  "checkout.section.delivery": "Delivery address",
  "checkout.section.shipping": "Shipping method",
  "checkout.section.payment": "Payment method",

  "checkout.field.email": "Email address",
  "checkout.field.emailPlaceholder": "you@example.com",
  "checkout.createAccount.labelBold": "Create an account right away",
  "checkout.createAccount.labelRest": " — save your details and view your orders later. ",
  "checkout.createAccount.optional": "(optional)",
  "checkout.createAccount.passwordPlaceholder": "Choose a password (min. 8 characters)",
  "checkout.createAccount.passwordHint": "At least 8 characters.",
  "checkout.field.company": "Company name",
  "checkout.field.companyPlaceholder": "Company Ltd.",
  "checkout.field.coc": "CoC number",
  "checkout.field.vat": "VAT number",

  "checkout.field.country": "Country",
  "checkout.country.outsideNote":
    "Outside NL and BE, fixed shipping costs apply (no free shipping).",
  "checkout.field.firstName": "First name",
  "checkout.field.lastName": "Last name",
  "checkout.field.postalCode": "Postcode",
  "checkout.field.houseNumber": "No.",
  "checkout.field.addition": "Addition",
  "checkout.field.street": "Street",
  "checkout.field.streetLookup": "Street (looking up address…)",
  "checkout.field.autofill": "Filled in automatically",
  "checkout.field.city": "City",
  "checkout.field.phone": "Phone (optional)",
  "checkout.billing.toggle": "Billing address differs from the delivery address",
  "checkout.billing.companyOptional": "Company name (optional)",
  "checkout.billing.streetAndNumber": "Street and house number",
  "checkout.billing.streetPlaceholder": "Street name 1",

  "checkout.delivery.title": "Delivery",

  "checkout.summary.title": "Your order",
  "checkout.billieSurcharge": "Billie surcharge",
  "checkout.terms.pre": "I agree to the ",
  "checkout.terms.termsLink": "terms & conditions",
  "checkout.terms.mid": " and the ",
  "checkout.terms.privacyLink": "privacy policy",
  "checkout.terms.post": ".",
  "checkout.newsletter":
    "Keep me posted on DIY tips and KLUSRPAS offers (newsletter).",
  "checkout.pay": "Pay {amount}",
  "checkout.chooseBankHint": "Choose your bank to continue.",
  "checkout.choosePaymentHint": "Please choose a payment method first.",
  "checkout.usp.freeReturn": "Return within 14 days",
  "checkout.usp.fastDelivery": "Fast delivery",

  "checkout.trust.heading": "What customers say about KLUSR",
  "checkout.trust.based": "{average} — based on {count} reviews",
  "checkout.trust.verified": "Verified purchase",

  "checkout.error.choosePayment": "Please choose a payment method first.",
  "checkout.error.chooseBank": "Please choose your bank for iDEAL first.",
  "checkout.error.accountPassword":
    "Choose a password of at least 8 characters for your account.",
  "checkout.error.card": "Please check your card details and try again.",
  "checkout.error.paymentFailed": "Failed to create payment",
  "checkout.error.generic": "Something went wrong",

  "checkout.payment.chooseBank": "Choose your bank",
  "checkout.payment.hint.ideal": "Pay directly with your own bank",
  "checkout.payment.hint.creditcard": "Visa, Mastercard",
  "checkout.payment.hint.klarna": "Pay later — within 14 days",
  "checkout.payment.hint.bancontact": "Pay with your Bancontact card",

  "checkout.reorder.title": "Forgotten something?",
  "checkout.reorder.textPre": "Order something else within ",
  "checkout.reorder.textMinutes": "15 minutes",
  "checkout.reorder.textMid": " and pay ",
  "checkout.reorder.textBold": "no extra shipping costs",
  "checkout.reorder.textPost": " — we'll send it in a single parcel.",
  "checkout.reorder.added": "Added — no extra shipping costs",
  "checkout.reorder.addAria": "Add {title}",
  "checkout.reorder.toCart": "Go to cart",
  "checkout.reorder.continueShopping": "Continue shopping",

  "checkout.thanks.title": "Thank you for your order!",
  "checkout.thanks.text":
    "We've received your order and we'll get started on it right away.",
  "checkout.thanks.confirmationSentPre": " A confirmation has been sent to ",
  "checkout.thanks.confirmationSentPost": ".",
  "checkout.thanks.orderNumber": "Order number",
  "checkout.thanks.orderDate": "Order date",
  "checkout.thanks.subtotal": "Subtotal",
  "checkout.thanks.shipping": "Shipping",
  "checkout.thanks.totalPaid": "Total paid",
  "checkout.thanks.free": "Free",
  "checkout.thanks.expectedDelivery": "Expected delivery: {date}",
  "checkout.thanks.step.confirmation.title": "Confirmation",
  "checkout.thanks.step.confirmation.hint": "Check your inbox",
  "checkout.thanks.step.packing.title": "Being packed",
  "checkout.thanks.step.packing.hint": "Today still",
  "checkout.thanks.step.onTheWay.title": "On its way",
  "checkout.thanks.step.onTheWay.hint": "Track your parcel",
  "checkout.thanks.trackOrder": "Track your order",
  "checkout.thanks.continueShopping": "Continue shopping",
  "checkout.thanks.downloadInvoice": "Download your invoice (PDF)",
  "checkout.thanks.deliveryAddress": "Delivery address",
  "checkout.thanks.loadError":
    "We couldn't load the order details, but your payment was received in good order. You'll receive a confirmation by email.",
  "checkout.thanks.backHome": "Back to home",
  "checkout.thanks.successBadge": "Payment successful",
  "checkout.thanks.orderSummary": "Your order",
  "checkout.thanks.needHelp.title": "Questions about your order?",
  "checkout.thanks.needHelp.text":
    "Our team is happy to help — from delivery times to product advice.",
  "checkout.thanks.needHelp.cta": "Go to customer service",
  "checkout.pending.title": "We're processing your payment…",
  "checkout.pending.text":
    "Your payment is still being confirmed by your bank. This usually only takes a few seconds.",
  "checkout.pending.hint":
    "This page refreshes automatically once your payment is complete. There's nothing you need to do.",
  "checkout.pending.refreshNow": "Refresh status now",
  "checkout.pending.backHome": "Back to home",
  "checkout.failed.title": "Your payment didn't go through",
  "checkout.failed.canceledTitle": "Your payment was canceled",
  "checkout.failed.expiredTitle": "Your payment expired",
  "checkout.failed.text":
    "No amount was charged. You can safely try again.",
  "checkout.failed.cartKept": "Your shopping cart has been kept.",
  "checkout.failed.retry": "Try again",
  "checkout.failed.toCart": "Go to cart",
  "checkout.failed.help": "Need help? Contact customer service",
  "checkout.failed.orderRef": "Order number: {ref}",

  "checkout.validation.required": "Required",
  "checkout.validation.email": "Enter a valid email address",
  "checkout.validation.postalCode": "Enter your postcode",
  "checkout.validation.street": "Enter your street name",
  "checkout.validation.terms": "Please accept the terms & conditions to place your order.",
  "checkout.validation.postalCodeNl": "E.g. 7443 BR",
  "checkout.validation.coc": "A CoC number has 8 digits.",
  "checkout.validation.vat": "Enter a valid VAT number, e.g. NL000000000B00.",

  "service.hero.kicker": "Customer service",
  "service.hero.title": "How can we help you?",
  "service.hero.subtitle":
    "Find quick answers to the most frequently asked questions below, or get in touch with us directly. Our DIYers are ready to help.",

  "service.trust.delivery": "Order before 09:00, delivered this evening",
  "service.trust.returns": "14-day right of withdrawal",
  "service.trust.payment": "Secure payment via Mollie",
  "service.trust.advice": "Advice from former painters",
  "service.trust.warranty": "Statutory warranty on everything",

  "service.contact.call.title": "Call us",
  "service.contact.call.description": "Mon–Fri 09:00 - 18:00",
  "service.contact.mail.title": "Email us",
  "service.contact.mail.description": "Reply within 1 working day",
  "service.contact.store.title": "Colour advice",
  "service.contact.store.description": "Free advice from our former painters",
  "service.contact.store.action": "Go to the colour picker",
  "service.contact.ai.title": "Klushulp",
  "service.contact.ai.description": "Instant answers, day and night",
  "service.contact.ai.action": "Ask your question",

  "service.shipping.title": "Shipping costs",
  "service.shipping.subtitle":
    "Free shipping from {amount} in the Netherlands and Belgium. Ordered before 09:00 on working days? Then your parcel will be delivered this evening.",
  "service.shipping.rowNl": "Netherlands",
  "service.shipping.freeFrom": "· free from {amount}",
  "service.shipping.mailbox": "Letterbox parcel (NL)",
  "service.shipping.mailboxHint": "Small, flat items that fit through the letterbox",
  "service.shipping.rowBe": "Belgium",
  "service.shipping.outsideNote":
    "We deliver throughout the EU. Outside the Netherlands and Belgium there is no free shipping. We don't ship outside the EU — including Switzerland and the United Kingdom — due to customs.",

  "service.group.shipping.title": "Shipping & returns",
  "service.group.shipping.intro":
    "Free shipping from {free} in NL and BE, ordered before 09:00 means delivery this evening, and returns by post with a return label — return shipping is at your own expense. To the rest of the EU from {eu}.",
  "service.group.payment.title": "Secure payment",
  "service.group.payment.intro":
    "Pay easily and securely with iDEAL, Bancontact, credit card or pay later with Klarna via Mollie.",
  "service.group.warranty.title": "Warranty & service",
  "service.group.warranty.intro":
    "Statutory warranty on everything, plus personal service from our former painters.",
  "service.group.mengverf.title": "Mixed paint & colour advice",
  "service.group.mengverf.intro":
    "Every colour mixed to measure with an exact colour match. Please note: colour-mixed paint is made to order and cannot be returned.",
  "service.group.kluspas.title": "KLUSRPAS & business",
  "service.group.kluspas.intro":
    "Free KLUSRPAS benefits for consumers, and the ProfPas with 10% discount (excl. VAT) for business customers.",

  "service.faq.shipping.when.q": "When will my order be delivered?",
  "service.faq.shipping.when.a":
    "Order before 09:00 on working days? Then your order will be delivered this evening. You'll receive a track & trace code as soon as your parcel is on its way.",
  "service.faq.shipping.cost.q": "How much does shipping cost?",
  "service.faq.shipping.cost.a":
    "In the Netherlands and Belgium, shipping is free from {nlFree}. Below that you pay {nlPrice} in the Netherlands and {bePrice} in Belgium. We send small, flat items as a letterbox parcel for {mailbox} (NL only). To the other EU countries we deliver from {eu}; no free shipping applies there. You'll always see the exact shipping costs during checkout.",
  "service.faq.shipping.abroad.q": "Do you also deliver abroad?",
  "service.faq.shipping.abroad.a":
    "We deliver throughout the EU. Shipping to Belgium is free from {beFree}; for the other EU countries a fixed rate per country applies from {eu}, which you'll see during checkout. We don't ship outside the EU — including Switzerland and the United Kingdom — due to customs.",
  "service.faq.shipping.return.q": "How do I return a product?",
  "service.faq.shipping.return.a":
    "Returns are possible by post with a return label; return shipping is at your own expense. Register your return via your account or customer service and you'll receive the return label and instructions. You have 14 days to change your mind.",

  "service.faq.payment.methods.q": "Which payment methods do you accept?",
  "service.faq.payment.methods.a":
    "You pay securely with iDEAL, Bancontact, credit card or afterwards via Klarna. All payments are encrypted via our payment partner Mollie.",
  "service.faq.payment.afterwards.q": "Can I pay afterwards?",
  "service.faq.payment.afterwards.a":
    "Yes, with Klarna you pay securely afterwards. You only pay after you've received and checked your order.",
  "service.faq.payment.safe.q": "Is paying online safe?",
  "service.faq.payment.safe.a":
    "Absolutely. All transactions run through Mollie, a certified payment service. We don't store any payment details ourselves.",

  "service.faq.warranty.products.q": "What warranty do I get on products?",
  "service.faq.warranty.products.a":
    "All our products come with the statutory warranty. In addition, many brands offer their own manufacturer's warranty. Is something wrong with your product? Get in touch and we'll find a solution together.",
  "service.faq.warranty.damaged.q": "My product arrived damaged, what now?",
  "service.faq.warranty.damaged.a":
    "How annoying! Contact our customer service within 48 hours and include a photo. We'll send a replacement product free of charge or refund the amount.",
  "service.faq.warranty.store.q": "How do I get service or advice?",
  "service.faq.warranty.store.a":
    "KLUSR is fully online. Our former painters are happy to help you with advice or questions about your purchase via customer service or the Klushulp — you'll get a quick, personal answer.",

  "service.faq.mengverf.return.q": "Can I return colour-mixed paint?",
  "service.faq.mengverf.return.a":
    "We mix colour-mixed paint to measure especially for you. That's why it's — like other made-to-measure products — legally excluded from the right of withdrawal and we can't take mixed paint back. Is something unexpectedly wrong with the colour or the product? Then get in touch and we'll sort it out together free of charge.",
  "service.faq.mengverf.match.q": "How accurate is the colour match?",
  "service.faq.mengverf.match.a":
    "We mix based on professional colour codes (including RAL, Gamma and AkzoNobel) for an exact match. Unsure about a colour? Order a colour tester or sample pot first before having the whole quantity mixed — keep in mind that on-screen colours may differ slightly.",
  "service.faq.mengverf.amount.q": "How much paint do I need?",
  "service.faq.mengverf.amount.a":
    "As a rough guide, count on 1 litre per 8–10 m² per coat. On the product page and via our Klushulp we calculate it exactly for you, so you don't order too much or too little.",
  "service.faq.mengverf.instore.q": "How do I have paint mixed to colour?",
  "service.faq.mengverf.instore.a":
    "Choose your colour online in the colour picker and order the matching paint. Our colour specialists mix your paint expertly to the exact colour and we deliver it to your door, ready to use.",

  "service.faq.kluspas.what.q": "What is the KLUSRPAS and how much does it cost?",
  "service.faq.kluspas.what.a":
    "The KLUSRPAS is completely free and instantly gives you the sharper KLUSRPAS price on the entire collection, plus exclusive deals. You activate it when creating an account.",
  "service.faq.kluspas.business.q": "I order for my business — is that possible?",
  "service.faq.kluspas.business.a":
    "Yes. For freelancers, painters and companies we have the KLUSR ProfPas: 10% discount on the entire collection and prices excl. VAT, on invoice. You can register for free via the business page.",
  "service.faq.kluspas.invoice.q": "Do I get an invoice with VAT?",
  "service.faq.kluspas.invoice.a":
    "Yes, with every order you receive a proper invoice with VAT specified. Business customers see prices excl. VAT and pay on invoice.",

  "service.general.title": "Ordering & account",
  "service.faq.general.order.q": "How do I place an order?",
  "service.faq.general.order.a":
    "Add products to your basket, go to the checkout and follow the steps. You don't need an account to order, but with an account it's faster next time.",
  "service.faq.general.account.q": "Do I need an account?",
  "service.faq.general.account.a":
    "No, you can order as a guest. With an account you do keep your details, order history and your KLUSRPAS benefits in one place.",
  "service.faq.general.mix.q": "Can I have paint mixed to colour?",
  "service.faq.general.mix.a":
    "Yes! We mix any desired colour to measure. Choose your colour online in the colour picker and our colour specialists mix your paint expertly to the exact colour, then deliver it ready to use.",

  "service.guarantee.title": "Not happy? Money back.",
  "service.guarantee.text":
    "We want you to start your project with peace of mind. That's why: 14 days to change your mind, returns by post with a return label (return shipping is at your own expense) and a statutory warranty on everything. Colour-mixed paint is made to order and therefore excluded from returns — but in the event of a defect we'll always sort it out free of charge.",
  "service.guarantee.cta": "Read the return policy",

  "service.contactBlock.title": "Can't find your question?",
  "service.contactBlock.text":
    "Send us a message. You'll immediately receive a ticket number and a confirmation by email — we usually reply within 1 working day.",
  "service.contactBlock.preferPre": "Prefer an instant answer? ",
  "service.contactBlock.preferLink": "Ask the Klushulp",
  "service.contactBlock.preferPost": " — available 24/7.",
  "service.contactBlock.viewStorePage": "Ask the Klushulp",

  "faq.meta.breadcrumb": "Frequently asked questions",
  "faq.badge": "Help & info",
  "faq.title": "Frequently asked questions",
  "faq.subtitle": "Didn't find what you're looking for? Our customer service is happy to help.",
  "faq.more.title": "Another question?",
  "faq.more.text": "We're happy to help you personally.",
  "faq.more.cta": "To customer service",

  "faq.group.ordering": "Ordering & payment",
  "faq.group.delivery": "Delivery & returns",
  "faq.group.mengverf": "Mixed paint & colour",
  "faq.group.kluspas": "KLUSRPAS",

  "faq.order.how.q": "How do I place an order?",
  "faq.order.how.a":
    "Add products to your cart and check out securely. For paint, you first choose your colour — which we mix exactly for you.",
  "faq.order.payment.q": "Which payment methods do you accept?",
  "faq.order.payment.a":
    "You pay securely via Mollie with iDEAL, credit card and — where available — pay later, among others.",
  "faq.order.account.q": "Do I need an account?",
  "faq.order.account.a":
    "No, you can order as a guest. With a (free) account and KLUSRPAS you do benefit from extra savings and keep your orders and colours.",
  "faq.order.account.text":
    "No, you can order as a guest. With a free account and KLUSRPAS you benefit from extra savings and keep your orders and colours.",

  "faq.delivery.when.q": "When will my order arrive?",
  "faq.delivery.when.a":
    "Ordered before 09:00 on working days, delivered this evening. Shipping is free from € 50, below that we charge € 4,95.",
  "faq.delivery.pickup.q": "Can I collect my order?",
  "faq.delivery.pickup.aPre": "KLUSR is fully online — we deliver throughout the Netherlands and Belgium. Questions about your delivery? Our ",
  "faq.delivery.pickup.aLink": "customer service",
  "faq.delivery.pickup.aPost": " is happy to help.",
  "faq.delivery.pickup.text": "KLUSR is fully online — we deliver throughout the Netherlands and Belgium. Collection is not available.",
  "faq.delivery.return.q": "How do I return a product?",
  "faq.delivery.return.aPre": "You have 14 days to change your mind. Report your return to our ",
  "faq.delivery.return.aLink": "customer service",
  "faq.delivery.return.aMid": ". Please note: colour-mixed paint is excluded from returns (see ",
  "faq.delivery.return.aTermsLink": "terms",
  "faq.delivery.return.aPost": ").",
  "faq.delivery.return.text":
    "You have 14 days to change your mind. Report your return to our customer service. Colour-mixed paint is excluded from returns.",

  "faq.mengverf.any.q": "Can I have any colour mixed?",
  "faq.mengverf.any.aPre":
    "Yes. Choose from thousands of colours (Gamma, Sikkens, RAL, AkzoNobel) or your own shade in our ",
  "faq.mengverf.any.aLink": "colour picker",
  "faq.mengverf.any.aPost": ". We mix the paint to colour exactly.",
  "faq.mengverf.any.text":
    "Yes. Choose from thousands of colours (Gamma, Sikkens, RAL, AkzoNobel) or your own shade in our colour picker. We mix the paint to colour exactly.",
  "faq.mengverf.how.q": "How exactly does mixed paint work?",
  "faq.mengverf.how.aPre":
    "You choose a colour, we mix it professionally into the right base. Read more on ",
  "faq.mengverf.how.aLink": "the mixed paint page",
  "faq.mengverf.how.aPost": ".",
  "faq.mengverf.how.text":
    "You choose a colour, we mix it professionally into the right base. Read more on the mixed paint page.",
  "faq.mengverf.exchange.q": "Can I exchange mixed paint?",
  "faq.mengverf.exchange.a":
    "We make colour-mixed paint especially for you and it is therefore excluded from the right of withdrawal, unless there is a defect.",

  "faq.kluspas.what.q": "What is the KLUSRPAS?",
  "faq.kluspas.what.aPre":
    "The free KLUSRPAS always gives you the sharpest price and exclusive deals. Read all about it on the ",
  "faq.kluspas.what.aLink": "KLUSRPAS page",
  "faq.kluspas.what.aPost": ".",
  "faq.kluspas.what.text":
    "The free KLUSRPAS always gives you the sharpest price and exclusive deals.",
  "faq.kluspas.cost.q": "How much does the KLUSRPAS cost?",
  "faq.kluspas.cost.a": "Nothing — the KLUSRPAS is free to request and use.",

  "about.breadcrumb": "About KLUSR",
  "about.hero.kicker": "About KLUSR",
  "about.hero.titleLead": "The best paint and everything you need ",
  "about.hero.titleAccent": "right now",
  "about.hero.titleTail": " for the job",
  "about.hero.intro":
    "KLUSR was born out of a simple frustration: too often you'd leave the DIY store with the wrong paint and without good advice. That can be better. At KLUSR you get professional quality, the sharpest price and advice from people who really know the trade — former painters.",

  "about.value.advice.title": "Advice from former painters",
  "about.value.advice.body":
    "Our people spent years with the brush in hand themselves. You get that advice for free.",
  "about.value.color.title": "Every colour, mixed exactly",
  "about.value.color.body":
    "Thousands of colours from all the well-known fan decks — professionally mixed to colour, ready to use.",
  "about.value.quality.title": "Professional quality",
  "about.value.quality.body":
    "Top brands, sharply priced, and with the free KLUSRPAS always the most savings on your whole project.",

  "about.story.title": "Our story",
  "about.story.p1":
    "What began with a mixing machine and a lot of knowledge grew into the online DIY specialist for do-it-yourselfers and professionals. The common thread stayed the same: the best advice and the right materials, for both the do-it-yourselfer and the professional.",
  "about.story.p2":
    "Today we bring that knowledge together in a complete webshop. Online the sharpest KLUSRPAS price, your colour mixed exactly and delivered to your door, with personal advice from our former painters via the Klushulp and customer service.",

  "about.stores.title": "Online, across the country",
  "about.stores.all": "View the range",

  "about.cta.title": "Ready to get started?",
  "about.cta.text": "Request your KLUSRPAS for free and grab the savings right away.",
  "about.cta.button": "More about KLUSRPAS",

  "notFound.code": "404",
  "notFound.title": "We couldn't find this page",
  "notFound.text":
    "The page has moved or no longer exists. Search below — there's a good chance we'll find what you're looking for.",
  "notFound.searchPlaceholder": "Search a product, brand or colour…",
  "notFound.searchSubmit": "Search",
  "notFound.searchAria": "Search",
  "notFound.popular": "Popular at KLUSR",
  "notFound.popular.paint": "Paint",
  "notFound.popular.colorPicker": "Colour picker",
  "notFound.popular.tools": "Tools",
  "notFound.popular.advice": "DIY advice",
  "notFound.toHome": "To the homepage",
  "notFound.customerService": "Customer service",

  "plp.filters": "Filters",
  "plp.clearFilters": "Clear filters",
  "plp.clearFiltersCount": "Clear filters ({count})",
  "plp.clearAll": "Clear all filters",
  "plp.resultCount": "products",
  "plp.resultCountOne": "product",
  "plp.show": "Show {count} products",
  "plp.showOne": "Show {count} product",
  "plp.sortAria": "Sort",
  "plp.sort.populair": "Popular",
  "plp.sort.priceAsc": "Price low to high",
  "plp.sort.priceDesc": "Price high to low",
  "plp.sort.rating": "Best rated",
  "plp.sort.newest": "Newest",

  "plp.group.mengverf": "Mixed paint",
  "plp.group.productType": "Product type",
  "plp.group.price": "Price",
  "plp.group.volume": "Volume",
  "plp.group.rating": "Rating",
  "plp.group.dealsLabels": "Deals & labels",
  "plp.group.brand": "Brand",

  "plp.facet.glans": "Sheen",
  "plp.facet.materiaal": "Material",
  "plp.facet.fitting": "Fitting",
  "plp.facet.dessin": "Pattern",
  "plp.facet.toepassing": "Use",
  "plp.facet.korrel": "Grit",
  "plp.facet.lichtkleur": "Light colour",
  "plp.facet.type": "Type",

  "plp.priceBucket.lt25": "Up to € 25",
  "plp.priceBucket.mid": "€ 25 – € 50",
  "plp.priceBucket.high": "€ 50 – € 100",
  "plp.priceBucket.top": "From € 100",

  "plp.rating.min4": "4 stars & up",
  "plp.rating.min45": "4.5 stars & up",
  "plp.ratingChip": "{rating}+ stars",

  "plp.badge.actie": "Sale",
  "plp.badge.bestseller": "Bestseller",
  "plp.badge.proKeuze": "Pro choice",
  "plp.badge.nieuw": "New",
  "plp.badge.bundel": "Value bundle",

  "plp.colorMixable": "Mixed to colour",
  "plp.viewAria": "View",
  "plp.viewGrid": "Grid view",
  "plp.viewList": "List view",
  "plp.empty.title": "No products found",
  "plp.empty.text": "Adjust your filters to see more results.",
  "plp.favorite": "Save as favourite",

  "finder.title": "Not sure what you need?",
  "finder.subtitle": "Tell us briefly about your project and we'll find the right products for you.",
  "finder.placeholder": "E.g. paint for my wooden window frames outside",
  "finder.inputAria": "Describe your project",
  "finder.submit": "Find products",
  "finder.submitShort": "Find",
  "finder.applied": "Filters applied to your project.",
  "finder.none": "No specific filter found — refine your question or use the filters.",
  "finder.error": "That didn't quite work. Try again or use the filters on the left.",

  "pdp.addToCart": "Add to cart",
  "pdp.buyNow": "Buy now",
  "pdp.reviewsLink": "{rating} · {count} reviews",
  "pdp.sizeLabel": "Size / volume:",
  "pdp.color": "Colour",
  "pdp.chooseColor": "Choose your colour",
  "pdp.changeColor": "Change colour",
  "pdp.anyColor":
    "Any colour possible — we mix the paint exactly to your chosen shade. Pick a colour to see it on the wall.",
  "pdp.mixed.pre": "Will be ",
  "pdp.mixed.bold": "professionally mixed to colour",
  "pdp.mixed.inBase": " in {base}",
  "pdp.mixed.post": ". Exact match, ready to use.",
  "pdp.chooseColorTitle": "Choose a colour first",
  "pdp.chooseColorBuy": "Select a colour before ordering this paint.",
  "pdp.chooseColorAdd": "Select a colour before adding this paint.",
  "pdp.addedToCart": "Added to cart",
  "pdp.favAdded": "Added to favourites",
  "pdp.favRemoved": "Removed from favourites",
  "pdp.favSave": "Save for later",
  "pdp.favSaved": "Saved to favourites",
  "pdp.kluspasPrice": "KLUSRPAS price",
  "pdp.profpasPrice": "ProfPas price",
  "pdp.normalPrice": "Regular price",
  "pdp.withoutAccount": "— without an account",
  "pdp.kluspas.title": "KLUSRPAS price — free for everyone",
  "pdp.kluspas.body":
    "Choose to create a free account at checkout and the KLUSRPAS discount is applied right away. No subscription, no obligations.",
  "pdp.kluspas.link": "What is the KLUSRPAS?",
  "pdp.kluspas.drawer.intro":
    "The KLUSRPAS is KLUSR's free loyalty pass. Pass holders always pay the lowest price across the entire range.",
  "pdp.kluspas.drawer.benefit1": "Always the lowest KLUSRPAS price",
  "pdp.kluspas.drawer.benefit2": "Exclusive deals and offers",
  "pdp.kluspas.drawer.benefit3": "Free personal colour advice",
  "pdp.kluspas.drawer.benefit4": "Earn klustegoed on every purchase",
  "pdp.kluspas.drawer.how":
    "Create a free account; the discount is applied right away at checkout. No obligations.",
  "pdp.kluspas.drawer.cta": "Create an account",
  "pdp.kluspas.drawer.more": "Read more about the KLUSRPAS",
  "pdp.kluspas.teaserTitle": "{price} with KLUSRPAS",
  "pdp.kluspas.teaserCta": "Log in or create a free account",
  "pdp.kluspas.teaserSave": "Save {amount} · {pct}% off",
  "pdp.surcharge": "Incl. {base} (+{amount} for a dark colour)",
  "pdp.perLiter": "{price} per litre",
  "pdp.discountBadge": "{pct}% OFF",
  "pdp.withPass": "with {pass}",
  "pdp.passExplain": "{pct}% off the entire range with your free {pass}.",
  "pdp.yourPrice": "Your price",
  "pdp.yourPassPrice": "with {pass}",
  "pdp.passApplied": "{pct}% off, automatically applied with your {pass}.",
  "pdp.perLiterCheaper": "larger tin is cheaper per litre",
  "pdp.stockForBasePre": "Stock shown for ",
  "pdp.stockForBasePost": " — each base has its own stock.",

  "pdp.usp.freeShipping": "Free shipping from €50",
  "pdp.usp.returns": "Returns within 14 days",
  "pdp.usp.afterpay": "Pay later available",

  "pdp.tab.description": "Description",
  "pdp.tab.specs": "Specifications",
  "pdp.tab.reviews": "Reviews",
  "pdp.tab.processing": "Application & advice",
  "pdp.reviews.basedOnPre": "Based on ",
  "pdp.reviews.basedOnPost": " reviews from verified DIYers.",
  "pdp.reviews.verified": "Verified",
  "pdp.reviews.none": "No reviews yet.",
  "pdp.reviews.empty": "No reviews for this product yet.",
  "pdp.reviews.beFirst": "Be the first to write a review.",
  "rating.none": "No reviews yet",
  "pdp.processing.title": "Advice from our former painters",

  "price.advies": "RRP",
  "price.normal": "Regular",
  "price.inclVat": "incl. VAT",
  "price.exclVat": "excl. VAT",
  "price.from": "from",
  "price.save": "You save {amount}",
  "price.savePct": " ({pct}%)",
  "price.vsAdvies": " on the RRP",
  "price.vsAccount": " with your free KLUSR account",

  "chat.teaser.product": "Questions about this product? I'm happy to help.",
  "chat.teaser.category": "Need help choosing? Just ask the Klushulp.",
  "chat.teaser.cart": "Still unsure before you check out? I'll think along.",
  "chat.teaser.general": "Hi there! 👋 Questions about your project? Feel free to ask.",
  "chat.teaser.cta": "Chat with the Klushulp",
  "chat.teaser.openAria": "Open the chat with the Klushulp",
  "chat.teaser.dismissAria": "Close the chat invitation",

  "delivery.beforeCutoff": "Order before {time}, delivered {day}",
  "delivery.afterCutoff": "Ordered → delivered {day}",
  "delivery.today": "this evening",
  "delivery.tomorrow": "tomorrow",
  "delivery.dayAfter": "the day after tomorrow",
  "delivery.countdown": "{h}h {m}m left",
};

const fr: Messages = {
  "usp.advice": "Conseils d'anciens peintres",
  "usp.quality": "Qualité professionnelle",
  "usp.everything": "Tout pour vos travaux",
  "usp.delivery": "Commandé avant 19h, livré demain",

  "nav.customerService": "Service client",
  "nav.cart": "Panier",
  "nav.cartAria": "Panier, {count} articles",
  "search.placeholder": "Que recherchez-vous ?",

  "footer.newsletter.title": "Ne manquez aucune offre",
  "footer.newsletter.text":
    "Inscrivez-vous à la newsletter et recevez des astuces bricolage, de l'inspiration et les meilleures offres KLUSRPAS.",

  "footer.tagline":
    "La meilleure PEINTURE et tout ce qu'il vous faut MAINTENANT pour vos travaux. Conseils d'anciens peintres, qualité professionnelle.",

  "footer.col.assortment": "Assortiment",
  "footer.col.customerService": "Service client",
  "footer.col.about": "À propos de KLUSR",

  "footer.service.customerService": "Service client",
  "footer.service.faq": "Questions fréquentes",
  "footer.service.orderStatus": "Suivre ma commande",
  "footer.service.shippingReturns": "Livraison & retours",
  "footer.service.returnPolicy": "Conditions de retour",
  "footer.service.securePayment": "Paiement sécurisé",
  "footer.service.warranty": "Garantie & service",

  "footer.about.aboutKlusr": "À propos de KLUSR",
  "footer.about.kluspas": "KLUSRPAS",
  "footer.about.business": "Professionnels & ProfPas",
  "footer.about.mixPaint": "Peinture sur mesure",
  "footer.about.colors": "Toutes les couleurs & collections",
  "footer.about.advice": "Conseils & inspiration",
  "footer.about.klushulp": "Klushulp",
  "footer.about.careers": "Carrières chez KLUSR",

  "footer.bottom.copyright": "© {year} KLUSR B.V. — Tous les prix TTC.",
  "footer.bottom.terms": "Conditions générales",
  "footer.bottom.returnPolicy": "Conditions de retour",
  "footer.bottom.privacy": "Confidentialité",
  "footer.bottom.cookies": "Politique en matière de cookies",
  "footer.bottom.accessibility": "Accessibilité",
  "footer.bottom.securePaymentVia": "Paiement sécurisé via",
  "footer.trust.payTitle": "Paiement sécurisé",
  "footer.trust.shipTitle": "Expédié avec",

  "lang.label": "Langue",
  "lang.continueIn": "Continuer en {language} ?",
  "lang.dismiss": "Fermer",

  "home.hero.badge": "Conseils d'anciens peintres",
  "home.hero.titleLead": "La meilleure ",
  "home.hero.titlePaint": "PEINTURE",
  "home.hero.titleMid": " et tout ce qu'il vous faut ",
  "home.hero.titleNow": "MAINTENANT",
  "home.hero.titleTail": " pour vos travaux !",
  "home.hero.subtitle":
    "Qualité professionnelle, teintée sur mesure. De la peinture intérieure et extérieure à l'outillage, la quincaillerie et l'électricité.",
  "home.hero.cta": "Découvrir notre assortiment",
  "home.hero.klushulp": "Klushulp",

  "home.heroAi.chip": "Klushulp · conseils d'anciens peintres",
  "home.heroAi.title": "Quels sont vos travaux ?",
  "home.heroAi.text":
    "Posez votre question tout de suite — notre Klushulp vous aide avec la peinture, les quantités et le bon outillage.",
  "home.heroAi.placeholder": "Ex. quelle peinture pour ma salle de bain ?",
  "home.heroAi.inputAria": "Posez votre question travaux à Klushulp",
  "home.heroAi.submitAria": "Demander à Klushulp",
  "home.heroAi.example.bedroom": "Quelle peinture pour ma chambre ?",
  "home.heroAi.example.liters": "Combien de litres me faut-il ?",
  "home.heroAi.example.primer": "Quel primaire sur bois brut ?",

  "home.funnel.title": "Que comptez-vous faire ?",
  "home.funnel.subtitle": "Choisissez vos travaux et nous vous aidons avec les bons produits et des conseils.",

  "home.verf.title": "Peinture — notre spécialité",
  "home.verf.subtitle": "Teintée sur mesure, qualité professionnelle",

  "home.popular.title": "Produits populaires",
  "home.popular.subtitle": "Les préférés de nos bricoleurs",
  "home.popular.link": "Plus de produits",

  "home.acties.title": "Promotions & offres",
  "home.acties.subtitle": "Avantage supplémentaire pour une durée limitée",

  "home.kluspas.badge": "KLUSPAS",
  "home.kluspas.title": "Devenez membre et payez toujours le prix le plus bas",
  "home.kluspas.text":
    "Avec la KLUSRPAS gratuite, vous profitez immédiatement des prix KLUSRPAS sur tout l'assortiment et ne manquez aucune promotion.",
  "home.kluspas.cta": "Demandez votre KLUSRPAS",
  "home.kluspas.benefit1": "Toujours le meilleur prix KLUSRPAS",
  "home.kluspas.benefit2": "Promotions exclusives et priorité lors des soldes",
  "home.kluspas.benefit3": "Conseils couleur gratuits via la Klushulp",
  "home.kluspas.benefit4": "Cumulez un avoir travaux",

  "home.inspiration.title": "Inspiration & conseils",
  "home.inspiration.subtitle": "Astuces bricolage et guides étape par étape de nos experts",

  "home.categories.title": "Acheter par catégorie",
  "home.categories.subtitle": "Tout pour vos travaux sous un même toit",

  "home.trending.link": "Tout voir",

  "home.forYou.title": "Rien que pour vous",
  "home.forYou.subtitle": "Recommandé selon ce que vous avez consulté et commandé",
  "home.viewed.title": "Continuer à explorer",
  "home.viewed.subtitle": "Récemment consultés par vous",

  "cart.title": "Panier",
  "cart.loading": "Chargement…",
  "cart.empty.title": "Votre panier est vide",
  "cart.empty.drawerText": "Ajoutez des produits pour compléter vos travaux.",
  "cart.empty.viewText": "Parcourez notre assortiment et complétez vos travaux.",
  "cart.empty.startPaint": "Commencer par la peinture",
  "cart.empty.viewPaint": "Voir la peinture",
  "cart.empty.klushulp": "Klushulp",

  "cart.freeShipping.reachedPre": "Félicitations ! Vous bénéficiez de la ",
  "cart.freeShipping.reachedBold": "livraison gratuite",
  "cart.freeShipping.reachedPost": ".",
  "cart.freeShipping.remainingPre": "Plus que ",
  "cart.freeShipping.remainingPost": " pour la livraison gratuite",

  "cart.item.remove": "Supprimer",
  "cart.item.save": "Garder",
  "cart.item.removeLabel": "Supprimer",
  "cart.item.add": "Ajouter",
  "cart.forgotten": "Souvent oubliés",
  "cart.moveToCart": "Au panier",
  "cart.savedForLater": "Gardés pour plus tard ({count})",

  "cart.summary.title": "Récapitulatif",
  "cart.kluspasDiscount": "Avantage KLUSRPAS",
  "cart.kluspas.nudge": "Économisez {amount} avec KLUSRPAS — connectez-vous ou créez un compte gratuit",
  "cart.profpasDiscount": "Remise ProfPas",
  "cart.subtotal": "Sous-total",
  "cart.exclVat": " (hors TVA)",
  "cart.shipping": "Frais de livraison",
  "cart.free": "Gratuit",
  "cart.vat": "TVA (21 %)",
  "cart.total": "Total",
  "cart.vatIncluded": "TVA incluse",
  "cart.vatIncludedBusiness": "TVA incluse · prix professionnels affichés hors TVA",
  "cart.checkout": "Passer à la caisse",
  "cart.continueShopping": "Continuer mes achats",
  "cart.toCart": "Voir le panier",

  "cart.usp.returns": "Retour sous 14 jours",
  "cart.usp.payment": "Paiement sécurisé via Mollie",

  "cart.upsell.title": "Complétez vos travaux",
  "cart.upsell.subtitle": "Les bricoleurs ont souvent aussi acheté",

  "checkout.title": "Paiement",
  "checkout.backToCart": "Retour au panier",
  "checkout.empty.text": "Ajoutez d'abord des produits pour passer commande.",
  "checkout.empty.toRange": "Voir l'assortiment",

  "checkout.private": "Particulier",
  "checkout.business": "Professionnel (hors TVA)",

  "checkout.reorderFree":
    "Livraison gratuite — vous commandez dans les 15 minutes suivant votre commande précédente.",

  "checkout.loggedInPre": "Vous êtes connecté en tant que ",
  "checkout.loggedInPost": ". Votre commande sera associée à votre compte.",
  "checkout.guest.title": "Vous commandez en tant qu'invité — très rapide, aucun compte requis",
  "checkout.guest.text":
    "Saisissez vos coordonnées et commandez aussitôt. En bas, créez un compte en un clic pour votre historique de commandes.",
  "checkout.guest.haveAccount": "Vous avez déjà un compte ? Se connecter",
  "checkout.login.emailPlaceholder": "Adresse e-mail",
  "checkout.login.passwordPlaceholder": "Mot de passe",
  "checkout.login.submit": "Se connecter",
  "checkout.login.error": "Échec de la connexion. Vérifiez votre adresse e-mail et votre mot de passe.",
  "checkout.login.forgotPre": "Mot de passe oublié ou vous préférez un lien de connexion ? ",
  "checkout.login.forgotLink": "Aller à la connexion",

  "checkout.section.contact": "Coordonnées",
  "checkout.section.delivery": "Adresse de livraison",
  "checkout.section.shipping": "Mode de livraison",
  "checkout.section.payment": "Mode de paiement",

  "checkout.field.email": "Adresse e-mail",
  "checkout.field.emailPlaceholder": "vous@exemple.fr",
  "checkout.createAccount.labelBold": "Créez tout de suite un compte",
  "checkout.createAccount.labelRest": " — enregistrez vos données et consultez vos commandes plus tard. ",
  "checkout.createAccount.optional": "(facultatif)",
  "checkout.createAccount.passwordPlaceholder": "Choisissez un mot de passe (8 caractères min.)",
  "checkout.createAccount.passwordHint": "Au moins 8 caractères.",
  "checkout.field.company": "Nom de l'entreprise",
  "checkout.field.companyPlaceholder": "Entreprise SARL",
  "checkout.field.coc": "Numéro RCS",
  "checkout.field.vat": "Numéro de TVA",

  "checkout.field.country": "Pays",
  "checkout.country.outsideNote":
    "En dehors des NL et de la BE, des frais de livraison fixes s'appliquent (pas de livraison gratuite).",
  "checkout.field.firstName": "Prénom",
  "checkout.field.lastName": "Nom",
  "checkout.field.postalCode": "Code postal",
  "checkout.field.houseNumber": "N°",
  "checkout.field.addition": "Complément",
  "checkout.field.street": "Rue",
  "checkout.field.streetLookup": "Rue (recherche de l'adresse…)",
  "checkout.field.autofill": "Renseigné automatiquement",
  "checkout.field.city": "Ville",
  "checkout.field.phone": "Téléphone (facultatif)",
  "checkout.billing.toggle": "L'adresse de facturation diffère de l'adresse de livraison",
  "checkout.billing.companyOptional": "Nom de l'entreprise (facultatif)",
  "checkout.billing.streetAndNumber": "Rue et numéro",
  "checkout.billing.streetPlaceholder": "Nom de la rue 1",

  "checkout.delivery.title": "Livraison",

  "checkout.summary.title": "Votre commande",
  "checkout.billieSurcharge": "Supplément Billie",
  "checkout.terms.pre": "J'accepte les ",
  "checkout.terms.termsLink": "conditions générales",
  "checkout.terms.mid": " et la ",
  "checkout.terms.privacyLink": "politique de confidentialité",
  "checkout.terms.post": ".",
  "checkout.newsletter":
    "Tenez-moi informé des astuces bricolage et des offres KLUSRPAS (newsletter).",
  "checkout.pay": "Payer {amount}",
  "checkout.chooseBankHint": "Choisissez votre banque pour continuer.",
  "checkout.choosePaymentHint": "Veuillez d'abord choisir un mode de paiement.",
  "checkout.usp.freeReturn": "Retour sous 14 jours",
  "checkout.usp.fastDelivery": "Livraison rapide",

  "checkout.trust.heading": "Ce que disent nos clients",
  "checkout.trust.based": "{average} — sur la base de {count} avis",
  "checkout.trust.verified": "Achat vérifié",

  "checkout.error.choosePayment": "Veuillez d'abord choisir un mode de paiement.",
  "checkout.error.chooseBank": "Veuillez d'abord choisir votre banque pour iDEAL.",
  "checkout.error.accountPassword":
    "Choisissez un mot de passe d'au moins 8 caractères pour votre compte.",
  "checkout.error.card": "Vérifiez vos données de carte et réessayez.",
  "checkout.error.paymentFailed": "Échec de la création du paiement",
  "checkout.error.generic": "Une erreur s'est produite",

  "checkout.payment.chooseBank": "Choisissez votre banque",
  "checkout.payment.hint.ideal": "Payez directement avec votre propre banque",
  "checkout.payment.hint.creditcard": "Visa, Mastercard",
  "checkout.payment.hint.klarna": "Paiement différé — sous 14 jours",
  "checkout.payment.hint.bancontact": "Payez avec votre carte Bancontact",

  "checkout.reorder.title": "Vous avez oublié quelque chose ?",
  "checkout.reorder.textPre": "Commandez autre chose dans les ",
  "checkout.reorder.textMinutes": "15 minutes",
  "checkout.reorder.textMid": " et ne payez ",
  "checkout.reorder.textBold": "aucun frais de livraison supplémentaire",
  "checkout.reorder.textPost": " — nous l'envoyons dans un seul colis.",
  "checkout.reorder.added": "Ajouté — aucun frais de livraison supplémentaire",
  "checkout.reorder.addAria": "Ajouter {title}",
  "checkout.reorder.toCart": "Voir le panier",
  "checkout.reorder.continueShopping": "Continuer mes achats",

  "checkout.thanks.title": "Merci pour votre commande !",
  "checkout.thanks.text":
    "Nous avons bien reçu votre commande et nous nous y mettons tout de suite.",
  "checkout.thanks.confirmationSentPre": " Une confirmation a été envoyée à ",
  "checkout.thanks.confirmationSentPost": ".",
  "checkout.thanks.orderNumber": "Numéro de commande",
  "checkout.thanks.orderDate": "Date de commande",
  "checkout.thanks.subtotal": "Sous-total",
  "checkout.thanks.shipping": "Frais de livraison",
  "checkout.thanks.totalPaid": "Total payé",
  "checkout.thanks.free": "Gratuit",
  "checkout.thanks.expectedDelivery": "Livraison estimée : {date}",
  "checkout.thanks.step.confirmation.title": "Confirmation",
  "checkout.thanks.step.confirmation.hint": "Vérifiez votre boîte de réception",
  "checkout.thanks.step.packing.title": "En préparation",
  "checkout.thanks.step.packing.hint": "Aujourd'hui même",
  "checkout.thanks.step.onTheWay.title": "En route",
  "checkout.thanks.step.onTheWay.hint": "Suivez votre colis",
  "checkout.thanks.trackOrder": "Suivre votre commande",
  "checkout.thanks.continueShopping": "Continuer mes achats",
  "checkout.thanks.downloadInvoice": "Télécharger votre facture (PDF)",
  "checkout.thanks.deliveryAddress": "Adresse de livraison",
  "checkout.thanks.loadError":
    "Nous n'avons pas pu charger les détails de la commande, mais votre paiement a bien été reçu. Vous recevrez une confirmation par e-mail.",
  "checkout.thanks.backHome": "Retour à l'accueil",
  "checkout.thanks.successBadge": "Paiement réussi",
  "checkout.thanks.orderSummary": "Votre commande",
  "checkout.thanks.needHelp.title": "Des questions sur votre commande ?",
  "checkout.thanks.needHelp.text":
    "Notre équipe est là pour vous aider — des délais de livraison aux conseils produits.",
  "checkout.thanks.needHelp.cta": "Vers le service client",
  "checkout.pending.title": "Nous traitons votre paiement…",
  "checkout.pending.text":
    "Votre paiement est encore en cours de confirmation par votre banque. Cela ne prend généralement que quelques secondes.",
  "checkout.pending.hint":
    "Cette page s'actualise automatiquement dès que votre paiement est confirmé. Vous n'avez rien à faire.",
  "checkout.pending.refreshNow": "Actualiser le statut",
  "checkout.pending.backHome": "Retour à l'accueil",
  "checkout.failed.title": "Votre paiement a échoué",
  "checkout.failed.canceledTitle": "Votre paiement a été annulé",
  "checkout.failed.expiredTitle": "Votre paiement a expiré",
  "checkout.failed.text":
    "Aucun montant n'a été débité. Vous pouvez réessayer en toute sécurité.",
  "checkout.failed.cartKept": "Votre panier a été conservé.",
  "checkout.failed.retry": "Réessayer",
  "checkout.failed.toCart": "Vers le panier",
  "checkout.failed.help": "Besoin d'aide ? Contactez le service client",
  "checkout.failed.orderRef": "Numéro de commande : {ref}",

  "checkout.validation.required": "Obligatoire",
  "checkout.validation.email": "Saisissez une adresse e-mail valide",
  "checkout.validation.postalCode": "Saisissez votre code postal",
  "checkout.validation.street": "Saisissez votre nom de rue",
  "checkout.validation.terms": "Veuillez accepter les conditions générales pour commander.",
  "checkout.validation.postalCodeNl": "Ex. 7443 BR",
  "checkout.validation.coc": "Un numéro RCS comporte 8 chiffres.",
  "checkout.validation.vat": "Saisissez un numéro de TVA valide, p. ex. NL000000000B00.",

  "service.hero.kicker": "Service client",
  "service.hero.title": "Comment pouvons-nous vous aider ?",
  "service.hero.subtitle":
    "Trouvez ci-dessous une réponse rapide aux questions les plus fréquentes, ou contactez-nous directement. Nos bricoleurs sont là pour vous.",

  "service.trust.delivery": "Commandé avant 19h, livré demain",
  "service.trust.returns": "14 jours de rétractation",
  "service.trust.payment": "Paiement sécurisé via Mollie",
  "service.trust.advice": "Conseils d'anciens peintres",
  "service.trust.warranty": "Garantie légale sur tout",

  "service.contact.call.title": "Appelez-nous",
  "service.contact.call.description": "Du lun. au ven. 09h00 - 18h00",
  "service.contact.mail.title": "Écrivez-nous",
  "service.contact.mail.description": "Réponse sous 1 jour ouvré",
  "service.contact.store.title": "Conseils couleur",
  "service.contact.store.description": "Conseils gratuits de nos anciens peintres",
  "service.contact.store.action": "Vers le sélecteur de couleurs",
  "service.contact.ai.title": "Klushulp",
  "service.contact.ai.description": "Réponse immédiate, jour et nuit",
  "service.contact.ai.action": "Posez votre question",

  "service.shipping.title": "Frais de livraison",
  "service.shipping.subtitle":
    "Livraison gratuite à partir de {amount} aux Pays-Bas et en Belgique. Commandé avant 19h les jours ouvrés ? Votre colis est alors livré le lendemain.",
  "service.shipping.rowNl": "Pays-Bas",
  "service.shipping.freeFrom": "· gratuit à partir de {amount}",
  "service.shipping.mailbox": "Colis boîte aux lettres (NL)",
  "service.shipping.mailboxHint": "Petits articles plats qui passent par la boîte aux lettres",
  "service.shipping.rowBe": "Belgique",
  "service.shipping.outsideNote":
    "Nous livrons dans toute l'UE. En dehors des Pays-Bas et de la Belgique, il n'y a pas de livraison gratuite. En dehors de l'UE — y compris la Suisse et le Royaume-Uni — nous ne livrons pas, en raison de la douane.",

  "service.group.shipping.title": "Livraison & retours",
  "service.group.shipping.intro":
    "Livraison gratuite à partir de {free} aux NL et en BE, commandé avant 19h c'est livré demain, et retours possibles par la poste avec étiquette de retour — les frais de retour sont à votre charge. Vers le reste de l'UE à partir de {eu}.",
  "service.group.payment.title": "Paiement sécurisé",
  "service.group.payment.intro":
    "Payez facilement et en toute sécurité avec iDEAL, Bancontact, carte de crédit ou en différé avec Klarna via Mollie.",
  "service.group.warranty.title": "Garantie & service",
  "service.group.warranty.intro":
    "Garantie légale sur tout, plus un service personnalisé de nos anciens peintres.",
  "service.group.mengverf.title": "Peinture sur mesure & conseils couleur",
  "service.group.mengverf.intro":
    "Chaque couleur teintée sur mesure avec une correspondance exacte. Attention : la peinture teintée sur mesure est un produit personnalisé et ne peut être retournée.",
  "service.group.kluspas.title": "KLUSRPAS & professionnels",
  "service.group.kluspas.intro":
    "Avantage KLUSRPAS gratuit pour les particuliers, et la ProfPas avec 10 % de remise (hors TVA) pour les clients professionnels.",

  "service.faq.shipping.when.q": "Quand ma commande sera-t-elle livrée ?",
  "service.faq.shipping.when.a":
    "Vous commandez les jours ouvrés avant 19h ? Votre commande est alors livrée le lendemain. Vous recevez un code de suivi dès que votre colis est en route.",
  "service.faq.shipping.cost.q": "Combien coûte la livraison ?",
  "service.faq.shipping.cost.a":
    "Aux Pays-Bas et en Belgique, la livraison est gratuite à partir de {nlFree}. En dessous, vous payez {nlPrice} aux Pays-Bas et {bePrice} en Belgique. Nous envoyons les petits articles plats en colis boîte aux lettres pour {mailbox} (NL uniquement). Vers les autres pays de l'UE, nous livrons à partir de {eu} ; aucune livraison gratuite ne s'applique. Vous voyez toujours les frais de livraison exacts au moment du paiement.",
  "service.faq.shipping.abroad.q": "Livrez-vous aussi à l'étranger ?",
  "service.faq.shipping.abroad.a":
    "Nous livrons dans toute l'UE. Vers la Belgique, la livraison est gratuite à partir de {beFree} ; pour les autres pays de l'UE, un tarif fixe par pays s'applique à partir de {eu}, que vous voyez au moment du paiement. En dehors de l'UE — y compris la Suisse et le Royaume-Uni — nous ne livrons pas, en raison de la douane.",
  "service.faq.shipping.return.q": "Comment retourner un produit ?",
  "service.faq.shipping.return.a":
    "Les retours sont possibles par la poste avec une étiquette de retour ; les frais de retour sont à votre charge. Déclarez votre retour via votre compte ou le service client et vous recevrez l'étiquette de retour et les instructions. Vous disposez de 14 jours de réflexion.",

  "service.faq.payment.methods.q": "Quels moyens de paiement acceptez-vous ?",
  "service.faq.payment.methods.a":
    "Vous payez en toute sécurité avec iDEAL, Bancontact, carte de crédit ou en différé via Klarna. Tous les paiements sont chiffrés via notre partenaire de paiement Mollie.",
  "service.faq.payment.afterwards.q": "Puis-je payer en différé ?",
  "service.faq.payment.afterwards.a":
    "Oui, avec Klarna vous payez en différé en toute sécurité. Vous ne payez qu'après avoir reçu et vérifié votre commande.",
  "service.faq.payment.safe.q": "Le paiement en ligne est-il sécurisé ?",
  "service.faq.payment.safe.a":
    "Absolument. Toutes les transactions passent par Mollie, un service de paiement certifié. Nous ne stockons nous-mêmes aucune donnée de paiement.",

  "service.faq.warranty.products.q": "Quelle garantie ai-je sur les produits ?",
  "service.faq.warranty.products.a":
    "Tous nos produits bénéficient de la garantie légale. De plus, de nombreuses marques appliquent leur propre garantie fabricant. Un problème avec votre produit ? Contactez-nous et nous chercherons une solution ensemble.",
  "service.faq.warranty.damaged.q": "Mon produit est arrivé endommagé, que faire ?",
  "service.faq.warranty.damaged.a":
    "Quel dommage ! Contactez notre service client dans les 48 heures et joignez une photo. Nous envoyons gratuitement un produit de remplacement ou remboursons le montant.",
  "service.faq.warranty.store.q": "Comment obtenir un service ou des conseils ?",
  "service.faq.warranty.store.a":
    "KLUSR est entièrement en ligne. Nos anciens peintres se feront un plaisir de vous aider avec des conseils ou des questions sur votre achat via le service client ou la Klushulp — vous obtenez une réponse personnelle rapidement.",

  "service.faq.mengverf.return.q": "Puis-je retourner de la peinture teintée sur mesure ?",
  "service.faq.mengverf.return.a":
    "Nous teintons la peinture sur mesure spécialement pour vous. C'est pourquoi elle est — comme les autres produits personnalisés — légalement exclue du droit de rétractation et nous ne pouvons pas reprendre la peinture sur mesure. Un problème inattendu avec la couleur ou le produit ? Contactez-nous alors et nous le résoudrons ensemble gratuitement.",
  "service.faq.mengverf.match.q": "Quelle est la précision de la correspondance des couleurs ?",
  "service.faq.mengverf.match.a":
    "Nous teintons sur la base de codes couleur professionnels (notamment RAL, Gamma et AkzoNobel) pour une correspondance exacte. Vous hésitez sur une couleur ? Commandez d'abord un testeur de couleur ou un pot d'essai avant de faire teinter toute la quantité — gardez à l'esprit que les couleurs à l'écran peuvent légèrement différer.",
  "service.faq.mengverf.amount.q": "De combien de peinture ai-je besoin ?",
  "service.faq.mengverf.amount.a":
    "Comptez en gros 1 litre pour 8–10 m² par couche. Sur la page produit et via notre Klushulp, nous le calculons exactement pour vous, afin que vous n'en commandiez ni trop ni trop peu.",
  "service.faq.mengverf.instore.q": "Comment faire teinter la peinture sur mesure ?",
  "service.faq.mengverf.instore.a":
    "Choisissez votre couleur en ligne dans le sélecteur de couleurs et commandez la peinture correspondante. Nos spécialistes couleur teintent votre peinture avec expertise à la couleur exacte et nous la livrons chez vous, prête à l'emploi.",

  "service.faq.kluspas.what.q": "Qu'est-ce que la KLUSRPAS et combien coûte-t-elle ?",
  "service.faq.kluspas.what.a":
    "La KLUSRPAS est entièrement gratuite et vous donne immédiatement le prix KLUSRPAS plus avantageux sur toute la collection, ainsi que des promotions exclusives. Vous l'activez lors de la création d'un compte.",
  "service.faq.kluspas.business.q": "Je commande à titre professionnel — est-ce possible ?",
  "service.faq.kluspas.business.a":
    "Oui. Pour les indépendants, les peintres et les entreprises, nous avons la KLUSR ProfPas : 10 % de remise sur toute la collection et des prix hors TVA, sur facture. L'inscription gratuite se fait via la page professionnels.",
  "service.faq.kluspas.invoice.q": "Vais-je recevoir une facture avec TVA ?",
  "service.faq.kluspas.invoice.a":
    "Oui, à chaque commande vous recevez une facture en bonne et due forme avec la TVA détaillée. Les clients professionnels voient les prix hors TVA et paient sur facture.",

  "service.general.title": "Commande & compte",
  "service.faq.general.order.q": "Comment passer une commande ?",
  "service.faq.general.order.a":
    "Ajoutez des produits à votre panier, allez à la caisse et suivez les étapes. Vous n'avez pas besoin de compte pour commander, mais avec un compte c'est plus rapide la prochaine fois.",
  "service.faq.general.account.q": "Ai-je besoin d'un compte ?",
  "service.faq.general.account.a":
    "Non, vous pouvez commander en tant qu'invité. Avec un compte, vous conservez toutefois vos coordonnées, votre historique de commandes et vos avantages KLUSRPAS au même endroit.",
  "service.faq.general.mix.q": "Puis-je faire teinter la peinture sur mesure ?",
  "service.faq.general.mix.a":
    "Oui ! Nous teintons sur mesure toute couleur souhaitée. Choisissez votre couleur en ligne dans le sélecteur de couleurs et nos spécialistes couleur teintent votre peinture avec expertise à la couleur exacte, puis nous la livrons prête à l'emploi.",

  "service.guarantee.title": "Pas satisfait ? Remboursé.",
  "service.guarantee.text":
    "Nous voulons que vous abordiez vos travaux l'esprit tranquille. C'est pourquoi : 14 jours de réflexion, retours possibles par la poste avec étiquette de retour (les frais de retour sont à votre charge) et garantie légale sur tout. La peinture teintée sur mesure est un produit personnalisé et donc exclue des retours — mais en cas de défaut, nous le résolvons toujours gratuitement.",
  "service.guarantee.cta": "Lisez les conditions de retour",

  "service.contactBlock.title": "Votre question n'y figure pas ?",
  "service.contactBlock.text":
    "Envoyez-nous un message. Vous recevez immédiatement un numéro de ticket et une confirmation par e-mail — nous répondons généralement sous 1 jour ouvré.",
  "service.contactBlock.preferPre": "Vous préférez une réponse immédiate ? ",
  "service.contactBlock.preferLink": "Demandez à la Klushulp",
  "service.contactBlock.preferPost": " — disponible 24h/24 et 7j/7.",
  "service.contactBlock.viewStorePage": "Demandez à la Klushulp",

  "faq.meta.breadcrumb": "Questions fréquentes",
  "faq.badge": "Aide & explications",
  "faq.title": "Questions fréquentes",
  "faq.subtitle": "Vous n'avez pas trouvé ce que vous cherchez ? Notre service client se fera un plaisir de vous aider.",
  "faq.more.title": "Une autre question ?",
  "faq.more.text": "Nous nous ferons un plaisir de vous aider personnellement.",
  "faq.more.cta": "Vers le service client",

  "faq.group.ordering": "Commande & paiement",
  "faq.group.delivery": "Livraison & retours",
  "faq.group.mengverf": "Peinture sur mesure & couleur",
  "faq.group.kluspas": "KLUSRPAS",

  "faq.order.how.q": "Comment passer une commande ?",
  "faq.order.how.a":
    "Ajoutez des produits à votre panier et payez en toute sécurité. Pour la peinture, vous choisissez d'abord votre couleur — que nous teintons exactement pour vous.",
  "faq.order.payment.q": "Quels moyens de paiement acceptez-vous ?",
  "faq.order.payment.a":
    "Vous payez en toute sécurité via Mollie avec notamment iDEAL, carte de crédit et — là où c'est disponible — le paiement différé.",
  "faq.order.account.q": "Ai-je besoin d'un compte ?",
  "faq.order.account.a":
    "Non, vous pouvez commander en tant qu'invité. Avec un compte (gratuit) et la KLUSRPAS, vous profitez en plus d'avantages supplémentaires et conservez vos commandes et vos couleurs.",
  "faq.order.account.text":
    "Non, vous pouvez commander en tant qu'invité. Avec un compte gratuit et la KLUSRPAS, vous profitez d'avantages supplémentaires et conservez vos commandes et vos couleurs.",

  "faq.delivery.when.q": "Quand ma commande sera-t-elle chez moi ?",
  "faq.delivery.when.a":
    "Commandé avant 19h les jours ouvrés, livré demain. La livraison est gratuite à partir de € 50, en dessous nous facturons € 4,95.",
  "faq.delivery.pickup.q": "Puis-je retirer ma commande ?",
  "faq.delivery.pickup.aPre": "KLUSR est entièrement en ligne — nous livrons partout aux Pays-Bas et en Belgique. Des questions sur votre livraison ? Notre ",
  "faq.delivery.pickup.aLink": "service client",
  "faq.delivery.pickup.aPost": " se fera un plaisir de vous aider.",
  "faq.delivery.pickup.text": "KLUSR est entièrement en ligne — nous livrons partout aux Pays-Bas et en Belgique. Le retrait n'est pas possible.",
  "faq.delivery.return.q": "Comment retourner un produit ?",
  "faq.delivery.return.aPre": "Vous disposez de 14 jours de réflexion. Déclarez votre retour auprès de notre ",
  "faq.delivery.return.aLink": "service client",
  "faq.delivery.return.aMid": ". Attention : la peinture teintée sur mesure est exclue des retours (voir ",
  "faq.delivery.return.aTermsLink": "conditions",
  "faq.delivery.return.aPost": ").",
  "faq.delivery.return.text":
    "Vous disposez de 14 jours de réflexion. Déclarez votre retour auprès de notre service client. La peinture teintée sur mesure est exclue des retours.",

  "faq.mengverf.any.q": "Puis-je faire teinter n'importe quelle couleur ?",
  "faq.mengverf.any.aPre":
    "Oui. Choisissez parmi des milliers de couleurs (Gamma, Sikkens, RAL, AkzoNobel) ou votre propre teinte dans notre ",
  "faq.mengverf.any.aLink": "sélecteur de couleurs",
  "faq.mengverf.any.aPost": ". Nous teintons la peinture exactement à la couleur.",
  "faq.mengverf.any.text":
    "Oui. Choisissez parmi des milliers de couleurs (Gamma, Sikkens, RAL, AkzoNobel) ou votre propre teinte dans notre sélecteur de couleurs. Nous teintons la peinture exactement à la couleur.",
  "faq.mengverf.how.q": "Comment fonctionne exactement la peinture sur mesure ?",
  "faq.mengverf.how.aPre":
    "Vous choisissez une couleur, nous la teintons professionnellement dans la bonne base. Pour en savoir plus, consultez ",
  "faq.mengverf.how.aLink": "la page peinture sur mesure",
  "faq.mengverf.how.aPost": ".",
  "faq.mengverf.how.text":
    "Vous choisissez une couleur, nous la teintons professionnellement dans la bonne base. Pour en savoir plus, consultez la page peinture sur mesure.",
  "faq.mengverf.exchange.q": "Puis-je échanger de la peinture teintée ?",
  "faq.mengverf.exchange.a":
    "Nous fabriquons la peinture teintée sur mesure spécialement pour vous ; elle est donc exclue du droit de rétractation, sauf en cas de défaut.",

  "faq.kluspas.what.q": "Qu'est-ce que la KLUSRPAS ?",
  "faq.kluspas.what.aPre":
    "La KLUSRPAS gratuite vous donne toujours le meilleur prix et des promotions exclusives. Découvrez tout à son sujet sur la ",
  "faq.kluspas.what.aLink": "page KLUSRPAS",
  "faq.kluspas.what.aPost": ".",
  "faq.kluspas.what.text":
    "La KLUSRPAS gratuite vous donne toujours le meilleur prix et des promotions exclusives.",
  "faq.kluspas.cost.q": "Combien coûte la KLUSRPAS ?",
  "faq.kluspas.cost.a": "Rien — la KLUSRPAS est gratuite à demander et à utiliser.",

  "about.breadcrumb": "À propos de KLUSR",
  "about.hero.kicker": "À propos de KLUSR",
  "about.hero.titleLead": "La meilleure peinture et tout ce qu'il vous faut ",
  "about.hero.titleAccent": "maintenant",
  "about.hero.titleTail": " pour vos travaux",
  "about.hero.intro":
    "KLUSR est né d'une frustration simple : trop souvent, vous quittiez le magasin de bricolage avec la mauvaise peinture et sans bon conseil. On peut faire mieux. Chez KLUSR, vous bénéficiez d'une qualité professionnelle, du meilleur prix et des conseils de personnes qui connaissent vraiment le métier — d'anciens peintres.",

  "about.value.advice.title": "Conseils d'anciens peintres",
  "about.value.advice.body":
    "Nos collaborateurs ont eux-mêmes passé des années le pinceau à la main. Ces conseils, vous les recevez en prime, gratuitement.",
  "about.value.color.title": "Chaque couleur, teintée avec précision",
  "about.value.color.body":
    "Des milliers de couleurs de tous les nuanciers connus — teintées professionnellement à la couleur, prêtes à l'emploi.",
  "about.value.quality.title": "Qualité professionnelle",
  "about.value.quality.body":
    "Des marques de premier plan, à prix serré, et avec la KLUSRPAS gratuite toujours le plus d'avantages sur l'ensemble de vos travaux.",

  "about.story.title": "Notre histoire",
  "about.story.p1":
    "Ce qui a commencé avec une machine à teinter et beaucoup de savoir-faire est devenu le spécialiste du bricolage en ligne pour les bricoleurs et les professionnels. Le fil conducteur est resté le même : les meilleurs conseils et les bons matériaux, aussi bien pour le bricoleur que pour le professionnel.",
  "about.story.p2":
    "Aujourd'hui, nous réunissons ce savoir-faire dans une boutique en ligne complète. En ligne, le meilleur prix KLUSRPAS, votre couleur teintée avec précision et livrée à votre porte, avec des conseils personnalisés de nos anciens peintres via la Klushulp et le service client.",

  "about.stores.title": "En ligne, partout au pays",
  "about.stores.all": "Voir l'assortiment",

  "about.cta.title": "Prêt à vous lancer ?",
  "about.cta.text": "Demandez votre KLUSRPAS gratuitement et profitez tout de suite des avantages.",
  "about.cta.button": "En savoir plus sur la KLUSRPAS",

  "notFound.code": "404",
  "notFound.title": "Nous n'avons pas trouvé cette page",
  "notFound.text":
    "La page a été déplacée ou n'existe plus. Cherchez ci-dessous — il y a de fortes chances que nous trouvions ce que vous cherchez.",
  "notFound.searchPlaceholder": "Cherchez un produit, une marque ou une couleur…",
  "notFound.searchSubmit": "Rechercher",
  "notFound.searchAria": "Rechercher",
  "notFound.popular": "Populaire chez KLUSR",
  "notFound.popular.paint": "Peinture",
  "notFound.popular.colorPicker": "Sélecteur de couleurs",
  "notFound.popular.tools": "Outillage",
  "notFound.popular.advice": "Conseils bricolage",
  "notFound.toHome": "Vers la page d'accueil",
  "notFound.customerService": "Service client",

  "plp.filters": "Filtres",
  "plp.clearFilters": "Effacer les filtres",
  "plp.clearFiltersCount": "Effacer les filtres ({count})",
  "plp.clearAll": "Effacer tous les filtres",
  "plp.resultCount": "produits",
  "plp.resultCountOne": "produit",
  "plp.show": "Afficher {count} produits",
  "plp.showOne": "Afficher {count} produit",
  "plp.sortAria": "Trier",
  "plp.sort.populair": "Populaire",
  "plp.sort.priceAsc": "Prix croissant",
  "plp.sort.priceDesc": "Prix décroissant",
  "plp.sort.rating": "Les mieux notés",
  "plp.sort.newest": "Les plus récents",

  "plp.group.mengverf": "Peinture sur mesure",
  "plp.group.productType": "Type de produit",
  "plp.group.price": "Prix",
  "plp.group.volume": "Contenance",
  "plp.group.rating": "Évaluation",
  "plp.group.dealsLabels": "Promotions & labels",
  "plp.group.brand": "Marque",

  "plp.facet.glans": "Brillance",
  "plp.facet.materiaal": "Matériau",
  "plp.facet.fitting": "Culot",
  "plp.facet.dessin": "Motif",
  "plp.facet.toepassing": "Utilisation",
  "plp.facet.korrel": "Grain",
  "plp.facet.lichtkleur": "Couleur de lumière",
  "plp.facet.type": "Type",

  "plp.priceBucket.lt25": "Jusqu'à € 25",
  "plp.priceBucket.mid": "€ 25 – € 50",
  "plp.priceBucket.high": "€ 50 – € 100",
  "plp.priceBucket.top": "À partir de € 100",

  "plp.rating.min4": "4 étoiles & plus",
  "plp.rating.min45": "4,5 étoiles & plus",
  "plp.ratingChip": "{rating}+ étoiles",

  "plp.badge.actie": "Promo",
  "plp.badge.bestseller": "Meilleure vente",
  "plp.badge.proKeuze": "Choix pro",
  "plp.badge.nieuw": "Nouveau",
  "plp.badge.bundel": "Lot avantageux",

  "plp.colorMixable": "Teintable sur mesure",
  "plp.viewAria": "Affichage",
  "plp.viewGrid": "Affichage en grille",
  "plp.viewList": "Affichage en liste",
  "plp.empty.title": "Aucun produit trouvé",
  "plp.empty.text": "Ajustez vos filtres pour voir plus de résultats.",
  "plp.favorite": "Ajouter aux favoris",

  "finder.title": "Vous ne savez pas ce qu'il vous faut ?",
  "finder.subtitle": "Décrivez brièvement vos travaux et nous trouvons tout de suite les bons produits pour vous.",
  "finder.placeholder": "Ex. peinture pour mes châssis en bois à l'extérieur",
  "finder.inputAria": "Décrivez vos travaux",
  "finder.submit": "Trouver des produits",
  "finder.submitShort": "Trouver",
  "finder.applied": "Filtres appliqués à vos travaux.",
  "finder.none": "Aucun filtre spécifique trouvé — précisez votre question ou utilisez les filtres.",
  "finder.error": "Ça n'a pas fonctionné. Réessayez ou utilisez les filtres à gauche.",

  "pdp.addToCart": "Au panier",
  "pdp.buyNow": "Commander maintenant",
  "pdp.reviewsLink": "{rating} · {count} avis",
  "pdp.sizeLabel": "Taille / contenance :",
  "pdp.color": "Couleur",
  "pdp.chooseColor": "Choisissez votre couleur",
  "pdp.changeColor": "Changer de couleur",
  "pdp.anyColor":
    "Toute couleur possible — nous teintons la peinture exactement selon la teinte choisie. Choisissez une couleur pour la voir sur le mur.",
  "pdp.mixed.pre": "Sera ",
  "pdp.mixed.bold": "teintée sur mesure de façon professionnelle",
  "pdp.mixed.inBase": " en {base}",
  "pdp.mixed.post": ". Correspondance exacte, prête à l'emploi.",
  "pdp.chooseColorTitle": "Choisissez d'abord une couleur",
  "pdp.chooseColorBuy": "Sélectionnez une couleur avant de commander cette peinture.",
  "pdp.chooseColorAdd": "Sélectionnez une couleur avant d'ajouter cette peinture.",
  "pdp.addedToCart": "Ajouté au panier",
  "pdp.favAdded": "Ajouté aux favoris",
  "pdp.favRemoved": "Retiré des favoris",
  "pdp.favSave": "Garder pour plus tard",
  "pdp.favSaved": "Enregistré dans les favoris",
  "pdp.kluspasPrice": "Prix KLUSRPAS",
  "pdp.profpasPrice": "Prix ProfPas",
  "pdp.normalPrice": "Prix normal",
  "pdp.withoutAccount": "— sans compte",
  "pdp.kluspas.title": "Prix KLUSRPAS — gratuit pour tous",
  "pdp.kluspas.body":
    "Lors du paiement, choisissez de créer un compte gratuit et la remise KLUSRPAS est appliquée immédiatement. Sans abonnement, sans engagement.",
  "pdp.kluspas.link": "Qu'est-ce que la KLUSRPAS ?",
  "pdp.kluspas.drawer.intro":
    "La KLUSRPAS est la carte avantage gratuite de KLUSR. Les détenteurs paient toujours le prix le plus bas sur tout l'assortiment.",
  "pdp.kluspas.drawer.benefit1": "Toujours le prix KLUSRPAS le plus bas",
  "pdp.kluspas.drawer.benefit2": "Promotions et offres exclusives",
  "pdp.kluspas.drawer.benefit3": "Conseil couleur personnalisé gratuit",
  "pdp.kluspas.drawer.benefit4": "Cumulez du klustegoed à chaque achat",
  "pdp.kluspas.drawer.how":
    "Créez un compte gratuit ; la remise est appliquée directement au paiement. Sans engagement.",
  "pdp.kluspas.drawer.cta": "Créer un compte",
  "pdp.kluspas.drawer.more": "En savoir plus sur la KLUSRPAS",
  "pdp.kluspas.teaserTitle": "{price} avec KLUSRPAS",
  "pdp.kluspas.teaserCta": "Connectez-vous ou créez un compte gratuit",
  "pdp.kluspas.teaserSave": "Économisez {amount} · {pct} %",
  "pdp.surcharge": "Incl. {base} (+{amount} pour une couleur foncée)",
  "pdp.perLiter": "{price} par litre",
  "pdp.discountBadge": "-{pct} %",
  "pdp.withPass": "avec {pass}",
  "pdp.passExplain": "{pct} % de réduction sur toute la gamme avec votre {pass} gratuit.",
  "pdp.yourPrice": "Votre prix",
  "pdp.yourPassPrice": "avec {pass}",
  "pdp.passApplied": "-{pct} %, appliqué automatiquement avec votre {pass}.",
  "pdp.perLiterCheaper": "le plus grand pot est plus avantageux au litre",
  "pdp.stockForBasePre": "Stock affiché pour ",
  "pdp.stockForBasePost": " — chaque base a son propre stock.",

  "pdp.usp.freeShipping": "Livraison gratuite dès €50",
  "pdp.usp.returns": "Retours sous 14 jours",
  "pdp.usp.afterpay": "Paiement différé possible",

  "pdp.tab.description": "Description",
  "pdp.tab.specs": "Caractéristiques",
  "pdp.tab.reviews": "Avis",
  "pdp.tab.processing": "Application & conseils",
  "pdp.reviews.basedOnPre": "Basé sur ",
  "pdp.reviews.basedOnPost": " avis de bricoleurs vérifiés.",
  "pdp.reviews.verified": "Vérifié",
  "pdp.reviews.none": "Pas encore d'avis.",
  "pdp.reviews.empty": "Pas encore d'avis pour ce produit.",
  "pdp.reviews.beFirst": "Soyez le premier à laisser un avis.",
  "rating.none": "Pas encore d'avis",
  "pdp.processing.title": "Les conseils de nos anciens peintres",

  "price.advies": "Prix conseillé",
  "price.normal": "Normal",
  "price.inclVat": "TVA incl.",
  "price.exclVat": "hors TVA",
  "price.from": "à partir de",
  "price.save": "Vous économisez {amount}",
  "price.savePct": " ({pct} %)",
  "price.vsAdvies": " sur le prix conseillé",
  "price.vsAccount": " avec votre compte KLUSR gratuit",

  "chat.teaser.product": "Des questions sur ce produit ? Je vous aide volontiers.",
  "chat.teaser.category": "Besoin d'aide pour choisir ? Demandez à la Klushulp.",
  "chat.teaser.cart": "Encore des doutes avant de payer ? Je vous conseille.",
  "chat.teaser.general": "Bonjour ! 👋 Des questions sur vos travaux ? N'hésitez pas.",
  "chat.teaser.cta": "Discuter avec la Klushulp",
  "chat.teaser.openAria": "Ouvrir le chat avec la Klushulp",
  "chat.teaser.dismissAria": "Fermer l'invitation au chat",

  "delivery.beforeCutoff": "Commandé avant {time}, livré {day}",
  "delivery.afterCutoff": "Commandé → livré {day}",
  "delivery.today": "ce soir",
  "delivery.tomorrow": "demain",
  "delivery.dayAfter": "après-demain",
  "delivery.countdown": "encore {h} h {m} min",
};

const de: Messages = {
  "usp.advice": "Beratung von ehemaligen Malern",
  "usp.quality": "Professionelle Qualität",
  "usp.everything": "Alles für Ihr Projekt",
  "usp.delivery": "Vor 09:00 Uhr bestellt, heute Abend geliefert",

  "nav.customerService": "Kundenservice",
  "nav.cart": "Warenkorb",
  "nav.cartAria": "Warenkorb, {count} Artikel",
  "search.placeholder": "Wonach suchen Sie?",

  "footer.newsletter.title": "Verpassen Sie kein Angebot",
  "footer.newsletter.text":
    "Melden Sie sich für den Newsletter an und erhalten Sie Heimwerker-Tipps, Inspiration und die besten KLUSRPAS-Angebote.",

  "footer.tagline":
    "Die beste FARBE und alles, was Sie JETZT für Ihr Projekt brauchen. Beratung von ehemaligen Malern, professionelle Qualität.",

  "footer.col.assortment": "Sortiment",
  "footer.col.customerService": "Kundenservice",
  "footer.col.about": "Über KLUSR",

  "footer.service.customerService": "Kundenservice",
  "footer.service.faq": "Häufig gestellte Fragen",
  "footer.service.orderStatus": "Bestellung verfolgen",
  "footer.service.shippingReturns": "Versand & Rückgabe",
  "footer.service.returnPolicy": "Rückgabebedingungen",
  "footer.service.securePayment": "Sicher bezahlen",
  "footer.service.warranty": "Garantie & Service",

  "footer.about.aboutKlusr": "Über KLUSR",
  "footer.about.kluspas": "KLUSRPAS",
  "footer.about.business": "Geschäftskunden & ProfPas",
  "footer.about.mixPaint": "Mischfarbe",
  "footer.about.colors": "Alle Farben & Kollektionen",
  "footer.about.advice": "Beratung & Inspiration",
  "footer.about.klushulp": "Klushulp",
  "footer.about.careers": "Karriere bei KLUSR",

  "footer.bottom.copyright": "© {year} KLUSR B.V. — Alle Preise inkl. MwSt.",
  "footer.bottom.terms": "Allgemeine Geschäftsbedingungen",
  "footer.bottom.returnPolicy": "Rückgabebedingungen",
  "footer.bottom.privacy": "Datenschutz",
  "footer.bottom.cookies": "Cookie-Richtlinie",
  "footer.bottom.accessibility": "Barrierefreiheit",
  "footer.bottom.securePaymentVia": "Sicher bezahlen über",
  "footer.trust.payTitle": "Sichere Zahlung",
  "footer.trust.shipTitle": "Versand mit",

  "lang.label": "Sprache",
  "lang.continueIn": "Auf {language} ansehen?",
  "lang.dismiss": "Schließen",

  "home.hero.badge": "Beratung von ehemaligen Malern",
  "home.hero.titleLead": "Die beste ",
  "home.hero.titlePaint": "FARBE",
  "home.hero.titleMid": " und alles, was Sie ",
  "home.hero.titleNow": "JETZT",
  "home.hero.titleTail": " brauchen!",
  "home.hero.subtitle":
    "Professionelle Qualität, nach Farbton gemischt. Von Innen- und Außenfarbe bis zu Werkzeug, Eisenwaren und Elektro.",
  "home.hero.cta": "Sortiment ansehen",
  "home.hero.klushulp": "Klushulp",

  "home.heroAi.chip": "Klushulp · Beratung von ehemaligen Malern",
  "home.heroAi.title": "Was steht an?",
  "home.heroAi.text":
    "Stellen Sie direkt Ihre Frage — unser Klushulp hilft Ihnen bei Farbe, Mengen und dem richtigen Werkzeug.",
  "home.heroAi.placeholder": "Z. B. welche Farbe für mein Badezimmer?",
  "home.heroAi.inputAria": "Stellen Sie Ihre Projektfrage an Klushulp",
  "home.heroAi.submitAria": "Klushulp fragen",
  "home.heroAi.example.bedroom": "Welche Farbe für mein Schlafzimmer?",
  "home.heroAi.example.liters": "Wie viele Liter brauche ich?",
  "home.heroAi.example.primer": "Welche Grundierung auf rohem Holz?",

  "home.funnel.title": "Was haben Sie vor?",
  "home.funnel.subtitle": "Wählen Sie Ihr Projekt und wir helfen Ihnen mit den richtigen Produkten und Tipps.",

  "home.verf.title": "Farbe — unsere Spezialität",
  "home.verf.subtitle": "Nach Farbton gemischt, professionelle Qualität",

  "home.popular.title": "Beliebte Produkte",
  "home.popular.subtitle": "Die Favoriten unserer Heimwerker",
  "home.popular.link": "Mehr Produkte",

  "home.acties.title": "Aktionen & Angebote",
  "home.acties.subtitle": "Vorübergehend zusätzlicher Vorteil",

  "home.kluspas.badge": "KLUSPAS",
  "home.kluspas.title": "Werden Sie Mitglied und zahlen Sie immer den niedrigsten Preis",
  "home.kluspas.text":
    "Mit der kostenlosen KLUSRPAS profitieren Sie sofort von KLUSRPAS-Preisen auf das gesamte Sortiment und verpassen keine Aktion.",
  "home.kluspas.cta": "KLUSRPAS beantragen",
  "home.kluspas.benefit1": "Immer der beste KLUSRPAS-Preis",
  "home.kluspas.benefit2": "Exklusive Aktionen und Vorrang im Ausverkauf",
  "home.kluspas.benefit3": "Kostenlose Farbberatung über die Klushulp",
  "home.kluspas.benefit4": "Sammeln Sie Projekt-Guthaben",

  "home.inspiration.title": "Inspiration & Beratung",
  "home.inspiration.subtitle": "Heimwerker-Tipps und Schritt-für-Schritt-Anleitungen unserer Experten",

  "home.categories.title": "Nach Kategorie shoppen",
  "home.categories.subtitle": "Alles für Ihr Projekt unter einem Dach",

  "home.trending.link": "Alles ansehen",

  "home.forYou.title": "Speziell für Sie",
  "home.forYou.subtitle": "Empfohlen auf Basis dessen, was Sie angesehen und bestellt haben",
  "home.viewed.title": "Weiter stöbern",
  "home.viewed.subtitle": "Kürzlich von Ihnen angesehen",

  "cart.title": "Warenkorb",
  "cart.loading": "Wird geladen…",
  "cart.empty.title": "Ihr Warenkorb ist leer",
  "cart.empty.drawerText": "Fügen Sie Produkte hinzu, um Ihr Projekt zu vervollständigen.",
  "cart.empty.viewText": "Sehen Sie sich unser Sortiment an und vervollständigen Sie Ihr Projekt.",
  "cart.empty.startPaint": "Mit Farbe beginnen",
  "cart.empty.viewPaint": "Farbe ansehen",
  "cart.empty.klushulp": "Klushulp",

  "cart.freeShipping.reachedPre": "Herzlichen Glückwunsch! Sie erhalten ",
  "cart.freeShipping.reachedBold": "kostenlosen Versand",
  "cart.freeShipping.reachedPost": ".",
  "cart.freeShipping.remainingPre": "Noch ",
  "cart.freeShipping.remainingPost": " bis zum kostenlosen Versand",

  "cart.item.remove": "Entfernen",
  "cart.item.save": "Merken",
  "cart.item.removeLabel": "Entfernen",
  "cart.item.add": "Hinzufügen",
  "cart.forgotten": "Oft vergessen",
  "cart.moveToCart": "In den Warenkorb",
  "cart.savedForLater": "Für später gemerkt ({count})",

  "cart.summary.title": "Übersicht",
  "cart.kluspasDiscount": "KLUSRPAS-Vorteil",
  "cart.kluspas.nudge": "Spare {amount} mit KLUSRPAS — anmelden oder kostenloses Konto erstellen",
  "cart.profpasDiscount": "ProfPas-Rabatt",
  "cart.subtotal": "Zwischensumme",
  "cart.exclVat": " (zzgl. MwSt.)",
  "cart.shipping": "Versandkosten",
  "cart.free": "Kostenlos",
  "cart.vat": "MwSt. (21 %)",
  "cart.total": "Gesamt",
  "cart.vatIncluded": "Inkl. MwSt.",
  "cart.vatIncludedBusiness": "Inkl. MwSt. · Geschäftspreise zzgl. MwSt. angezeigt",
  "cart.checkout": "Weiter zur Kasse",
  "cart.continueShopping": "Weiter einkaufen",
  "cart.toCart": "Zum Warenkorb",

  "cart.usp.returns": "Rückgabe innerhalb von 14 Tagen",
  "cart.usp.payment": "Sicher bezahlen über Mollie",

  "cart.upsell.title": "Vervollständigen Sie Ihr Projekt",
  "cart.upsell.subtitle": "Heimwerker kauften hier oft auch",

  "checkout.title": "Kasse",
  "checkout.backToCart": "Zurück zum Warenkorb",
  "checkout.empty.text": "Fügen Sie zuerst Produkte hinzu, um zur Kasse zu gehen.",
  "checkout.empty.toRange": "Zum Sortiment",

  "checkout.private": "Privat",
  "checkout.business": "Geschäftlich (zzgl. MwSt.)",

  "checkout.reorderFree":
    "Kostenloser Versand — Sie bestellen innerhalb von 15 Minuten nach Ihrer vorherigen Bestellung.",

  "checkout.loggedInPre": "Sie sind angemeldet als ",
  "checkout.loggedInPost": ". Ihre Bestellung wird mit Ihrem Konto verknüpft.",
  "checkout.guest.title": "Sie bestellen als Gast — superschnell, kein Konto erforderlich",
  "checkout.guest.text":
    "Geben Sie Ihre Daten ein und bestellen Sie direkt. Unten erstellen Sie mit einem Häkchen ein Konto für Ihre Bestellhistorie.",
  "checkout.guest.haveAccount": "Haben Sie bereits ein Konto? Anmelden",
  "checkout.login.emailPlaceholder": "E-Mail-Adresse",
  "checkout.login.passwordPlaceholder": "Passwort",
  "checkout.login.submit": "Anmelden",
  "checkout.login.error": "Anmeldung fehlgeschlagen. Bitte prüfen Sie Ihre E-Mail-Adresse und Ihr Passwort.",
  "checkout.login.forgotPre": "Passwort vergessen oder lieber einen Login-Link? ",
  "checkout.login.forgotLink": "Zur Anmeldung",

  "checkout.section.contact": "Kontaktdaten",
  "checkout.section.delivery": "Lieferadresse",
  "checkout.section.shipping": "Versandart",
  "checkout.section.payment": "Zahlungsart",

  "checkout.field.email": "E-Mail-Adresse",
  "checkout.field.emailPlaceholder": "sie@beispiel.de",
  "checkout.createAccount.labelBold": "Erstellen Sie direkt ein Konto",
  "checkout.createAccount.labelRest": " — speichern Sie Ihre Daten und sehen Sie Ihre Bestellungen später ein. ",
  "checkout.createAccount.optional": "(optional)",
  "checkout.createAccount.passwordPlaceholder": "Wählen Sie ein Passwort (mind. 8 Zeichen)",
  "checkout.createAccount.passwordHint": "Mindestens 8 Zeichen.",
  "checkout.field.company": "Firmenname",
  "checkout.field.companyPlaceholder": "Firma GmbH",
  "checkout.field.coc": "Handelsregisternummer",
  "checkout.field.vat": "USt-IdNr.",

  "checkout.field.country": "Land",
  "checkout.country.outsideNote":
    "Außerhalb von NL und BE gelten feste Versandkosten (kein kostenloser Versand).",
  "checkout.field.firstName": "Vorname",
  "checkout.field.lastName": "Nachname",
  "checkout.field.postalCode": "Postleitzahl",
  "checkout.field.houseNumber": "Nr.",
  "checkout.field.addition": "Zusatz",
  "checkout.field.street": "Straße",
  "checkout.field.streetLookup": "Straße (Adresse wird abgerufen…)",
  "checkout.field.autofill": "Wird automatisch ausgefüllt",
  "checkout.field.city": "Ort",
  "checkout.field.phone": "Telefon (optional)",
  "checkout.billing.toggle": "Rechnungsadresse weicht von der Lieferadresse ab",
  "checkout.billing.companyOptional": "Firmenname (optional)",
  "checkout.billing.streetAndNumber": "Straße und Hausnummer",
  "checkout.billing.streetPlaceholder": "Straßenname 1",

  "checkout.delivery.title": "Liefern",

  "checkout.summary.title": "Ihre Bestellung",
  "checkout.billieSurcharge": "Billie-Zuschlag",
  "checkout.terms.pre": "Ich stimme den ",
  "checkout.terms.termsLink": "Allgemeinen Geschäftsbedingungen",
  "checkout.terms.mid": " und der ",
  "checkout.terms.privacyLink": "Datenschutzerklärung",
  "checkout.terms.post": " zu.",
  "checkout.newsletter":
    "Halten Sie mich über Heimwerker-Tipps und KLUSRPAS-Angebote auf dem Laufenden (Newsletter).",
  "checkout.pay": "Bezahlen {amount}",
  "checkout.chooseBankHint": "Wählen Sie Ihre Bank, um fortzufahren.",
  "checkout.choosePaymentHint": "Bitte wählen Sie zuerst eine Zahlungsart.",
  "checkout.usp.freeReturn": "Rückgabe innerhalb von 14 Tagen",
  "checkout.usp.fastDelivery": "Schnelle Lieferung",

  "checkout.trust.heading": "Was Kunden über KLUSR sagen",
  "checkout.trust.based": "{average} — basierend auf {count} Bewertungen",
  "checkout.trust.verified": "Verifizierter Kauf",

  "checkout.error.choosePayment": "Bitte wählen Sie zuerst eine Zahlungsart.",
  "checkout.error.chooseBank": "Bitte wählen Sie zuerst Ihre Bank für iDEAL.",
  "checkout.error.accountPassword":
    "Wählen Sie ein Passwort mit mindestens 8 Zeichen für Ihr Konto.",
  "checkout.error.card": "Bitte prüfen Sie Ihre Kartendaten und versuchen Sie es erneut.",
  "checkout.error.paymentFailed": "Zahlung konnte nicht erstellt werden",
  "checkout.error.generic": "Etwas ist schiefgelaufen",

  "checkout.payment.chooseBank": "Wählen Sie Ihre Bank",
  "checkout.payment.hint.ideal": "Zahlen Sie direkt mit Ihrer eigenen Bank",
  "checkout.payment.hint.creditcard": "Visa, Mastercard",
  "checkout.payment.hint.klarna": "Später bezahlen — innerhalb von 14 Tagen",
  "checkout.payment.hint.bancontact": "Zahlen Sie mit Ihrer Bancontact-Karte",

  "checkout.reorder.title": "Etwas vergessen?",
  "checkout.reorder.textPre": "Bestellen Sie innerhalb von ",
  "checkout.reorder.textMinutes": "15 Minuten",
  "checkout.reorder.textMid": " noch etwas und zahlen Sie ",
  "checkout.reorder.textBold": "keine zusätzlichen Versandkosten",
  "checkout.reorder.textPost": " — wir versenden alles in einem Paket.",
  "checkout.reorder.added": "Hinzugefügt — keine zusätzlichen Versandkosten",
  "checkout.reorder.addAria": "{title} hinzufügen",
  "checkout.reorder.toCart": "Zum Warenkorb",
  "checkout.reorder.continueShopping": "Weiter einkaufen",

  "checkout.thanks.title": "Vielen Dank für Ihre Bestellung!",
  "checkout.thanks.text":
    "Wir haben Ihre Bestellung erhalten und kümmern uns sofort darum.",
  "checkout.thanks.confirmationSentPre": " Eine Bestätigung wurde gesendet an ",
  "checkout.thanks.confirmationSentPost": ".",
  "checkout.thanks.orderNumber": "Bestellnummer",
  "checkout.thanks.orderDate": "Bestelldatum",
  "checkout.thanks.subtotal": "Zwischensumme",
  "checkout.thanks.shipping": "Versandkosten",
  "checkout.thanks.totalPaid": "Gesamt bezahlt",
  "checkout.thanks.free": "Kostenlos",
  "checkout.thanks.expectedDelivery": "Voraussichtliche Lieferung: {date}",
  "checkout.thanks.step.confirmation.title": "Bestätigung",
  "checkout.thanks.step.confirmation.hint": "Prüfen Sie Ihren Posteingang",
  "checkout.thanks.step.packing.title": "Wird verpackt",
  "checkout.thanks.step.packing.hint": "Noch heute",
  "checkout.thanks.step.onTheWay.title": "Unterwegs",
  "checkout.thanks.step.onTheWay.hint": "Verfolgen Sie Ihr Paket",
  "checkout.thanks.trackOrder": "Bestellung verfolgen",
  "checkout.thanks.continueShopping": "Weiter einkaufen",
  "checkout.thanks.downloadInvoice": "Rechnung herunterladen (PDF)",
  "checkout.thanks.deliveryAddress": "Lieferadresse",
  "checkout.thanks.loadError":
    "Wir konnten die Bestelldaten nicht laden, aber Ihre Zahlung ist ordnungsgemäß eingegangen. Sie erhalten eine Bestätigung per E-Mail.",
  "checkout.thanks.backHome": "Zurück zur Startseite",
  "checkout.thanks.successBadge": "Zahlung erfolgreich",
  "checkout.thanks.orderSummary": "Ihre Bestellung",
  "checkout.thanks.needHelp.title": "Fragen zu Ihrer Bestellung?",
  "checkout.thanks.needHelp.text":
    "Unser Team hilft Ihnen gerne — von Lieferzeiten bis zur Produktberatung.",
  "checkout.thanks.needHelp.cta": "Zum Kundenservice",
  "checkout.pending.title": "Wir verarbeiten Ihre Zahlung…",
  "checkout.pending.text":
    "Ihre Zahlung wird noch von Ihrer Bank bestätigt. Das dauert in der Regel nur wenige Sekunden.",
  "checkout.pending.hint":
    "Diese Seite aktualisiert sich automatisch, sobald Ihre Zahlung abgeschlossen ist. Sie müssen nichts tun.",
  "checkout.pending.refreshNow": "Status jetzt aktualisieren",
  "checkout.pending.backHome": "Zurück zur Startseite",
  "checkout.failed.title": "Ihre Zahlung ist fehlgeschlagen",
  "checkout.failed.canceledTitle": "Ihre Zahlung wurde abgebrochen",
  "checkout.failed.expiredTitle": "Ihre Zahlung ist abgelaufen",
  "checkout.failed.text":
    "Es wurde kein Betrag abgebucht. Sie können es bedenkenlos erneut versuchen.",
  "checkout.failed.cartKept": "Ihr Warenkorb wurde gespeichert.",
  "checkout.failed.retry": "Erneut versuchen",
  "checkout.failed.toCart": "Zum Warenkorb",
  "checkout.failed.help": "Brauchen Sie Hilfe? Kontaktieren Sie den Kundenservice",
  "checkout.failed.orderRef": "Bestellnummer: {ref}",

  "checkout.validation.required": "Pflichtfeld",
  "checkout.validation.email": "Geben Sie eine gültige E-Mail-Adresse ein",
  "checkout.validation.postalCode": "Geben Sie Ihre Postleitzahl ein",
  "checkout.validation.street": "Geben Sie Ihren Straßennamen ein",
  "checkout.validation.terms": "Bitte stimmen Sie den Allgemeinen Geschäftsbedingungen zu, um zu bestellen.",
  "checkout.validation.postalCodeNl": "Z. B. 7443 BR",
  "checkout.validation.coc": "Eine Handelsregisternummer hat 8 Ziffern.",
  "checkout.validation.vat": "Geben Sie eine gültige USt-IdNr. ein, z. B. NL000000000B00.",

  "service.hero.kicker": "Kundenservice",
  "service.hero.title": "Womit können wir Ihnen helfen?",
  "service.hero.subtitle":
    "Finden Sie unten schnell eine Antwort auf die häufigsten Fragen oder nehmen Sie direkt Kontakt mit uns auf. Unsere Heimwerker stehen für Sie bereit.",

  "service.trust.delivery": "Vor 09:00 Uhr bestellt, heute Abend geliefert",
  "service.trust.returns": "14 Tage Widerrufsrecht",
  "service.trust.payment": "Sicher bezahlen über Mollie",
  "service.trust.advice": "Beratung von ehemaligen Malern",
  "service.trust.warranty": "Gesetzliche Garantie auf alles",

  "service.contact.call.title": "Rufen Sie uns an",
  "service.contact.call.description": "Mo. bis Fr. 09:00 - 18:00 Uhr",
  "service.contact.mail.title": "Schreiben Sie uns",
  "service.contact.mail.description": "Antwort innerhalb von 1 Werktag",
  "service.contact.store.title": "Farbberatung",
  "service.contact.store.description": "Kostenlose Beratung von unseren ehemaligen Malern",
  "service.contact.store.action": "Zum Farbwähler",
  "service.contact.ai.title": "Klushulp",
  "service.contact.ai.description": "Sofortige Antwort, Tag und Nacht",
  "service.contact.ai.action": "Stellen Sie Ihre Frage",

  "service.shipping.title": "Versandkosten",
  "service.shipping.subtitle":
    "Kostenloser Versand ab {amount} in den Niederlanden und Belgien. An Werktagen vor 09:00 Uhr bestellt? Dann ist Ihr Paket noch heute Abend bei Ihnen.",
  "service.shipping.rowNl": "Niederlande",
  "service.shipping.freeFrom": "· kostenlos ab {amount}",
  "service.shipping.mailbox": "Briefkastenpaket (NL)",
  "service.shipping.mailboxHint": "Kleine, flache Artikel, die durch den Briefkasten passen",
  "service.shipping.rowBe": "Belgien",
  "service.shipping.outsideNote":
    "Wir liefern in die gesamte EU. Außerhalb der Niederlande und Belgiens gibt es keinen kostenlosen Versand. Außerhalb der EU — einschließlich der Schweiz und des Vereinigten Königreichs — versenden wir aufgrund des Zolls nicht.",

  "service.group.shipping.title": "Versand & Rückgabe",
  "service.group.shipping.intro":
    "Kostenloser Versand ab {free} in NL und BE, vor 09:00 Uhr bestellt ist heute Abend geliefert, und Rückgabe per Post mit Rücksendeetikett möglich — die Rücksendekosten trägt der Kunde. In den Rest der EU ab {eu}.",
  "service.group.payment.title": "Sicher bezahlen",
  "service.group.payment.intro":
    "Bezahlen Sie einfach und sicher mit iDEAL, Bancontact, Kreditkarte oder später mit Klarna über Mollie.",
  "service.group.warranty.title": "Garantie & Service",
  "service.group.warranty.intro":
    "Gesetzliche Garantie auf alles, plus persönlicher Service von unseren ehemaligen Malern.",
  "service.group.mengverf.title": "Mischfarbe & Farbberatung",
  "service.group.mengverf.intro":
    "Jede Farbe nach Maß gemischt mit exakter Farbübereinstimmung. Bitte beachten: Nach Farbton gemischte Farbe ist Maßarbeit und kann nicht zurückgegeben werden.",
  "service.group.kluspas.title": "KLUSRPAS & Geschäftskunden",
  "service.group.kluspas.intro":
    "Kostenloser KLUSRPAS-Vorteil für Privatkunden und die ProfPas mit 10 % Rabatt (zzgl. MwSt.) für Geschäftskunden.",

  "service.faq.shipping.when.q": "Wann wird meine Bestellung geliefert?",
  "service.faq.shipping.when.a":
    "Bestellen Sie an Werktagen vor 09:00 Uhr? Dann ist Ihre Bestellung noch heute Abend bei Ihnen. Sie erhalten einen Track-&-Trace-Code, sobald Ihr Paket unterwegs ist.",
  "service.faq.shipping.cost.q": "Was kostet der Versand?",
  "service.faq.shipping.cost.a":
    "In den Niederlanden und Belgien ist der Versand ab {nlFree} kostenlos. Darunter zahlen Sie {nlPrice} in den Niederlanden und {bePrice} in Belgien. Kleine, flache Artikel versenden wir als Briefkastenpaket für {mailbox} (nur NL). In die übrigen EU-Länder liefern wir ab {eu}; dort gilt kein kostenloser Versand. Die genauen Versandkosten sehen Sie immer während des Bezahlvorgangs.",
  "service.faq.shipping.abroad.q": "Liefern Sie auch ins Ausland?",
  "service.faq.shipping.abroad.a":
    "Wir liefern in die gesamte EU. Nach Belgien ist der Versand ab {beFree} kostenlos; für die übrigen EU-Länder gilt ein fester Tarif pro Land ab {eu}, den Sie während des Bezahlvorgangs sehen. Außerhalb der EU — einschließlich der Schweiz und des Vereinigten Königreichs — versenden wir aufgrund des Zolls nicht.",
  "service.faq.shipping.return.q": "Wie gebe ich ein Produkt zurück?",
  "service.faq.shipping.return.a":
    "Die Rückgabe ist per Post mit einem Rücksendeetikett möglich; die Rücksendekosten trägt der Kunde. Melden Sie Ihre Rückgabe über Ihr Konto oder den Kundenservice an, dann erhalten Sie das Rücksendeetikett und die Anweisungen. Sie haben 14 Tage Bedenkzeit.",

  "service.faq.payment.methods.q": "Welche Zahlungsmethoden akzeptieren Sie?",
  "service.faq.payment.methods.a":
    "Sie bezahlen sicher mit iDEAL, Bancontact, Kreditkarte oder im Nachhinein über Klarna. Alle Zahlungen werden verschlüsselt über unseren Zahlungspartner Mollie abgewickelt.",
  "service.faq.payment.afterwards.q": "Kann ich im Nachhinein bezahlen?",
  "service.faq.payment.afterwards.a":
    "Ja, mit Klarna bezahlen Sie sicher im Nachhinein. Sie zahlen erst, nachdem Sie Ihre Bestellung erhalten und geprüft haben.",
  "service.faq.payment.safe.q": "Ist das Bezahlen online sicher?",
  "service.faq.payment.safe.a":
    "Absolut. Alle Transaktionen laufen über Mollie, einen zertifizierten Zahlungsdienst. Wir selbst speichern keine Zahlungsdaten.",

  "service.faq.warranty.products.q": "Welche Garantie erhalte ich auf Produkte?",
  "service.faq.warranty.products.a":
    "Für all unsere Produkte gilt die gesetzliche Garantie. Darüber hinaus bieten viele Marken ihre eigene Herstellergarantie. Stimmt etwas mit Ihrem Produkt nicht? Nehmen Sie Kontakt auf, dann suchen wir gemeinsam nach einer Lösung.",
  "service.faq.warranty.damaged.q": "Mein Produkt ist beschädigt angekommen, was nun?",
  "service.faq.warranty.damaged.a":
    "Wie ärgerlich! Kontaktieren Sie innerhalb von 48 Stunden unseren Kundenservice und fügen Sie ein Foto bei. Wir senden kostenlos ein Ersatzprodukt oder erstatten den Betrag.",
  "service.faq.warranty.store.q": "Wie erhalte ich Service oder Beratung?",
  "service.faq.warranty.store.a":
    "KLUSR ist vollständig online. Unsere ehemaligen Maler helfen Ihnen gerne mit Beratung oder Fragen zu Ihrem Einkauf über den Kundenservice oder die Klushulp weiter — Sie erhalten schnell eine persönliche Antwort.",

  "service.faq.mengverf.return.q": "Kann ich nach Farbton gemischte Farbe zurückgeben?",
  "service.faq.mengverf.return.a":
    "Nach Farbton gemischte Farbe mischen wir speziell für Sie nach Maß. Daher ist sie — wie andere maßgefertigte Produkte — gesetzlich vom Widerrufsrecht ausgeschlossen und wir können Mischfarbe nicht zurücknehmen. Stimmt unerwartet etwas mit der Farbe oder dem Produkt nicht? Dann nehmen Sie Kontakt auf, und wir lösen es gemeinsam kostenlos.",
  "service.faq.mengverf.match.q": "Wie genau ist die Farbübereinstimmung?",
  "service.faq.mengverf.match.a":
    "Wir mischen auf Basis professioneller Farbcodes (u. a. RAL, Gamma und AkzoNobel) für eine exakte Übereinstimmung. Sind Sie sich bei einer Farbe unsicher? Bestellen Sie zuerst einen Farbtester oder einen Probetopf, bevor Sie die gesamte Menge mischen lassen — beachten Sie, dass Bildschirmfarben leicht abweichen können.",
  "service.faq.mengverf.amount.q": "Wie viel Farbe brauche ich?",
  "service.faq.mengverf.amount.a":
    "Rechnen Sie grob mit 1 Liter pro 8–10 m² pro Schicht. Auf der Produktseite und über unsere Klushulp rechnen wir es genau für Sie aus, damit Sie weder zu viel noch zu wenig bestellen.",
  "service.faq.mengverf.instore.q": "Wie lasse ich Farbe nach Farbton mischen?",
  "service.faq.mengverf.instore.a":
    "Wählen Sie Ihre Farbe online im Farbwähler und bestellen Sie die passende Farbe. Unsere Farbspezialisten mischen Ihre Farbe fachkundig auf den exakten Farbton und wir liefern sie gebrauchsfertig zu Ihnen nach Hause.",

  "service.faq.kluspas.what.q": "Was ist die KLUSRPAS und was kostet sie?",
  "service.faq.kluspas.what.a":
    "Die KLUSRPAS ist völlig kostenlos und gibt Ihnen sofort den günstigeren KLUSRPAS-Preis auf die gesamte Kollektion sowie exklusive Aktionen. Sie aktivieren sie beim Erstellen eines Kontos.",
  "service.faq.kluspas.business.q": "Ich bestelle geschäftlich — ist das auch möglich?",
  "service.faq.kluspas.business.a":
    "Ja. Für Selbstständige, Maler und Unternehmen haben wir die KLUSR ProfPas: 10 % Rabatt auf die gesamte Kollektion und Preise zzgl. MwSt., auf Rechnung. Die kostenlose Registrierung ist über die Geschäftskunden-Seite möglich.",
  "service.faq.kluspas.invoice.q": "Erhalte ich eine Rechnung mit MwSt.?",
  "service.faq.kluspas.invoice.a":
    "Ja, bei jeder Bestellung erhalten Sie eine ordentliche Rechnung mit ausgewiesener MwSt. Geschäftskunden sehen die Preise zzgl. MwSt. und zahlen auf Rechnung.",

  "service.general.title": "Bestellen & Konto",
  "service.faq.general.order.q": "Wie gebe ich eine Bestellung auf?",
  "service.faq.general.order.a":
    "Legen Sie Produkte in Ihren Warenkorb, gehen Sie zur Kasse und durchlaufen Sie die Schritte. Sie brauchen kein Konto, um zu bestellen, aber mit einem Konto geht es beim nächsten Mal schneller.",
  "service.faq.general.account.q": "Brauche ich ein Konto?",
  "service.faq.general.account.a":
    "Nein, Sie können als Gast bestellen. Mit einem Konto bewahren Sie jedoch Ihre Daten, Ihre Bestellhistorie und Ihre KLUSRPAS-Vorteile an einem Ort auf.",
  "service.faq.general.mix.q": "Kann ich Farbe nach Farbton mischen lassen?",
  "service.faq.general.mix.a":
    "Ja! Wir mischen jede gewünschte Farbe nach Maß. Wählen Sie Ihre Farbe online im Farbwähler und unsere Farbspezialisten mischen Ihre Farbe fachkundig auf den exakten Farbton und liefern sie gebrauchsfertig.",

  "service.guarantee.title": "Nicht zufrieden? Geld zurück.",
  "service.guarantee.text":
    "Wir möchten, dass Sie Ihr Projekt mit gutem Gefühl angehen. Deshalb: 14 Tage Bedenkzeit, Rückgabe per Post mit Rücksendeetikett möglich (die Rücksendekosten trägt der Kunde) und gesetzliche Garantie auf alles. Nach Farbton gemischte Farbe ist Maßarbeit und daher von der Rückgabe ausgenommen — aber bei einem Mangel lösen wir es immer kostenlos.",
  "service.guarantee.cta": "Lesen Sie die Rückgabebedingungen",

  "service.contactBlock.title": "Ist Ihre Frage nicht dabei?",
  "service.contactBlock.text":
    "Senden Sie uns eine Nachricht. Sie erhalten sofort eine Ticketnummer und eine Bestätigung per E-Mail — wir antworten meist innerhalb von 1 Werktag.",
  "service.contactBlock.preferPre": "Lieber sofort eine Antwort? ",
  "service.contactBlock.preferLink": "Fragen Sie die Klushulp",
  "service.contactBlock.preferPost": " — rund um die Uhr verfügbar.",
  "service.contactBlock.viewStorePage": "Fragen Sie die Klushulp",

  "faq.meta.breadcrumb": "Häufig gestellte Fragen",
  "faq.badge": "Hilfe & Erklärung",
  "faq.title": "Häufig gestellte Fragen",
  "faq.subtitle": "Nicht gefunden, wonach Sie suchen? Unser Kundenservice hilft Ihnen gerne weiter.",
  "faq.more.title": "Noch eine Frage?",
  "faq.more.text": "Wir helfen Ihnen gerne persönlich weiter.",
  "faq.more.cta": "Zum Kundenservice",

  "faq.group.ordering": "Bestellen & bezahlen",
  "faq.group.delivery": "Lieferung & Rückgabe",
  "faq.group.mengverf": "Mischfarbe & Farbe",
  "faq.group.kluspas": "KLUSRPAS",

  "faq.order.how.q": "Wie gebe ich eine Bestellung auf?",
  "faq.order.how.a":
    "Legen Sie Produkte in Ihren Warenkorb und bezahlen Sie sicher. Bei Farbe wählen Sie zuerst Ihre Farbe — die wir exakt für Sie mischen.",
  "faq.order.payment.q": "Welche Zahlungsmethoden akzeptieren Sie?",
  "faq.order.payment.a":
    "Sie bezahlen sicher über Mollie mit unter anderem iDEAL, Kreditkarte und — wo verfügbar — Zahlung im Nachhinein.",
  "faq.order.account.q": "Brauche ich ein Konto?",
  "faq.order.account.a":
    "Nein, Sie können als Gast bestellen. Mit einem (kostenlosen) Konto und der KLUSRPAS profitieren Sie jedoch von zusätzlichen Vorteilen und bewahren Ihre Bestellungen und Farben auf.",
  "faq.order.account.text":
    "Nein, Sie können als Gast bestellen. Mit einem kostenlosen Konto und der KLUSRPAS profitieren Sie von zusätzlichen Vorteilen und bewahren Ihre Bestellungen und Farben auf.",

  "faq.delivery.when.q": "Wann ist meine Bestellung bei mir?",
  "faq.delivery.when.a":
    "An Werktagen vor 09:00 Uhr bestellt, heute Abend geliefert. Der Versand ist ab € 50 kostenlos, darunter berechnen wir € 4,95.",
  "faq.delivery.pickup.q": "Kann ich meine Bestellung abholen?",
  "faq.delivery.pickup.aPre": "KLUSR ist vollständig online — wir liefern in die ganzen Niederlande und nach Belgien. Fragen zu Ihrer Lieferung? Unser ",
  "faq.delivery.pickup.aLink": "Kundenservice",
  "faq.delivery.pickup.aPost": " hilft Ihnen gerne weiter.",
  "faq.delivery.pickup.text": "KLUSR ist vollständig online — wir liefern in die ganzen Niederlande und nach Belgien. Eine Abholung ist nicht möglich.",
  "faq.delivery.return.q": "Wie gebe ich ein Produkt zurück?",
  "faq.delivery.return.aPre": "Sie haben 14 Tage Bedenkzeit. Melden Sie Ihre Rückgabe bei unserem ",
  "faq.delivery.return.aLink": "Kundenservice",
  "faq.delivery.return.aMid": ". Bitte beachten: Nach Farbton gemischte Farbe ist von der Rückgabe ausgeschlossen (siehe ",
  "faq.delivery.return.aTermsLink": "Bedingungen",
  "faq.delivery.return.aPost": ").",
  "faq.delivery.return.text":
    "Sie haben 14 Tage Bedenkzeit. Melden Sie Ihre Rückgabe bei unserem Kundenservice. Nach Farbton gemischte Farbe ist von der Rückgabe ausgeschlossen.",

  "faq.mengverf.any.q": "Kann ich jede Farbe mischen lassen?",
  "faq.mengverf.any.aPre":
    "Ja. Wählen Sie aus Tausenden von Farben (Gamma, Sikkens, RAL, AkzoNobel) oder Ihrem eigenen Farbton in unserem ",
  "faq.mengverf.any.aLink": "Farbwähler",
  "faq.mengverf.any.aPost": ". Wir mischen die Farbe exakt nach Farbton.",
  "faq.mengverf.any.text":
    "Ja. Wählen Sie aus Tausenden von Farben (Gamma, Sikkens, RAL, AkzoNobel) oder Ihrem eigenen Farbton in unserem Farbwähler. Wir mischen die Farbe exakt nach Farbton.",
  "faq.mengverf.how.q": "Wie funktioniert Mischfarbe genau?",
  "faq.mengverf.how.aPre":
    "Sie wählen eine Farbe, wir mischen sie professionell in die richtige Basis. Mehr lesen Sie auf ",
  "faq.mengverf.how.aLink": "der Mischfarbe-Seite",
  "faq.mengverf.how.aPost": ".",
  "faq.mengverf.how.text":
    "Sie wählen eine Farbe, wir mischen sie professionell in die richtige Basis. Mehr lesen Sie auf der Mischfarbe-Seite.",
  "faq.mengverf.exchange.q": "Kann ich gemischte Farbe umtauschen?",
  "faq.mengverf.exchange.a":
    "Nach Farbton gemischte Farbe fertigen wir speziell für Sie an und sie ist daher vom Widerrufsrecht ausgeschlossen, es sei denn, es liegt ein Mangel vor.",

  "faq.kluspas.what.q": "Was ist die KLUSRPAS?",
  "faq.kluspas.what.aPre":
    "Die kostenlose KLUSRPAS gibt Ihnen immer den günstigsten Preis und exklusive Aktionen. Lesen Sie alles darüber auf der ",
  "faq.kluspas.what.aLink": "KLUSRPAS-Seite",
  "faq.kluspas.what.aPost": ".",
  "faq.kluspas.what.text":
    "Die kostenlose KLUSRPAS gibt Ihnen immer den günstigsten Preis und exklusive Aktionen.",
  "faq.kluspas.cost.q": "Was kostet die KLUSRPAS?",
  "faq.kluspas.cost.a": "Nichts — die KLUSRPAS ist kostenlos zu beantragen und zu nutzen.",

  "about.breadcrumb": "Über KLUSR",
  "about.hero.kicker": "Über KLUSR",
  "about.hero.titleLead": "Die beste Farbe und alles, was Sie ",
  "about.hero.titleAccent": "jetzt",
  "about.hero.titleTail": " für Ihr Projekt brauchen",
  "about.hero.intro":
    "KLUSR entstand aus einer einfachen Frustration: Zu oft verließ man den Baumarkt mit der falschen Farbe und ohne gute Beratung. Das geht besser. Bei KLUSR erhalten Sie professionelle Qualität, den günstigsten Preis und Beratung von Menschen, die das Handwerk wirklich verstehen — ehemalige Maler.",

  "about.value.advice.title": "Beratung von ehemaligen Malern",
  "about.value.advice.body":
    "Unsere Leute haben selbst jahrelang mit dem Pinsel gearbeitet. Diese Beratung erhalten Sie gratis dazu.",
  "about.value.color.title": "Jede Farbe, exakt gemischt",
  "about.value.color.body":
    "Tausende Farben aus allen bekannten Farbfächern — professionell nach Farbton gemischt, gebrauchsfertig.",
  "about.value.quality.title": "Professionelle Qualität",
  "about.value.quality.body":
    "Top-Marken, günstig im Preis, und mit der kostenlosen KLUSRPAS immer der größte Vorteil für Ihr gesamtes Projekt.",

  "about.story.title": "Unsere Geschichte",
  "about.story.p1":
    "Was mit einer Mischmaschine und einer Menge Wissen begann, wuchs zum Online-Heimwerker-Spezialisten für Heimwerker und Profis. Der rote Faden blieb derselbe: die beste Beratung und die richtigen Materialien, sowohl für Heimwerker als auch für Profis.",
  "about.story.p2":
    "Heute bündeln wir dieses Wissen in einem kompletten Webshop. Online der günstigste KLUSRPAS-Preis, Ihre Farbe exakt gemischt und bis vor die Haustür geliefert, mit persönlicher Beratung von unseren ehemaligen Malern über die Klushulp und den Kundenservice.",

  "about.stores.title": "Online, landesweit",
  "about.stores.all": "Sortiment ansehen",

  "about.cta.title": "Bereit loszulegen?",
  "about.cta.text": "Beantragen Sie Ihre KLUSRPAS kostenlos und sichern Sie sich gleich den Vorteil.",
  "about.cta.button": "Mehr über die KLUSRPAS",

  "notFound.code": "404",
  "notFound.title": "Diese Seite konnten wir nicht finden",
  "notFound.text":
    "Die Seite wurde verschoben oder existiert nicht mehr. Suchen Sie unten weiter — die Chance ist groß, dass wir finden, wonach Sie suchen.",
  "notFound.searchPlaceholder": "Suchen Sie ein Produkt, eine Marke oder eine Farbe…",
  "notFound.searchSubmit": "Suchen",
  "notFound.searchAria": "Suchen",
  "notFound.popular": "Beliebt bei KLUSR",
  "notFound.popular.paint": "Farbe",
  "notFound.popular.colorPicker": "Farbwähler",
  "notFound.popular.tools": "Werkzeug",
  "notFound.popular.advice": "Heimwerker-Beratung",
  "notFound.toHome": "Zur Startseite",
  "notFound.customerService": "Kundenservice",

  "plp.filters": "Filter",
  "plp.clearFilters": "Filter löschen",
  "plp.clearFiltersCount": "Filter löschen ({count})",
  "plp.clearAll": "Alle Filter löschen",
  "plp.resultCount": "Produkte",
  "plp.resultCountOne": "Produkt",
  "plp.show": "{count} Produkte anzeigen",
  "plp.showOne": "{count} Produkt anzeigen",
  "plp.sortAria": "Sortieren",
  "plp.sort.populair": "Beliebt",
  "plp.sort.priceAsc": "Preis aufsteigend",
  "plp.sort.priceDesc": "Preis absteigend",
  "plp.sort.rating": "Beste Bewertung",
  "plp.sort.newest": "Neueste",

  "plp.group.mengverf": "Mischfarbe",
  "plp.group.productType": "Produktart",
  "plp.group.price": "Preis",
  "plp.group.volume": "Inhalt",
  "plp.group.rating": "Bewertung",
  "plp.group.dealsLabels": "Aktionen & Labels",
  "plp.group.brand": "Marke",

  "plp.facet.glans": "Glanzgrad",
  "plp.facet.materiaal": "Material",
  "plp.facet.fitting": "Fassung",
  "plp.facet.dessin": "Dessin",
  "plp.facet.toepassing": "Anwendung",
  "plp.facet.korrel": "Körnung",
  "plp.facet.lichtkleur": "Lichtfarbe",
  "plp.facet.type": "Typ",

  "plp.priceBucket.lt25": "Bis € 25",
  "plp.priceBucket.mid": "€ 25 – € 50",
  "plp.priceBucket.high": "€ 50 – € 100",
  "plp.priceBucket.top": "Ab € 100",

  "plp.rating.min4": "4 Sterne & mehr",
  "plp.rating.min45": "4,5 Sterne & mehr",
  "plp.ratingChip": "{rating}+ Sterne",

  "plp.badge.actie": "Aktion",
  "plp.badge.bestseller": "Bestseller",
  "plp.badge.proKeuze": "Profi-Wahl",
  "plp.badge.nieuw": "Neu",
  "plp.badge.bundel": "Vorteilspaket",

  "plp.colorMixable": "Nach Farbe mischbar",
  "plp.viewAria": "Ansicht",
  "plp.viewGrid": "Rasteransicht",
  "plp.viewList": "Listenansicht",
  "plp.empty.title": "Keine Produkte gefunden",
  "plp.empty.text": "Passen Sie Ihre Filter an, um mehr Ergebnisse zu sehen.",
  "plp.favorite": "Als Favorit speichern",

  "finder.title": "Nicht sicher, was Sie brauchen?",
  "finder.subtitle": "Beschreiben Sie kurz Ihr Projekt, dann finden wir gleich die passenden Produkte für Sie.",
  "finder.placeholder": "Z. B. Farbe für meine Holzfenster außen",
  "finder.inputAria": "Beschreiben Sie Ihr Projekt",
  "finder.submit": "Produkte finden",
  "finder.submitShort": "Finden",
  "finder.applied": "Filter auf Ihr Projekt angewendet.",
  "finder.none": "Kein spezifischer Filter gefunden — präzisieren Sie Ihre Frage oder nutzen Sie die Filter.",
  "finder.error": "Das hat gerade nicht geklappt. Versuchen Sie es erneut oder nutzen Sie die Filter links.",

  "pdp.addToCart": "In den Warenkorb",
  "pdp.buyNow": "Direkt kaufen",
  "pdp.reviewsLink": "{rating} · {count} Bewertungen",
  "pdp.sizeLabel": "Größe / Inhalt:",
  "pdp.color": "Farbe",
  "pdp.chooseColor": "Wählen Sie Ihre Farbe",
  "pdp.changeColor": "Farbe ändern",
  "pdp.anyColor":
    "Jede Farbe möglich — wir mischen die Farbe exakt nach Ihrer gewählten Nuance. Wählen Sie eine Farbe, um sie an der Wand zu sehen.",
  "pdp.mixed.pre": "Wird ",
  "pdp.mixed.bold": "professionell nach Farbe gemischt",
  "pdp.mixed.inBase": " in {base}",
  "pdp.mixed.post": ". Exakte Übereinstimmung, gebrauchsfertig.",
  "pdp.chooseColorTitle": "Wählen Sie zuerst eine Farbe",
  "pdp.chooseColorBuy": "Wählen Sie eine Farbe, bevor Sie diese Farbe bestellen.",
  "pdp.chooseColorAdd": "Wählen Sie eine Farbe, bevor Sie diese Farbe hinzufügen.",
  "pdp.addedToCart": "Zum Warenkorb hinzugefügt",
  "pdp.favAdded": "Zu Favoriten hinzugefügt",
  "pdp.favRemoved": "Aus Favoriten entfernt",
  "pdp.favSave": "Für später speichern",
  "pdp.favSaved": "In Favoriten gespeichert",
  "pdp.kluspasPrice": "KLUSRPAS-Preis",
  "pdp.profpasPrice": "ProfPas-Preis",
  "pdp.normalPrice": "Normaler Preis",
  "pdp.withoutAccount": "— ohne Konto",
  "pdp.kluspas.title": "KLUSRPAS-Preis — kostenlos für alle",
  "pdp.kluspas.body":
    "Wähle beim Bezahlen ein kostenloses Konto und der KLUSRPAS-Rabatt wird sofort verrechnet. Kein Abo, keine Verpflichtungen.",
  "pdp.kluspas.link": "Was ist die KLUSRPAS?",
  "pdp.kluspas.drawer.intro":
    "Die KLUSRPAS ist die kostenlose Vorteilskarte von KLUSR. Karteninhaber zahlen immer den niedrigsten Preis im gesamten Sortiment.",
  "pdp.kluspas.drawer.benefit1": "Immer der niedrigste KLUSRPAS-Preis",
  "pdp.kluspas.drawer.benefit2": "Exklusive Aktionen und Angebote",
  "pdp.kluspas.drawer.benefit3": "Kostenlose persönliche Farbberatung",
  "pdp.kluspas.drawer.benefit4": "Klustegoed bei jedem Einkauf sammeln",
  "pdp.kluspas.drawer.how":
    "Erstelle ein kostenloses Konto; der Rabatt wird beim Bezahlen sofort verrechnet. Keine Verpflichtungen.",
  "pdp.kluspas.drawer.cta": "Konto erstellen",
  "pdp.kluspas.drawer.more": "Mehr über die KLUSRPAS erfahren",
  "pdp.kluspas.teaserTitle": "{price} mit KLUSRPAS",
  "pdp.kluspas.teaserCta": "Anmelden oder kostenloses Konto erstellen",
  "pdp.kluspas.teaserSave": "Spare {amount} · {pct}% Rabatt",
  "pdp.surcharge": "Inkl. {base} (+{amount} für dunkle Farbe)",
  "pdp.perLiter": "{price} pro Liter",
  "pdp.discountBadge": "{pct}% RABATT",
  "pdp.withPass": "mit {pass}",
  "pdp.passExplain": "{pct}% Rabatt auf das gesamte Sortiment mit deiner kostenlosen {pass}.",
  "pdp.yourPrice": "Dein Preis",
  "pdp.yourPassPrice": "mit {pass}",
  "pdp.passApplied": "{pct}% Rabatt, automatisch mit deiner {pass} verrechnet.",
  "pdp.perLiterCheaper": "größerer Eimer ist günstiger pro Liter",
  "pdp.stockForBasePre": "Bestand angezeigt für ",
  "pdp.stockForBasePost": " — jede Basis hat einen eigenen Bestand.",

  "pdp.usp.freeShipping": "Kostenloser Versand ab €50",
  "pdp.usp.returns": "Rückgabe innerhalb von 14 Tagen",
  "pdp.usp.afterpay": "Kauf auf Rechnung möglich",

  "pdp.tab.description": "Beschreibung",
  "pdp.tab.specs": "Spezifikationen",
  "pdp.tab.reviews": "Bewertungen",
  "pdp.tab.processing": "Verarbeitung & Beratung",
  "pdp.reviews.basedOnPre": "Basierend auf ",
  "pdp.reviews.basedOnPost": " Bewertungen von verifizierten Heimwerkern.",
  "pdp.reviews.verified": "Verifiziert",
  "pdp.reviews.none": "Noch keine Bewertungen.",
  "pdp.reviews.empty": "Noch keine Bewertungen für dieses Produkt.",
  "pdp.reviews.beFirst": "Sei der Erste, der eine Bewertung schreibt.",
  "rating.none": "Noch keine Bewertungen",
  "pdp.processing.title": "Beratung von unseren ehemaligen Malern",

  "price.advies": "UVP",
  "price.normal": "Normal",
  "price.inclVat": "inkl. MwSt.",
  "price.exclVat": "exkl. MwSt.",
  "price.from": "ab",
  "price.save": "Sie sparen {amount}",
  "price.savePct": " ({pct} %)",
  "price.vsAdvies": " auf den UVP",
  "price.vsAccount": " mit Ihrem kostenlosen KLUSR-Konto",

  "chat.teaser.product": "Fragen zu diesem Produkt? Ich helfe Ihnen gern.",
  "chat.teaser.category": "Hilfe bei der Auswahl? Fragen Sie die Klushulp.",
  "chat.teaser.cart": "Noch Zweifel vor dem Bezahlen? Ich denke mit.",
  "chat.teaser.general": "Hallo! 👋 Fragen zu Ihrem Projekt? Fragen Sie ruhig.",
  "chat.teaser.cta": "Mit der Klushulp chatten",
  "chat.teaser.openAria": "Chat mit der Klushulp öffnen",
  "chat.teaser.dismissAria": "Chat-Einladung schließen",

  "delivery.beforeCutoff": "Vor {time} bestellt, {day} geliefert",
  "delivery.afterCutoff": "Bestellt → {day} geliefert",
  "delivery.today": "heute Abend",
  "delivery.tomorrow": "morgen",
  "delivery.dayAfter": "übermorgen",
  "delivery.countdown": "noch {h} Std. {m} Min.",
};

// Pools: overlay bovenop NL. De vertaal-cron (scripts/translate-ui.mjs) vult
// messages.pl.json; ontbrekende keys vallen netjes terug op het Nederlands.
const pl: Messages = { ...nl, ...(plOverlay as Partial<Messages>) } as Messages;

export const dictionaries: Record<Locale, Messages> = { nl, en, fr, de, pl };

export type MessageKey = keyof Messages;
