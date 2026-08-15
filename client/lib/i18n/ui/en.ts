/**
 * English UI dictionary — the source of truth for the shape of every other
 * language. `UiDictionary` is derived from this object, so adding a key here
 * makes TypeScript demand it in ka, ru and he before the build will pass.
 *
 * Editorial content that belongs to an *entity* (a tour, hotel, destination,
 * experience, transfer offer or pick-up point) is not here — it lives in
 * `data/i18n/`, keyed by entity id, and is merged over the English record at
 * read time. Everything in this file is chrome, page copy, or vocabulary that
 * exists once for the whole site.
 *
 * Countable nouns are `PluralForms` rather than plain strings: Russian needs
 * three forms where English needs two, and a `${count} ${noun}s` template
 * cannot express that. See `plural()` in ../plural.ts.
 */

import type { PluralForms } from "../plural";

/** Every countable noun the UI renders with a number in front of it. */
export type UnitKey =
  | "traveller"
  | "guest"
  | "night"
  | "day"
  | "room"
  | "property"
  | "journey"
  | "experience"
  | "transfer"
  | "passenger"
  | "adult"
  | "child"
  | "largeBag"
  | "cabinBag"
  | "bag"
  | "review"
  | "result";

const englishUnits: Record<UnitKey, PluralForms> = {
  traveller: { one: "traveller", other: "travellers" },
  guest: { one: "guest", other: "guests" },
  night: { one: "night", other: "nights" },
  day: { one: "day", other: "days" },
  room: { one: "room", other: "rooms" },
  property: { one: "property", other: "properties" },
  journey: { one: "journey", other: "journeys" },
  experience: { one: "experience", other: "experiences" },
  transfer: { one: "transfer", other: "transfers" },
  passenger: { one: "passenger", other: "passengers" },
  adult: { one: "adult", other: "adults" },
  child: { one: "child", other: "children" },
  largeBag: { one: "large bag", other: "large bags" },
  cabinBag: { one: "cabin bag", other: "cabin bags" },
  bag: { one: "bag", other: "bags" },
  review: { one: "review", other: "reviews" },
  result: { one: "result", other: "results" },
};

