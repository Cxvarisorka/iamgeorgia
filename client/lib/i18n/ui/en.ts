/**
 * English UI dictionary — the source of truth for the shape of every other
 * language. `UiDictionary` is derived from this object, so adding a key here
 * makes TypeScript demand it in ka, ru and he before the build will pass.
 *
 * Editorial content (tours, hotels, destinations, experiences) is not here —
 * it lives beside the data in `data/i18n/`, keyed by entity id.
 */
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
    experiences: "Experiences",
    about: "About",
    contact: "Contact",
    planTrip: "Plan a trip",
    descriptions: {
      tours: "Multi-day journeys across the Caucasus",
      destinations: "Regions, cities and mountain valleys",
      hotels: "Stays we have slept in ourselves",
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
  },

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
    itinerary: "Itinerary",
    included: "What's included",
    excluded: "Not included",
    importantInfo: "Important information",
    meetingPoint: "Meeting point",
    highlights: "Highlights",
    day: "Day {n}",
    meals: "Meals",
    accommodation: "Accommodation",
    difficulty: "Difficulty",
    duration: "Duration",
    groupSize: "Group size",
    from: "From",
    perPerson: "per person",
    relatedTitle: "Other journeys you might like",
    planThisTour: "Plan this tour",
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
    amenities: "Amenities",
    location: "Location",
    rooms: "Rooms",
    reviews: "Reviews",
    policies: "Policies",
    whatsNearby: "What's nearby",
    guestScore: "Guest score",
    reviewsCount: "{count} reviews",
    stayed: "Stayed {date}",
    fromPerNight: "From {price} per night",
    perNight: "per night",
    selectRoom: "Select room",
    breakfastIncluded: "Breakfast included",
    maxGuests: "Sleeps {count}",
    roomSize: "{size} m²",
    checkIn: "Check-in",
    checkOut: "Check-out",
    cancellation: "Cancellation",
    children: "Children",
    pets: "Pets",
    payment: "Payment",
    houseRules: "House rules",
    mapPlaceholder: "Interactive map not included in this prototype.",
    relatedTitle: "Other places to stay",
    propertyTypes: {
      Hotel: "Hotel",
      Boutique: "Boutique",
      Resort: "Resort",
      Guesthouse: "Guesthouse",
      Lodge: "Lodge",
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
    attractionsTitle: "Attractions in {name}",
    attractionsEyebrow: "What to see",
    idealFor: "Ideal for",
    travelInfo: "Travel information",
    bestTime: "Best time to visit",
    gettingThere: "Getting there",
    gettingAround: "Getting around",
    language: "Language",
    toursHere: "Tours in {name}",
    hotelsHere: "Where to stay in {name}",
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
    whatToExpect: "What to expect",
    included: "What's included",
    highlights: "Highlights",
    duration: "Duration",
    groupSize: "Group size",
    from: "From",
    perPerson: "per person",
    bookThis: "Request this experience",
    relatedTitle: "Other experiences nearby",
    categories: {
      wine: "Wine",
      food: "Food",
      adventure: "Adventure",
      culture: "Culture",
      wellness: "Wellness",
      craft: "Craft",
    },
  },

  about: {
    metaTitle: "About",
    valuesEyebrow: "What we hold to",
    valuesTitle: "Four things we do not compromise on",
  },

  contact: {
    metaTitle: "Contact",
    form: {
      name: "Your name",
      email: "Email",
      phone: "Phone",
      travelDates: "Approximate travel dates",
      groupSize: "How many travelling",
      interests: "What interests you",
      message: "Tell us about the trip",
      required: "*",
      errors: {
        name: "Please tell us your name.",
        email: "Please enter a valid email address.",
        message: "A sentence or two is enough to get started.",
      },
      successTitle: "Thank you, {name}",
      successBody:
        "In a live product your enquiry would now be with a trip planner. Here, it is the end of the prototype flow — nothing was sent or stored.",
      note: "We reply to every enquiry within one working day.",
    },
  },

  requestModal: {
    title: "Talk to a trip planner",
    subtitle: "That's with our team",
    successTitle: "Request received",
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
