/**
 * The service catalogue: priced extras with no inventory.
 *
 * Mostly kosher provision, because that is what the owner asked the catalogue
 * to carry first — meals, supervision and the Friday-afternoon logistics that
 * a shomer Shabbat traveller in Georgia cannot arrange from abroad. A guide
 * and equipment hire sit alongside them so the shape is not mistaken for a
 * kosher-only table: a service is any priced thing with no stock behind it.
 *
 * `basis` decides what one unit is, and therefore what a package slot's
 * `quantityRule` multiplies. It is the field most likely to be got wrong, so
 * each entry states the reasoning where it is not obvious.
 *
 * Prices are integer minor units in GEL, supplier-side. What a buyer sees is
 * this marked up by their own commission, unless `sellCents` fixes it.
 */

export const SERVICES = [
    {
        slug: 'shabbat-meals-delivered',
        name: 'Shabbat meals, delivered',
        category: 'SHABBAT_MEALS',
        // Per person: three meals for one traveller over one Shabbat. A slot
        // that wants them for a family sets `quantityRule: PER_PERSON`.
        basis: 'PER_PERSON',
        netCents: 9_000,
        destinationSlug: 'tbilisi',
        noticeHours: 72,
        // A caterer confirms by hand: the food is cooked to order and the
        // delivery has to land before candle lighting.
        confirmationMode: 'ON_REQUEST',
        isKosher: true,
        kosherAuthority: 'Chabad of Georgia',
        summary: 'Friday night dinner, Shabbat lunch and seudah shlishit, sealed and delivered to the property.',
        description: [
            'Three meals cooked in a supervised kitchen in Tbilisi and delivered sealed on Friday afternoon, in time to be put away before candle lighting.',
            'Hot dishes travel in sealed foil trays suitable for a warming plate; the property is told to expect them and where to leave them.'
        ],
        included: [
            'Friday night dinner: fish, soup, main and two salads',
            'Shabbat lunch: cold cuts, kugel, salads and dessert',
            'Seudah shlishit: light dairy-free platter',
            'Grape juice and challah for both meals',
            'Delivery to the property before candle lighting'
        ]
    },
    {
        slug: 'kosher-meal-delivery',
        name: 'Kosher meals, daily',
        category: 'KOSHER_MEAL_DELIVERY',
        // Per person per day: the only basis that scales on both axes, and the
        // reason the enum has four values rather than two.
        basis: 'PER_PERSON_PER_DAY',
        netCents: 5_500,
        destinationSlug: 'tbilisi',
        noticeHours: 48,
        confirmationMode: 'INSTANT',
        isKosher: true,
        kosherAuthority: 'Chabad of Georgia',
        summary: 'A hot supervised lunch and dinner delivered to wherever the day ends.',
        description: [
            'Two meals a day, delivered to the property or to a meeting point on the road. Ordered by the day, so a trip that eats out on one of them simply books fewer.',
            'Every meal is sealed and marked with its hechsher. Dietary requirements are passed to the kitchen but not guaranteed without notice.'
        ],
        included: ['Hot lunch', 'Hot dinner', 'Bread, drink and a piece of fruit', 'Delivery within the destination']
    },
    {
        slug: 'mashgiach-on-site',
        name: 'Mashgiach on site',
        category: 'MASHGIACH',
        // Per day, not per person: one supervisor covers the whole party.
        basis: 'PER_DAY',
        netCents: 42_000,
        destinationSlug: 'tbilisi',
        noticeHours: 168,
        // A week's notice and a named person: never instant.
        confirmationMode: 'ON_REQUEST',
        isKosher: true,
        kosherAuthority: 'Chabad of Georgia',
        summary: 'A supervisor in the property kitchen for the duration, so food can be prepared on site.',
        description: [
            'Turns a hotel kitchen into one a group can eat from: the mashgiach arrives before the first service, kashers what can be kashered and stays through preparation.',
            'Booked by the day and priced for the group, not the head. Arranged with the property in advance — a kitchen that will not accept supervision cannot be made to.'
        ],
        included: ['Kashering of the equipment agreed with the property', 'Supervision through preparation and service', 'A written note of what was and was not kashered']
    },
    {
        slug: 'synagogue-transfer',
        name: 'Synagogue transfer',
        category: 'SYNAGOGUE_TRANSFER',
        // Per group: a car is a car whether two or six travel in it.
        basis: 'PER_GROUP',
        netCents: 8_000,
        destinationSlug: 'tbilisi',
        noticeHours: 24,
        confirmationMode: 'INSTANT',
        isKosher: true,
        summary: 'A car to the synagogue and back, timed around the service rather than the clock.',
        description: [
            'Booked for the group and timed to the day it falls on: the driver is briefed on when to collect, and waits rather than circling.',
            'Not available during Shabbat itself. A package with the Shabbat rules switched on will not place this inside the window.'
        ],
        included: ['Return transfer within the city', 'Waiting time included', 'Driver briefed on the service times']
    },
    {
        slug: 'private-guide-day',
        name: 'Private guide, full day',
        category: 'GUIDE',
        basis: 'PER_DAY',
        netCents: 32_000,
        destinationSlug: null,
        noticeHours: 48,
        confirmationMode: 'ON_REQUEST',
        isKosher: false,
        summary: 'An English-speaking guide for the day, yours alone.',
        description: [
            'A licensed guide for a full day, on foot or in your own vehicle. Not a tour: there is no route and no ticket, only somebody who knows the place and answers to your party.',
            'Georgian, Russian, English and Hebrew are usually available; the language is confirmed with the booking.'
        ],
        included: ['Eight hours with a licensed guide', 'Their entry where a site charges for it', 'Planning the day with you the evening before']
    },
    {
        slug: 'trekking-equipment-hire',
        name: 'Trekking equipment hire',
        category: 'EQUIPMENT',
        basis: 'PER_PERSON_PER_DAY',
        netCents: 4_500,
        destinationSlug: 'kazbegi',
        noticeHours: 24,
        confirmationMode: 'INSTANT',
        isKosher: false,
        summary: 'Boots, poles and a pack, fitted the evening before you walk.',
        description: [
            'For travellers who fly in without kit. Fitted at the guesthouse the evening before the first walk and collected at the end.',
            'Sizes are confirmed at booking. Anything that does not fit on the night is swapped in the morning.'
        ],
        included: ['Boots and poles', 'A 30-litre pack', 'A shell jacket', 'Fitting and collection']
    }
];

