/**
 * SEO-content voor de verf-landingspagina's. Per leaf-subcategorie een compacte
 * spec; de generator maakt daar rijke secties + FAQ van, zodat elke
 * landingspagina onderaan stevige, relevante tekst heeft (goed voor SEO én klant).
 */

export interface LeafSeoSection {
  heading: string;
  paragraphs: string[];
}

export interface LeafSeoContent {
  intro: string;
  sections: LeafSeoSection[];
  faq: { q: string; a: string }[];
}

interface LeafSpec {
  title: string;
  group: string;
  /** Eén rijke zin: wat het is. */
  about: string;
  /** Waar het voor bedoeld is (ondergronden/toepassingen). */
  suited: string[];
  /** Concrete schilderstip. */
  tip: string;
  /** Of dit type op kleur te mengen is (muur/lak wel, primer/coating vaak niet). */
  mixable?: boolean;
  /** Extra, type-specifieke FAQ. */
  faq?: { q: string; a: string }[];
}

const SPECS: Record<string, LeafSpec> = {
  // ---- Lakken ----
  binnenlak: {
    title: "Binnenlak",
    group: "Lakken",
    about:
      "Binnenlak is een dekkende, slijtvaste aflak voor houtwerk binnen, verkrijgbaar in mat, zijdeglans en hoogglans.",
    suited: ["deuren", "kozijnen binnen", "plinten", "trapleuningen", "radiatoromkastingen"],
    tip: "Schuur de vorige laag licht op en ontvet met ammoniak voor een hechting die jaren meegaat.",
    mixable: true,
  },
  buitenlak: {
    title: "Buitenlak",
    group: "Lakken",
    about:
      "Buitenlak is een weerbestendige aflak die hout buiten beschermt tegen vocht, UV en temperatuurwisselingen.",
    suited: ["voordeuren", "kozijnen buiten", "boeidelen", "tuinhout dat dekkend moet"],
    tip: "Lak alleen bij 8–25 °C en een droge ondergrond; vermijd directe zon zodat de laag niet te snel velt.",
    mixable: true,
  },
  "deur-kozijnlak": {
    title: "Deur- en kozijnlak",
    group: "Lakken",
    about:
      "Deur- en kozijnlak is speciaal afgestemd op intensief belast houtwerk: hard, krasvast en mooi strak vloeiend.",
    suited: ["binnen- en buitendeuren", "kozijnen", "ramen"],
    tip: "Werk met een lakroller plus een kwast voor de hoeken, en lak deuren liggend om druipers te voorkomen.",
    mixable: true,
  },
  meubellak: {
    title: "Meubellak",
    group: "Lakken",
    about:
      "Meubellak geeft kasten, tafels en ander meubilair een strakke, goed reinigbare en slijtvaste afwerking.",
    suited: ["kasten", "tafels", "stoelen", "mdf-meubels"],
    tip: "Gebruik op mdf eerst een mdf-primer; onbehandelde randen zuigen anders ongelijk in.",
    mixable: true,
  },
  traplak: {
    title: "Traplak",
    group: "Lakken",
    about:
      "Traplak is een extra slijtvaste lak die de treden van je trap beschermt tegen intensief beloop.",
    suited: ["houten trappen", "treden", "stootborden"],
    tip: "Lak om-en-om treden zodat je de trap kunt blijven gebruiken, of voeg anti-slip toe voor veiligheid.",
    mixable: true,
  },
  // ---- Muurverf ----
  binnenmuurverf: {
    title: "Binnenmuurverf",
    group: "Muurverf",
    about:
      "Binnenmuurverf (latex) dekt strak, droogt snel en is er in mat, zijdemat en zijdeglans voor elke ruimte.",
    suited: ["muren binnen", "plafonds", "stuc- en gipswanden"],
    tip: "Rol nat-in-nat in banen van boven naar beneden en sluit elke baan af met een lichte ‘aftrekbeweging’.",
    mixable: true,
  },
  buitenmuurverf: {
    title: "Buitenmuurverf",
    group: "Muurverf",
    about:
      "Buitenmuurverf is een dampopen, weerbestendige gevelverf die minerale ondergronden jarenlang beschermt.",
    suited: ["gevels", "buitenmuren", "beton", "kalkzandsteen", "stucwerk buiten"],
    tip: "Behandel kale of poederende gevels eerst met een fixeer of gevelgrond zodat de verf niet loslaat.",
    mixable: true,
  },
  plafondverf: {
    title: "Plafondverf",
    group: "Muurverf",
    about:
      "Plafondverf is diepmat en spat nauwelijks, voor een egaal plafond zonder hinderlijke glansverschillen.",
    suited: ["plafonds", "stucplafonds", "gipsplaten"],
    tip: "Veel plafondverf gaat ‘roze op, wit droog’ aan: zo zie je direct welke stukken je al gehad hebt.",
    mixable: true,
  },
  "schrobvaste-verf": {
    title: "Schrobvaste verf",
    group: "Muurverf",
    about:
      "Schrobvaste verf is een reinigbare, vochtbestendige muurverf die vlekken en regelmatig poetsen verdraagt.",
    suited: ["keuken", "hal en gang", "kinderkamer", "trapopgang"],
    tip: "Laat de verf minstens 2–3 weken uitharden voordat je voor het eerst schrobt — dan is hij op volle sterkte.",
    mixable: true,
  },
  // ---- Beits ----
  "transparante-beits": {
    title: "Transparante beits",
    group: "Beits",
    about:
      "Transparante beits trekt in het hout en laat de nerf zien, terwijl hij beschermt tegen vocht en UV.",
    suited: ["tuinhout", "schuttingen", "tuinmeubelen", "blank houtwerk"],
    tip: "Breng dunne lagen aan in de richting van de nerf; transparante beits is sneller toe aan onderhoud dan dekkende.",
    mixable: false,
  },
  "dekkende-beits": {
    title: "Dekkende beits",
    group: "Beits",
    about:
      "Dekkende beits combineert de bescherming van beits met een volledig dekkende, egale kleur.",
    suited: ["schuttingen", "tuinhuizen", "boeidelen", "verweerd tuinhout"],
    tip: "Dekkende beits is ideaal om vergrijsd of eerder geschilderd hout een frisse, egale kleur te geven.",
    mixable: true,
  },
  // ---- Grondverf & primers ----
  "grondverf-hout": {
    title: "Grondverf voor hout",
    group: "Grondverf & primers",
    about:
      "Grondverf voor hout vult de nerf, sluit de ondergrond af en zorgt dat je aflak egaal en duurzaam hecht.",
    suited: ["kaal hout", "kozijnen", "deuren", "houten meubels"],
    tip: "Grond ook de kopse kanten goed mee — daar dringt vocht het snelst binnen.",
    mixable: false,
  },
  "grondverf-metaal": {
    title: "Grondverf voor metaal",
    group: "Grondverf & primers",
    about:
      "Grondverf voor metaal (roestwerende primer) beschermt staal en ijzer tegen corrosie als basis onder de aflak.",
    suited: ["hekwerk", "stalen kozijnen", "leuningen", "tuinmeubelen van metaal"],
    tip: "Verwijder eerst losse roest met een staalborstel; breng de primer aan op een schone, ontvette ondergrond.",
    mixable: false,
  },
  multiprimer: {
    title: "Multiprimers",
    group: "Grondverf & primers",
    about:
      "Een multiprimer hecht op vrijwel alle ondergronden en is dé alleskunner als voorbehandeling.",
    suited: ["hout", "metaal", "kunststof", "tegels", "gegrond pleisterwerk"],
    tip: "Twijfel je over de ondergrond? Een multiprimer is de veilige keuze — test bij twijfel op een klein stukje.",
    mixable: false,
  },
  hechtprimer: {
    title: "Hechtprimers",
    group: "Grondverf & primers",
    about:
      "Een hechtprimer maakt gladde, moeilijke ondergronden ‘grijpbaar’ zodat de verf zich blijvend vasthoudt.",
    suited: ["kunststof", "gelakt hout", "pvc", "gegalvaniseerd metaal", "tegels"],
    tip: "Op heel glad materiaal eerst licht opschuren (matteren) voor het beste hechtresultaat.",
    mixable: false,
  },
  "isolerende-primer": {
    title: "Isolerende primers",
    group: "Grondverf & primers",
    about:
      "Een isolerende primer sluit hardnekkige vlekken af zodat ze niet door je nieuwe verflaag heen slaan.",
    suited: ["vochtkringen", "roet- en nicotinevlekken", "uitslaande houtnerf", "watervlekken"],
    tip: "Laat de isolerende laag volledig drogen voor je overschildert — anders kan de vlek alsnog doorkomen.",
    mixable: false,
  },
  // ---- Voorstrijk & grondering ----
  voorstrijk: {
    title: "Voorstrijk",
    group: "Voorstrijk & grondering",
    about:
      "Voorstrijkmiddel egaliseert de zuiging van een ondergrond zodat muurverf of behanglijm gelijkmatig hecht.",
    suited: ["nieuw stucwerk", "gipsplaat", "poederende muren"],
    tip: "Kies een voorstrijk die past bij de zuiging: licht zuigend of juist sterk zuigend (diepgrond).",
    mixable: false,
  },
  diepgrond: {
    title: "Diepgrond",
    group: "Voorstrijk & grondering",
    about:
      "Diepgrond dringt diep in sterk zuigende of poederende ondergronden en bindt ze tot een stevige basis.",
    suited: ["oud pleisterwerk", "gasbeton", "poederende muren", "kalkzandsteen"],
    tip: "Op zwaar poederende muren een tweede laag diepgrond aanbrengen tot de ondergrond niet meer afgeeft.",
    mixable: false,
  },
  fixeergrond: {
    title: "Fixeergrond",
    group: "Voorstrijk & grondering",
    about:
      "Fixeergrond legt losse deeltjes vast en maakt krijtende of poederende ondergronden weer overschilderbaar.",
    suited: ["krijtende gevels", "oude kalkverf", "poederende buitenmuren"],
    tip: "Veeg de muur eerst stofvrij; fixeer werkt het beste op een ondergrond zonder losse korst.",
    mixable: false,
  },
  // ---- Beton- & vloerverf ----
  betonverf: {
    title: "Betonverf",
    group: "Beton- & vloerverf",
    about:
      "Betonverf is een slijtvaste coating die betonvloeren en -wanden stofvrij maakt en beschermt.",
    suited: ["betonvloeren", "kelders", "schuren", "betonnen wanden"],
    tip: "Nieuw beton minstens 4 weken laten uitharden; ontvet en ontstof de vloer grondig voor het verven.",
    mixable: false,
  },
  vloerverf: {
    title: "Vloerverf",
    group: "Beton- & vloerverf",
    about:
      "Vloerverf geeft binnen- en garagevloeren een sterke, goed reinigbare en aantrekkelijke afwerking.",
    suited: ["garagevloeren", "schuurvloeren", "houten en betonnen vloeren"],
    tip: "Werk met een vloerroller op een steel en begin bij de muur het verst van de deur, zodat je jezelf niet ‘inschildert’.",
    mixable: false,
  },
  garageverf: {
    title: "Garageverf",
    group: "Beton- & vloerverf",
    about:
      "Garageverf is bestand tegen autobanden, olie en intensief belopen — speciaal voor de garagevloer.",
    suited: ["garagevloeren", "carports", "werkplaatsvloeren"],
    tip: "Laat de vloer na het verven goed uitharden voor je de auto erop zet (vaak 5–7 dagen) tegen bandafdruk.",
    mixable: false,
  },
  trapverf: {
    title: "Trapverf",
    group: "Beton- & vloerverf",
    about:
      "Trapverf is een extra slijtvaste verf voor treden die dagelijks intensief worden belopen.",
    suited: ["betonnen trappen", "houten trappen", "kelder- en zoldertrappen"],
    tip: "Verf de treden om-en-om zodat de trap bruikbaar blijft, en voeg anti-slip toe voor grip.",
    mixable: true,
  },
  "vloercoating-2k": {
    title: "2-componenten vloercoating",
    group: "Beton- & vloerverf",
    about:
      "Een 2-componenten (epoxy) vloercoating vormt een keiharde, chemisch bestendige toplaag voor zwaar belaste vloeren.",
    suited: ["garages", "werkplaatsen", "bedrijfsvloeren", "betonvloeren"],
    tip: "Meng component A en B exact volgens verhouding en verwerk binnen de ‘potlife’ — daarna hardt het onherroepelijk uit.",
    mixable: false,
  },
  // ---- Speciale verf ----
  radiatorverf: {
    title: "Radiatorverf",
    group: "Speciale verf",
    about:
      "Radiatorverf is hittebestendig en vergeelt niet, zodat radiatoren en verwarmingsbuizen strak wit blijven.",
    suited: ["radiatoren", "verwarmingsbuizen", "convectoren"],
    tip: "Schilder een koude radiator; zet de verwarming pas na volledige uitharding weer aan.",
    mixable: true,
  },
  schoolbordverf: {
    title: "Schoolbordverf",
    group: "Speciale verf",
    about:
      "Schoolbordverf maakt van vrijwel elke wand of deur een beschrijfbaar krijtbord.",
    suited: ["kinderkamer", "keukenwand", "kantoor", "deuren"],
    tip: "Breng twee dunne lagen aan en ‘prepareer’ het bord daarna door het één keer volledig met krijt in te wrijven en uit te vegen.",
    mixable: false,
  },
  magneetverf: {
    title: "Magneetverf",
    group: "Speciale verf",
    about:
      "Magneetverf bevat ijzerdeeltjes waardoor magneten blijven plakken — ideaal onder een laag schoolbord- of muurverf.",
    suited: ["kinderkamer", "keuken", "kantoor", "memowanden"],
    tip: "Breng 2–3 lagen aan voor voldoende magneetkracht en overschilder daarna met je gewenste kleur muurverf.",
    mixable: false,
  },
  "hittebestendige-verf": {
    title: "Hittebestendige verf",
    group: "Speciale verf",
    about:
      "Hittebestendige verf houdt hoge temperaturen uit zonder te blakeren of te verkleuren.",
    suited: ["kachels", "haarden", "uitlaten", "barbecues", "verwarmingsbuizen"],
    tip: "Let op de maximale temperatuur op het blik (bv. 600 °C) en laat de verf vaak ‘inbranden’ bij eerste verwarming.",
    mixable: false,
  },
  tegelverf: {
    title: "Tegelverf",
    group: "Speciale verf",
    about:
      "Met tegelverf geef je bestaande wandtegels een nieuwe kleur zonder te hakken of opnieuw te betegelen.",
    suited: ["badkamer", "keuken (spatwand)", "toilet"],
    tip: "Ontvet de tegels grondig en behandel de voegen mee; gebruik in natte zones een tegelverf die daarvoor geschikt is.",
    mixable: true,
  },
  spuitverf: {
    title: "Spuitverf",
    group: "Speciale verf",
    about:
      "Spuitverf (spuitbus) geeft een strakke, naadloze laag op kleine en lastig te kwasten voorwerpen.",
    suited: ["metaal", "kunststof", "fietsen", "tuinmeubelen", "decoratie"],
    tip: "Spuit in dunne lagen op 25–30 cm afstand en houd de bus in beweging om druipers te voorkomen.",
    mixable: false,
  },
};

