import { localise, localiseAll } from "./i18n/merge";
import { tourContent } from "./i18n/tours";
import type { Locale } from "@/lib/i18n/config";
import type { Tour, TourCategory } from "@/types";

/**
 * Filter vocabulary shared by the tours index controls.
 *
 * Values only — the words come from `t.tours.categories` and
 * `t.tours.durations`, keyed by exactly these strings.
 */
export const tourCategories: TourCategory[] = [
  "adventure",
  "culture",
  "wine",
  "nature",
  "city",
];

export type TourDurationBucket = "1" | "2-3" | "4-6" | "7";

export const tourDurations: TourDurationBucket[] = ["1", "2-3", "4-6", "7"];

export const tours: Tour[] = [
  {
    id: "tour-1",
    slug: "gergeti-glacier-trek",
    title: "Gergeti Glacier Trek",
    location: "Kazbegi, Khevi",
    destinationSlug: "kazbegi",
    category: "adventure",
    summary:
      "Three days beneath Mount Kazbek, climbing from the Gergeti church to the glacier terrace at 3,000 metres.",
    description: [
      "This is the classic Kazbegi ascent, done properly. Rather than rushing the church and driving away, you sleep in the valley, acclimatise on the ridge, and walk up onto the glacier terrace with a guide who has been doing it for fifteen years.",
      "Day two is the long one: a steady climb past the Sabertse saddle onto the moraine below the Gergeti glacier, with Kazbek's north face directly above you. It is not technical, but it is sustained — expect seven hours on your feet and real altitude.",
      "Evenings are spent in a family guesthouse in Stepantsminda, which is to say they are spent eating more than you planned to.",
    ],
    image: "/images/tours/gergeti-glacier.jpg",
    gallery: [
      { src: "/images/tours/gergeti-glacier.jpg", alt: "Glacier ice on the flanks of Mount Kazbek" },
      { src: "/images/destinations/kazbegi-1.jpg", alt: "The Terek valley below the Gergeti ridge" },
      { src: "/images/destinations/kazbegi-2.jpg", alt: "The summit of Mount Kazbek above cloud" },
      { src: "/images/culture/shepherd.jpg", alt: "Sheep grazing on a high Caucasus pasture" },
    ],
    durationDays: 3,
    durationLabel: "3 days · 2 nights",
    groupSize: "2–8 travellers",
    difficulty: "Challenging",
    priceFrom: 690,
    rating: 4.9,
    reviewCount: 142,
    highlights: [
      "Sunrise at Gergeti Trinity Church before the day visitors arrive",
      "Walk onto the moraine terrace below the Gergeti glacier",
      "Two nights in a family-run guesthouse in Stepantsminda",
      "A mountain guide with fifteen seasons on Kazbek",
      "Stop at the Friendship Monument on the drive up",
    ],
    included: [
      "Private transfers from and to Tbilisi",
      "Two nights' guesthouse accommodation",
      "All breakfasts and dinners",
      "Certified mountain guide throughout",
      "Trekking poles and daypack if needed",
    ],
    excluded: [
      "International flights",
      "Travel insurance (required)",
      "Lunches on trekking days",
      "Personal equipment and clothing",
      "Gratuities",
    ],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Stepantsminda",
        description:
          "Drive north on the Georgian Military Road, stopping at Ananuri fortress and the Friendship Monument. Arrive in the valley by mid-afternoon and take a short acclimatisation walk along the Chkheri river.",
        meals: ["dinner"],
        accommodation: "Family guesthouse, Stepantsminda",
      },
      {
        day: 2,
        title: "Gergeti church and the glacier terrace",
        description:
          "An early start for the ridge, reaching the church before the crowds. Continue past the Sabertse saddle onto the moraine below the glacier — around seven hours' walking and 1,200 m of ascent. Descend the same way.",
        meals: ["breakfast", "dinner"],
        accommodation: "Family guesthouse, Stepantsminda",
      },
      {
        day: 3,
        title: "Gveleti falls and return",
        description:
          "A gentler morning walk into the Dariali gorge to the Gveleti waterfalls, then the drive back to Tbilisi with a late lunch stop in Pasanauri.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 08:00 on day one. Pick-up is included anywhere in the city.",
    importantInfo: [
      "Day two involves 1,200 m of ascent at altitude — a good level of fitness is essential.",
      "Weather above 2,500 m changes quickly; the route may be shortened at the guide's discretion.",
      "Broken-in walking boots with ankle support are required.",
      "The trek does not cross crevassed ice and needs no technical equipment.",
    ],
    featured: true,
  },
  {
    id: "tour-2",
    slug: "kakheti-wine-route",
    title: "The Kakheti Wine Route",
    location: "Sighnaghi & the Alazani Valley",
    destinationSlug: "kakheti",
    category: "wine",
    summary:
      "Two days through the birthplace of wine — qvevri cellars, a monastic winery and a supra that runs long.",
    description: [
      "Georgia has been making wine for around eight thousand years, and Kakheti is where it still happens at scale. This journey moves between small family marani and one serious monastic estate, with enough time at each to actually talk to the people pouring.",
      "You will taste from the qvevri — whole grapes fermented under the earth in beeswax-lined clay — and understand why amber wine tastes nothing like the white wine you know.",
      "The second evening is a full supra in a private house in Sighnaghi, with a tamada running the toasts. It is the most Georgian thing that will happen to you.",
    ],
    image: "/images/destinations/kakheti-1.jpg",
    gallery: [
      { src: "/images/destinations/kakheti-1.jpg", alt: "A rainbow over the vineyards of the Alazani valley" },
      { src: "/images/experiences/wine-tasting.jpg", alt: "The barrel cellar of a Kakhetian winery" },
      { src: "/images/culture/wine.jpg", alt: "A glass of amber Georgian wine" },
      { src: "/images/experiences/supra.jpg", alt: "A Georgian supra table laid with dishes" },
    ],
    durationDays: 2,
    durationLabel: "2 days · 1 night",
    groupSize: "2–10 travellers",
    difficulty: "Easy",
    priceFrom: 420,
    rating: 4.9,
    reviewCount: 216,
    highlights: [
      "Taste directly from qvevri in a working family cellar",
      "Alaverdi Cathedral and its monastic winery",
      "A private supra with a traditional tamada",
      "Sunset over the Alazani valley from the Sighnaghi walls",
      "Tsinandali Estate and its nineteenth-century cellar",
    ],
    included: [
      "Private transfers from and to Tbilisi",
      "One night in a boutique guesthouse in Sighnaghi",
      "All tastings and cellar visits",
      "Traditional supra dinner with wine",
      "English-speaking wine guide",
    ],
    excluded: ["International flights", "Travel insurance", "Bottles purchased at wineries", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Telavi and Alaverdi",
        description:
          "Drive east across the Gombori pass into the Alazani valley. Visit Alaverdi Cathedral and its monastic cellar, then a family marani for a qvevri tasting and lunch under the vines. Continue to Sighnaghi for sunset on the ramparts.",
        meals: ["lunch", "dinner"],
        accommodation: "Boutique guesthouse, Sighnaghi",
      },
      {
        day: 2,
        title: "Bodbe, Tsinandali and the road home",
        description:
          "Morning at Bodbe Monastery, then Tsinandali Estate for its garden and cellar. A final tasting of Saperavi before the drive back to Tbilisi.",
        meals: ["breakfast", "lunch"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 09:00 on day one.",
    importantInfo: [
      "Six to eight tastings across two days — pacing is entirely up to you.",
      "The supra is a shared table; vegetarian menus are available with notice.",
      "Cellars are cool year-round; bring a layer even in August.",
    ],
    featured: true,
  },
  {
    id: "tour-3",
    slug: "svaneti-tower-country",
    title: "Svaneti Tower Country",
    location: "Mestia & Ushguli, Upper Svaneti",
    destinationSlug: "svaneti",
    category: "culture",
    summary:
      "Five days behind the main Caucasus ridge, among nine-hundred-year-old defence towers and 5,000-metre peaks.",
    description: [
      "Svaneti stayed independent because it was almost impossible to reach. The stone koshki towers that fill its villages were built to survive both invasion and blood feud, and hundreds of them are still standing.",
      "This journey uses Mestia as a base for two nights, then crosses to Ushguli — four hamlets at 2,100 metres beneath Shkhara, Georgia's highest mountain — for two more.",
      "There is walking every day, but nothing technical: glacier approaches, ridge viewpoints and long slow afternoons in villages where the Svan language is still the first one spoken.",
    ],
    image: "/images/destinations/svaneti-1.jpg",
    gallery: [
      { src: "/images/destinations/svaneti-1.jpg", alt: "The towers of Ushguli beneath Mount Shkhara" },
      { src: "/images/destinations/svaneti-2.jpg", alt: "A Svan tower house above Mestia" },
      { src: "/images/home/inspiration-2.jpg", alt: "The Svaneti ridge under cloud" },
      { src: "/images/culture/shepherd.jpg", alt: "A shepherd on a high pasture" },
    ],
    durationDays: 5,
    durationLabel: "5 days · 4 nights",
    groupSize: "2–8 travellers",
    difficulty: "Moderate",
    priceFrom: 1180,
    rating: 4.8,
    reviewCount: 97,
    highlights: [
      "Two nights in Ushguli, UNESCO-listed and at 2,100 m",
      "The Chalaadi glacier walk through birch forest",
      "Mestia's tower quarter in evening light",
      "Svan cuisine — kubdari, tashmijabi and chilli salt",
      "The Koruldi lakes ridge above Mestia",
    ],
    included: [
      "Return flights Tbilisi–Mestia or private transfer",
      "Four nights in guesthouses",
      "All breakfasts and dinners",
      "4x4 transfer Mestia–Ushguli",
      "Local Svan guide",
    ],
    excluded: ["International flights", "Travel insurance", "Lunches", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Arrival in Mestia",
        description:
          "Fly or drive into Mestia. Afternoon walk through the tower quarter and the Svaneti Museum of History and Ethnography.",
        meals: ["dinner"],
        accommodation: "Guesthouse, Mestia",
      },
      {
        day: 2,
        title: "Chalaadi Glacier",
        description:
          "A three-hour return walk from the Mestiachala valley through birch forest to the glacier snout. Afternoon free, or continue to the Koruldi lakes by 4x4.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Mestia",
      },
      {
        day: 3,
        title: "Mestia to Ushguli",
        description:
          "The rough valley road to Ushguli — four hours of river crossings and switchbacks, with stops in Ipari and Kala. Arrive under Shkhara in the afternoon.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Ushguli",
      },
      {
        day: 4,
        title: "Shkhara glacier walk",
        description:
          "A full-day walk up the Enguri valley to the Shkhara glacier amphitheatre and back — around 18 km on gentle gradients.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Ushguli",
      },
      {
        day: 5,
        title: "Return",
        description: "Drive back to Mestia for the flight, or continue by road to Zugdidi and Tbilisi.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Natakhtari airfield, Tbilisi, or your hotel if travelling by road.",
    importantInfo: [
      "Mestia flights are weather-dependent; a road transfer is the standard fallback.",
      "Guesthouses are simple, warm and family-run — not hotels.",
      "The Mestia–Ushguli road is rough. Motion sickness remedies are worth packing.",
    ],
    featured: true,
  },
  {
    id: "tour-4",
    slug: "truso-valley-expedition",
    title: "Truso Valley Expedition",
    location: "Kazbegi, Khevi",
    destinationSlug: "kazbegi",
    category: "nature",
    summary:
      "A day in a wide glacial valley of ochre mineral terraces, abandoned towers and almost nobody else.",
    description: [
      "Truso is the valley people drive past on the way to Kazbegi without knowing it exists. It runs west from the Georgian Military Road towards the Russian border, and it is extraordinary: rust-orange travertine terraces bubbling with mineral water, abandoned stone villages, and a mineral lake the colour of weak tea.",
      "The walking is easy — a broad valley floor with barely any gradient — which makes this one of the best value days in the Caucasus for anyone who wants scale without effort.",
    ],
    image: "/images/tours/truso-valley.jpg",
    gallery: [
      { src: "/images/tours/truso-valley.jpg", alt: "Mineral travertine terraces in the Truso valley" },
      { src: "/images/destinations/kazbegi-1.jpg", alt: "The Khevi valley below Mount Kazbek" },
      { src: "/images/destinations/gudauri-2.jpg", alt: "The Georgian Military Road" },
      { src: "/images/about/landscape.jpg", alt: "Fog over Georgian hill country" },
    ],
    durationDays: 1,
    durationLabel: "Full day · 11 hours",
    groupSize: "2–12 travellers",
    difficulty: "Easy",
    priceFrom: 165,
    rating: 4.8,
    reviewCount: 88,
    highlights: [
      "Ochre travertine terraces and bubbling mineral springs",
      "The abandoned village and tower at Zakagori",
      "A near-empty valley even in high summer",
      "Ananuri fortress on the drive north",
    ],
    included: [
      "Private 4x4 and driver from Tbilisi",
      "English-speaking guide",
      "Border zone permit arrangement",
      "Bottled water",
    ],
    excluded: ["Meals", "Travel insurance", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi — Truso — Tbilisi",
        description:
          "Early departure north, stopping at Ananuri. Turn into the Truso valley at Kvemo Okrokana and walk 12 km return along the valley floor past the travertine terraces to Zakagori tower. Late lunch in Kazbegi before the drive home.",
        meals: [],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 07:30.",
    importantInfo: [
      "The valley is a border zone; passport details are needed 48 hours in advance.",
      "Roughly 12 km of flat walking at around 2,000 m.",
      "There is no shade — sun protection matters even on cool days.",
    ],
    featured: false,
  },
  {
    id: "tour-5",
    slug: "vardzia-cave-city",
    title: "Vardzia & the Southern Frontier",
    location: "Samtskhe-Javakheti",
    destinationSlug: "borjomi",
    category: "culture",
    summary:
      "Two days along Georgia's southern edge — a thirteen-storey cave monastery, a restored fortress and volcanic uplands.",
    description: [
      "Vardzia was cut into a cliff above the Mtkvari in the twelfth century under Queen Tamar: a monastery city of six hundred rooms across thirteen levels, built to hold an army and to survive a siege. An earthquake in 1283 sheared away the outer wall and exposed the whole honeycomb.",
      "The route south crosses high volcanic plateau, past Rabati Castle in Akhaltsikhe and the fortress at Khertvisi, with a night in the Borjomi gorge on the way back.",
    ],
    image: "/images/tours/vardzia.jpg",
    gallery: [
      { src: "/images/tours/vardzia.jpg", alt: "The cave monastery of Vardzia cut into a cliff face" },
      { src: "/images/tours/uplistsikhe.jpg", alt: "Rock-cut chambers at Uplistsikhe" },
      { src: "/images/destinations/borjomi-1.jpg", alt: "Forested ridges near Borjomi" },
      { src: "/images/about/heritage.jpg", alt: "A Georgian church in mountain country" },
    ],
    durationDays: 2,
    durationLabel: "2 days · 1 night",
    groupSize: "2–12 travellers",
    difficulty: "Moderate",
    priceFrom: 380,
    rating: 4.7,
    reviewCount: 74,
    highlights: [
      "Thirteen levels of rock-cut monastery at Vardzia",
      "The frescoed Church of the Dormition",
      "Rabati Castle in Akhaltsikhe",
      "Khertvisi fortress at the river confluence",
      "A night in the Borjomi gorge",
    ],
    included: [
      "Private transfers from and to Tbilisi",
      "One night's hotel accommodation in Borjomi",
      "Breakfast and one dinner",
      "All site entry fees",
      "English-speaking guide",
    ],
    excluded: ["International flights", "Travel insurance", "Lunches", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Vardzia",
        description:
          "Drive south-west via Borjomi and Akhaltsikhe, visiting Rabati Castle. Continue past Khertvisi to Vardzia for the late afternoon, when the cliff face turns gold. Return to Borjomi for the night.",
        meals: ["dinner"],
        accommodation: "Hotel, Borjomi",
      },
      {
        day: 2,
        title: "Borjomi and return",
        description:
          "Morning in Borjomi central park — the mineral spring and funicular — then the drive back to Tbilisi via Uplistsikhe cave town.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 08:30 on day one.",
    importantInfo: [
      "Vardzia involves steep steps and a low, narrow connecting tunnel.",
      "Shoulders and knees must be covered in the working monastery section.",
      "The southern plateau is significantly colder than Tbilisi year-round.",
    ],
    featured: false,
  },
  {
    id: "tour-6",
    slug: "chaukhi-juta-crossing",
    title: "Chaukhi & Juta Crossing",
    location: "Juta, Khevi",
    destinationSlug: "kazbegi",
    category: "adventure",
    summary:
      "Four days over the Chaukhi pass, from the granite spires above Juta down into the Khevsureti valleys.",
    description: [
      "The Chaukhi massif is the closest thing Georgia has to the Dolomites — vertical granite towers rising straight out of green pasture above the shepherds' village of Juta.",
      "This crossing climbs to the Chaukhi pass at 3,338 metres and descends into Khevsureti, one of the most isolated inhabited regions in the Caucasus, finishing at the fortress village of Roshka and the Abudelauri glacial lakes.",
      "It is the most demanding journey we run, and the one guests talk about longest afterwards.",
    ],
    image: "/images/tours/chaukhi.jpg",
    gallery: [
      { src: "/images/tours/chaukhi.jpg", alt: "The granite towers of the Chaukhi massif" },
      { src: "/images/tours/gergeti-glacier.jpg", alt: "Glacier ice in the high Caucasus" },
      { src: "/images/destinations/kazbegi-2.jpg", alt: "Mount Kazbek above the clouds" },
      { src: "/images/home/hero.jpg", alt: "A glacial lake in a Caucasus cirque" },
    ],
    durationDays: 4,
    durationLabel: "4 days · 3 nights",
    groupSize: "4–8 travellers",
    difficulty: "Challenging",
    priceFrom: 880,
    rating: 4.9,
    reviewCount: 61,
    highlights: [
      "The 3,338 m Chaukhi pass crossing",
      "The three Abudelauri lakes — green, blue and white",
      "Two nights in high shepherd villages",
      "Granite spires that look imported from the Alps",
    ],
    included: [
      "Private transfers from and to Tbilisi",
      "Three nights' guesthouse and mountain hut accommodation",
      "All breakfasts and dinners",
      "Certified mountain guide and porter support",
      "Group safety equipment",
    ],
    excluded: ["International flights", "Travel insurance (required)", "Lunches", "Personal equipment", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Juta",
        description:
          "Drive north to Juta at 2,200 m, Georgia's highest year-round village. Short acclimatisation walk towards the Chaukhi amphitheatre.",
        meals: ["dinner"],
        accommodation: "Guesthouse, Juta",
      },
      {
        day: 2,
        title: "Chaukhi base and the amphitheatre",
        description:
          "A full acclimatisation day beneath the massif, walking to the base of the towers and back. Around six hours.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Juta",
      },
      {
        day: 3,
        title: "The pass to Roshka",
        description:
          "The crossing: a steep 1,100 m climb to the 3,338 m pass, then a long descent past the Abudelauri lakes to Roshka. Eight to nine hours.",
        meals: ["breakfast", "dinner"],
        accommodation: "Mountain guesthouse, Roshka",
      },
      {
        day: 4,
        title: "Khevsureti and return",
        description:
          "Morning at the Roshka boulder field, then the long drive back to Tbilisi through the Khevsureti valleys.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 08:00 on day one.",
    importantInfo: [
      "Day three crosses a 3,338 m pass with snow into early July — this is a serious mountain day.",
      "Previous multi-day trekking experience is required.",
      "Accommodation on night three is a simple mountain guesthouse with shared facilities.",
    ],
    featured: false,
  },
  {
    id: "tour-7",
    slug: "imereti-canyons-and-caves",
    title: "Imereti Canyons & Caves",
    location: "Martvili & Okatse, Imereti",
    destinationSlug: "borjomi",
    category: "nature",
    summary:
      "Two days of turquoise river canyons, cantilevered walkways and one of Europe's great cave systems.",
    description: [
      "Western Georgia is wetter, greener and far less visited than the east. Its limestone country has been carved into a set of canyons that look almost tropical: Martvili, where you drift through a jade-green gorge by boat, and Okatse, crossed by a walkway bolted to the cliff 140 metres above the riverbed.",
      "Between them sits Prometheus Cave — kilometres of illuminated chambers, stalactites and an underground river you finish by boat.",
    ],
    image: "/images/tours/martvili.jpg",
    gallery: [
      { src: "/images/tours/martvili.jpg", alt: "The turquoise water of Martvili canyon" },
      { src: "/images/tours/okatse.jpg", alt: "The cliff walkway above Okatse canyon" },
      { src: "/images/destinations/borjomi-1.jpg", alt: "Dense forest in western Georgia" },
      { src: "/images/about/landscape.jpg", alt: "Green hill country in Georgia" },
    ],
    durationDays: 2,
    durationLabel: "2 days · 1 night",
    groupSize: "2–12 travellers",
    difficulty: "Easy",
    priceFrom: 350,
    rating: 4.7,
    reviewCount: 103,
    highlights: [
      "A boat drift through the jade water of Martvili canyon",
      "The 780 m cliff walkway at Okatse",
      "Prometheus Cave and its underground river",
      "Gelati Monastery, a UNESCO site above Kutaisi",
    ],
    included: [
      "Private transfers from and to Tbilisi",
      "One night's hotel accommodation in Kutaisi",
      "Breakfast",
      "All site entry and boat fees",
      "English-speaking guide",
    ],
    excluded: ["International flights", "Travel insurance", "Lunches and dinners", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Martvili and Kutaisi",
        description:
          "Drive west to Martvili canyon for the boat trip through the gorge, then on to Kutaisi with an afternoon stop at Gelati Monastery.",
        meals: ["breakfast"],
        accommodation: "Hotel, Kutaisi",
      },
      {
        day: 2,
        title: "Okatse, Prometheus and return",
        description:
          "The Okatse canyon walkway in the morning, Prometheus Cave after lunch, then the drive back to Tbilisi.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 08:00 on day one.",
    importantInfo: [
      "The Okatse walkway has open grating and is not suitable for a serious fear of heights.",
      "Prometheus Cave stays at 14°C year-round — bring a layer.",
      "Canyon boat trips are suspended after heavy rain.",
    ],
    featured: false,
  },
  {
    id: "tour-8",
    slug: "tusheti-highland-crossing",
    title: "Tusheti Highland Crossing",
    location: "Omalo & Dartlo, Tusheti",
    destinationSlug: "kazbegi",
    category: "adventure",
    summary:
      "Six days in Georgia's most remote inhabited region, reached by one of the world's most exposed mountain roads.",
    description: [
      "Tusheti is cut off by snow for eight months of the year. The only way in is the Abano Pass — a 2,850-metre unpaved road with no barriers, regularly listed among the most dangerous drives on earth, and genuinely spectacular.",
      "What waits on the other side is worth it: slate-roofed villages, defensive towers, shepherd families who bring their flocks up every summer, and a protected landscape with almost no infrastructure.",
      "We walk between Omalo, Dartlo and Chesho, sleeping in family houses, and finish with a night back down in Kakheti.",
    ],
    image: "/images/tours/tusheti.jpg",
    gallery: [
      { src: "/images/tours/tusheti.jpg", alt: "A slate-roofed village in Tusheti" },
      { src: "/images/home/story.jpg", alt: "Morning light over Upper Omalo" },
      { src: "/images/culture/shepherd.jpg", alt: "A shepherd with his flock in the highlands" },
      { src: "/images/experiences/horse-riding.jpg", alt: "Horses on a mountain trail" },
    ],
    durationDays: 6,
    durationLabel: "6 days · 5 nights",
    groupSize: "4–8 travellers",
    difficulty: "Challenging",
    priceFrom: 1420,
    rating: 4.9,
    reviewCount: 48,
    highlights: [
      "The Abano Pass at 2,850 m",
      "The tower village of Dartlo",
      "Walking between Omalo, Dartlo and Chesho",
      "Tushetian guda cheese straight from the shepherds",
      "A final night in a Kakheti wine estate",
    ],
    included: [
      "Private 4x4 transfers throughout",
      "Five nights' guesthouse accommodation",
      "All breakfasts and dinners",
      "Local Tush guide",
      "National park permits",
    ],
    excluded: ["International flights", "Travel insurance (required)", "Lunches", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi to Omalo",
        description:
          "Drive east to Kakheti, then the six-hour 4x4 climb over the Abano Pass into Tusheti. Arrive in Upper Omalo by evening.",
        meals: ["dinner"],
        accommodation: "Guesthouse, Omalo",
      },
      {
        day: 2,
        title: "Omalo and Keselo",
        description:
          "An acclimatisation day exploring the Keselo tower complex above Omalo and the ridge walk to Shenako.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Omalo",
      },
      {
        day: 3,
        title: "Omalo to Dartlo",
        description: "A six-hour walk down the Pirikiti Alazani valley to Dartlo, the finest tower village in Tusheti.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Dartlo",
      },
      {
        day: 4,
        title: "Dartlo, Chesho and Parsma",
        description: "A loop further up the valley to Chesho and Parsma, with shepherd stops along the way.",
        meals: ["breakfast", "dinner"],
        accommodation: "Guesthouse, Dartlo",
      },
      {
        day: 5,
        title: "Return over the pass",
        description: "The long drive back over Abano into Kakheti, finishing at a wine estate near Telavi.",
        meals: ["breakfast", "dinner"],
        accommodation: "Wine estate, Kakheti",
      },
      {
        day: 6,
        title: "Kakheti to Tbilisi",
        description: "A morning tasting at the estate, then the two-hour drive back to the capital.",
        meals: ["breakfast"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 07:00 on day one.",
    importantInfo: [
      "The Abano Pass is unpaved, exposed and only open roughly June to early October.",
      "There are no ATMs, pharmacies or reliable mobile signal in Tusheti.",
      "Electricity in the villages is solar and intermittent.",
    ],
    featured: false,
  },
  {
    id: "tour-9",
    slug: "davit-gareja-desert",
    title: "Davit Gareja & the Painted Desert",
    location: "Udabno, Kakheti",
    destinationSlug: "kakheti",
    category: "culture",
    summary:
      "A day trip into semi-desert badlands to a sixth-century cave monastery on the Azerbaijani border.",
    description: [
      "An hour and a half south-east of Tbilisi the landscape stops being green. Davit Gareja is a complex of cave monasteries cut into the sides of a ridge in genuine semi-desert, founded in the sixth century by one of the Assyrian fathers.",
      "The Lavra monastery at the base is still working. The climb over the ridge to Udabno's painted caves — with their surviving frescoes and a view over the Azerbaijani steppe — is the reason to come.",
      "On the way back the road passes the Mravaltskaro badlands, striped in ochre, rust and grey.",
    ],
    image: "/images/tours/davit-gareja.jpg",
    gallery: [
      { src: "/images/tours/davit-gareja.jpg", alt: "The cave monastery complex at Davit Gareja" },
      { src: "/images/about/landscape.jpg", alt: "Striped semi-desert hills in south-east Georgia" },
      { src: "/images/destinations/kakheti-1.jpg", alt: "The Kakheti countryside" },
      { src: "/images/about/heritage.jpg", alt: "A Georgian monastery in open country" },
    ],
    durationDays: 1,
    durationLabel: "Full day · 9 hours",
    groupSize: "2–14 travellers",
    difficulty: "Moderate",
    priceFrom: 140,
    rating: 4.6,
    reviewCount: 129,
    highlights: [
      "The working Lavra monastery cut into the rock",
      "Udabno's frescoed caves above the border ridge",
      "Striped badlands at Mravaltskaro",
      "Semi-desert scenery unlike anywhere else in Georgia",
    ],
    included: ["Private transfer from Tbilisi", "English-speaking guide", "Bottled water"],
    excluded: ["Meals", "Travel insurance", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "Tbilisi — Davit Gareja — Tbilisi",
        description:
          "Drive south-east through Gardabani to the monastery. Visit the Lavra, then climb the ridge to the Udabno caves. Lunch at the village taverna before returning via the badlands.",
        meals: [],
        accommodation: "—",
      },
    ],
    meetingPoint: "Your Tbilisi hotel, 09:00.",
    importantInfo: [
      "The ridge climb is steep, exposed and takes about 90 minutes return.",
      "Access to the Udabno caves can close at short notice for border reasons.",
      "There is no shade — summer temperatures regularly exceed 35°C.",
    ],
    featured: false,
  },
  {
    id: "tour-10",
    slug: "tbilisi-in-depth",
    title: "Tbilisi in Depth",
    location: "Tbilisi",
    destinationSlug: "tbilisi",
    category: "city",
    summary:
      "A full day through the capital's layers — bathhouses, balconies, brutalism and the food that ties it together.",
    description: [
      "Most visitors see Tbilisi's old town in two hours and decide they have seen the city. This day is the argument against that.",
      "It moves from the sulphur bath quarter and the Betlemi steps up to Narikala, then out to the parts of the city that rarely make the itinerary: the Soviet-modernist Ministry of Highways building, the Chronicle of Georgia, and the market halls at Dezerter Bazaar.",
      "Food is threaded throughout — a bakery, a market, a wine bar, and a long lunch in a courtyard restaurant.",
    ],
    image: "/images/destinations/tbilisi-1.jpg",
    gallery: [
      { src: "/images/destinations/tbilisi-1.jpg", alt: "Panorama over old Tbilisi" },
      { src: "/images/culture/balconies.jpg", alt: "The tiled facade of the Orbeliani bathhouse in old Tbilisi" },
      { src: "/images/experiences/sulfur-baths.jpg", alt: "The domes of the Abanotubani bath quarter" },
      { src: "/images/culture/khachapuri.jpg", alt: "Adjarian khachapuri fresh from the oven" },
    ],
    durationDays: 1,
    durationLabel: "Full day · 7 hours",
    groupSize: "2–8 travellers",
    difficulty: "Easy",
    priceFrom: 95,
    rating: 4.8,
    reviewCount: 187,
    highlights: [
      "The Abanotubani sulphur bath quarter",
      "Narikala fortress and the Betlemi steps",
      "Dezerter Bazaar with a chef",
      "Soviet modernism at the former Ministry of Highways",
      "A long courtyard lunch with natural wine",
    ],
    included: ["Private guide for the day", "All transport within the city", "Market tastings", "Lunch with wine"],
    excluded: ["Hotel transfers outside the centre", "Bathhouse entry", "Gratuities"],
    itinerary: [
      {
        day: 1,
        title: "A day across the city",
        description:
          "Begin at the bathhouses and climb to Narikala, then descend through the old town for a bakery stop. Cross to Dezerter Bazaar with a chef, take a long courtyard lunch, and finish among the Soviet-modern landmarks on the left bank.",
        meals: ["lunch"],
        accommodation: "—",
      },
    ],
    meetingPoint: "Meidan Square, 09:30. Hotel pick-up available in the central districts.",
    importantInfo: [
      "Around 6 km of walking, including steep cobbled streets and steps.",
      "The bathhouse visit is optional and paid directly if you want a private room.",
      "The route can be reshaped around dietary requirements — tell us in advance.",
    ],
    featured: false,
  },
];

/** Every tour in one language. Prices, ratings and day counts do not move. */
export function localisedTours(locale: Locale): Tour[] {
  return localiseAll(tours, locale, tourContent);
}

export function getTourBySlug(slug: string, locale?: Locale): Tour | undefined {
  const base = tours.find((tour) => tour.slug === slug);
  if (!base || !locale) return base;
  return localise(base, locale, tourContent);
}

export function getToursByDestination(destinationSlug: string, locale?: Locale): Tour[] {
  const matches = tours.filter((tour) => tour.destinationSlug === destinationSlug);
  return locale ? localiseAll(matches, locale, tourContent) : matches;
}

export function featuredTours(locale?: Locale): Tour[] {
  const matches = tours.filter((tour) => tour.featured);
  return locale ? localiseAll(matches, locale, tourContent) : matches;
}
