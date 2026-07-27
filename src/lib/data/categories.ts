import type { Category } from "@/types";

/**
 * Verf-taxonomie in 7 groepen → SEO-landingspagina's per type. Elke leaf is een
 * eigen pagina (/categorie/verf/<slug>) met eigen tekst en gekoppelde producten.
 * De groepen structureren het mega-menu; de flat-lijst voedt routing/filters.
 */
const verfSubGroups = [
  {
    title: "Lakken",
    slug: "lakken",
    subCategories: [
      { title: "Binnenlak", slug: "binnenlak" },
      { title: "Buitenlak", slug: "buitenlak" },
      { title: "Deur- en kozijnlak", slug: "deur-kozijnlak" },
      { title: "Meubellak", slug: "meubellak" },
      { title: "Traplak", slug: "traplak" },
    ],
  },
  {
    title: "Muurverf",
    slug: "muurverf",
    subCategories: [
      { title: "Binnenmuurverf", slug: "binnenmuurverf" },
      { title: "Buitenmuurverf", slug: "buitenmuurverf" },
      { title: "Plafondverf", slug: "plafondverf" },
      { title: "Schrobvaste verf", slug: "schrobvaste-verf" },
    ],
  },
  {
    title: "Beits",
    slug: "beits",
    subCategories: [
      { title: "Transparante beits", slug: "transparante-beits" },
      { title: "Dekkende beits", slug: "dekkende-beits" },
    ],
  },
  {
    title: "Grondverf & primers",
    slug: "grondverf-primers",
    subCategories: [
      { title: "Grondverf voor hout", slug: "grondverf-hout" },
      { title: "Grondverf voor metaal", slug: "grondverf-metaal" },
      { title: "Multiprimers", slug: "multiprimer" },
      { title: "Hechtprimers", slug: "hechtprimer" },
      { title: "Isolerende primers", slug: "isolerende-primer" },
    ],
  },
  {
    title: "Voorstrijk & grondering",
    slug: "voorstrijk-grondering",
    subCategories: [
      { title: "Voorstrijk", slug: "voorstrijk" },
      { title: "Diepgrond", slug: "diepgrond" },
      { title: "Fixeergrond", slug: "fixeergrond" },
    ],
  },
  {
    title: "Beton- & vloerverf",
    slug: "beton-vloerverf",
    subCategories: [
      { title: "Betonverf", slug: "betonverf" },
      { title: "Vloerverf", slug: "vloerverf" },
      { title: "Garageverf", slug: "garageverf" },
      { title: "Trapverf", slug: "trapverf" },
      { title: "2-componenten vloercoating", slug: "vloercoating-2k" },
    ],
  },
  {
    title: "Speciale verf",
    slug: "speciale-verf",
    subCategories: [
      { title: "Radiatorverf", slug: "radiatorverf" },
      { title: "Schoolbordverf", slug: "schoolbordverf" },
      { title: "Magneetverf", slug: "magneetverf" },
      { title: "Hittebestendige verf", slug: "hittebestendige-verf" },
      { title: "Tegelverf", slug: "tegelverf" },
      { title: "Spuitverf", slug: "spuitverf" },
    ],
  },
];

/**
 * Top-level navigation categories. "Verf" is dominant per KLUSR positioning.
 */
