import type { Destination } from "@/types";

/**
 * Local mock data. Content is illustrative and exists purely to populate the UI —
 * there is no data-fetching layer in this prototype.
 */
export const destinations: Destination[] = [
  {
    id: "dest-tbilisi",
    slug: "tbilisi",
    name: "Tbilisi",
    region: "Kartli",
    tagline: "A capital that never quite decided which century to belong to",
    summary:
      "Sulphur baths, balconied courtyards and a restaurant scene rewriting what Georgian food can be.",
    description: [
      "Tbilisi is built on a bend of the Mtkvari river, wedged between two ridges, and it has been rebuilt after invasion more times than most cities have existed. The result is a capital of overlaps: brick bathhouses beside brutalist concrete, art nouveau facades leaning over vine-covered courtyards, wine bars in former Soviet printing houses.",
      "The old town rewards slow walking. Streets bend without warning, staircases turn into someone's front garden, and the wooden balconies that define the city hang on with visible determination. Above it all, Narikala fortress has watched every version of Tbilisi since the fourth century.",
      "Come for a weekend and you will spend it eating. Stay a week and you will start to understand why Georgians talk about their capital the way other people talk about a difficult, beloved relative.",
    ],
    heroImage: "/images/destinations/tbilisi-1.jpg",
    coverImage: "/images/destinations/tbilisi-2.jpg",
    gallery: [
      { src: "/images/destinations/tbilisi-1.jpg", alt: "Panorama over the rooftops of old Tbilisi" },
      { src: "/images/culture/balconies.jpg", alt: "The tiled facade of the Orbeliani bathhouse in old Tbilisi" },
      { src: "/images/experiences/sulfur-baths.jpg", alt: "Brick domes of the Abanotubani sulphur baths" },
      { src: "/images/culture/bread.jpg", alt: "Shoti bread pulled from a clay tone oven" },
    ],
    idealFor: ["First-time visitors", "Food and wine", "Architecture", "City weekends"],
    attractions: [
      {
        name: "Abanotubani sulphur baths",
        description:
          "The domed bathhouse quarter that gave the city its name — Tbilisi means 'warm place'. Private rooms are booked by the hour.",
      },
      {
        name: "Narikala Fortress",
        description:
          "A fourth-century citadel above the old town, reached by cable car or a steep, worthwhile walk along the ridge.",
      },
      {
        name: "Chardin & Erekle II streets",
        description:
          "The dense heart of the old town, best after dark when the courtyards and wine bars fill up.",
      },
      {
        name: "Dry Bridge Market",
        description:
          "Soviet cameras, hand-painted signs, mismatched silver and the occasional genuinely good antique.",
      },
      {
        name: "Chronicle of Georgia",
        description:
          "Sixteen black pillars on a hill above the reservoir, carved with Georgian kings and scenes from the Gospels.",
      },
    ],
    travelInfo: {
      bestTime: "April–June and September–October for warm days without August heat.",
      gettingThere: "Tbilisi International Airport, 17 km east of the centre — around 25 minutes by car.",
      gettingAround: "Walkable old town, cheap metro, and taxis everywhere. Hire a driver for day trips.",
      language: "Georgian. English is widely spoken in hospitality; Russian is common with older generations.",
    },
    featured: true,
  },
  {
    id: "dest-kazbegi",
    slug: "kazbegi",
    name: "Kazbegi",
    region: "Khevi",
    tagline: "Where the road runs out and the Caucasus begins",
    summary:
      "A glacier-hung valley beneath Mount Kazbek, with the most photographed church in the country on the ridge above town.",
    description: [
      "Three hours north of Tbilisi, the Georgian Military Road climbs through the Cross Pass and drops into Khevi — a high valley of grey rivers, sheep tracks and a 5,054-metre volcano that spends most of the summer wearing cloud.",
      "Stepantsminda, the valley town, exists mainly as a base. The reason everyone comes is on the hill above it: Gergeti Trinity Church, standing alone at 2,170 metres with Kazbek behind it. The walk up takes about two hours; the view rearranges your sense of scale.",
      "Beyond the church, the valley keeps going. Truso, Juta, the Chaukhi massif and the Gergeti glacier are all within a day's reach, and all of them are emptier than they deserve to be.",
    ],
    heroImage: "/images/destinations/kazbegi-1.jpg",
    coverImage: "/images/destinations/kazbegi-2.jpg",
    gallery: [
      { src: "/images/destinations/kazbegi-1.jpg", alt: "The Terek valley at Stepantsminda" },
      { src: "/images/tours/gergeti-glacier.jpg", alt: "Glacier ice below the summit of Mount Kazbek" },
      { src: "/images/tours/truso-valley.jpg", alt: "Mineral travertine terraces in the Truso valley" },
      { src: "/images/tours/chaukhi.jpg", alt: "The granite towers of the Chaukhi massif above Juta" },
    ],
    idealFor: ["Hiking", "Mountain photography", "Short escapes from Tbilisi", "Alpine scenery"],
    attractions: [
      {
        name: "Gergeti Trinity Church",
        description:
          "A fourteenth-century church alone on a grass ridge at 2,170 m, with Mount Kazbek rising behind it.",
      },
      {
        name: "Truso Valley",
        description:
          "A wide glacial valley of ochre mineral springs, abandoned stone towers and almost no other walkers.",
      },
      {
        name: "Juta & the Chaukhi massif",
        description:
          "Georgia's answer to the Dolomites — vertical granite spires above a shepherds' summer village.",
      },
      {
        name: "Gveleti Waterfalls",
        description: "A short, steep walk off the Dariali gorge road to a pair of falls in a side canyon.",
      },
    ],
    travelInfo: {
      bestTime: "June–September for hiking; January–March for snow, though passes can close.",
      gettingThere: "Roughly 3 hours from Tbilisi by road via the Georgian Military Road.",
      gettingAround: "A 4x4 with a driver is essential for Truso and Juta. The Gergeti walk starts in town.",
      language: "Georgian, with a distinct Khevsurian mountain dialect still spoken by older residents.",
    },
    featured: true,
  },
  {
    id: "dest-svaneti",
    slug: "svaneti",
    name: "Svaneti",
    region: "Upper Svaneti",
    tagline: "Stone towers, glaciers, and a language older than the Georgian alphabet",
    summary:
      "Medieval defensive towers stacked against 5,000-metre peaks in Europe's highest permanently inhabited villages.",
    description: [
      "Svaneti sits behind the main Caucasus ridge, cut off for centuries by snow and by choice. What survived that isolation is remarkable: hundreds of stone koshki — family defence towers, some nine centuries old — still standing in villages that never surrendered to anybody.",
      "Mestia is the regional centre and the practical base. Ushguli, four hours further up a rough valley road, is a cluster of four hamlets at 2,100 metres beneath Shkhara, Georgia's highest peak, and is UNESCO-listed for good reason.",
      "The Svans speak Svan, a language that split from Georgian around four thousand years ago. They also make a chilli-and-garlic salt you will want to take home by the kilo.",
    ],
    heroImage: "/images/destinations/svaneti-1.jpg",
    coverImage: "/images/destinations/svaneti-2.jpg",
    gallery: [
      { src: "/images/destinations/svaneti-1.jpg", alt: "Stone defence towers of Ushguli beneath Mount Shkhara" },
      { src: "/images/destinations/svaneti-2.jpg", alt: "A Svan tower house standing above Mestia" },
      { src: "/images/home/inspiration-2.jpg", alt: "The Svaneti ridge under summer cloud" },
      { src: "/images/culture/shepherd.jpg", alt: "A shepherd moving sheep across a high Caucasus pasture" },
    ],
    idealFor: ["Trekking", "Heritage", "Remote travel", "Photography"],
    attractions: [
      {
        name: "Ushguli",
        description:
          "Four hamlets at 2,100 m under Shkhara — among the highest continuously inhabited settlements in Europe.",
      },
      {
        name: "Mestia's tower quarter",
        description: "Dozens of koshki towers packed into a working town, best seen in low evening light.",
      },
      {
        name: "Chalaadi Glacier",
        description: "A three-hour return walk from Mestia through birch forest to a glacier snout you can touch.",
      },
      {
        name: "Mestia–Ushguli trek",
        description:
          "The classic four-day Georgian trek, sleeping in village guesthouses along the way.",
      },
    ],
    travelInfo: {
      bestTime: "Late June to early October. Roads and treks are unreliable outside that window.",
      gettingThere: "Fly Tbilisi–Mestia (under an hour) or drive 8–9 hours via Zugdidi.",
      gettingAround: "Shared 4x4s run Mestia–Ushguli. Private transfers are far more comfortable.",
      language: "Svan alongside Georgian. English is limited outside guesthouses.",
    },
    featured: true,
  },
  {
    id: "dest-kakheti",
    slug: "kakheti",
    name: "Kakheti",
    region: "Kakheti",
    tagline: "Eight thousand vintages, still pouring",
    summary:
      "The birthplace of wine — clay qvevri buried in cellar floors, monasteries on ridges, and the Alazani valley below.",
    description: [
      "Georgians have been making wine in Kakheti for roughly eight thousand years, and they have never stopped doing it their way: whole grapes fermented in beeswax-lined clay vessels buried to the neck in the earth. UNESCO lists the method as intangible cultural heritage. Locals just call it wine.",
      "The region is broad and gentle — the Alazani valley running east under the wall of the Greater Caucasus, planted with Saperavi and Rkatsiteli almost to the horizon. Hilltop towns like Sighnaghi look out over all of it.",
      "Visits here are less about ticking off sights than about sitting down. A cellar visit becomes lunch; lunch becomes a supra; the supra acquires a toastmaster and, at some point, singing.",
    ],
    heroImage: "/images/destinations/kakheti-1.jpg",
    coverImage: "/images/destinations/kakheti-2.jpg",
    gallery: [
      { src: "/images/destinations/kakheti-1.jpg", alt: "A rainbow over the vineyards of the Alazani valley" },
      { src: "/images/experiences/wine-tasting.jpg", alt: "The barrel cellar of a Kakhetian winery" },
      { src: "/images/culture/wine.jpg", alt: "A glass of amber Georgian wine" },
      { src: "/images/culture/market.jpg", alt: "A roadside produce market in Kakheti" },
    ],
    idealFor: ["Wine", "Food", "Slow travel", "Couples"],
    attractions: [
      {
        name: "Sighnaghi",
        description:
          "A walled hill town with a near-complete eighteenth-century rampart and views across the whole Alazani valley.",
      },
      {
        name: "Alaverdi Cathedral",
        description: "An eleventh-century cathedral in open vineyard country, with a working monastic winery.",
      },
      {
        name: "Tsinandali Estate",
        description:
          "The nineteenth-century home and garden of Alexander Chavchavadze, who bottled Georgia's first European-style wine.",
      },
      {
        name: "Bodbe Monastery",
        description: "The burial place of St Nino, who brought Christianity to Georgia, set among tall cypresses.",
      },
    ],
    travelInfo: {
      bestTime: "September–October for the rtveli harvest; May–June for green valleys and fewer visitors.",
      gettingThere: "Around 2 hours from Tbilisi to Sighnaghi by road.",
      gettingAround: "A driver is strongly recommended — the point of Kakheti is the tasting.",
      language: "Georgian. Most family wineries have at least one English speaker.",
    },
    featured: true,
  },
  {
    id: "dest-batumi",
    slug: "batumi",
    name: "Batumi",
    region: "Adjara",
    tagline: "Black Sea light, palm trees and architectural swagger",
    summary:
      "A subtropical port city where belle époque facades, glass towers and a pebble beach share the same boulevard.",
    description: [
      "Batumi is Georgia's least Georgian-looking city, and it enjoys that. Humid, subtropical and built along seven kilometres of Black Sea shoreline, it mixes restored belle époque merchant houses with skyscrapers that appear to have been designed on a dare.",
      "The seaside boulevard is the spine of the place — cycle lanes, fountains, sculpture and cafés running the whole length of the beach. Behind it, the old town is quieter than you expect, with squares built for shade.",
      "Inland, Adjara changes character entirely: steep green valleys, arched stone bridges, and villages where the local food leans on cheese, butter and cornmeal in a way the rest of Georgia finds slightly excessive.",
    ],
    heroImage: "/images/destinations/batumi-1.jpg",
    coverImage: "/images/destinations/batumi-2.jpg",
    gallery: [
      { src: "/images/destinations/batumi-1.jpg", alt: "The seaside boulevard along Batumi's Black Sea shore" },
      { src: "/images/destinations/batumi-2.jpg", alt: "Batumi's skyline rising behind the beach" },
      { src: "/images/home/inspiration-3.jpg", alt: "Sunset over the Black Sea coast" },
      { src: "/images/hotels/property-10.jpg", alt: "A seaside resort building on the Adjaran coast" },
    ],
    idealFor: ["Beach and city", "Summer travel", "Nightlife", "Families"],
    attractions: [
      {
        name: "Batumi Boulevard",
        description: "Seven kilometres of promenade, gardens and cafés running the length of the beach.",
      },
      {
        name: "Batumi Botanical Garden",
        description:
          "A hundred hectares of subtropical planting on a headland north of the city, with sea views throughout.",
      },
      {
        name: "Piazza & the old town",
        description: "A mosaic-lined square and the quieter merchant streets around it.",
      },
      {
        name: "Makhuntseti waterfall & arched bridge",
        description: "An easy inland trip to a medieval stone bridge and a swimmable waterfall.",
      },
    ],
    travelInfo: {
      bestTime: "June–September for swimming. May and October are warm, green and much quieter.",
      gettingThere: "Batumi International Airport, or 5–6 hours by road / fast train from Tbilisi.",
      gettingAround: "The boulevard is flat and bike-friendly; the centre is walkable.",
      language: "Georgian, with Turkish and Russian widely understood in the port area.",
    },
    featured: false,
  },
  {
    id: "dest-mtskheta",
    slug: "mtskheta",
    name: "Mtskheta",
    region: "Mtskheta-Mtianeti",
    tagline: "Where Georgia became Georgia",
    summary:
      "The ancient capital at the meeting of two rivers, and the spiritual centre of the country since the fourth century.",
    description: [
      "Twenty minutes from Tbilisi, at the confluence of the Mtkvari and Aragvi rivers, Mtskheta was the capital of the kingdom of Iberia for around eight hundred years. It is where Georgia adopted Christianity in 337, and it remains the seat of the Georgian Orthodox Church.",
      "Svetitskhoveli Cathedral dominates the town — an eleventh-century structure built over a fourth-century church, over the spot where, according to tradition, Christ's robe is buried. On the ridge opposite stands Jvari, a sixth-century monastery whose silhouette appears on half the postcards in the country.",
      "It is small, and it is busy with tour buses by eleven. Arrive early, or stay until the late afternoon light comes through the cathedral windows.",
    ],
    heroImage: "/images/destinations/mtskheta-1.jpg",
    coverImage: "/images/destinations/mtskheta-2.jpg",
    gallery: [
      { src: "/images/destinations/mtskheta-1.jpg", alt: "Jvari Monastery on the ridge above Mtskheta" },
      { src: "/images/destinations/mtskheta-2.jpg", alt: "Svetitskhoveli Cathedral in the old capital" },
      { src: "/images/tours/uplistsikhe.jpg", alt: "Rock-cut chambers of the Uplistsikhe cave town" },
      { src: "/images/about/heritage.jpg", alt: "A Georgian church set against mountain pasture" },
    ],
    idealFor: ["Day trips", "History", "Architecture", "First-time visitors"],
    attractions: [
      {
        name: "Svetitskhoveli Cathedral",
        description:
          "The eleventh-century cathedral at the centre of Georgian Orthodoxy, and a UNESCO World Heritage site.",
      },
      {
        name: "Jvari Monastery",
        description:
          "A sixth-century church on the ridge above the river confluence, and the classic view over the old capital.",
      },
      {
        name: "Samtavro Monastery",
        description: "A working convent with a fourth-century chapel and the graves of King Mirian and Queen Nana.",
      },
      {
        name: "Uplistsikhe",
        description:
          "An hour further west — a cave city carved into a sandstone ridge, inhabited from the first millennium BC.",
      },
    ],
    travelInfo: {
      bestTime: "Year round. Spring and autumn have the best light and the smallest crowds.",
      gettingThere: "25 minutes by car from Tbilisi, often combined with Jvari and Uplistsikhe in one day.",
      gettingAround: "The town centre is small and entirely walkable; Jvari needs a car.",
      language: "Georgian. Shoulders and knees should be covered inside churches.",
    },
    featured: false,
  },
  {
    id: "dest-borjomi",
    slug: "borjomi",
    name: "Borjomi",
    region: "Samtskhe-Javakheti",
    tagline: "Mineral springs under a canopy of spruce",
    summary:
      "A nineteenth-century spa town wrapped in one of Europe's largest protected forests.",
    description: [
      "Borjomi built its reputation on water — a naturally carbonated mineral spring that the Romanov family bottled, drank and made famous across the empire. The green-glass bottle is still one of Georgia's most recognisable exports.",
      "The town sits in a narrow gorge of the Mtkvari, and the central park runs straight up it: bathhouses, a funicular, and a spring you can drink from directly. Most visitors are surprised by how warm the water is, and by the taste.",
      "The real scale is beyond the town. Borjomi-Kharagauli National Park covers more than 85,000 hectares of spruce and beech forest, with marked multi-day trails and backcountry huts — genuinely wild country, two and a half hours from the capital.",
    ],
    heroImage: "/images/destinations/borjomi-1.jpg",
    coverImage: "/images/destinations/borjomi-2.jpg",
    gallery: [
      { src: "/images/destinations/borjomi-1.jpg", alt: "Forested ridges of Borjomi-Kharagauli National Park" },
      { src: "/images/destinations/borjomi-2.jpg", alt: "The mineral water park in central Borjomi" },
      { src: "/images/hotels/property-4.jpg", alt: "A spa bathhouse interior" },
      { src: "/images/about/landscape.jpg", alt: "Fog lying across Georgian hill country" },
    ],
    idealFor: ["Spa and wellness", "Forest walking", "Families", "Cool summer air"],
    attractions: [
      {
        name: "Borjomi Central Park",
        description: "The mineral spring, bathhouses and funicular at the head of the gorge.",
      },
      {
        name: "Borjomi-Kharagauli National Park",
        description:
          "85,000 hectares of protected forest with waymarked trails from two hours to six days.",
      },
      {
        name: "Timotesubani Monastery",
        description: "A twelfth-century brick church with unusually intact medieval frescoes.",
      },
      {
        name: "Rabati Castle, Akhaltsikhe",
        description: "An hour west — a heavily restored fortress complex mixing Georgian, Ottoman and Jewish quarters.",
      },
    ],
    travelInfo: {
      bestTime: "May–October for hiking; the town is a cool retreat through July and August.",
      gettingThere: "About 2.5 hours from Tbilisi by road, or a scenic train to Borjomi Parki station.",
      gettingAround: "The town is walkable. National park entry is via the visitor centre in Likani.",
      language: "Georgian, with Russian common in the spa hotels.",
    },
    featured: false,
  },
  {
    id: "dest-gudauri",
    slug: "gudauri",
    name: "Gudauri",
    region: "Mtskheta-Mtianeti",
    tagline: "Powder above the Cross Pass",
    summary:
      "Georgia's principal ski resort — treeless, high-altitude bowls at 2,200 metres, two hours from Tbilisi.",
    description: [
      "Gudauri sits on a south-facing plateau just below the Jvari Pass, at the top of the Georgian Military Road. There are no trees, which means there is very little to stop you: wide open bowls, long groomed runs and freeride terrain that has quietly built a serious reputation.",
      "The season usually runs December to April, with reliable snow and lift prices that still surprise visitors from the Alps. Heli-skiing operates out of the resort, and the ridgelines above the top station open into big backcountry descents.",
      "Out of season it changes completely — paragliding, alpine meadows, and one of the strangest and best viewpoints in the country at the Russia–Georgia Friendship Monument, a concrete drum of Soviet mosaic hanging over a 300-metre drop.",
    ],
    heroImage: "/images/destinations/gudauri-1.jpg",
    coverImage: "/images/destinations/gudauri-2.jpg",
    gallery: [
      { src: "/images/destinations/gudauri-1.jpg", alt: "Ski slopes above the Gudauri plateau" },
      { src: "/images/destinations/gudauri-2.jpg", alt: "The Georgian Military Road climbing towards the Cross Pass" },
      { src: "/images/experiences/paragliding.jpg", alt: "A paraglider launching above the Gudauri valley" },
      { src: "/images/home/cta.jpg", alt: "The Caucasus range seen from the Georgian Military Road" },
    ],
    idealFor: ["Skiing and snowboarding", "Freeride", "Paragliding", "Winter escapes"],
    attractions: [
      {
        name: "Gudauri ski area",
        description: "Around 70 km of marked piste across treeless bowls, with lifts to 3,270 m.",
      },
      {
        name: "Russia–Georgia Friendship Monument",
        description:
          "A 1983 mosaic rotunda cantilevered over the Devil's Valley, with one of the country's great views.",
      },
      {
        name: "Paragliding over the plateau",
        description: "Tandem flights from the ridge above the resort, running from spring through autumn.",
      },
      {
        name: "Ananuri Fortress",
        description: "On the drive up — a seventeenth-century castle and church above the Zhinvali reservoir.",
      },
    ],
    travelInfo: {
      bestTime: "December–April for snow; June–September for paragliding and alpine walking.",
      gettingThere: "Roughly 2 hours from Tbilisi. Winter transfers should use a 4x4 with winter tyres.",
      gettingAround: "The resort is compact; ski-in access from most hotels along the plateau road.",
      language: "Georgian, with English and Russian standard across the ski schools.",
    },
    featured: false,
  },
];

export function getDestinationBySlug(slug: string): Destination | undefined {
  return destinations.find((destination) => destination.slug === slug);
}

export const featuredDestinations = destinations.filter((destination) => destination.featured);
