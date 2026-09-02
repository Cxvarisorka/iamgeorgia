/**
 * Kosher facility names in the three non-default locales.
 *
 * The general amenity vocabulary carries no seeded translations — those are
 * entered from the admin panel one at a time. These are seeded because the
 * whole point of the kosher work is that an Israeli agency reads the property
 * in Hebrew, and shipping twenty-one English strings into a right-to-left page
 * would make the feature look unfinished on the one audience it is built for.
 *
 * Keyed by amenity code, then by locale. A locale left out of an entry simply
 * falls through to the English base row, which is exactly what
 * `serializers/localise.js` does field by field.
 */
export const KOSHER_AMENITY_TRANSLATIONS = {
    // --- Food & kitchen ---------------------------------------------------
    kosherRestaurant: {
        ka: 'ქოშერ რესტორანი',
        ru: 'Кошерный ресторан',
        he: 'מסעדה כשרה'
    },
    kosherKitchen: {
        ka: 'ქოშერ სამზარეულო',
        ru: 'Кошерная кухня',
        he: 'מטבח כשר'
    },
    kosherBreakfast: {
        ka: 'ქოშერ საუზმე',
        ru: 'Кошерный завтрак',
        he: 'ארוחת בוקר כשרה'
    },
    kosherLunch: {
        ka: 'ქოშერ სადილი',
        ru: 'Кошерный обед',
        he: 'ארוחת צהריים כשרה'
    },
    kosherDinner: {
        ka: 'ქოშერ ვახშამი',
        ru: 'Кошерный ужин',
        he: 'ארוחת ערב כשרה'
    },
    separateMeatDairy: {
        ka: 'ხორცისა და რძის ცალკე მომზადება',
        ru: 'Раздельное приготовление мясного и молочного',
        he: 'הפרדת בשרי וחלבי'
    },
    kosherMealOnRequest: {
        ka: 'ქოშერ კვება მოთხოვნით',
        ru: 'Кошерное питание по запросу',
        he: 'ארוחה כשרה לפי בקשה'
    },
    passoverKosher: {
        ka: 'ქოშერ პესახისთვის',
        ru: 'Кошер на Песах',
        he: 'כשר לפסח'
    },
    kosherWine: {
        ka: 'ქოშერ ღვინო',
        ru: 'Кошерное вино',
        he: 'יין כשר'
    },

    // --- Shabbat ----------------------------------------------------------
    shabbatElevator: {
        ka: 'შაბათის ლიფტი',
        ru: 'Шаббатний лифт',
        he: 'מעלית שבת'
    },
    shabbatMeals: {
        ka: 'შაბათის კვება',
        ru: 'Шаббатние трапезы',
        he: 'סעודות שבת'
    },
    manualRoomKeys: {
        ka: 'მექანიკური გასაღებები',
        ru: 'Механические ключи от номера',
        he: 'מפתחות מכניים לחדר'
    },
    shabbatLighting: {
        ka: 'შაბათის განათება ნომერში',
        ru: 'Шаббатнее освещение в номере',
        he: 'תאורת שבת בחדר'
    },
    shabbatHotPlate: {
        ka: 'შაბათის ცხელი ფილა',
        ru: 'Шаббатняя плата',
        he: 'פלטת שבת'
    },
    shabbatLateCheckout: {
        ka: 'გვიანი გასვლა შაბათს',
        ru: 'Поздний выезд в субботу',
        he: 'צ׳ק אאוט מאוחר בשבת'
    },

    // --- Religious facilities ---------------------------------------------
    synagogueOnSite: {
        ka: 'სინაგოგა სასტუმროში',
        ru: 'Синагога на территории',
        he: 'בית כנסת במלון'
    },
    synagogueNearby: {
        ka: 'სინაგოგა ახლოს',
        ru: 'Синагога поблизости',
        he: 'בית כנסת בקרבת מקום'
    },
    prayerRoom: {
        ka: 'სალოცავი ოთახი',
        ru: 'Молитвенная комната',
        he: 'חדר תפילה'
    },
    minyanDaily: {
        ka: 'ყოველდღიური მინიანი',
        ru: 'Ежедневный миньян',
        he: 'מניין יומי'
    },
    mikvehOnSite: {
        ka: 'მიკვე სასტუმროში',
        ru: 'Миква на территории',
        he: 'מקווה במלון'
    },
    mikvehNearby: {
        ka: 'მიკვე ახლოს',
        ru: 'Миква поблизости',
        he: 'מקווה בקרבת מקום'
    },
    eruv: {
        ka: 'ერუვის ფარგლებში',
        ru: 'В пределах эрува',
        he: 'בתוך עירוב'
    }
};