export const en = {
  meta: {
    tagline: "Discover Georgia Beyond the Ordinary",
    description:
      "A Georgian travel studio crafting private tours, mountain journeys, wine routes and stays across the Caucasus.",
  },

  nav: {
    tours: "Tours",
    destinations: "Destinations",
    hotels: "Hotels",
    transfers: "Transfers",
    experiences: "Experiences",
    about: "About",
    contact: "Contact",
    planTrip: "Plan a trip",
    descriptions: {
      tours: "Multi-day journeys across the Caucasus",
      destinations: "Regions, cities and mountain valleys",
      hotels: "Stays we have slept in ourselves",
      transfers: "Private cars and shared shuttles",
      experiences: "Wine, food, craft and adventure",
      about: "The studio behind the journeys",
    },
    groups: {
      explore: "Explore",
      company: "Company",
      follow: "Follow",
    },
  },

  actions: {
    planYourTrip: "Plan your trip",
    exploreTours: "Explore tours",
    browseDestinations: "Browse destinations",
    allTours: "All tours",
    allHotels: "All hotels",
    allExperiences: "All experiences",
    allDestinations: "All destinations",
    learnMore: "Learn more",
    viewDetails: "View details",
    viewHotel: "View hotel",
    reserve: "Reserve",
    request: "Request",
    sendEnquiry: "Send enquiry",
    sendAnother: "Send another",
    browseTours: "Browse tours",
    exploreExperiences: "Explore experiences",
    clearFilters: "Clear filters",
    clearSearch: "Clear search",
    search: "Search",
    share: "Share",
    save: "Save",
    saved: "Saved",
    subscribe: "Subscribe",
    backHome: "Back to home",
    seeAll: "See all",
    cancel: "Cancel",
    close: "Close",
    done: "Done",
    tryAgain: "Try again",
    select: "Select",
    change: "Change",
    clearAll: "Clear all",
    filters: "Filters",
    sortBy: "Sort by",
    askQuestion: "Ask a question",
    talkToPlanner: "Talk to a trip planner",
    planCustomTrip: "Plan a custom trip",
    askUs: "Ask us",
    askUsToFindOne: "Ask us to find one",
    continue: "Continue",
  },

  common: {
    home: "Home",
    from: "From",
    total: "Total",
    any: "Any",
    all: "All",
    everything: "Everything",
    flexible: "Flexible",
    included: "Included",
    perPerson: "per person",
    perNight: "per night",
    perNightShort: "/ night",
    approx: "Approx. {value}",
    /**
     * Duration abbreviations, appended straight to the number by
     * `formatDuration` — "5h 35m". A language that sets its abbreviation off
     * from the digits (Russian: 5 ч) carries the space in the string itself.
     */
    hourShort: "h",
    minuteShort: "m",
    prototypeNotice:
      "This is a front-end prototype. No booking is made, no payment is taken and nothing is stored.",
  },

  /**
   * Countable nouns. `plural(locale, count, forms)` picks the right variant
   * through `Intl.PluralRules`, so Russian gets турист / туриста / туристов
   * from the same call site that gets traveller / travellers in English.
   *
   * Typed through `UnitKey` rather than inferred: inference would freeze each
   * entry at the two forms English happens to need, and Russian would then be
   * unable to declare `few` and `many`.
   */
  units: englishUnits,

  a11y: {
    breadcrumb: "Breadcrumb",
    primaryNav: "Primary",
    mobileNav: "Mobile",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    closeDialog: "Close dialog",
    closeGallery: "Close gallery",
    previousImage: "Previous image",
    nextImage: "Next image",
    changeLanguage: "Change language",
    skipToContent: "Skip to content",
    scroll: "Scroll",
    ratedOutOf: "Rated {value} out of 5",
    fromReviews: "from {count} reviews",
    starProperty: "{count}-star property",
    to: "to",
    fewer: "Fewer {item}",
    more: "More {item}",
    removeTraveller: "Remove a traveller",
    addTraveller: "Add a traveller",
    removeGuest: "Remove a guest",
    addGuest: "Add a guest",
    maximumPrice: "Maximum price",
    maximumNightlyPrice: "Maximum nightly price",
    filterByRegion: "Filter by region",
    sortTours: "Sort tours",
    propertySections: "Property sections",
  },

  home: {
    hero: {
      eyebrow: "Georgia · The Caucasus",
      title: "Discover Georgia beyond the ordinary",
      body: "Mountain journeys, eight-thousand-year-old vineyards and a table that never empties — planned by the people who grew up here.",
      imageAlt: "A glacial lake below the peaks of the Greater Caucasus",
    },
    statement: {
      eyebrow: "Who we are",
      title:
        "A country the size of Ireland, with three climate zones, a language nobody else speaks and the oldest wine on earth.",
      body: "I'am Georgia is a travel studio in Tbilisi. We design private journeys for people who would rather understand a place than photograph it — and we do it with guides, drivers and winemakers we have known for years.",
    },
    destinations: {
      eyebrow: "Where to go",
      title: "Regions worth the drive",
      description:
        "Eight places that between them cover glaciers, vineyards, the Black Sea and a capital that resists description.",
    },
    tours: {
      eyebrow: "Signature journeys",
      title: "Tours we would go on ourselves",
      description:
        "Small groups, local guides and itineraries with enough room in them to change your mind.",
    },
    culture: {
      eyebrow: "The Georgian table",
      title:
        "Guests are a gift from God. They will remind you of this while refilling your glass.",
      body1:
        "A supra is not a dinner. It is a form, with a toastmaster, a sequence and rules about when you may drink and when you must simply listen. The first toast is always to peace. The last is always to the people who are no longer at the table.",
      body2:
        "Somewhere in the middle, three-part polyphonic singing starts — a tradition older than the Georgian alphabet, and one that UNESCO added to its heritage list in 2001. Nobody performs it at you. They simply expect you to join in badly.",
      quote: "We do not have a word for stranger that does not also mean guest.",
      quoteAttribution: "Nino Kvaratskhelia — our lead guide in Kakheti",
      storyImageAlt: "Morning light over the highland village of Upper Omalo in Tusheti",
      strip: {
        khachapuri: "Adjarian khachapuri fresh from the oven",
        wine: "A glass of amber Georgian qvevri wine",
        dance: "Traditional Georgian dance in costume",
        craft: "Georgian cloisonné enamel work",
      },
    },
    hotels: {
      eyebrow: "Where to stay",
      title: "Properties we have slept in",
      description: "Every hotel here has been visited, and none of them pay to be listed.",
    },
    experiences: {
      eyebrow: "Things to do",
      title: "Half a day that changes the trip",
      description:
        "Short, specific experiences run by people who do this for a living rather than for visitors.",
    },
    why: {
      eyebrow: "Why travel with us",
      title: "A small studio, deliberately",
      body: "We run fewer journeys than we could, because the alternative is doing them less well.",
      reasons: [
        {
          title: "We live here",
          description:
            "The studio is in Tbilisi and the guides are Georgian. When a road closes over the Cross Pass, we know before the news does.",
        },
        {
          title: "Nothing is commissioned",
          description:
            "No hotel, winery or restaurant pays to appear in an itinerary. If we recommend it, it is because we go there.",
        },
        {
          title: "Small by design",
          description:
            "Groups cap at eight, and most journeys run private. Villages in Svaneti and Tusheti are not built for coaches.",
        },
        {
          title: "Planned around you",
          description:
            "Every itinerary starts as a conversation. Tell us you would rather walk than drive and the whole shape changes.",
        },
      ],
    },
    journal: {
      eyebrow: "Journal",
      title: "Before you book anything",
      description:
        "Notes from the studio on timing, routes and the things worth arguing about.",
      items: [
        {
          tag: "Planning",
          title: "When to visit Georgia",
          excerpt:
            "Why late September is the best fortnight of the year, and the two weeks in August to avoid.",
          alt: "Tbilisi at sunset",
        },
        {
          tag: "Regions",
          title: "The Svaneti question",
          excerpt:
            "Fly or drive? Four days or seven? What the guidebooks understate about getting behind the ridge.",
          alt: "The Svaneti ridge under cloud",
        },
        {
          tag: "Wine",
          title: "A short course in qvevri",
          excerpt:
            "Amber wine, buried clay and eight thousand years of doing it the difficult way.",
          alt: "Sunset over the Black Sea coast",
        },
      ],
    },
    cta: {
      eyebrow: "Start the conversation",
      title: "Tell us what kind of traveller you are. We'll do the rest.",
      body: "Every journey begins with a short call and a lot of questions. There is no cost to planning, and no obligation to book.",
    },
  },

  footer: {
    dispatches: "Dispatches",
    newsletterBody:
      "Occasional notes on where to go in Georgia, and when. No more than once a month.",
    emailPlaceholder: "your@email.com",
    newsletterThanks: "Thank you — we'll be in touch.",
    newsletterError: "Please enter a valid email address.",
    rights: "© {year} {name}. A front-end design prototype.",
  },

  /** Studio contact details. Addresses and opening hours are read, not parsed. */
  studio: {
    address: "12 Erekle II Street, Old Tbilisi, 0105 Georgia",
    hours: "Mon–Sat · 09:00–19:00 (GMT+4)",
    credentials: [
      { value: "11 yrs", label: "Crafting journeys in Georgia" },
      { value: "4,800+", label: "Travellers hosted" },
      { value: "38", label: "Local guides & drivers" },
      { value: "4.9/5", label: "Average traveller rating" },
    ],
  },

  tours: {
    metaTitle: "Tours",
    metaDescription:
      "Multi-day journeys and day trips across Georgia — mountain treks in Kazbegi and Svaneti, wine routes through Kakheti and cave cities in the south.",
    heroEyebrow: "Journeys",
    heroTitle: "Tours across Georgia and the Caucasus",
    heroDescription:
      "Ten routes we run ourselves, from a single day in Tbilisi to six days behind the main ridge.",
    heroImageAlt: "The granite towers of the Chaukhi massif above Juta",
    spotlightEyebrow: "Journey of the season",
    spotlightTitle: "Three days beneath Mount Kazbek",
    spotlightDescription: "Our most requested trek, and the one our guides argue over leading.",
    overview: "Overview",
    about: "About this journey",
    itinerary: "Itinerary",
    included: "What's included",
    excluded: "Not included",
    importantInfo: "Important information",
    meetingPoint: "Meeting point",
    highlights: "Highlights",
    day: "Day {n}",
    mealsIncluded: "Meals included",
    overnight: "Overnight",
    meals: "Meals",
    /** Rendered from the `MealKey`s an itinerary day carries. */
    mealNames: {
      breakfast: "Breakfast",
      lunch: "Lunch",
      dinner: "Dinner",
    },
    /** Accordion label for a day trip, which has no "Day 2" to number. */
    itineraryLabel: "Itinerary",
    accommodation: "Accommodation",
    difficulty: "Difficulty",
    duration: "Duration",
    groupSize: "Group size",
    region: "Region",
    from: "From",
    perPerson: "per person",
    relatedEyebrow: "You may also like",
    relatedTitle: "Related journeys",
    planThisTour: "Plan this tour",
    notFound: "Tour not found",
    searchLabel: "Search tours",
    searchPlaceholder: "Search by name, region or interest",
    filterType: "Type",
    filterLength: "Length",
    allRegions: "All regions",
    matchingFilters: "matching your filters",
    emptyTitle: "No journeys match that combination",
    emptyBody:
      "Try widening the length or region — or tell us what you had in mind and we will build it.",
    sort: {
      recommended: "Our recommendations",
      priceLow: "Price (lowest first)",
      priceHigh: "Price (highest first)",
      duration: "Duration (shortest first)",
    },
    planning: {
      preferredStart: "Preferred start date",
      travellers: "Travellers",
      planningFee: "Trip planning & permits",
      estimatedTotal: "Estimated total",
      requestJourney: "Request this journey",
      noPayment:
        "No payment is taken at this stage. A trip planner replies within one working day.",
      rowJourney: "Journey",
      rowDuration: "Duration",
      rowStart: "Preferred start",
      rowTravellers: "Travellers",
      sendRequest: "Send request",
    },
    categories: {
      adventure: "Adventure",
      culture: "Culture",
      wine: "Wine",
      nature: "Nature",
      city: "City",
    },
    difficulties: {
      Easy: "Easy",
      Moderate: "Moderate",
      Challenging: "Challenging",
    },
    durations: {
      "1": "Day trip",
      "2-3": "2–3 days",
      "4-6": "4–6 days",
      "7": "7+ days",
    },
  },

  hotels: {
    metaTitle: "Hotels",
    metaDescription:
      "Boutique houses, mountain lodges, wine estates and seafront resorts across Georgia — every property visited by our team.",
    heroEyebrow: "Where to stay",
    heroTitle: "Places we would book for ourselves",
    heroDescription:
      "Nine properties across Georgia. No paid placements, no properties we have not slept in.",
    heroImageAlt: "The lit entrance of a boutique property at dusk",
    overview: "Overview",
    about: "About this property",
    amenities: "Amenities",
    facilities: "Facilities",
    location: "Location",
    rooms: "Rooms",
    reviews: "Reviews",
    guestReviews: "Guest reviews",
    policies: "Policies",
    whatsNearby: "What's nearby",
    guestScore: "Guest score",
    reviewsCount: "{count} reviews",
    stayed: "Stayed {date}",
    fromPerNight: "From {price} per night",
    perNight: "per night",
    perNightInclTaxes: "per night, incl. taxes",
    selectRoom: "Select room",
    seeRooms: "See rooms",
    roomTypesAvailable: "{count} room types available. Rates are indicative and include taxes.",
    breakfastIncluded: "Breakfast included",
    breakfastSupplement: "Breakfast available for a supplement",
    maxGuests: "Sleeps {count}",
    guestsCount: "{count} guests",
    roomSize: "{size} m²",
    checkIn: "Check-in",
    checkOut: "Check-out",
    cancellation: "Cancellation",
    children: "Children",
    childrenAndBeds: "Children & beds",
    pets: "Pets",
    payment: "Payment",
    houseRules: "House rules",
    mapPlaceholder: "Interactive map not included in this prototype.",
    relatedEyebrow: "Other properties",
    relatedTitle: "You might also consider",
    notFound: "Property not found",
    searchDestination: "Destination",
    searchAnywhere: "Anywhere in Georgia",
    guestsAndRooms: "Guests & rooms",
    guestsLabel: "Guests",
    roomsLabel: "Rooms",
    inDestination: "in {name}",
    emptyTitle: "No properties match those filters",
    emptyBody:
      "Try widening the budget or removing a facility — we only list nine properties, and every one of them is worth a look.",
    showProperties: "Show {count}",
    filters: {
      propertyType: "Property type",
      guestScore: "Guest score",
      nightlyBudget: "Nightly budget",
      facilities: "Facilities",
      upTo: "Up to",
      anyScore: "Any score",
      veryGood: "Very good · 8+",
      exceptional: "Exceptional · 9+",
    },
    sort: {
      recommended: "Our recommendations",
      priceLow: "Price (lowest first)",
      priceHigh: "Price (highest first)",
      rating: "Guest rating",
    },
    booking: {
      serviceCharge: "Service charge",
      notChargedNow: "You will not be charged now.",
      confirmStay: "Confirm your stay",
      rowProperty: "Property",
      rowRoom: "Room",
      rowNights: "Nights",
      rowGuests: "Guests",
      rowBeds: "Beds",
      rowMaxGuests: "Maximum guests",
      rowCancellation: "Cancellation",
      reserveRoom: "Reserve this room",
      requestRoom: "Request this room",
    },
    propertyTypes: {
      Hotel: "Hotel",
      Boutique: "Boutique",
      Resort: "Resort",
      Guesthouse: "Guesthouse",
      Lodge: "Lodge",
    },
    amenityLabels: {
      wifi: "Free Wi-Fi",
      breakfast: "Breakfast included",
      pool: "Swimming pool",
      parking: "Free parking",
      restaurant: "Restaurant",
      spa: "Spa & wellness",
      airConditioning: "Air conditioning",
      gym: "Fitness centre",
      bar: "Bar & lounge",
      petFriendly: "Pet friendly",
      familyRooms: "Family rooms",
      airportShuttle: "Airport shuttle",
      terrace: "Terrace",
      roomService: "Room service",
    },
    scoreLabels: {
      exceptional: "Exceptional",
      excellent: "Excellent",
      veryGood: "Very good",
      good: "Good",
      pleasant: "Pleasant",
    },
  },

  destinations: {
    metaTitle: "Destinations",
    metaDescription:
      "Tbilisi, Kazbegi, Svaneti, Kakheti, Batumi, Mtskheta, Borjomi and Gudauri — the regions of Georgia worth building a journey around.",
    heroEyebrow: "Where to go",
    heroTitle: "Eight regions, three climates, one small country",
    heroDescription:
      "From the Black Sea to a 5,000-metre ridge is a five-hour drive. Here is how to choose.",
    heroImageAlt: "Stone defence towers of Ushguli beneath Mount Shkhara",
    moreEyebrow: "Also worth your time",
    moreTitle: "Four more places to build a trip around",
    moreDescription: "Shorter stops, and the regions that reward a second visit to Georgia.",
    aboutTitle: "About {name}",
    attractionsTitle: "Attractions in {name}",
    attractionsEyebrow: "What to see",
    galleryEyebrow: "Gallery",
    galleryTitle: "{name} in pictures",
    idealFor: "Ideal for",
    travelInfo: "Travel information",
    bestTime: "Best time to visit",
    gettingThere: "Getting there",
    gettingAround: "Getting around",
    language: "Language",
    toursHere: "Tours in {name}",
    hotelsHere: "Where to stay in {name}",
    experiencesHere: "Experiences in {name}",
    keepExploring: "Keep exploring",
    otherRegions: "Other regions of Georgia",
    heroImageAltNamed: "{name}, Georgia",
    notFound: "Destination not found",
  },

  experiences: {
    metaTitle: "Experiences",
    metaDescription:
      "Qvevri wine tastings, khinkali classes, sulphur baths, polyphonic singing and paragliding over the Caucasus — short experiences across Georgia.",
    heroEyebrow: "Things to do",
    heroTitle: "The half-days people remember longest",
    heroDescription:
      "Wine, food, craft, mountains and music — run by people who do this for a living, not for visitors.",
    heroImageAlt: "A Georgian supra table laid with dishes",
    theExperience: "The experience",
    whatToExpect: "What to expect",
    included: "What's included",
    highlights: "Highlights",
    duration: "Duration",
    groupSize: "Group size",
    location: "Location",
    from: "From",
    perPerson: "per person",
    pricePerPerson: "{price} pp",
    bookThis: "Request this experience",
    preferredDate: "Preferred date",
    guests: "Guests",
    noPayment: "No payment is taken at this stage.",
    relatedEyebrow: "More to do",
    relatedTitle: "Other experiences",
    emptyTitle: "Nothing in that category yet",
    emptyBody:
      "We add experiences as we find ones worth recommending. Tell us what you are after in the meantime.",
    showEverything: "Show everything",
    notFound: "Experience not found",
    rowExperience: "Experience",
    rowLocation: "Location",
    rowDuration: "Duration",
    rowDate: "Preferred date",
    rowGuests: "Guests",
    categories: {
      wine: "Wine",
      food: "Food",
      adventure: "Adventure",
      culture: "Culture",
      wellness: "Wellness",
      craft: "Craft",
    },
  },

  transfers: {
    metaTitle: "Transfers",
    metaDescription:
      "Private cars, minivans and shared shuttles between Georgian airports, cities and hotels — booked in advance, with a named driver and a fixed price.",

    hero: {
      eyebrow: "Getting around",
      title: "Private transfers across Georgia",
      description:
        "Airports, cities and mountain villages. A named driver and a fixed price, agreed before you travel.",
      imageAlt: "The Georgian Military Road climbing towards the Cross Pass",
    },

    intro: {
      eyebrow: "Booked ahead",
      title: "Why arrange it before you land",
      description:
        "Tbilisi arrivals peak between midnight and four in the morning. The kerbside price at that hour is not the price you would have been quoted at noon.",
    },

    trust: [
      {
        title: "Checked providers",
        body: "Every operator listed here holds a Georgian passenger licence and insurance we have seen.",
      },
      {
        title: "Named driver",
        body: "You get the driver's name, photo and vehicle registration the evening before pick-up.",
      },
      {
        title: "Free cancellation",
        body: "Most transfers can be cancelled up to 24 hours before pick-up at no cost.",
      },
      {
        title: "Someone to call",
        body: "A Tbilisi number answered around the clock while you are travelling with us.",
      },
    ],

    routes: {
      eyebrow: "Popular routes",
      title: "The journeys we drive most",
      description:
        "Prices are for a Comfort Sedan carrying two passengers, and include tolls, parking and waiting time.",
      /** Keyed `fromId>toId`, so a route note travels with the pair it describes. */
      notes: {
        "tbs-airport>tbilisi": "The 20-minute run into town",
        "tbs-airport>batumi": "Cross the country in a day",
        "tbs-airport>gudauri": "Straight to the snow",
        "kut-airport>batumi": "The budget-airline arrival",
        "tbilisi>stepantsminda": "Up the Military Road",
        "tbilisi>sighnaghi": "Into the wine country",
      },
    },

    fleet: {
      eyebrow: "The fleet",
      title: "Choose the vehicle, not the surprise",
      description:
        "Every class states exactly how many people and bags it takes. You book the class; the exact car is confirmed the evening before with the driver's name.",
      upTo: "Up to {count}",
    },

    how: {
      title: "How a transfer works",
      body: "Four steps, and the only one that happens on the day is getting in the car.",
      steps: [
        {
          title: "Tell us the journey",
          body: "Pick-up, destination, date, time and how many of you are travelling with how much luggage.",
        },
        {
          title: "Choose a vehicle",
          body: "Every class that can carry your party, priced for your exact route. No estimates that change later.",
        },
        {
          title: "Confirm the details",
          body: "Lead passenger, a phone number, and your flight if you are arriving. Nothing is charged at this stage.",
        },
        {
          title: "Meet your driver",
          body: "You get the driver's name, photo and registration the evening before. At an airport they meet you in arrivals with a name board.",
        },
      ],
      disclaimer:
        "Transfers are a front-end prototype. Prices, providers and availability shown here are illustrative, and no booking is placed.",
    },

    search: {
      formLabel: "Transfer search",
      typeLegend: "Transfer type",
      oneWay: "One way",
      return: "Return",
      pickUp: "Pick-up",
      dropOff: "Drop-off",
      pickUpPlaceholder: "Airport, city or hotel",
      dropOffPlaceholder: "Where are you going?",
      swap: "Swap pick-up and drop-off",
      date: "Date",
      time: "Pick-up time",
      returnDate: "Return date",
      returnTime: "Return pick-up time",
      passengersLuggage: "Passengers & luggage",
      submit: "Search transfers",
      update: "Update search",
      errorSummary: "{count} details still need your attention.",
    },

    errors: {
      from: "Choose where we should collect you.",
      to: "Choose where you are going.",
      samePlace: "Pick-up and drop-off cannot be the same place.",
      date: "Choose a travel date.",
      time: "Choose a pick-up time.",
      returnDate: "Choose a return date.",
      returnBeforeOutbound: "The return cannot be before the outbound journey.",
      returnTime: "Choose a return pick-up time.",
      noAdults: "At least one adult must travel.",
      tooManyPassengers: "For parties over 40, talk to us directly.",
    },

    locationPicker: {
      searchPlaceholder: "Airport, city, hotel or address",
      searchLabel: "Search {field} locations",
      noResults: "Nothing matches “{query}”. Try a city, or the airport code.",
      note: "Prototype location list. A live product would search real addresses.",
      groups: {
        airport: "Airports",
        city: "Cities & towns",
        hotel: "Hotels",
        landmark: "Popular destinations",
      },
    },

    passengers: {
      adults: "Adults",
      adultsHint: "12 and over",
      children: "Children",
      childrenHint: "Child seats free on request",
      luggage: "Large bags",
      luggageHint: "Checked suitcases",
      cabinBags: "Cabin bags",
      cabinBagsHint: "Carried on your lap or at your feet",
    },

    steps: {
      navLabel: "Booking progress",
      completed: "completed",
      search: "Search",
      choose: "Choose a vehicle",
      details: "Your details",
      confirmed: "Confirmed",
    },

    vehicleClasses: {
      sedan: "Sedan",
      suv: "SUV",
      minivan: "Minivan",
      van: "Van",
      bus: "Bus",
    },

    features: {
      airConditioning: "Air conditioning",
      wifi: "Wi-Fi on board",
      childSeat: "Child seat available",
      englishDriver: "English-speaking driver",
      meetGreet: "Meet & greet",
      flightTracking: "Flight tracking",
      bottledWater: "Bottled water",
      freeWaiting: "Free waiting time",
    },

    kinds: {
      private: "Private",
      shared: "Shared",
      privateTransfer: "Private transfer",
      sharedTransfer: "Shared transfer",
    },

    filters: {
      vehicleType: "Vehicle type",
      passengerCapacity: "Passenger capacity",
      transferType: "Transfer type",
      price: "Price",
      upTo: "Up to",
      features: "Features",
      providerRating: "Provider rating",
      anyRating: "Any rating",
      outstanding: "4.5+ · Outstanding",
      veryGood: "4.0+ · Very good",
    },

    sort: {
      recommended: "Our recommendations",
      priceLow: "Price (lowest first)",
      rating: "Provider rating",
      duration: "Fastest transfer",
    },

    results: {
      metaTitle: "Available transfers",
      metaDescription: "Compare private cars, minivans and shared shuttles for your journey.",
      title: "Available transfers",
      searching: "Searching for available vehicles…",
      availableFor: "available for your journey",
      show: "Show {count}",
      noJourneyTitle: "Tell us where you're going",
      noJourneyBody:
        "Choose a pick-up point and a destination and we'll price every vehicle that can make the journey.",
      emptyTitle: "No transfers found",
      emptyCapacity:
        "No vehicle on this route can take that many passengers and bags. Reduce the party size, or ask us to arrange a convoy.",
      emptyFilters:
        "Nothing matches those filters. Widen the budget or drop a requirement and the options will come back.",
      changeSearch: "Change search",
    },

    card: {
      selected: "Selected transfer",
      upToPassengers: "Up to {count}",
      verified: "Verified",
      fromPerPerson: "From, per person",
      forYourParty: "{price} for your party",
      bothJourneys: "both journeys",
      allTaxes: "all taxes and tolls",
    },

    journeyBar: {
      pickUpFallback: "Pick-up",
      dropOffFallback: "Drop-off",
      returnLabel: "Return",
      changeSearch: "Change search",
      close: "Close",
    },

    gallery: {
      pickUp: "Pick-up: {name}",
      destination: "Destination: {name}",
    },

    detail: {
      metaTitle: "{name} — transfer",
      notFound: "Transfer not found",
      titleRoute: "{kind} transfer — {from} to {to}",
      titleFallback: "{name} — {kind} transfer",
      kindPrivate: "Private",
      kindShared: "Shared",
      kindPrivateLower: "private",
      kindSharedLower: "shared",
      yearsOperating: "{count} years operating in Georgia",
      keyInformation: "Key information",
      pickUp: "Pick-up",
      destination: "Destination",
      journeyTime: "Journey time",
      distance: "Distance",
      vehicle: "Vehicle",
      passengers: "Passengers",
      luggage: "Luggage",
      notSelected: "Not selected",
      kmByRoad: "{count} km by road",
      upToTravelling: "Up to {max} · {count} travelling",
      upTo: "Up to {max}",
      luggageValue: "{large} large bags · {cabin} cabin bags",
      about: "About this transfer",
      onBoard: "On board",
      included: "What's included",
      excluded: "Not included",
      howPickupWorks: "How pick-up works",
      beforeTheDay: "Before the day",
      beforeTheDayBody:
        "The evening before travel you receive the driver's name, photograph, mobile number and vehicle registration. If your plans change, reply to that message — the driver reads it, not a call centre.",
      cancellation: "Cancellation",
      cancellationNote:
        "Cancellation terms are set by {provider} and confirmed in writing when the transfer is booked.",
      backToResults: "Back to results",
      noPaymentStep: "No payment is taken at this step.",
      priceThis: "Price this transfer",
      priceThisBody:
        "Fares depend on the route, so tell us where you are travelling between and we will price this vehicle for your journey.",
      startSearch: "Start a search",
    },

    summary: {
      route: "Route",
      pickUp: "Pick-up",
      returnPickUp: "Return pick-up",
      journeyTime: "Journey time",
      passengers: "Passengers",
      luggage: "Luggage",
      perJourney: "{name}, per journey",
      perPersonLine: "{price} × {passengers}",
      returnJourney: "Return journey",
      tollsTaxes: "Tolls, taxes and parking",
      transferSummary: "Transfer summary",
      yourTransfer: "Your transfer",
    },

    booking: {
      metaTitle: "Your transfer details",
      title: "Your transfer details",
      intro:
        "One more step. Tell us who is travelling and how to reach you, and we will hold this vehicle while the provider confirms.",
      breadcrumb: "Your details",
      leadPassenger: "Lead passenger",
      leadPassengerBody:
        "The driver contacts this person, and the confirmation goes to this address.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      mobile: "Mobile number",
      mobileHint: "Include the country code — the driver may need to call on the day.",
      phonePlaceholder: "+995 599 12 45 80",
      required: "(required)",
      pickUpSection: "Pick-up",
      pickUpLocation: "Pick-up location",
      dateAndTime: "Date and time",
      dropOffLocation: "Drop-off location",
      changeNote: "To change any of these, go back to the results page and update your search.",
      flightNumber: "Flight number",
      flightPlaceholder: "e.g. A9 604",
      flightHint: "Optional, but it is how we track a delay and hold the driver for you.",
      pickupNote: "Exact address or meeting note",
      pickupNotePlaceholder: "Hotel name, street number, or where to wait",
      requests: "Special requests",
      requestsBody:
        "Child seats, extra stops, oversized luggage, a wheelchair — tell us and we will confirm before the day.",
      requestsPlaceholder: "Anything the driver should know in advance…",
      prototypeNote:
        "This is a front-end prototype. No booking is placed, no payment is taken and nothing you type here leaves this browser tab.",
      errorOne: "One detail still needs your attention.",
      errorMany: "{count} details still need your attention.",
      submit: "Continue to confirmation",
      back: "Back to transfer details",
      noTransferTitle: "No transfer chosen yet",
      noTransferBody:
        "Pick a vehicle from the results and we will bring your journey through to this step.",
      searchTransfers: "Search transfers",
      errors: {
        firstName: "Please give the lead passenger's first name.",
        lastName: "Please give the lead passenger's last name.",
        email: "Please enter a valid email address.",
        phone: "The driver needs a number they can reach you on.",
      },
    },

    confirmation: {
      metaTitle: "Transfer request received",
      title: "Transfer request received",
      thanks: "Thank you, {name}. ",
      body: "Your transfer details have been saved. {provider} confirms the driver within a few hours, and you will have their name and vehicle registration the evening before you travel.",
      reference: "Booking reference",
      copy: "Copy reference",
      copied: "Copied",
      copiedAnnounce: "Booking reference copied to clipboard",
      leadPassenger: "Lead passenger",
      name: "Name",
      email: "Email",
      mobile: "Mobile",
      flight: "Flight",
      pickupNote: "Pick-up note",
      specialRequests: "Special requests",
      whatNext: "What happens next",
      nextSteps: [
        "The provider confirms the vehicle and assigns a driver.",
        "The evening before, you get the driver's name, photo, mobile number and registration.",
        "On the day, meet as described in the pick-up instructions. Payment is arranged with the provider.",
      ],
      ifChanges: "If anything changes",
      ifChangesBody: "Quote your reference and we will move or cancel the transfer.",
      prototypeNote:
        "This is a front-end prototype. No transfer has been booked, no message has been sent and no payment has been taken. The reference above was generated in your browser.",
      viewDetails: "View transfer details",
      backHome: "Back to homepage",
      nothingTitle: "Nothing to confirm",
      nothingBody:
        "This confirmation link has expired or is incomplete. Start a new search and we will take you through again.",
    },

    error: {
      title: "Something went wrong finding your transfer",
      body: "The search did not come back. Nothing has been booked and nothing has been charged — try again, or start a fresh search.",
      reference: "Reference: {digest}",
      newSearch: "Start a new search",
    },
  },

  about: {
    metaTitle: "About",
    metaDescription:
      "I'am Georgia is a travel studio in Tbilisi designing private journeys across the Caucasus, run by Georgian guides, drivers and winemakers.",
    heroEyebrow: "Since {year}",
    heroTitle: "We are the people who kept telling you to visit",
    heroDescription:
      "A travel studio in Tbilisi, run by Georgians, for travellers who want more than the highlights.",
    heroImageAlt: "A Georgian church standing on mountain pasture",
    startEyebrow: "How it started",
    startTitle:
      "It began because a friend from Berlin asked what there was to do in Georgia, and the honest answer took four hours.",
    startBody1:
      "In 2014 there were two of us: a mountain guide from Kazbegi and a former journalist who could not stop writing itineraries for visiting friends. We had no office, one second-hand Delica, and a conviction that the country was being undersold by everyone trying to sell it.",
    startBody2:
      "Eleven years later there are thirty-eight of us. We still argue about routes. We still take people to the same family in Kakheti, who now expect us in September and are offended if we are late.",
    whyEyebrow: "Why Georgia",
    whyTitle: "Three climate zones, five hours apart",
    whyBody1:
      "You can start the day on a Black Sea beach in Batumi and finish it at 2,200 metres in a village of stone towers where the language split from Georgian four thousand years ago. Very few countries this size can do that.",
    whyBody2:
      "Then there is the wine — eight thousand years of it, fermented in clay buried in the ground, a method UNESCO protects and Georgians simply call Tuesday.",
    whyBody3:
      "And there is the table. Georgian hospitality is not a service standard. It is a structural feature of the culture, and it will exhaust you in the best way.",
    whyImageAlt: "Fog lying across the hills of the Khada gorge",
    valuesEyebrow: "What we hold to",
    valuesTitle: "Four things we do not compromise on",
    values: [
      {
        title: "Local first, always",
        description:
          "Every guide, driver and cook we work with is Georgian and lives in the region they take you through. It is the only way the stories are first-hand.",
      },
      {
        title: "We say no",
        description:
          "If a place is wrong for you, we will tell you — even when it is the thing everyone else is selling. Twelve people on a Tusheti road is not a holiday.",
      },
      {
        title: "Nothing is commissioned",
        description:
          "No hotel or winery pays to be in an itinerary. Our recommendations are worth exactly as much as our independence.",
      },
      {
        title: "Leave it as we found it",
        description:
          "Small groups, local guesthouses, and money that stays in the valleys we visit. Mountains do not recover quickly from being popular.",
      },
    ],
    peopleEyebrow: "The people",
    peopleTitle: "Thirty-eight guides, drivers, cooks and one very patient office",
    peopleDescription:
      "Our guides are climbers, sommeliers, archaeologists and shepherds' children. Several are all four.",
    peopleImageAlts: [
      "Guides walking a mountain trail",
      "A shepherd moving a flock in the highlands",
      "A Georgian polyphonic ensemble",
    ],
    ctaTitle: "Come and argue with us about where you should go.",
    ctaBody:
      "Tell us how long you have, what you like eating and whether you would rather walk or be driven. We will send back a route.",
    ctaBrowse: "Browse our tours",
  },

  contact: {
    metaTitle: "Contact",
    metaDescription:
      "Talk to a trip planner at I'am Georgia. Tell us how long you have and what you like, and we will send back a route.",
    eyebrow: "Plan your trip",
    title: "Tell us what kind of traveller you are",
    description:
      "Every journey starts with a few questions and no obligation. We reply within one working day, in English, Georgian, Russian or German.",
    directTitle: "Get in touch directly",
    labels: {
      email: "Email",
      telephone: "Telephone",
      whatsapp: "WhatsApp",
      studio: "Studio",
      hours: "Opening hours",
    },
    follow: "Follow",
    imageAlt: "The tiled Orbeliani bathhouse facade in old Tbilisi, near our studio",
    form: {
      name: "Your name",
      email: "Email",
      phone: "Phone",
      travellers: "Travellers",
      travelDates: "Approximate travel dates",
      whenThinking: "When are you thinking?",
      notSureYet: "Not sure yet",
      groupSize: "How many travelling",
      interests: "What interests you",
      interestsLegend: "What are you most interested in?",
      message: "Tell us about the trip",
      messageLabel: "Tell us about your trip",
      messagePlaceholder:
        "How long you have, what you like eating, whether you would rather walk or be driven…",
      required: "*",
      prototypeNote:
        "This form is part of a front-end prototype. Nothing is submitted, emailed or stored.",
      errors: {
        name: "Please tell us your name.",
        email: "Please enter a valid email address.",
        message: "A sentence or two about your trip helps us reply properly.",
      },
      successTitle: "Thank you, {name}",
      successBody:
        "In a live product your enquiry would now be with a trip planner. Here, it is the end of the prototype flow — nothing was sent or stored.",
      note: "We reply to every enquiry within one working day.",
      interestOptions: [
        "Mountains & hiking",
        "Wine & food",
        "Culture & history",
        "Skiing",
        "Black Sea",
        "Photography",
      ],
      months: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
    },
  },

  requestModal: {
    title: "Talk to a trip planner",
    subtitle: "That's with our team",
    successTitle: "Request received",
    successBody:
      "In a live product this is where you would receive a confirmation email and a reference number. Here, it is the end of the prototype flow.",
  },

  filters: {
    all: "All",
    region: "Region",
    category: "Category",
    duration: "Duration",
    priceRange: "Price",
    sortBy: "Sort by",
    results: "{count} results",
    noResultsTitle: "Nothing matches those filters",
    noResultsBody: "Try widening the search, or clear the filters to start again.",
    searchTours: "Search tours",
    searchHotels: "Search hotels",
    searchExperiences: "Search experiences",
  },

  notFound: {
    metaTitle: "Page not found",
    eyebrow: "Error 404",
    title: "This road doesn't go anywhere",
    body: "Which happens more often than you would think in the Caucasus. The page you were looking for has moved, or never existed.",
    backHome: "Back to the homepage",
    askUs: "Ask us where to go",
    sections: "Site sections",
  },

  share: {
    copied: "Link copied to clipboard",
    pageLink: "Page link",
  },
};

/**
 * Every other locale must satisfy this shape.
 *
 * Deliberately not `as const`: literal types would make `UiDictionary` demand
 * the *English words* from every translation rather than just the same keys.
 */
export type UiDictionary = typeof en;
