import type { UiDictionary } from "./en";

/**
 * Hebrew (עברית) UI dictionary.
 *
 * Hebrew is the only right-to-left locale in the set. The direction itself is
 * handled by `dir="rtl"` on <html> plus logical CSS properties — nothing in
 * this file needs directional markup. Latin brand names and email addresses
 * stay in Latin script and are bidi-isolated at the component level.
 */
export const he: UiDictionary = {
  meta: {
    tagline: "לגלות את גאורגיה מעבר לרגיל",
    description:
      "סטודיו נסיעות גאורגי שמתכנן טיולים פרטיים, מסעות הרים, דרכי יין ולינה ברחבי הקווקז.",
  },

  nav: {
    tours: "טיולים",
    destinations: "יעדים",
    hotels: "מלונות",
    transfers: "הסעות",
    experiences: "חוויות",
    about: "עלינו",
    contact: "צור קשר",
    planTrip: "לתכנן טיול",
    descriptions: {
      tours: "מסעות רב-יומיים ברחבי הקווקז",
      destinations: "אזורים, ערים ועמקי הרים",
      hotels: "מקומות שלנו עצמנו ישַנּו בהם",
      transfers: "רכבים פרטיים ושאטלים משותפים",
      experiences: "יין, אוכל, מלאכה והרפתקה",
      about: "הסטודיו שמאחורי המסעות",
    },
    groups: {
      explore: "לגלות",
      company: "החברה",
      follow: "עקבו אחרינו",
    },
  },

  actions: {
    planYourTrip: "לתכנן את הטיול",
    exploreTours: "לגלות טיולים",
    browseDestinations: "לעיין ביעדים",
    allTours: "כל הטיולים",
    allHotels: "כל המלונות",
    allExperiences: "כל החוויות",
    allDestinations: "כל היעדים",
    learnMore: "מידע נוסף",
    viewDetails: "לפרטים",
    viewHotel: "לצפייה במלון",
    reserve: "להזמנה",
    request: "לשליחת בקשה",
    sendEnquiry: "לשליחת פנייה",
    sendAnother: "לשלוח פנייה נוספת",
    browseTours: "לעיין בטיולים",
    exploreExperiences: "לגלות חוויות",
    clearFilters: "לנקות מסננים",
    clearSearch: "לנקות חיפוש",
    search: "חיפוש",
    share: "שיתוף",
    save: "שמירה",
    saved: "נשמר",
    subscribe: "להרשמה",
    backHome: "חזרה לדף הבית",
    seeAll: "לראות הכול",
    cancel: "ביטול",
    close: "סגירה",
    done: "סיום",
    tryAgain: "לנסות שוב",
    select: "לבחור",
    change: "לשנות",
    clearAll: "לנקות הכול",
    filters: "מסננים",
    sortBy: "מיון לפי",
    askQuestion: "לשאול שאלה",
    talkToPlanner: "לדבר עם מתכנן מסלולים",
    planCustomTrip: "לתכנן טיול בהתאמה אישית",
    askUs: "לשאול אותנו",
    askUsToFindOne: "בקשו מאיתנו למצוא",
    continue: "להמשיך",
  },

  common: {
    home: "דף הבית",
    from: "החל מ-",
    total: "סה״כ",
    any: "הכול",
    all: "הכול",
    everything: "הכול",
    flexible: "גמיש",
    included: "כלול",
    perPerson: "לאדם",
    perNight: "ללילה",
    perNightShort: "/ לילה",
    approx: "כ-{value}",
    hourShort: " שע׳",
    minuteShort: " דק׳",
    prototypeNotice:
      "זהו אב-טיפוס פרונט-אנד. לא נוצרת הזמנה, לא נגבה תשלום ודבר אינו נשמר.",
  },

  units: {
    traveller: { one: "מטייל", two: "מטיילים", other: "מטיילים" },
    guest: { one: "אורח", two: "אורחים", other: "אורחים" },
    night: { one: "לילה", two: "לילות", other: "לילות" },
    day: { one: "יום", two: "ימים", other: "ימים" },
    room: { one: "חדר", two: "חדרים", other: "חדרים" },
    property: { one: "נכס", two: "נכסים", other: "נכסים" },
    journey: { one: "מסע", two: "מסעות", other: "מסעות" },
    experience: { one: "חוויה", two: "חוויות", other: "חוויות" },
    transfer: { one: "הסעה", two: "הסעות", other: "הסעות" },
    passenger: { one: "נוסע", two: "נוסעים", other: "נוסעים" },
    adult: { one: "מבוגר", two: "מבוגרים", other: "מבוגרים" },
    child: { one: "ילד", two: "ילדים", other: "ילדים" },
    largeBag: { one: "מזוודה גדולה", two: "מזוודות גדולות", other: "מזוודות גדולות" },
    cabinBag: { one: "תיק יד", two: "תיקי יד", other: "תיקי יד" },
    bag: { one: "תיק", two: "תיקים", other: "תיקים" },
    review: { one: "ביקורת", two: "ביקורות", other: "ביקורות" },
    result: { one: "תוצאה", two: "תוצאות", other: "תוצאות" },
  },

  a11y: {
    breadcrumb: "נתיב ניווט",
    primaryNav: "ניווט ראשי",
    mobileNav: "ניווט נייד",
    openMenu: "פתיחת התפריט",
    closeMenu: "סגירת התפריט",
    closeDialog: "סגירת החלון",
    closeGallery: "סגירת הגלריה",
    previousImage: "התמונה הקודמת",
    nextImage: "התמונה הבאה",
    changeLanguage: "החלפת שפה",
    skipToContent: "דילוג לתוכן",
    scroll: "גלילה",
    ratedOutOf: "דירוג {value} מתוך 5",
    fromReviews: "מתוך {count} ביקורות",
    starProperty: "מלון {count} כוכבים",
    to: "—",
    fewer: "פחות {item}",
    more: "יותר {item}",
    removeTraveller: "להסיר מטייל",
    addTraveller: "להוסיף מטייל",
    removeGuest: "להסיר אורח",
    addGuest: "להוסיף אורח",
    maximumPrice: "מחיר מרבי",
    maximumNightlyPrice: "מחיר מרבי ללילה",
    filterByRegion: "סינון לפי אזור",
    sortTours: "מיון טיולים",
    propertySections: "מדורי הנכס",
  },

  home: {
    hero: {
      eyebrow: "גאורגיה · הקווקז",
      title: "לגלות את גאורגיה מעבר לרגיל",
      body: "מסעות הרים, כרמים בני שמונת אלפים שנה ושולחן שלא מתרוקן לעולם — מתוכננים בידי מי שגדל כאן.",
      imageAlt: "אגם קרחוני מתחת לפסגות הקווקז הגדול",
    },
    statement: {
      eyebrow: "מי אנחנו",
      title:
        "מדינה בגודל אירלנד, עם שלושה אזורי אקלים, שפה שאיש אחר אינו דובר, והיין העתיק בעולם.",
      body: "‏I'am Georgia הוא סטודיו נסיעות בטביליסי. אנחנו מתכננים מסעות פרטיים לאנשים שמעדיפים להבין מקום ולא לצלם אותו — ועושים זאת עם מדריכים, נהגים וייננים שאנחנו מכירים שנים.",
    },
    destinations: {
      eyebrow: "לאן לנסוע",
      title: "אזורים ששווים את הדרך",
      description:
        "שמונה מקומות שמכסים יחד קרחונים, כרמים, את הים השחור ובירה שמסרבת להגדרה.",
    },
    tours: {
      eyebrow: "מסעות החתימה שלנו",
      title: "טיולים שהיינו יוצאים אליהם בעצמנו",
      description:
        "קבוצות קטנות, מדריכים מקומיים ומסלולים שיש בהם מספיק מרווח כדי לשנות את דעתכם.",
    },
    culture: {
      eyebrow: "השולחן הגאורגי",
      title: "אורחים הם מתנה מאלוהים. יזכירו לכם את זה תוך כדי מזיגה נוספת.",
      body1:
        "סוּפְּרָה אינה ארוחת ערב. זו צורה — עם תמדה, סדר וכללים לגבי מתי מותר לשתות ומתי פשוט צריך להקשיב. ההרמה הראשונה תמיד לשלום. האחרונה תמיד לאלה שכבר אינם ליד השולחן.",
      body2:
        "אי-שם באמצע מתחילה שירה פוליפונית בשלושה קולות — מסורת עתיקה מן האלף-בית הגאורגי, שאונסק\"ו הכניסה לרשימת המורשת ב-2001. איש אינו מבצע אותה עבורכם. פשוט מצפים שתצטרפו, גם אם בצורה גרועה.",
      quote: "אין לנו מילה ל‑״זר״ שאינה אומרת גם ״אורח״.",
      quoteAttribution: "נינו קוורצחליה — המדריכה הראשית שלנו בקחתי",
      storyImageAlt: "אור בוקר על הכפר ההררי אומאלו עילית בטושתי",
      strip: {
        khachapuri: "חצ'פורי אדג'רי טרי מהתנור",
        wine: "כוס יין גאורגי ענברי מכוֶוורי",
        dance: "ריקוד גאורגי מסורתי בתלבושות",
        craft: "עבודת אמייל גאורגית",
      },
    },
    hotels: {
      eyebrow: "איפה לישון",
      title: "מקומות שאנחנו ישַנּו בהם",
      description: "בכל מלון כאן ביקרנו בעצמנו, ואף אחד מהם אינו משלם כדי להופיע ברשימה.",
    },
    experiences: {
      eyebrow: "מה לעשות",
      title: "חצי יום שמשנה את הטיול",
      description:
        "חוויות קצרות וממוקדות, בהנחיית אנשים שזו פרנסתם ולא מופע לתיירים.",
    },
    why: {
      eyebrow: "למה איתנו",
      title: "סטודיו קטן — מתוך בחירה",
      body: "אנחנו מפעילים פחות מסעות ממה שיכולנו, כי החלופה היא לעשות אותם פחות טוב.",
      reasons: [
        {
          title: "אנחנו חיים כאן",
          description:
            "הסטודיו בטביליסי והמדריכים גאורגים. כשהכביש במעבר ההרים נסגר, אנחנו יודעים לפני החדשות.",
        },
        {
          title: "שום דבר אינו ממומן",
          description:
            "אף מלון, יקב או מסעדה אינם משלמים כדי להיכלל במסלול. אם אנחנו ממליצים, זה משום שאנחנו מגיעים לשם.",
        },
        {
          title: "קטן בכוונה",
          description:
            "הקבוצות מוגבלות לשמונה, ורוב המסעות פרטיים. הכפרים בסוונטי ובטושתי לא נבנו לאוטובוסים.",
        },
        {
          title: "מתוכנן סביבכם",
          description:
            "כל מסלול מתחיל בשיחה. אמרו לנו שאתם מעדיפים ללכת ברגל ולא לנסוע, וכל הצורה משתנה.",
        },
      ],
    },
    journal: {
      eyebrow: "יומן",
      title: "לפני שמזמינים משהו",
      description: "רשימות מהסטודיו על עיתוי, מסלולים והדברים ששווה להתווכח עליהם.",
      items: [
        {
          tag: "תכנון",
          title: "מתי לבקר בגאורגיה",
          excerpt:
            "למה סוף ספטמבר הוא השבועיים הטובים בשנה, ואילו שבועיים באוגוסט כדאי להימנע מהם.",
          alt: "טביליסי בשקיעה",
        },
        {
          tag: "אזורים",
          title: "שאלת סוונטי",
          excerpt:
            "לטוס או לנסוע? ארבעה ימים או שבעה? מה שמדריכי הטיולים ממעיטים לספר על הדרך מעבר לרכס.",
          alt: "רכס סוונטי מתחת לעננים",
        },
        {
          tag: "יין",
          title: "קורס קצר בכוורי",
          excerpt:
            "יין ענברי, חרס קבור בקרקע ושמונת אלפים שנה של עשייה בדרך הקשה.",
          alt: "שקיעה מעל חוף הים השחור",
        },
      ],
    },
    cta: {
      eyebrow: "נתחיל בשיחה",
      title: "ספרו לנו איזה סוג מטיילים אתם. את השאר נעשה אנחנו.",
      body: "כל מסע מתחיל בשיחה קצרה והרבה שאלות. התכנון ללא עלות וללא התחייבות להזמין.",
    },
  },

  footer: {
    dispatches: "עדכונים",
    newsletterBody:
      "רשימות מדי פעם על לאן לנסוע בגאורגיה ומתי. לא יותר מפעם בחודש.",
    emailPlaceholder: "your@email.com",
    newsletterThanks: "תודה — נהיה בקשר.",
    newsletterError: "נא להזין כתובת אימייל תקינה.",
    rights: "‏© {year} {name}. אב-טיפוס לעיצוב פרונט-אנד.",
  },

  studio: {
    address: "רחוב ארקלה השני 12, טביליסי העתיקה, 0105, גאורגיה",
    hours: "ב׳–ש׳ · 09:00–19:00 (GMT+4)",
    credentials: [
      { value: "11 שנים", label: "מתכננים מסעות בגאורגיה" },
      { value: "‎4,800+", label: "מטיילים שאירחנו" },
      { value: "38", label: "מדריכים ונהגים מקומיים" },
      { value: "4.9/5", label: "דירוג ממוצע של מטיילים" },
    ],
  },

  tours: {
    metaTitle: "טיולים",
    metaDescription:
      "מסעות רב-יומיים וטיולי יום ברחבי גאורגיה — מסלולי הרים בקזבגי ובסוונטי, דרכי יין בקחתי וערי מערות בדרום.",
    heroEyebrow: "מסעות",
    heroTitle: "טיולים ברחבי גאורגיה והקווקז",
    heroDescription:
      "עשרה מסלולים שאנחנו מפעילים בעצמנו, מיום אחד בטביליסי ועד שישה ימים מעבר לרכס הראשי.",
    heroImageAlt: "מגדלי הגרניט של מסיב צ'אוחי מעל ג'וטה",
    spotlightEyebrow: "מסע העונה",
    spotlightTitle: "שלושה ימים למרגלות הר קזבק",
    spotlightDescription:
      "המסלול המבוקש ביותר שלנו — וזה שהמדריכים מתווכחים מי יוביל אותו.",
    overview: "סקירה",
    about: "על המסע הזה",
    itinerary: "מסלול יומי",
    included: "מה כלול",
    excluded: "מה אינו כלול",
    importantInfo: "מידע חשוב",
    meetingPoint: "נקודת מפגש",
    highlights: "עיקרי הדברים",
    day: "יום {n}",
    mealsIncluded: "ארוחות כלולות",
    overnight: "לינה",
    meals: "ארוחות",
    mealNames: {
      breakfast: "ארוחת בוקר",
      lunch: "ארוחת צהריים",
      dinner: "ארוחת ערב",
    },
    itineraryLabel: "מסלול",
    accommodation: "לינה",
    difficulty: "רמת קושי",
    duration: "משך",
    groupSize: "גודל הקבוצה",
    region: "אזור",
    from: "החל מ-",
    perPerson: "לאדם",
    relatedEyebrow: "אולי יתאים לכם גם",
    relatedTitle: "מסעות קרובים",
    planThisTour: "לתכנן את הטיול הזה",
    notFound: "הטיול לא נמצא",
    searchLabel: "חיפוש טיולים",
    searchPlaceholder: "חיפוש לפי שם, אזור או תחום עניין",
    filterType: "סוג",
    filterLength: "אורך",
    allRegions: "כל האזורים",
    matchingFilters: "שתואמים את המסננים",
    emptyTitle: "אין מסעות שתואמים את השילוב הזה",
    emptyBody:
      "אפשר להרחיב את האורך או האזור — או לספר לנו מה חשבתם, ואנחנו נבנה את זה.",
    sort: {
      recommended: "ההמלצות שלנו",
      priceLow: "מחיר (מהנמוך לגבוה)",
      priceHigh: "מחיר (מהגבוה לנמוך)",
      duration: "משך (מהקצר לארוך)",
    },
    planning: {
      preferredStart: "תאריך התחלה מועדף",
      travellers: "מטיילים",
      planningFee: "תכנון ואישורים",
      estimatedTotal: "סה״כ משוער",
      requestJourney: "לבקש את המסע הזה",
      noPayment: "בשלב זה לא נגבה תשלום. מתכנן מסלולים ישיב בתוך יום עסקים אחד.",
      rowJourney: "מסע",
      rowDuration: "משך",
      rowStart: "התחלה מועדפת",
      rowTravellers: "מטיילים",
      sendRequest: "לשלוח בקשה",
    },
    categories: {
      adventure: "הרפתקה",
      culture: "תרבות",
      wine: "יין",
      nature: "טבע",
      city: "עיר",
    },
    difficulties: {
      Easy: "קל",
      Moderate: "בינוני",
      Challenging: "מאתגר",
    },
    durations: {
      "1": "טיול יום",
      "2-3": "2–3 ימים",
      "4-6": "4–6 ימים",
      "7": "7+ ימים",
    },
  },

  hotels: {
    metaTitle: "מלונות",
    metaDescription:
      "בתי בוטיק, אכסניות הרים, אחוזות יין ומלונות חוף ברחבי גאורגיה — בכל נכס ביקר הצוות שלנו.",
    heroEyebrow: "איפה לישון",
    heroTitle: "מקומות שהיינו מזמינים לעצמנו",
    heroDescription:
      "תשעה נכסים ברחבי גאורגיה. בלי מיקום בתשלום, ובלי מקומות שלא ישַנּו בהם.",
    heroImageAlt: "הכניסה המוארת של מלון בוטיק בשעת דמדומים",
    overview: "סקירה",
    about: "על הנכס הזה",
    amenities: "שירותים",
    facilities: "מתקנים",
    location: "מיקום",
    rooms: "חדרים",
    reviews: "ביקורות",
    guestReviews: "ביקורות אורחים",
    policies: "מדיניות",
    whatsNearby: "מה בסביבה",
    guestScore: "ציון אורחים",
    reviewsCount: "{count} ביקורות",
    stayed: "שהות ב-{date}",
    fromPerNight: "החל מ-{price} ללילה",
    perNight: "ללילה",
    perNightInclTaxes: "ללילה, כולל מסים",
    selectRoom: "לבחירת חדר",
    seeRooms: "לצפייה בחדרים",
    roomTypesAvailable: "{count} סוגי חדרים זמינים. המחירים הם להמחשה וכוללים מסים.",
    breakfastIncluded: "ארוחת בוקר כלולה",
    breakfastSupplement: "ארוחת בוקר בתוספת תשלום",
    maxGuests: "עד {count} אורחים",
    guestsCount: "{count} אורחים",
    roomSize: "{size} מ״ר",
    checkIn: "כניסה",
    checkOut: "יציאה",
    cancellation: "ביטול",
    children: "ילדים",
    childrenAndBeds: "ילדים ומיטות",
    pets: "בעלי חיים",
    payment: "תשלום",
    houseRules: "כללי הבית",
    mapPlaceholder: "מפה אינטראקטיבית אינה נכללת באב-טיפוס זה.",
    relatedEyebrow: "נכסים נוספים",
    relatedTitle: "אולי תרצו לשקול גם",
    notFound: "הנכס לא נמצא",
    searchDestination: "יעד",
    searchAnywhere: "כל מקום בגאורגיה",
    guestsAndRooms: "אורחים וחדרים",
    guestsLabel: "אורחים",
    roomsLabel: "חדרים",
    inDestination: "ב{name}",
    emptyTitle: "אין נכסים שתואמים את המסננים",
    emptyBody:
      "אפשר להרחיב את התקציב או להסיר מתקן — יש לנו תשעה נכסים בסך הכול, וכל אחד מהם שווה מבט.",
    showProperties: "להציג {count}",
    filters: {
      propertyType: "סוג הנכס",
      guestScore: "ציון אורחים",
      nightlyBudget: "תקציב ללילה",
      facilities: "מתקנים",
      upTo: "עד",
      anyScore: "כל ציון",
      veryGood: "טוב מאוד · 8+",
      exceptional: "יוצא דופן · 9+",
    },
    sort: {
      recommended: "ההמלצות שלנו",
      priceLow: "מחיר (מהנמוך לגבוה)",
      priceHigh: "מחיר (מהגבוה לנמוך)",
      rating: "דירוג אורחים",
    },
    booking: {
      serviceCharge: "דמי שירות",
      notChargedNow: "לא ייגבה מכם תשלום כעת.",
      confirmStay: "אישור השהות",
      rowProperty: "נכס",
      rowRoom: "חדר",
      rowNights: "לילות",
      rowGuests: "אורחים",
      rowBeds: "מיטות",
      rowMaxGuests: "מספר אורחים מרבי",
      rowCancellation: "ביטול",
      reserveRoom: "להזמין את החדר הזה",
      requestRoom: "לבקש את החדר הזה",
    },
    propertyTypes: {
      Hotel: "מלון",
      Boutique: "בוטיק",
      Resort: "אתר נופש",
      Guesthouse: "בית הארחה",
      Lodge: "אכסניית הרים",
    },
    amenityLabels: {
      wifi: "‏Wi-Fi חינם",
      breakfast: "ארוחת בוקר כלולה",
      pool: "בריכת שחייה",
      parking: "חניה חינם",
      restaurant: "מסעדה",
      spa: "ספא ובריאות",
      airConditioning: "מיזוג אוויר",
      gym: "חדר כושר",
      bar: "בר וטרקלין",
      petFriendly: "מתאים לבעלי חיים",
      familyRooms: "חדרים משפחתיים",
      airportShuttle: "הסעה משדה התעופה",
      terrace: "מרפסת",
      roomService: "שירות חדרים",
    },
    scoreLabels: {
      exceptional: "יוצא דופן",
      excellent: "מצוין",
      veryGood: "טוב מאוד",
      good: "טוב",
      pleasant: "נעים",
    },
  },

  destinations: {
    metaTitle: "יעדים",
    metaDescription:
      "טביליסי, קזבגי, סוונטי, קחתי, בטומי, מצחתה, בורז'ומי וגודאורי — אזורי גאורגיה ששווה לבנות סביבם מסע.",
    heroEyebrow: "לאן לנסוע",
    heroTitle: "שמונה אזורים, שלושה אקלימים, מדינה קטנה אחת",
    heroDescription:
      "מהים השחור עד רכס בגובה 5,000 מטר יש חמש שעות נסיעה. כך בוחרים.",
    heroImageAlt: "מגדלי ההגנה מאבן באושגולי למרגלות הר שכרה",
    moreEyebrow: "גם אלה שווים את הזמן",
    moreTitle: "עוד ארבעה מקומות לבנות סביבם טיול",
    moreDescription: "עצירות קצרות, והאזורים שמצדיקים ביקור שני בגאורגיה.",
    aboutTitle: "על {name}",
    attractionsTitle: "אתרים ב{name}",
    attractionsEyebrow: "מה לראות",
    galleryEyebrow: "גלריה",
    galleryTitle: "{name} בתמונות",
    idealFor: "מתאים במיוחד ל",
    travelInfo: "מידע לנסיעה",
    bestTime: "הזמן הטוב ביותר",
    gettingThere: "איך מגיעים",
    gettingAround: "איך מתניידים",
    language: "שפה",
    toursHere: "טיולים ב{name}",
    hotelsHere: "איפה לישון ב{name}",
    experiencesHere: "חוויות ב{name}",
    keepExploring: "להמשיך לגלות",
    otherRegions: "אזורים אחרים בגאורגיה",
    heroImageAltNamed: "{name}, גאורגיה",
    notFound: "היעד לא נמצא",
  },

  experiences: {
    metaTitle: "חוויות",
    metaDescription:
      "טעימות יין מכוורי, סדנאות חינקלי, מרחצאות גופרית, שירה פוליפונית ומצנחי רחיפה מעל הקווקז — חוויות קצרות ברחבי גאורגיה.",
    heroEyebrow: "מה לעשות",
    heroTitle: "חצאי הימים שנחרתים הכי הרבה זמן",
    heroDescription:
      "יין, אוכל, מלאכה, הרים ומוזיקה — בהנחיית אנשים שזו פרנסתם, לא מופע.",
    heroImageAlt: "שולחן סופרה גאורגי ערוך במנות",
    theExperience: "החוויה",
    whatToExpect: "למה לצפות",
    included: "מה כלול",
    highlights: "עיקרי הדברים",
    duration: "משך",
    groupSize: "גודל הקבוצה",
    location: "מיקום",
    from: "החל מ-",
    perPerson: "לאדם",
    pricePerPerson: "{price} לאדם",
    bookThis: "לבקש את החוויה הזו",
    preferredDate: "תאריך מועדף",
    guests: "אורחים",
    noPayment: "בשלב זה לא נגבה תשלום.",
    relatedEyebrow: "עוד דברים לעשות",
    relatedTitle: "חוויות נוספות",
    emptyTitle: "אין עדיין דבר בקטגוריה הזו",
    emptyBody:
      "אנחנו מוסיפים חוויות כשאנחנו מוצאים כאלה ששוות המלצה. בינתיים, ספרו לנו מה אתם מחפשים.",
    showEverything: "להציג הכול",
    notFound: "החוויה לא נמצאה",
    rowExperience: "חוויה",
    rowLocation: "מיקום",
    rowDuration: "משך",
    rowDate: "תאריך מועדף",
    rowGuests: "אורחים",
    categories: {
      wine: "יין",
      food: "אוכל",
      adventure: "הרפתקה",
      culture: "תרבות",
      wellness: "בריאות",
      craft: "מלאכה",
    },
  },

  transfers: {
    metaTitle: "הסעות",
    metaDescription:
      "רכבים פרטיים, מיניוואנים ושאטלים משותפים בין שדות תעופה, ערים ומלונות בגאורגיה — בהזמנה מראש, עם נהג בשמו ומחיר קבוע.",

    hero: {
      eyebrow: "איך מתניידים",
      title: "הסעות פרטיות ברחבי גאורגיה",
      description:
        "שדות תעופה, ערים וכפרי הרים. נהג בשמו ומחיר קבוע, מוסכם עוד לפני הנסיעה.",
      imageAlt: "הכביש הצבאי הגאורגי מטפס לעבר מעבר הצלב",
    },

    intro: {
      eyebrow: "בהזמנה מראש",
      title: "למה כדאי לסדר את זה לפני הנחיתה",
      description:
        "שיא הנחיתות בטביליסי הוא בין חצות לארבע לפנות בוקר. המחיר שינקבו לכם בשעה הזו ליד המדרכה אינו המחיר שהייתם מקבלים בצהריים.",
    },

    trust: [
      {
        title: "ספקים מאומתים",
        body: "לכל מפעיל ברשימה יש רישיון גאורגי להסעת נוסעים וביטוח שראינו במו עינינו.",
      },
      {
        title: "נהג בשמו",
        body: "את שם הנהג, תמונתו ומספר הרישוי של הרכב תקבלו בערב שלפני האיסוף.",
      },
      {
        title: "ביטול חינם",
        body: "את רוב ההסעות אפשר לבטל ללא עלות עד 24 שעות לפני האיסוף.",
      },
      {
        title: "יש למי להתקשר",
        body: "מספר בטביליסי שעונה מסביב לשעון כל עוד אתם נוסעים איתנו.",
      },
    ],

    routes: {
      eyebrow: "מסלולים מבוקשים",
      title: "הנסיעות שאנחנו מבצעים הכי הרבה",
      description:
        "המחירים הם ל-Comfort Sedan עם שני נוסעים, וכוללים אגרות דרך, חניה וזמן המתנה.",
      notes: {
        "tbs-airport>tbilisi": "עשרים דקות עד העיר",
        "tbs-airport>batumi": "לחצות את המדינה ביום אחד",
        "tbs-airport>gudauri": "היישר אל השלג",
        "kut-airport>batumi": "הנחיתה של טיסות הלואו-קוסט",
        "tbilisi>stepantsminda": "במעלה הכביש הצבאי",
        "tbilisi>sighnaghi": "אל ארץ היין",
      },
    },

    fleet: {
      eyebrow: "הצי",
      title: "לבחור את הרכב, לא את ההפתעה",
      description:
        "כל דרגה מציינת בדיוק כמה אנשים וכמה מזוודות היא נושאת. אתם מזמינים דרגה; הרכב המדויק מאושר בערב שלפני, יחד עם שם הנהג.",
      upTo: "עד {count}",
    },

    how: {
      title: "איך הסעה עובדת",
      body: "ארבעה שלבים, ורק אחד מהם קורה ביום עצמו — להיכנס לרכב.",
      steps: [
        {
          title: "ספרו לנו על הנסיעה",
          body: "נקודת איסוף, יעד, תאריך, שעה וכמה אתם עם כמה מזוודות.",
        },
        {
          title: "בחרו רכב",
          body: "כל דרגה שיכולה לשאת את הקבוצה שלכם, מתומחרת למסלול המדויק שלכם. בלי הערכות שמשתנות אחר כך.",
        },
        {
          title: "אשרו את הפרטים",
          body: "הנוסע הראשי, מספר טלפון, והטיסה שלכם אם אתם נוחתים. בשלב זה לא נגבה דבר.",
        },
        {
          title: "פגשו את הנהג",
          body: "את שם הנהג, תמונתו ומספר הרישוי תקבלו בערב שלפני. בשדה התעופה הוא ממתין באולם הנוסעים עם שלט.",
        },
      ],
      disclaimer:
        "ההסעות הן אב-טיפוס פרונט-אנד. המחירים, הספקים והזמינות המוצגים כאן הם להמחשה, ולא נוצרת הזמנה.",
    },

    search: {
      formLabel: "חיפוש הסעה",
      typeLegend: "סוג ההסעה",
      oneWay: "כיוון אחד",
      return: "הלוך ושוב",
      pickUp: "איסוף",
      dropOff: "הורדה",
      pickUpPlaceholder: "שדה תעופה, עיר או מלון",
      dropOffPlaceholder: "לאן אתם נוסעים?",
      swap: "החלפה בין נקודת האיסוף לנקודת ההורדה",
      date: "תאריך",
      time: "שעת איסוף",
      returnDate: "תאריך חזרה",
      returnTime: "שעת איסוף בחזרה",
      passengersLuggage: "נוסעים וכבודה",
      submit: "חיפוש הסעות",
      update: "עדכון החיפוש",
      errorSummary: "נותרו {count} פרטים שדורשים את תשומת לבכם.",
    },

    errors: {
      from: "בחרו מהיכן לאסוף אתכם.",
      to: "בחרו לאן אתם נוסעים.",
      samePlace: "נקודת האיסוף וההורדה אינן יכולות להיות אותו מקום.",
      date: "בחרו תאריך נסיעה.",
      time: "בחרו שעת איסוף.",
      returnDate: "בחרו תאריך חזרה.",
      returnBeforeOutbound: "החזרה אינה יכולה להיות לפני נסיעת ההלוך.",
      returnTime: "בחרו שעת איסוף לחזרה.",
      noAdults: "לפחות מבוגר אחד חייב לנסוע.",
      tooManyPassengers: "לקבוצות מעל 40 איש, דברו איתנו ישירות.",
    },

    locationPicker: {
      searchPlaceholder: "שדה תעופה, עיר, מלון או כתובת",
      searchLabel: "חיפוש מקומות: {field}",
      noResults: "אין תוצאות עבור ״{query}״. נסו עיר, או את קוד שדה התעופה.",
      note: "רשימת מקומות של אב-טיפוס. מוצר אמיתי היה מחפש כתובות אמיתיות.",
      groups: {
        airport: "שדות תעופה",
        city: "ערים ועיירות",
        hotel: "מלונות",
        landmark: "יעדים מבוקשים",
      },
    },

    passengers: {
      adults: "מבוגרים",
      adultsHint: "מגיל 12 ומעלה",
      children: "ילדים",
      childrenHint: "מושב בטיחות חינם לפי בקשה",
      luggage: "מזוודות גדולות",
      luggageHint: "מזוודות לתא המטען",
      cabinBags: "תיקי יד",
      cabinBagsHint: "על הברכיים או לרגליים",
    },

    steps: {
      navLabel: "התקדמות ההזמנה",
      completed: "הושלם",
      search: "חיפוש",
      choose: "בחירת רכב",
      details: "הפרטים שלכם",
      confirmed: "אושר",
    },

    vehicleClasses: {
      sedan: "סדאן",
      suv: "רכב שטח",
      minivan: "מיניוואן",
      van: "ואן",
      bus: "אוטובוס",
    },

    features: {
      airConditioning: "מיזוג אוויר",
      wifi: "‏Wi-Fi ברכב",
      childSeat: "מושב בטיחות לילד",
      englishDriver: "נהג דובר אנגלית",
      meetGreet: "קבלת פנים עם שלט",
      flightTracking: "מעקב אחר הטיסה",
      bottledWater: "מים בבקבוקים",
      freeWaiting: "זמן המתנה ללא תשלום",
    },

    kinds: {
      private: "פרטית",
      shared: "משותפת",
      privateTransfer: "הסעה פרטית",
      sharedTransfer: "הסעה משותפת",
    },

    filters: {
      vehicleType: "סוג הרכב",
      passengerCapacity: "מספר נוסעים",
      transferType: "סוג ההסעה",
      price: "מחיר",
      upTo: "עד",
      features: "מאפיינים",
      providerRating: "דירוג הספק",
      anyRating: "כל דירוג",
      outstanding: "4.5+ · מצוין",
      veryGood: "4.0+ · טוב מאוד",
    },

    sort: {
      recommended: "ההמלצות שלנו",
      priceLow: "מחיר (מהנמוך לגבוה)",
      rating: "דירוג הספק",
      duration: "ההסעה המהירה ביותר",
    },

    results: {
      metaTitle: "הסעות זמינות",
      metaDescription: "השוו רכבים פרטיים, מיניוואנים ושאטלים משותפים לנסיעה שלכם.",
      title: "הסעות זמינות",
      searching: "מחפשים רכבים זמינים…",
      availableFor: "זמינות לנסיעה שלכם",
      show: "להציג {count}",
      noJourneyTitle: "ספרו לנו לאן אתם נוסעים",
      noJourneyBody:
        "בחרו נקודת איסוף ויעד, ואנחנו נתמחר כל רכב שיכול לבצע את הנסיעה.",
      emptyTitle: "לא נמצאו הסעות",
      emptyCapacity:
        "אף רכב במסלול הזה אינו יכול לשאת כל כך הרבה נוסעים ומזוודות. הקטינו את הקבוצה, או בקשו מאיתנו לארגן שיירה.",
      emptyFilters:
        "שום דבר לא תואם את המסננים. הרחיבו את התקציב או ותרו על דרישה, והאפשרויות יחזרו.",
      changeSearch: "לשנות את החיפוש",
    },

    card: {
      selected: "ההסעה שנבחרה",
      upToPassengers: "עד {count}",
      verified: "מאומת",
      fromPerPerson: "החל מ-, לאדם",
      forYourParty: "{price} לקבוצה שלכם",
      bothJourneys: "שני הכיוונים",
      allTaxes: "כל המסים והאגרות",
    },

    journeyBar: {
      pickUpFallback: "איסוף",
      dropOffFallback: "הורדה",
      returnLabel: "חזרה",
      changeSearch: "לשנות את החיפוש",
      close: "סגירה",
    },

    gallery: {
      pickUp: "איסוף: {name}",
      destination: "יעד: {name}",
    },

    detail: {
      metaTitle: "{name} — הסעה",
      notFound: "ההסעה לא נמצאה",
      titleRoute: "הסעה {kind} — {from} ← {to}",
      titleFallback: "{name} — הסעה {kind}",
      kindPrivate: "פרטית",
      kindShared: "משותפת",
      kindPrivateLower: "פרטית",
      kindSharedLower: "משותפת",
      yearsOperating: "{count} שנים של פעילות בגאורגיה",
      keyInformation: "מידע עיקרי",
      pickUp: "איסוף",
      destination: "יעד",
      journeyTime: "זמן נסיעה",
      distance: "מרחק",
      vehicle: "רכב",
      passengers: "נוסעים",
      luggage: "כבודה",
      notSelected: "לא נבחר",
      kmByRoad: "{count} ק״מ בכביש",
      upToTravelling: "עד {max} · נוסעים {count}",
      upTo: "עד {max}",
      luggageValue: "{large} מזוודות גדולות · {cabin} תיקי יד",
      about: "על ההסעה הזו",
      onBoard: "ברכב",
      included: "מה כלול",
      excluded: "מה אינו כלול",
      howPickupWorks: "איך מתבצע האיסוף",
      beforeTheDay: "בערב שלפני",
      beforeTheDayBody:
        "בערב שלפני הנסיעה תקבלו את שם הנהג, תמונה, מספר נייד ומספר רישוי של הרכב. אם התוכניות משתנות, השיבו להודעה הזו — הנהג קורא אותה, לא מוקד שירות.",
      cancellation: "ביטול",
      cancellationNote:
        "תנאי הביטול נקבעים על ידי {provider} ומאושרים בכתב בעת ההזמנה.",
      backToResults: "חזרה לתוצאות",
      noPaymentStep: "בשלב זה לא נגבה תשלום.",
      priceThis: "לתמחר את ההסעה הזו",
      priceThisBody:
        "המחיר תלוי במסלול, אז ספרו לנו בין אילו נקודות אתם נוסעים ואנחנו נתמחר את הרכב הזה עבור הנסיעה שלכם.",
      startSearch: "להתחיל חיפוש",
    },

    summary: {
      route: "מסלול",
      pickUp: "איסוף",
      returnPickUp: "איסוף בחזרה",
      journeyTime: "זמן נסיעה",
      passengers: "נוסעים",
      luggage: "כבודה",
      perJourney: "{name}, לנסיעה",
      perPersonLine: "{price} × {passengers}",
      returnJourney: "נסיעת חזרה",
      tollsTaxes: "אגרות, מסים וחניה",
      transferSummary: "סיכום ההסעה",
      yourTransfer: "ההסעה שלכם",
    },

    booking: {
      metaTitle: "פרטי ההסעה שלכם",
      title: "פרטי ההסעה שלכם",
      intro:
        "עוד שלב אחד. ספרו לנו מי נוסע ואיך להשיג אתכם, ואנחנו נשמור את הרכב הזה בזמן שהספק מאשר.",
      breadcrumb: "הפרטים שלכם",
      leadPassenger: "נוסע ראשי",
      leadPassengerBody: "הנהג יוצר קשר עם האדם הזה, והאישור נשלח לכתובת הזו.",
      firstName: "שם פרטי",
      lastName: "שם משפחה",
      email: "אימייל",
      mobile: "מספר נייד",
      mobileHint: "כללו את קידומת המדינה — ייתכן שהנהג יצטרך להתקשר ביום הנסיעה.",
      phonePlaceholder: "‎+995 599 12 45 80",
      required: "(חובה)",
      pickUpSection: "איסוף",
      pickUpLocation: "מקום האיסוף",
      dateAndTime: "תאריך ושעה",
      dropOffLocation: "מקום ההורדה",
      changeNote: "כדי לשנות פרטים אלה, חזרו לדף התוצאות ועדכנו את החיפוש.",
      flightNumber: "מספר טיסה",
      flightPlaceholder: "לדוגמה A9 604",
      flightHint: "לא חובה, אבל כך אנחנו עוקבים אחרי עיכוב ומחזיקים לכם את הנהג.",
      pickupNote: "כתובת מדויקת או הערה על המפגש",
      pickupNotePlaceholder: "שם המלון, מספר הבית, או היכן להמתין",
      requests: "בקשות מיוחדות",
      requestsBody:
        "מושבי בטיחות, עצירות נוספות, כבודה גדולה, כיסא גלגלים — כתבו לנו ונאשר עוד לפני היום.",
      requestsPlaceholder: "כל דבר שכדאי שהנהג יידע מראש…",
      prototypeNote:
        "זהו אב-טיפוס פרונט-אנד. לא נוצרת הזמנה, לא נגבה תשלום, ודבר ממה שתקלידו כאן אינו יוצא מלשונית הדפדפן.",
      errorOne: "נותר פרט אחד שדורש את תשומת לבכם.",
      errorMany: "נותרו {count} פרטים שדורשים את תשומת לבכם.",
      submit: "להמשיך לאישור",
      back: "חזרה לפרטי ההסעה",
      noTransferTitle: "עדיין לא נבחרה הסעה",
      noTransferBody: "בחרו רכב מתוך התוצאות ואנחנו נעביר את הנסיעה שלכם לשלב הזה.",
      searchTransfers: "חיפוש הסעות",
      errors: {
        firstName: "נא לציין את שמו הפרטי של הנוסע הראשי.",
        lastName: "נא לציין את שם המשפחה של הנוסע הראשי.",
        email: "נא להזין כתובת אימייל תקינה.",
        phone: "הנהג זקוק למספר שאפשר להשיג אתכם בו.",
      },
    },

    confirmation: {
      metaTitle: "בקשת ההסעה התקבלה",
      title: "בקשת ההסעה התקבלה",
      thanks: "תודה, {name}. ",
      body: "פרטי ההסעה שלכם נשמרו. {provider} יאשר את הנהג בתוך שעות ספורות, ואת שמו ואת מספר הרישוי של הרכב תקבלו בערב שלפני הנסיעה.",
      reference: "מספר הזמנה",
      copy: "להעתיק את המספר",
      copied: "הועתק",
      copiedAnnounce: "מספר ההזמנה הועתק",
      leadPassenger: "נוסע ראשי",
      name: "שם",
      email: "אימייל",
      mobile: "נייד",
      flight: "טיסה",
      pickupNote: "הערה על האיסוף",
      specialRequests: "בקשות מיוחדות",
      whatNext: "מה קורה עכשיו",
      nextSteps: [
        "הספק מאשר את הרכב ומשבץ נהג.",
        "בערב שלפני תקבלו את שם הנהג, תמונה, מספר נייד ומספר רישוי.",
        "ביום הנסיעה נפגשים כמתואר בהוראות האיסוף. התשלום מסודר מול הספק.",
      ],
      ifChanges: "אם משהו משתנה",
      ifChangesBody: "מסרו את מספר ההזמנה ואנחנו נעביר או נבטל את ההסעה.",
      prototypeNote:
        "זהו אב-טיפוס פרונט-אנד. לא הוזמנה הסעה, לא נשלחה הודעה ולא נגבה תשלום. המספר שלמעלה נוצר בדפדפן שלכם.",
      viewDetails: "לצפייה בפרטי ההסעה",
      backHome: "חזרה לדף הבית",
      nothingTitle: "אין מה לאשר",
      nothingBody:
        "תוקף קישור האישור פג או שהוא חלקי. התחילו חיפוש חדש ואנחנו נלווה אתכם שוב.",
    },

    error: {
      title: "משהו השתבש באיתור ההסעה שלכם",
      body: "החיפוש לא חזר. שום דבר לא הוזמן ולא נגבה — נסו שוב, או התחילו חיפוש חדש.",
      reference: "מזהה: {digest}",
      newSearch: "להתחיל חיפוש חדש",
    },
  },

  about: {
    metaTitle: "עלינו",
    metaDescription:
      "‏I'am Georgia הוא סטודיו נסיעות בטביליסי שמתכנן מסעות פרטיים ברחבי הקווקז, בהובלת מדריכים, נהגים וייננים גאורגים.",
    heroEyebrow: "משנת {year}",
    heroTitle: "אנחנו אלה שלא הפסיקו להגיד לכם לבוא",
    heroDescription:
      "סטודיו נסיעות בטביליסי, בניהול גאורגים, למטיילים שרוצים יותר מרשימת האתרים המרכזיים.",
    heroImageAlt: "כנסייה גאורגית ניצבת על מרעה הררי",
    startEyebrow: "איך זה התחיל",
    startTitle:
      "הכול התחיל מפני שחבר מברלין שאל מה יש לעשות בגאורגיה, והתשובה הכנה ארכה ארבע שעות.",
    startBody1:
      "בשנת 2014 היינו שניים: מדריך הרים מקזבגי ועיתונאי לשעבר שלא הצליח להפסיק לכתוב מסלולים לחברים שבאו לבקר. לא היה לנו משרד, הייתה לנו Delica אחת יד שנייה, והייתה לנו הכרה שכל מי שמנסה למכור את המדינה מוכר אותה בזול מדי.",
    startBody2:
      "אחת עשרה שנים אחר כך אנחנו שלושים ושמונה. אנחנו עדיין מתווכחים על מסלולים. ואנחנו עדיין מביאים אנשים לאותה משפחה בקחתי, שמצפה לנו עכשיו בספטמבר ונעלבת אם נאחר.",
    whyEyebrow: "למה גאורגיה",
    whyTitle: "שלושה אזורי אקלים, במרחק חמש שעות",
    whyBody1:
      "אפשר להתחיל את היום על חוף הים השחור בבטומי ולסיים אותו בגובה 2,200 מטר, בכפר של מגדלי אבן שבו השפה נפרדה מגאורגית לפני ארבעת אלפים שנה. מעט מאוד מדינות בגודל הזה מסוגלות לכך.",
    whyBody2:
      "ויש את היין — שמונת אלפים שנה שלו, מתסיס בחרס קבור באדמה; שיטה שאונסק\"ו מגנה עליה והגאורגים פשוט קוראים לה יום שלישי.",
    whyBody3:
      "ויש את השולחן. הכנסת האורחים הגאורגית אינה תקן שירות. היא מאפיין מבני של התרבות, והיא תתיש אתכם בדרך הטובה ביותר.",
    whyImageAlt: "ערפל שוכב על גבעות ערוץ חאדה",
    valuesEyebrow: "במה אנחנו דבקים",
    valuesTitle: "ארבעה דברים שאיננו מתפשרים עליהם",
    values: [
      {
        title: "מקומיים תחילה, תמיד",
        description:
          "כל מדריך, נהג וטבח שאנחנו עובדים איתם הוא גאורגי וחי באזור שדרכו הוא מוביל אתכם. רק כך הסיפורים הם ממקור ראשון.",
      },
      {
        title: "אנחנו יודעים לומר לא",
        description:
          "אם מקום אינו מתאים לכם, נאמר לכם — גם כשזה בדיוק מה שכולם מוכרים. שנים עשר אנשים על כביש בטושתי אינם חופשה.",
      },
      {
        title: "שום דבר אינו ממומן",
        description:
          "אף מלון או יקב אינם משלמים כדי להיכלל במסלול. ההמלצות שלנו שוות בדיוק כמו העצמאות שלנו.",
      },
      {
        title: "להשאיר כפי שמצאנו",
        description:
          "קבוצות קטנות, בתי הארחה מקומיים, וכסף שנשאר בעמקים שאנחנו מבקרים בהם. הרים אינם מתאוששים מהר מפופולריות.",
      },
    ],
    peopleEyebrow: "האנשים",
    peopleTitle: "שלושים ושמונה מדריכים, נהגים, טבחים ומשרד אחד סבלני מאוד",
    peopleDescription:
      "המדריכים שלנו הם מטפסים, סומלייה, ארכיאולוגים וילדים של רועים. אחדים מהם הם כל הארבעה.",
    peopleImageAlts: [
      "מדריכים צועדים בשביל הררי",
      "רועה מוביל עדר בהרים הגבוהים",
      "אנסמבל פוליפוני גאורגי",
    ],
    ctaTitle: "בואו להתווכח איתנו על המקום שאליו כדאי לכם לנסוע.",
    ctaBody:
      "ספרו לנו כמה זמן יש לכם, מה אתם אוהבים לאכול והאם אתם מעדיפים ללכת ברגל או להיסע. אנחנו נחזיר לכם מסלול.",
    ctaBrowse: "לעיין בטיולים שלנו",
  },

  contact: {
    metaTitle: "צור קשר",
    metaDescription:
      "דברו עם מתכנן מסלולים ב-I'am Georgia. ספרו לנו כמה זמן יש לכם ומה אתם אוהבים, ואנחנו נחזיר מסלול.",
    eyebrow: "לתכנן את הטיול",
    title: "ספרו לנו איזה סוג מטיילים אתם",
    description:
      "כל מסע מתחיל בכמה שאלות וללא התחייבות. אנחנו משיבים בתוך יום עסקים אחד — באנגלית, גאורגית, רוסית או גרמנית.",
    directTitle: "ליצור קשר ישירות",
    labels: {
      email: "אימייל",
      telephone: "טלפון",
      whatsapp: "WhatsApp",
      studio: "הסטודיו",
      hours: "שעות פעילות",
    },
    follow: "עקבו אחרינו",
    imageAlt: "חזית האריחים של מרחצאות אורבליאני בטביליסי העתיקה, ליד הסטודיו שלנו",
    form: {
      name: "השם שלך",
      email: "אימייל",
      phone: "טלפון",
      travellers: "מטיילים",
      travelDates: "תאריכי נסיעה משוערים",
      whenThinking: "על איזה מועד אתם חושבים?",
      notSureYet: "עדיין לא בטוח",
      groupSize: "כמה נוסעים",
      interests: "מה מעניין אתכם",
      interestsLegend: "מה הכי מעניין אתכם?",
      message: "ספרו לנו על הטיול",
      messageLabel: "ספרו לנו על הטיול שלכם",
      messagePlaceholder:
        "כמה זמן יש לכם, מה אתם אוהבים לאכול, והאם אתם מעדיפים ללכת ברגל או להיסע…",
      required: "*",
      prototypeNote:
        "הטופס הזה הוא חלק מאב-טיפוס פרונט-אנד. שום דבר אינו נשלח, אינו נשלח באימייל ואינו נשמר.",
      errors: {
        name: "נא לציין את שמכם.",
        email: "נא להזין כתובת אימייל תקינה.",
        message: "משפט או שניים על הטיול יעזרו לנו להשיב כמו שצריך.",
      },
      successTitle: "תודה, {name}",
      successBody:
        "במוצר אמיתי הפנייה שלכם הייתה כבר אצל מתכנן מסלולים. כאן זהו סוף אב-הטיפוס — שום דבר לא נשלח ולא נשמר.",
      note: "אנחנו משיבים לכל פנייה בתוך יום עסקים אחד.",
      interestOptions: [
        "הרים וטיולי רגל",
        "יין ואוכל",
        "תרבות והיסטוריה",
        "סקי",
        "הים השחור",
        "צילום",
      ],
      months: [
        "ינואר",
        "פברואר",
        "מרץ",
        "אפריל",
        "מאי",
        "יוני",
        "יולי",
        "אוגוסט",
        "ספטמבר",
        "אוקטובר",
        "נובמבר",
        "דצמבר",
      ],
    },
  },

  requestModal: {
    title: "לדבר עם מתכנן מסלולים",
    subtitle: "ישירות עם הצוות שלנו",
    successTitle: "הבקשה התקבלה",
    successBody:
      "במוצר אמיתי הייתם מקבלים כאן אימייל אישור ומספר סימוכין. כאן זהו סוף אב-הטיפוס.",
  },

  filters: {
    all: "הכול",
    region: "אזור",
    category: "קטגוריה",
    duration: "משך",
    priceRange: "מחיר",
    sortBy: "מיון לפי",
    results: "{count} תוצאות",
    noResultsTitle: "שום דבר לא תואם את המסננים",
    noResultsBody: "אפשר להרחיב את החיפוש, או לנקות את המסננים ולהתחיל מחדש.",
    searchTours: "חיפוש טיולים",
    searchHotels: "חיפוש מלונות",
    searchExperiences: "חיפוש חוויות",
  },

  notFound: {
    metaTitle: "הדף לא נמצא",
    eyebrow: "שגיאה 404",
    title: "הדרך הזו לא מובילה לשום מקום",
    body: "מה שקורה בקווקז לעיתים קרובות יותר מכפי שנדמה. הדף שחיפשתם עבר, או שמעולם לא היה קיים.",
    backHome: "חזרה לדף הבית",
    askUs: "שאלו אותנו לאן לנסוע",
    sections: "מדורי האתר",
  },

  share: {
    copied: "הקישור הועתק",
    pageLink: "קישור לדף",
  },
};