export const categories: Category[] = [
  {
    id: "verf",
    title: "Verf",
    slug: "verf",
    image: "https://picsum.photos/seed/klusr-cat-verf/800/600",
    icon: "PaintBucket",
    description:
      "Professionele verf voor binnen en buiten. Gemengd op elke kleur, met advies van ex-schilders.",
    seoTitle: "Verf kopen | Binnen- & buitenverf op kleur gemengd | KLUSR",
    seoDescription:
      "Koop professionele verf bij KLUSR. Binnenverf, buitenverf, lak, beits en primer. Op kleur gemengd, voor 10:00 besteld vanavond in huis.",
    paint: true,
    subGroups: verfSubGroups,
    subCategories: verfSubGroups.flatMap((g) => g.subCategories),
  },
  {
    id: "afbouw-fijnbouw",
    title: "Afbouw & fijnbouw",
    slug: "afbouw-fijnbouw",
    image: "https://picsum.photos/seed/klusr-cat-afbouw/800/600",
    icon: "Layers",
    description:
      "Plamuur, stucwerk, kit, vulmiddel en alles voor een strakke afwerking.",
    seoTitle: "Afbouw & fijnbouw | Plamuur, kit & vulmiddel | KLUSR",
    seoDescription:
      "Afbouwmaterialen voor een perfecte afwerking: plamuur, stuc, kit, vulmiddel en gereedschap. Bestel eenvoudig online bij KLUSR.",
    subGroups: [
      {
        title: "Wand & afwerking",
        slug: "wand-afwerking",
        subCategories: [
          { title: "Stuc & gips", slug: "stuc" },
        ],
      },
      {
        title: "Vullen, kitten & lijmen",
        slug: "vullen-kitten-lijmen",
        subCategories: [
          { title: "Plamuur & vulmiddel", slug: "plamuur" },
          { title: "Lijmen, kitten & vulmiddelen", slug: "lijmen-kitten-en-vulmiddelen" },
          { title: "Kit & purschuim", slug: "kit" },
        ],
      },
      {
        title: "Gereedschap & toebehoren",
        slug: "gereedschap-toebehoren",
        subCategories: [
          { title: "Gereedschap", slug: "gereedschap" },
          { title: "Schuurmateriaal", slug: "schuren" },
          { title: "Emmers & speciekuipen", slug: "bouwemmers-en-speciekuipen" },
          { title: "Horren", slug: "horren" },
        ],
      },
    ],
    subCategories: [
      { title: "Plamuur & vulmiddel", slug: "plamuur" },
      { title: "Kit & purschuim", slug: "kit" },
      { title: "Stuc & gips", slug: "stuc" },
      { title: "Schuurmateriaal", slug: "schuren" },
    ],
  },
  {
    id: "behang",
    title: "Behang",
    slug: "behang",
    image: "https://picsum.photos/seed/klusr-cat-behang/800/600",
    icon: "Wallpaper",
    description:
      "Behang, vliesbehang en glasweefselbehang met bijbehorende lijm en gereedschap.",
    seoTitle: "Behang kopen | Vlies- & glasweefselbehang | KLUSR",
    seoDescription:
      "Behang bij KLUSR: vliesbehang, glasweefselbehang, behanglijm en behanggereedschap. Bestel eenvoudig online bij KLUSR.",
    subGroups: [
      {
        title: "Behang & wandbekleding",
        slug: "behang-wandbekleding",
        subCategories: [
          { title: "Behang", slug: "behang" },
          { title: "Glasweefselbehang", slug: "glasweefselbehang" },
        ],
      },
    ],
    subCategories: [
      { title: "Behang", slug: "behang" },
      { title: "Glasweefselbehang", slug: "glasweefselbehang" },
    ],
  },
  {
    id: "ijzerwaren",
    title: "IJzerwaren",
    slug: "ijzerwaren",
    image: "https://picsum.photos/seed/klusr-cat-ijzerwaren/800/600",
    icon: "Wrench",
    description: "Schroeven, pluggen, beslag, sloten en bevestigingsmateriaal.",
    seoTitle: "IJzerwaren & bevestiging | Schroeven, pluggen & beslag | KLUSR",
    seoDescription:
      "IJzerwaren bij KLUSR: schroeven, pluggen, beslag, sloten en scharnieren. Professionele kwaliteit, scherp geprijsd.",
    subGroups: [
      {
        title: "Bevestigen",
        slug: "bevestigen",
        subCategories: [
          { title: "Bevestigingsmaterialen", slug: "bevestigingsmaterialen" },
          { title: "Schroeven & bouten", slug: "schroeven" },
          { title: "Pluggen", slug: "pluggen" },
        ],
      },
      {
        title: "Hang- & sluitwerk",
        slug: "hang-sluitwerk",
        subCategories: [
          { title: "Hang- & sluitwerk", slug: "ijzerwaren-hang-en-sluitwerk" },
          { title: "Beslag & scharnieren", slug: "beslag" },
          { title: "Sloten", slug: "sloten" },
        ],
      },
    ],
    subCategories: [
      { title: "Schroeven & bouten", slug: "schroeven" },
      { title: "Pluggen", slug: "pluggen" },
      { title: "Beslag & scharnieren", slug: "beslag" },
      { title: "Sloten", slug: "sloten" },
    ],
  },
  {
    id: "elektra",
    title: "Elektra",
    slug: "elektra",
    image: "https://picsum.photos/seed/klusr-cat-elektra/800/600",
    icon: "Plug",
    description:
      "Schakelmateriaal, kabels, stopcontacten en alles voor je elektraklus.",
    seoTitle: "Elektra & schakelmateriaal | Stopcontacten & kabel | KLUSR",
    seoDescription:
      "Elektra bij KLUSR: stopcontacten, schakelaars, kabel en installatiemateriaal. Met duidelijke uitleg en advies.",
    subGroups: [
      {
        title: "Installatie & schakelen",
        slug: "installatie-schakelen",
        subCategories: [
          { title: "Schakelaars & stopcontacten", slug: "schakelmateriaal" },
          { title: "Installatiemateriaal", slug: "installatiemateriaal" },
          { title: "Kabel & draad", slug: "kabel" },
          { title: "Verdeel & groepenkast", slug: "verdeelkast" },
        ],
      },
      {
        title: "Verlengen & stroom",
        slug: "verlengen-stroom",
        subCategories: [
          { title: "Verlengkabels & contactdozen", slug: "verlengkabels-en-tafelcontactdozen" },
          { title: "Batterijen", slug: "batterijen" },
          { title: "Overig elektra", slug: "overig-electra" },
        ],
      },
      {
        title: "Veiligheid",
        slug: "veiligheid",
        subCategories: [
          { title: "Brandbeveiliging", slug: "brandbeveiliging" },
        ],
      },
    ],
    subCategories: [
      { title: "Schakelaars & stopcontacten", slug: "schakelmateriaal" },
      { title: "Kabel & draad", slug: "kabel" },
      { title: "Verdeel & groepenkast", slug: "verdeelkast" },
    ],
  },
  {
    id: "gereedschap",
    title: "Gereedschap",
    slug: "gereedschap",
    image: "https://picsum.photos/seed/klusr-cat-gereedschap/800/600",
    icon: "Hammer",
    description:
      "Hand- en elektrisch gereedschap van topmerken voor elke klus.",
    seoTitle: "Gereedschap kopen | Hand- & elektrisch gereedschap | KLUSR",
    seoDescription:
      "Gereedschap bij KLUSR: boormachines, accuschroevendraaiers, handgereedschap en schildersgereedschap van topmerken.",
    subGroups: [
      {
        title: "Handgereedschap",
        slug: "handgereedschap-groep",
        subCategories: [
          { title: "Handgereedschap", slug: "handgereedschap" },
          { title: "Meetgereedschap", slug: "meetgereedschap" },
        ],
      },
      {
        title: "Elektrisch gereedschap",
        slug: "elektrisch-gereedschap-groep",
        subCategories: [
          { title: "Elektrisch gereedschap", slug: "elektrisch-gereedschap" },
          { title: "Accessoires elektrisch gereedschap", slug: "acc-elektrisch-gereedschap" },
          { title: "Stationair gereedschap", slug: "stationair-gereedschap" },
        ],
      },
      {
        title: "Schilderen & schuren",
        slug: "schilderen-schuren",
        subCategories: [
          { title: "Schildergereedschap", slug: "schildersgereedschap" },
          { title: "Schuurmateriaal", slug: "schuurmateriaal" },
          { title: "Verdunningsmiddelen", slug: "verdunningsmiddelen" },
        ],
      },
      {
        title: "Werkplaats & onderhoud",
        slug: "werkplaats-onderhoud",
        subCategories: [
          { title: "Werkkleding", slug: "werkkleding" },
          { title: "Onderhoud & smeermiddelen", slug: "onderhoud-smeermiddelen" },
          { title: "Licht & lampjes", slug: "licht-en-lampjes" },
        ],
      },
    ],
    subCategories: [
      { title: "Schildergereedschap", slug: "schildersgereedschap" },
      { title: "Schuurmateriaal", slug: "schuurmateriaal" },
      { title: "Elektrisch gereedschap", slug: "elektrisch-gereedschap" },
      { title: "Handgereedschap", slug: "handgereedschap" },
      { title: "Meetgereedschap", slug: "meetgereedschap" },
    ],
  },
  {
    id: "reiniging",
    title: "Reiniging & onderhoud",
    slug: "reiniging",
    image: "https://picsum.photos/seed/klusr-cat-reiniging/800/600",
    icon: "SprayCan",
    description:
      "Reinigers, schimmel- en aanslagverwijderaars en ongediertebestrijding voor in en om het huis.",
    seoTitle: "Reiniging & onderhoud | Reinigers & ongediertebestrijding | KLUSR",
    seoDescription:
      "Reiniging & onderhoud bij KLUSR: reinigers, schimmel- en aanslagverwijderaars en ongediertebestrijding van o.a. HG. Bestel eenvoudig online.",
    subGroups: [
      {
        title: "Reinigen & onderhoud",
        slug: "reinigen-onderhoud",
        subCategories: [
          { title: "Reinigers", slug: "reinigers" },
          { title: "Schimmel & aanslag", slug: "schimmel-aanslag" },
          { title: "Ongediertebestrijding", slug: "ongediertebestrijding" },
        ],
      },
    ],
    subCategories: [
      { title: "Reinigers", slug: "reinigers" },
      { title: "Schimmel & aanslag", slug: "schimmel-aanslag" },
      { title: "Ongediertebestrijding", slug: "ongediertebestrijding" },
    ],
  },
  {
    id: "tuin",
    title: "Tuin",
    slug: "tuin",
    image: "https://picsum.photos/seed/klusr-cat-tuin/800/600",
    icon: "Sprout",
    description: "Tuinverf, beits, gereedschap en alles voor buiten.",
    seoTitle: "Tuin & buiten | Tuinverf, beits & gereedschap | KLUSR",
    seoDescription:
      "Alles voor je tuin bij KLUSR: tuinhoutbeits, buitenverf, tuingereedschap en bevestiging voor buiten.",
    subGroups: [
      {
        title: "Tuinonderhoud",
        slug: "tuinonderhoud",
        subCategories: [
          { title: "Tuinhoutbeits", slug: "tuinhoutbeits" },
          { title: "Bestrating & onderhoud", slug: "bestrating" },
        ],
      },
      {
        title: "Tuingereedschap",
        slug: "tuingereedschap-groep",
        subCategories: [
          { title: "Tuingereedschap", slug: "hand-tuingereedschap" },
          { title: "Kruiwagens", slug: "kruiwagens" },
        ],
      },
    ],
    subCategories: [
      { title: "Tuinhoutbeits", slug: "tuinhoutbeits" },
      { title: "Tuingereedschap", slug: "tuingereedschap" },
      { title: "Bestrating & onderhoud", slug: "bestrating" },
    ],
  },
  {
    id: "verlichting",
    title: "Verlichting",
    slug: "verlichting",
    image: "https://picsum.photos/seed/klusr-cat-verlichting/800/600",
    icon: "Lightbulb",
    description: "LED-lampen, armaturen en buitenverlichting.",
    seoTitle: "Verlichting kopen | LED-lampen & armaturen | KLUSR",
    seoDescription:
      "Verlichting bij KLUSR: LED-lampen, armaturen, spots en buitenverlichting. Energiezuinig en sfeervol.",
    subGroups: [
      {
        title: "Lampen & lichtbronnen",
        slug: "lampen-lichtbronnen",
        subCategories: [
          { title: "LED-lampen", slug: "led-lampen" },
          { title: "Lichtbronnen & zaklampen", slug: "lichtbronnen-en-zaklampen" },
        ],
      },
      {
        title: "Armaturen & buiten",
        slug: "armaturen-buiten",
        subCategories: [
          { title: "Armaturen", slug: "armaturen" },
          { title: "Buitenverlichting", slug: "buitenverlichting" },
          { title: "Werkverlichting", slug: "werkverlichting" },
        ],
      },
    ],
    subCategories: [
      { title: "LED-lampen", slug: "led-lampen" },
      { title: "Armaturen", slug: "armaturen" },
      { title: "Buitenverlichting", slug: "buitenverlichting" },
    ],
  },
  {
    id: "vloeren-raam",
    title: "Vloeren & raam",
    slug: "vloeren-raam",
    image: "https://picsum.photos/seed/klusr-cat-vloeren/800/600",
    icon: "LayoutPanelTop",
    description: "Laminaat, PVC, ondervloer en raamdecoratie.",
    seoTitle: "Vloeren & raamdecoratie | Laminaat, PVC & gordijnen | KLUSR",
    seoDescription:
      "Vloeren en raamdecoratie bij KLUSR: laminaat, PVC-vloeren, ondervloer, plinten en raamdecoratie.",
    subGroups: [
      {
        title: "Vloeren",
        slug: "vloeren",
        subCategories: [
          { title: "Laminaat", slug: "laminaat" },
          { title: "Laminaat & PVC", slug: "laminaat-pvc" },
        ],
      },
      {
        title: "Ondervloer & plinten",
        slug: "ondervloer-plinten",
        subCategories: [
          { title: "Ondervloeren", slug: "ondervloeren" },
          { title: "Ondervloer & plinten", slug: "ondervloer" },
          { title: "Plinten", slug: "plinten" },
        ],
      },
      {
        title: "Raamdecoratie",
        slug: "raamdecoratie-groep",
        subCategories: [
          { title: "Raamdecoratie", slug: "raamdecoratie" },
        ],
      },
    ],
    subCategories: [
      { title: "Laminaat & PVC", slug: "laminaat-pvc" },
      { title: "Ondervloer & plinten", slug: "ondervloer" },
      { title: "Raamdecoratie", slug: "raamdecoratie" },
    ],
  },
  {
    id: "acties",
    title: "Acties",
    slug: "acties",
    image: "https://picsum.photos/seed/klusr-cat-acties/800/600",
    icon: "Tag",
    description: "De scherpste aanbiedingen en KLUSRPAS-voordeel.",
    seoTitle: "Acties & aanbiedingen | Klusvoordeel | KLUSR",
    seoDescription:
      "Profiteer van de scherpste acties bij KLUSR. Tijdelijke aanbiedingen op verf, gereedschap en meer.",
  },
];

export const navCategories = categories;

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getCategoryTitle(slug: string): string {
  return categories.find((c) => c.slug === slug)?.title ?? slug;
}
