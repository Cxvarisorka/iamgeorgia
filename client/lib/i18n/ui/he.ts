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
    experiences: "חוויות",
    about: "עלינו",
    contact: "צור קשר",
    planTrip: "לתכנן טיול",
    descriptions: {
      tours: "מסעות רב-יומיים ברחבי הקווקז",
      destinations: "אזורים, ערים ועמקי הרים",
      hotels: "מקומות שלנו עצמנו ישַנּו בהם",
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
    itinerary: "מסלול יומי",
    included: "מה כלול",
    excluded: "מה אינו כלול",
    importantInfo: "מידע חשוב",
    meetingPoint: "נקודת מפגש",
    highlights: "עיקרי הדברים",
    day: "יום {n}",
    meals: "ארוחות",
    accommodation: "לינה",
    difficulty: "רמת קושי",
    duration: "משך",
    groupSize: "גודל הקבוצה",
    from: "החל מ-",
    perPerson: "לאדם",
    relatedTitle: "מסעות נוספים שעשויים להתאים",
    planThisTour: "לתכנן את הטיול הזה",
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
    amenities: "שירותים",
    location: "מיקום",
    rooms: "חדרים",
    reviews: "ביקורות",
    policies: "מדיניות",
    whatsNearby: "מה בסביבה",
    guestScore: "ציון אורחים",
    reviewsCount: "{count} ביקורות",
    stayed: "שהות ב-{date}",
    fromPerNight: "החל מ-{price} ללילה",
    perNight: "ללילה",
    selectRoom: "לבחירת חדר",
    breakfastIncluded: "ארוחת בוקר כלולה",
    maxGuests: "עד {count} אורחים",
    roomSize: "{size} מ״ר",
    checkIn: "כניסה",
    checkOut: "יציאה",
    cancellation: "ביטול",
    children: "ילדים",
    pets: "בעלי חיים",
    payment: "תשלום",
    houseRules: "כללי הבית",
    mapPlaceholder: "מפה אינטראקטיבית אינה נכללת באב-טיפוס זה.",
    relatedTitle: "מקומות לינה נוספים",
    propertyTypes: {
      Hotel: "מלון",
      Boutique: "בוטיק",
      Resort: "אתר נופש",
      Guesthouse: "בית הארחה",
      Lodge: "אכסניית הרים",
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
    attractionsTitle: "אתרים ב{name}",
    attractionsEyebrow: "מה לראות",
    idealFor: "מתאים במיוחד ל",
    travelInfo: "מידע לנסיעה",
    bestTime: "הזמן הטוב ביותר",
    gettingThere: "איך מגיעים",
    gettingAround: "איך מתניידים",
    language: "שפה",
    toursHere: "טיולים ב{name}",
    hotelsHere: "איפה לישון ב{name}",
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
    whatToExpect: "למה לצפות",
    included: "מה כלול",
    highlights: "עיקרי הדברים",
    duration: "משך",
    groupSize: "גודל הקבוצה",
    from: "החל מ-",
    perPerson: "לאדם",
    bookThis: "לבקש את החוויה הזו",
    relatedTitle: "חוויות נוספות בסביבה",
    categories: {
      wine: "יין",
      food: "אוכל",
      adventure: "הרפתקה",
      culture: "תרבות",
      wellness: "בריאות",
      craft: "מלאכה",
    },
  },

  about: {
    metaTitle: "עלינו",
    valuesEyebrow: "במה אנחנו דבקים",
    valuesTitle: "ארבעה דברים שאיננו מתפשרים עליהם",
  },

  contact: {
    metaTitle: "צור קשר",
    form: {
      name: "השם שלך",
      email: "אימייל",
      phone: "טלפון",
      travelDates: "תאריכי נסיעה משוערים",
      groupSize: "כמה נוסעים",
      interests: "מה מעניין אתכם",
      message: "ספרו לנו על הטיול",
      required: "*",
      errors: {
        name: "נא לציין את שמכם.",
        email: "נא להזין כתובת אימייל תקינה.",
        message: "משפט או שניים מספיקים כדי להתחיל.",
      },
      successTitle: "תודה, {name}",
      successBody:
        "במוצר אמיתי הפנייה שלכם הייתה כבר אצל מתכנן מסלולים. כאן זהו סוף אב-הטיפוס — שום דבר לא נשלח ולא נשמר.",
      note: "אנחנו משיבים לכל פנייה בתוך יום עסקים אחד.",
    },
  },

  requestModal: {
    title: "לדבר עם מתכנן מסלולים",
    subtitle: "ישירות עם הצוות שלנו",
    successTitle: "הבקשה התקבלה",
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