function faqFor(spec: LeafSpec): { q: string; a: string }[] {
  const lower = spec.title.toLowerCase();
  const base: { q: string; a: string }[] = [
    {
      q: `Hoeveel ${lower} heb ik nodig?`,
      a: "Reken op ongeveer 1 liter per 8 à 10 m² per laag; voor een mooi dekkend resultaat zijn meestal twee lagen nodig. Twijfel je over de hoeveelheid? Onze ex-schilders rekenen het graag met je uit.",
    },
  ];
  if (spec.mixable) {
    base.push({
      q: `Kan ik ${lower} op kleur laten mengen?`,
      a: `Ja. Vrijwel al onze ${spec.group.toLowerCase()} mengen we op elke gewenste kleur — RAL, NCS of een eigen kleurstaal — terwijl je wacht. Mengverf kun je overigens niet retourneren, dus laat je bij twijfel even adviseren.`,
    });
  }
  base.push({
    q: "Voor 09:00 besteld, vanavond in huis?",
    a: "Klopt. Bestel je op werkdagen vóór 09:00, dan ligt je bestelling vanavond op de mat. We bezorgen door heel Nederland en België.",
  });
  return [...(spec.faq ?? []), ...base];
}

/** Bouw de SEO-landingscontent voor een verf-leaf. */
export function getVerfLeafContent(slug: string): LeafSeoContent | null {
  const spec = SPECS[slug];
  if (!spec) return null;
  const lower = spec.title.toLowerCase();
  const suitedList = spec.suited.join(", ").replace(/, ([^,]*)$/, " en $1");

  return {
    intro: `${spec.about} Bij KLUSR koop je ${lower} van professionele topmerken, met deskundig advies van ex-schilders.`,
    sections: [
      {
        heading: `Wat is ${lower}?`,
        paragraphs: [
          spec.about,
          `${spec.title} is bij uitstek geschikt voor ${suitedList}. Bij KLUSR vind je het in een professioneel assortiment, scherp geprijsd en met KLUSRPAS-voordeel voor leden.`,
        ],
      },
      {
        heading: `Waar gebruik je ${lower} voor?`,
        paragraphs: [
          `Gebruik ${lower} voor ${suitedList}. Een goede voorbereiding is het halve werk: zorg dat de ondergrond schoon, droog en vetvrij is en behandel kale plekken voor met een passende primer of grondverf.`,
        ],
      },
      {
        heading: "Tip van onze ex-schilders",
        paragraphs: [
          spec.tip,
          "Niet zeker welk product of welke hoeveelheid je nodig hebt? Stel je vraag aan onze klusadviseurs of gebruik het AI-advies op de productpagina — we denken graag met je klus mee.",
        ],
      },
      {
        heading: `${spec.title} kopen bij KLUSR`,
        paragraphs: [
          `KLUSR is dé klusspecialist voor verf en schildersbenodigdheden. Je bestelt ${lower} eenvoudig online: voor 09:00 besteld is vanavond in huis, en met de gratis KLUSRPAS profiteer je altijd van de scherpste prijs. Vragen over je klus? Onze ex-schilders staan voor je klaar.`,
        ],
      },
    ],
    faq: faqFor(spec),
  };
}
