import type { Experience, ExperienceCategory } from "@/types";

export const experienceCategories: { value: ExperienceCategory; label: string }[] = [
  { value: "wine", label: "Wine" },
  { value: "food", label: "Food" },
  { value: "culture", label: "Culture" },
  { value: "adventure", label: "Adventure" },
  { value: "wellness", label: "Wellness" },
  { value: "craft", label: "Craft" },
];

export const experiences: Experience[] = [
  {
    id: "exp-1",
    slug: "georgian-wine-tasting",
    title: "Qvevri Wine Tasting with a Winemaker",
    location: "Alazani Valley, Kakheti",
    destinationSlug: "kakheti",
    category: "wine",
    summary:
      "Taste straight from the clay in a working family cellar, with the person who buried the vessels.",
    description: [
      "Georgian wine is not made the way European wine is made. Whole grapes — skins, stems and all — go into a beeswax-lined clay qvevri buried to its neck in the cellar floor, and stay there through fermentation and ageing. The result is amber, tannic and completely unlike anything a supermarket has prepared you for.",
      "This afternoon is spent in a family marani in the Alazani valley with the winemaker himself. You will look into an open qvevri, taste four wines drawn directly from the clay, and eat whatever came out of the garden that morning.",
    ],
    image: "/images/experiences/wine-tasting.jpg",
    gallery: [
      { src: "/images/experiences/wine-tasting.jpg", alt: "The barrel cellar of a Kakhetian winery" },
      { src: "/images/culture/wine.jpg", alt: "A glass of amber Georgian wine" },
      { src: "/images/destinations/kakheti-1.jpg", alt: "Vineyards in the Alazani valley" },
      { src: "/images/experiences/supra.jpg", alt: "A table laid with Georgian dishes" },
    ],
    duration: "4 hours",
    groupSize: "2–8 guests",
    price: 85,
    rating: 4.9,
    reviewCount: 214,
    highlights: [
      "Four wines drawn directly from the qvevri",
      "A cellar that has been in the same family for six generations",
      "Lunch from the garden, cooked that morning",
      "The chance to look inside an open qvevri",
    ],
    whatToExpect: [
      {
        title: "Into the marani",
        description:
          "You start in the cellar itself, standing on the clay lids of vessels holding two thousand litres each, while the winemaker explains what is happening underneath your feet.",
      },
      {
        title: "The tasting",
        description:
          "Four wines — a Rkatsiteli, two Saperavi and something experimental — poured in the order the family drinks them, not the order a sommelier would choose.",
      },
      {
        title: "Lunch under the vines",
        description:
          "A long table in the courtyard with badrijani, khachapuri, tomatoes that taste like tomatoes, and as much wine as the afternoon calls for.",
      },
    ],
    included: ["All wine tastings", "Lunch with the family", "English-speaking host", "Cellar visit"],
    featured: true,
  },
  {
    id: "exp-2",
    slug: "khinkali-cooking-class",
    title: "Khinkali & Khachapuri Cooking Class",
    location: "Old Tbilisi",
    destinationSlug: "tbilisi",
    category: "food",
    summary:
      "Learn the pleat. Georgian dumplings are judged on the fold, and everyone counts.",
    description: [
      "Khinkali are soup dumplings twisted into a topknot, and Georgians are unforgiving about the count — nineteen pleats is respectable, twenty-eight is showing off. You hold the knot, bite the side, drink the broth, and leave the top on the plate.",
      "This class runs in a working kitchen off Erekle II street. You will make khinkali from scratch, fold an Imeretian khachapuri, and eat everything you produce with a glass of something local.",
    ],
    image: "/images/experiences/cooking.jpg",
    gallery: [
      { src: "/images/experiences/cooking.jpg", alt: "Freshly boiled khinkali on a plate" },
      { src: "/images/culture/khachapuri.jpg", alt: "Adjarian khachapuri with egg and butter" },
      { src: "/images/culture/bread.jpg", alt: "Shoti bread being pulled from a clay oven" },
      { src: "/images/destinations/tbilisi-1.jpg", alt: "Rooftops of old Tbilisi" },
    ],
    duration: "3.5 hours",
    groupSize: "2–10 guests",
    price: 65,
    rating: 4.8,
    reviewCount: 178,
    highlights: [
      "Make khinkali dough and filling from scratch",
      "Fold both Imeretian and Adjarian khachapuri",
      "A market walk for herbs and spices beforehand",
      "Eat everything you make, with wine",
    ],
    whatToExpect: [
      {
        title: "Market first",
        description:
          "A short walk to buy herbs, cheese and blue fenugreek, with an explanation of the spice mixes that make Georgian food taste Georgian.",
      },
      {
        title: "The kitchen",
        description:
          "Dough, filling, and the pleat — taught slowly, then practised until your count is respectable.",
      },
      {
        title: "The table",
        description: "You sit down to what you made, with wine and a short lesson in how to eat a khinkali properly.",
      },
    ],
    included: ["All ingredients", "Market walk", "Recipes to take home", "Wine and soft drinks"],
    featured: true,
  },
  {
    id: "exp-3",
    slug: "supra-with-a-tamada",
    title: "A Supra with a Tamada",
    location: "Tbilisi",
    destinationSlug: "tbilisi",
    category: "culture",
    summary:
      "The Georgian feast is a structured performance with a toastmaster running it. Sit down and find out.",
    description: [
      "A supra is not a dinner party. It is a form with rules: a tamada — toastmaster — is appointed, and he leads the table through a sequence of toasts that always begins with peace and always ends with the people who are no longer at the table.",
      "You are seated with a Georgian family in a private house. The tamada will toast, the table will answer, and somewhere between the third and fifth toast the singing usually starts.",
    ],
    image: "/images/experiences/supra.jpg",
    gallery: [
      { src: "/images/experiences/supra.jpg", alt: "A Georgian supra table covered with dishes" },
      { src: "/images/culture/wine.jpg", alt: "Wine poured at a Georgian table" },
      { src: "/images/culture/khachapuri.jpg", alt: "Khachapuri on a supra table" },
      { src: "/images/experiences/polyphony.jpg", alt: "Georgian polyphonic singers performing" },
    ],
    duration: "4 hours",
    groupSize: "2–12 guests",
    price: 95,
    rating: 4.9,
    reviewCount: 156,
    highlights: [
      "A full supra menu across three courses",
      "A traditional tamada leading the toasts",
      "Live polyphonic singing at the table",
      "Hosted in a private Tbilisi home",
    ],
    whatToExpect: [
      {
        title: "The table is already full",
        description:
          "Georgian tables are laid all at once and dishes are stacked on top of each other. Nothing arrives in courses.",
      },
      {
        title: "The toasts begin",
        description:
          "The tamada opens with peace, then moves through Georgia, the guests, the family, and the departed. You will be asked to give one.",
      },
      {
        title: "Then the singing",
        description:
          "Three-part polyphony, sung at the table rather than performed at you. It is on the UNESCO heritage list for a reason.",
      },
    ],
    included: ["Full supra menu", "Wine and chacha", "Tamada and singers", "Translation throughout"],
    featured: true,
  },
  {
    id: "exp-4",
    slug: "sulphur-bath-ritual",
    title: "The Sulphur Bath Ritual",
    location: "Abanotubani, Tbilisi",
    destinationSlug: "tbilisi",
    category: "wellness",
    summary:
      "A private room in the brick-domed bathhouses that gave Tbilisi its name, plus the famous kisa scrub.",
    description: [
      "Tbilisi means 'warm place', and the city exists because of the sulphur springs that surface in Abanotubani. The domed brick bathhouses above them have been in continuous use since the seventeenth century — Pushkin and Dumas both wrote about the experience, neither entirely calmly.",
      "You take a private room with a hot mineral pool, then submit to the kisa: a full-body scrub with a coarse mitt delivered by a mekise who has no interest in your comfort and every interest in your circulation.",
    ],
    image: "/images/experiences/sulfur-baths.jpg",
    gallery: [
      { src: "/images/experiences/sulfur-baths.jpg", alt: "Brick domes of the Abanotubani bathhouses" },
      { src: "/images/destinations/tbilisi-2.jpg", alt: "Narikala fortress above the bath quarter" },
      { src: "/images/hotels/property-4.jpg", alt: "A bathhouse interior" },
      { src: "/images/culture/balconies.jpg", alt: "The tiled facade of the Orbeliani bathhouse" },
    ],
    duration: "1.5 hours",
    groupSize: "1–6 guests",
    price: 55,
    rating: 4.7,
    reviewCount: 132,
    highlights: [
      "A private room with a natural sulphur pool",
      "The traditional kisa scrub and honey-soap massage",
      "Seventeenth-century brick vaulting overhead",
      "Tea on the terrace afterwards",
    ],
    whatToExpect: [
      {
        title: "Your own room",
        description:
          "Georgian bathhouses are private, not communal — you get a tiled room with a hot mineral pool, a cold plunge and a marble slab.",
      },
      {
        title: "The kisa",
        description:
          "Fifteen minutes of vigorous exfoliation followed by a soap massage. It is more thorough than most visitors expect.",
      },
      {
        title: "Cool down",
        description: "Tea on the terrace above the quarter, looking across to the Narikala ridge.",
      },
    ],
    included: ["Private bath room for 90 minutes", "Kisa scrub and soap massage", "Towels and slippers", "Herbal tea"],
    featured: false,
  },
  {
    id: "exp-5",
    slug: "polyphony-and-dance",
    title: "Polyphony & Dance Rehearsal",
    location: "Tbilisi",
    destinationSlug: "tbilisi",
    category: "culture",
    summary:
      "Sit in on a working rehearsal of three-part singing and mountain dance — not a show, an actual practice.",
    description: [
      "Georgian polyphony predates the country's conversion to Christianity and is sung in three independent parts that resolve into intervals Western ears find strange and then can't stop thinking about. UNESCO listed it in 2001.",
      "Rather than a staged dinner performance, this is an evening inside a rehearsal room with an ensemble preparing a programme. You will hear how the parts are assembled, watch the men's mountain dances practised at half speed, and be invited to attempt the bass line.",
    ],
    image: "/images/experiences/polyphony.jpg",
    gallery: [
      { src: "/images/experiences/polyphony.jpg", alt: "A Georgian polyphonic ensemble singing" },
      { src: "/images/culture/dance.jpg", alt: "Traditional Georgian dance in costume" },
      { src: "/images/destinations/tbilisi-1.jpg", alt: "Tbilisi at dusk" },
      { src: "/images/experiences/supra.jpg", alt: "A supra table with singers" },
    ],
    duration: "2 hours",
    groupSize: "2–15 guests",
    price: 45,
    rating: 4.8,
    reviewCount: 89,
    highlights: [
      "A working ensemble rehearsal, not a tourist show",
      "The three vocal parts explained and demonstrated",
      "Khevsurian and Adjarian dance practised up close",
      "A go at singing the bass line yourself",
    ],
    whatToExpect: [
      {
        title: "How the parts work",
        description:
          "The ensemble takes a single song apart — bass drone, middle voice, and the ornamented top line — and rebuilds it in front of you.",
      },
      {
        title: "The dances",
        description:
          "Mountain dances are practised slowly before they are performed fast. Watching the slow version is more revealing.",
      },
      {
        title: "Your turn",
        description: "The bass line is the accessible one. Everyone tries; some manage.",
      },
    ],
    included: ["Rehearsal access", "Translation and commentary", "Georgian wine and snacks"],
    featured: false,
  },
  {
    id: "exp-6",
    slug: "highland-horse-riding",
    title: "Highland Horse Riding",
    location: "Juta & the Khevi Valleys",
    destinationSlug: "kazbegi",
    category: "adventure",
    summary:
      "Ride Tushetian mountain horses across alpine pasture below the Chaukhi towers.",
    description: [
      "Tushetian horses are small, sure-footed and entirely unbothered by terrain that would give a European horse pause. They are the reason people have been able to live in these mountains at all.",
      "This half-day ride starts from the village of Juta at 2,200 metres and follows shepherd tracks across open pasture towards the base of the Chaukhi massif, with the granite towers filling the skyline the whole way.",
    ],
    image: "/images/experiences/horse-riding.jpg",
    gallery: [
      { src: "/images/experiences/horse-riding.jpg", alt: "Horses on a mountain trail" },
      { src: "/images/tours/chaukhi.jpg", alt: "The granite towers of the Chaukhi massif" },
      { src: "/images/culture/shepherd.jpg", alt: "A shepherd with his flock" },
      { src: "/images/destinations/kazbegi-1.jpg", alt: "The Khevi valley" },
    ],
    duration: "Half day · 5 hours",
    groupSize: "2–6 guests",
    price: 120,
    rating: 4.7,
    reviewCount: 64,
    highlights: [
      "Sure-footed Tushetian mountain horses",
      "Open pasture below the Chaukhi granite spires",
      "A shepherd's camp stop for cheese and bread",
      "Suitable for confident beginners",
    ],
    whatToExpect: [
      {
        title: "Matching and briefing",
        description:
          "Horses are matched to experience, and there is a proper briefing before anyone mounts. Helmets are provided and required.",
      },
      {
        title: "Across the pasture",
        description:
          "Three hours at a walk with some trotting on the flats, following tracks used by shepherds moving flocks up for summer.",
      },
      {
        title: "The camp stop",
        description: "A break at a summer shepherd's camp for guda cheese, bread and mountain tea.",
      },
    ],
    included: ["Horse and equipment", "Helmet", "Local guide", "Shepherd's camp refreshments"],
    featured: false,
  },
  {
    id: "exp-7",
    slug: "paragliding-gudauri",
    title: "Tandem Paragliding over Gudauri",
    location: "Gudauri, Mtskheta-Mtianeti",
    destinationSlug: "gudauri",
    category: "adventure",
    summary:
      "Launch from the ridge at 2,600 metres and fly out over the Devil's Valley with the Caucasus around you.",
    description: [
      "Gudauri's treeless plateau and reliable thermals make it one of the best tandem paragliding sites in the region. Launch is from the ridge above the resort at around 2,600 metres.",
      "The flight runs fifteen to twenty-five minutes depending on conditions, out over the Devil's Valley with the main Caucasus ridge on one side and the Georgian Military Road threading below.",
    ],
    image: "/images/experiences/paragliding.jpg",
    gallery: [
      { src: "/images/experiences/paragliding.jpg", alt: "A paraglider above the Gudauri plateau" },
      { src: "/images/destinations/gudauri-1.jpg", alt: "The open slopes of Gudauri" },
      { src: "/images/destinations/gudauri-2.jpg", alt: "The Georgian Military Road below the pass" },
      { src: "/images/home/cta.jpg", alt: "The Caucasus range from the Cross Pass" },
    ],
    duration: "2 hours including transfer",
    groupSize: "1–4 guests",
    price: 150,
    rating: 4.9,
    reviewCount: 203,
    highlights: [
      "Launch from 2,600 m above the resort",
      "15–25 minutes of airtime",
      "Views over the Devil's Valley and the main Caucasus ridge",
      "Certified tandem pilots and onboard video",
    ],
    whatToExpect: [
      {
        title: "Up to the ridge",
        description: "A 4x4 shuttle from the resort to the launch site, with a briefing while the wing is laid out.",
      },
      {
        title: "Launch",
        description:
          "Three or four running steps and the ground drops away. Take-off is the only part that requires anything from you.",
      },
      {
        title: "The flight",
        description:
          "Fifteen to twenty-five minutes riding the ridge lift, with the option of some gentle spirals on the way down if you want them.",
      },
    ],
    included: ["Certified tandem pilot", "All flight equipment", "Transfer to launch site", "Onboard video and photos"],
    featured: false,
  },
  {
    id: "exp-8",
    slug: "ceramics-workshop",
    title: "Clay & Enamel Craft Workshop",
    location: "Tbilisi",
    destinationSlug: "tbilisi",
    category: "craft",
    summary:
      "An afternoon at the wheel and the kiln, learning the two crafts Georgia never stopped practising.",
    description: [
      "Georgian clay work runs from the qvevri — vessels holding thousands of litres, built by hand over months — down to cups and bowls thrown on a wheel in an afternoon. The same country also produces minankari, the cloisonné enamel technique that survived here after it died out in Byzantium.",
      "This workshop in a Tbilisi studio covers both: throwing on the wheel, then setting fine gold wire and glass powder into a small enamel piece you take home.",
    ],
    image: "/images/experiences/ceramics.jpg",
    gallery: [
      { src: "/images/experiences/ceramics.jpg", alt: "Glazes being mixed by hand in a pottery workshop" },
      { src: "/images/culture/craft.jpg", alt: "Georgian cloisonné enamel jewellery" },
      { src: "/images/culture/balconies.jpg", alt: "Tilework on the Orbeliani bathhouse facade" },
      { src: "/images/experiences/wine-tasting.jpg", alt: "A Georgian winery cellar" },
    ],
    duration: "3 hours",
    groupSize: "2–8 guests",
    price: 70,
    rating: 4.8,
    reviewCount: 71,
    highlights: [
      "Throw a bowl on the wheel with a working potter",
      "Set gold wire and glass in a minankari enamel piece",
      "Take your enamel work home the same day",
      "Ceramics shipped on once fired and glazed",
    ],
    whatToExpect: [
      {
        title: "At the wheel",
        description:
          "Centring is the hard part and takes most people three attempts. You will throw two or three pieces and keep the best.",
      },
      {
        title: "Enamel",
        description:
          "Fine gold wire bent into cells on a copper base, filled with powdered glass and fired — the technique is a thousand years old and unchanged.",
      },
      {
        title: "Taking it home",
        description:
          "Enamel is finished in the session. Ceramics need firing and glazing, so those are posted on to you.",
      },
    ],
    included: ["All materials", "Firing and glazing", "Shipping of ceramic pieces", "Coffee and Georgian sweets"],
    featured: false,
  },
];

export function getExperienceBySlug(slug: string): Experience | undefined {
  return experiences.find((experience) => experience.slug === slug);
}

export function getExperiencesByDestination(destinationSlug: string): Experience[] {
  return experiences.filter((experience) => experience.destinationSlug === destinationSlug);
}

export const featuredExperiences = experiences.filter((experience) => experience.featured);