/**
 * Prose in the other three languages, keyed by slug.
 *
 * Only what is language. The basis, the notice period and every amount are
 * facts and stay on the record itself.
 */
export const SERVICE_CONTENT = {
    ka: {
        'shabbat-meals-delivered': {
            name: 'შაბათის კვება, მიტანით',
            summary: 'პარასკევის ვახშამი, შაბათის სადილი და სეუდა შლიშით — დალუქული და მიტანილი სასტუმროში.'
        },
        'kosher-meal-delivery': {
            name: 'ქოშერ კვება, ყოველდღიური',
            summary: 'ცხელი ზედამხედველობითი სადილი და ვახშამი, მიტანილი იქ, სადაც დღე მთავრდება.'
        },
        'mashgiach-on-site': {
            name: 'მაშგიახი ადგილზე',
            summary: 'ზედამხედველი სასტუმროს სამზარეულოში, რომ საკვები ადგილზე მომზადდეს.'
        },
        'synagogue-transfer': {
            name: 'ტრანსფერი სინაგოგაში',
            summary: 'მანქანა სინაგოგამდე და უკან, სამსახურის და არა საათის მიხედვით.'
        },
        'private-guide-day': {
            name: 'კერძო გიდი, სრული დღე',
            summary: 'ინგლისურენოვანი გიდი მთელი დღით, მხოლოდ თქვენთვის.'
        },
        'trekking-equipment-hire': {
            name: 'ლაშქრობის აღჭურვილობის ქირა',
            summary: 'ფეხსაცმელი, ჯოხები და ზურგჩანთა, მორგებული სიარულის წინა საღამოს.'
        }
    },
    ru: {
        'shabbat-meals-delivered': {
            name: 'Субботние трапезы с доставкой',
            summary: 'Ужин в пятницу, субботний обед и сеуда шлишит — запечатанные и доставленные в отель.'
        },
        'kosher-meal-delivery': {
            name: 'Кошерное питание, ежедневно',
            summary: 'Горячие обед и ужин под наблюдением, с доставкой туда, где заканчивается день.'
        },
        'mashgiach-on-site': {
            name: 'Машгиах на месте',
            summary: 'Наблюдающий на кухне отеля, чтобы еду можно было готовить на месте.'
        },
        'synagogue-transfer': {
            name: 'Трансфер в синагогу',
            summary: 'Машина до синагоги и обратно, по времени службы, а не по часам.'
        },
        'private-guide-day': {
            name: 'Частный гид на день',
            summary: 'Англоговорящий гид на весь день, только для вас.'
        },
        'trekking-equipment-hire': {
            name: 'Аренда снаряжения для треккинга',
            summary: 'Ботинки, палки и рюкзак, подобранные накануне выхода.'
        }
    },
    he: {
        'shabbat-meals-delivered': {
            name: 'סעודות שבת, במשלוח',
            summary: 'סעודת ליל שבת, סעודת שחרית וסעודה שלישית — ארוזות וחתומות, במשלוח למלון.'
        },
        'kosher-meal-delivery': {
            name: 'ארוחות כשרות, יומי',
            summary: 'צהריים וערב חמים בהשגחה, במשלוח לאן שהיום נגמר.'
        },
        'mashgiach-on-site': {
            name: 'משגיח במקום',
            summary: 'משגיח במטבח המלון, כדי שאפשר יהיה להכין אוכל במקום.'
        },
        'synagogue-transfer': {
            name: 'הסעה לבית הכנסת',
            summary: 'רכב לבית הכנסת ובחזרה, לפי זמני התפילה ולא לפי השעון.'
        },
        'private-guide-day': {
            name: 'מדריך פרטי, יום מלא',
            summary: 'מדריך דובר אנגלית ליום שלם, רק בשבילכם.'
        },
        'trekking-equipment-hire': {
            name: 'השכרת ציוד טיולים',
            summary: 'נעליים, מקלות ותיק, במידה שלכם בערב שלפני ההליכה.'
        }
    }
};
