/**
 * Sample packages: a hotel, the transfers either end and the journeys between,
 * sold and cancelled as one thing.
 *
 * Three of them, chosen to cover the shapes the model has to hold rather than
 * to fill a catalogue:
 *
 *   - a **fixed** package, every slot pinned to one product, discounted by a
 *     percentage — the common case;
 *   - a **kosher** package, whose profile constrains which hotels may fill its
 *     stay slot and forbids driving during Shabbat;
 *   - an **open** package whose stay slot names no hotel, so the resolver
 *     searches the destination and the buyer picks from the alternatives.
 *
 * Slots reference products by slug and are resolved at seed time. A package
 * whose products are not seeded is skipped with a warning rather than half
 * created: a template with a missing slot is worse than no template.
 */

export const PACKAGES = [
    {
        slug: 'kakheti-wine-weekend',
        name: 'Kakheti wine weekend',
        destinationSlug: 'kakheti',
        nights: 2,
        image: '/images/tours/uplistsikhe.jpg',
        featured: true,
        b2cEnabled: true,
        // A vineyard retreat with one minibus on the route: a real ceiling,
        // and the field that makes an over-large party a 422 rather than a
        // quote nobody could honour.
        maxAdults: 8,
        maxPax: 8,
        summary: 'Two nights among the vineyards, a day on the wine route, and someone else driving.',
        description: [
            'The Alazani valley from a terrace, and the cellars that made it famous. Two nights at a vineyard retreat, a full day on the wine route with a guide who knows which doors open, and a car either end so nobody is counting glasses.',
            'Priced as one trip. The room, the tour and the transfers are booked together and cancelled together, which is what makes the weekend cheaper than its parts.'
        ],
        adjustment: { kind: 'DISCOUNT_BPS', value: 800, appliesTo: 'REQUIRED_ONLY' },
        components: [
            {
                componentType: 'HOTEL_STAY',
                label: 'Two nights in the vineyards',
                nights: 2,
                dayOffset: 0,
                hotelSlug: 'alazani-vineyard-retreat'
            },
            {
                componentType: 'TRANSFER',
                label: 'Airport pick-up',
                dayOffset: 0,
                timeOfDay: '12:00',
                fromPointSlug: 'tbilisi-airport',
                toPointSlug: 'telavi'
            },
            {
                componentType: 'TOUR',
                label: 'The wine route',
                dayOffset: 1,
                tourSlug: 'kakheti-wine-route'
            },
            {
                componentType: 'TRANSFER',
                label: 'Airport drop-off',
                dayOffset: 2,
                timeOfDay: '10:00',
                fromPointSlug: 'telavi',
                toPointSlug: 'tbilisi-airport'
            },
            {
                componentType: 'SERVICE',
                label: 'A guide for the second day',
                dayOffset: 1,
                required: false,
                serviceSlug: 'private-guide-day',
                quantityRule: 'ONE'
            }
        ]
    },
    {
        slug: 'tbilisi-shabbat',
        name: 'Shabbat in Tbilisi',
        destinationSlug: 'tbilisi',
        nights: 3,
        image: '/images/tours/davit-gareja.jpg',
        featured: true,
        b2cEnabled: true,
        summary: 'Three nights in the old town, a supervised kitchen, and a Shabbat nobody has to organise.',
        description: [
            'Arrive Thursday, walk the city on Friday morning, and let the rest of Friday take care of itself. The meals arrive sealed before candle lighting, the synagogue is a short walk, and nothing is scheduled between Friday sunset and Saturday night.',
            'The hotel is chosen for its kitchen, not its view. The package will not sell for a date on which its certification lapses, and it will not put a car on the road during Shabbat.'
        ],
        adjustment: { kind: 'DISCOUNT_BPS', value: 500, appliesTo: 'REQUIRED_ONLY' },
        // Creating this profile is what makes the package kosher. Without it
        // the same slots are an ordinary city break.
        kosher: {
            minServiceLevel: 'FULL',
            certifiedRequired: true,
            certificationScopes: ['PROPERTY', 'KITCHEN'],
            requireCertValidThroughStay: true,
            hotelRequestCodes: ['manualRoomKeys', 'kosherBreakfast', 'shabbatHotPlate'],
            shabbatMode: 'SOLAR',
            candleLightingOffsetMin: 18,
            havdalahOffsetMin: 42,
            noTransfersInShabbat: true,
            noToursOnShabbat: true,
            supervisionAuthority: 'Chabad of Georgia',
            notes: 'Meals are delivered Friday afternoon. The property is briefed to hold them, to leave a mechanical key and to have the hot plate on.'
        },
        components: [
            {
                componentType: 'HOTEL_STAY',
                label: 'Three nights in the old town',
                nights: 3,
                dayOffset: 0,
                hotelSlug: 'vera-house-tbilisi'
            },
            {
                componentType: 'TRANSFER',
                label: 'Airport pick-up',
                dayOffset: 0,
                timeOfDay: '11:00',
                fromPointSlug: 'tbilisi-airport',
                toPointSlug: 'tbilisi'
            },
            {
                componentType: 'SERVICE',
                label: 'Shabbat meals',
                dayOffset: 1,
                serviceSlug: 'shabbat-meals-delivered',
                quantityRule: 'PER_PERSON'
            },
            {
                componentType: 'TOUR',
                label: 'Tbilisi on foot',
                // Day one, deliberately: the city walk happens on Friday
                // morning, before the rest day the profile enforces.
                dayOffset: 1,
                required: false,
                tourSlug: 'tbilisi-in-depth'
            },
            {
                componentType: 'SERVICE',
                label: 'Synagogue transfer',
                dayOffset: 1,
                required: false,
                serviceSlug: 'synagogue-transfer',
                quantityRule: 'ONE'
            }
        ]
    },
    {
        slug: 'tbilisi-your-choice',
        name: 'Tbilisi, your choice of room',
        destinationSlug: 'tbilisi',
        nights: 3,
        image: '/images/tours/vardzia.jpg',
        b2cEnabled: true,
        summary: 'Three nights in the capital with the hotel left open, and the old town walked properly.',
        description: [
            'The same three nights whichever room you take. The stay slot names no hotel: every property in Tbilisi that can take your party on those dates is offered, cheapest first, and swapping one for another re-prices the whole trip in front of you.',
            'A guide walks the old town on the second day. The airport car is included both ways because the alternative is a queue at two in the morning.'
        ],
        adjustment: { kind: 'DISCOUNT_BPS', value: 600, appliesTo: 'ALL_ITEMS' },
        components: [
            {
                componentType: 'HOTEL_STAY',
                label: 'Three nights, your choice',
                nights: 3,
                dayOffset: 0
                // No `hotelSlug`: the resolver searches the destination and
                // returns the rest as alternatives to swap between.
            },
            {
                componentType: 'TRANSFER',
                label: 'Airport pick-up',
                dayOffset: 0,
                timeOfDay: '13:00',
                fromPointSlug: 'tbilisi-airport',
                toPointSlug: 'tbilisi'
            },
            {
                componentType: 'TOUR',
                label: 'The old town on foot',
                dayOffset: 1,
                tourSlug: 'tbilisi-in-depth'
            },
            {
                componentType: 'TRANSFER',
                label: 'Airport drop-off',
                dayOffset: 3,
                timeOfDay: '09:00',
                fromPointSlug: 'tbilisi',
                toPointSlug: 'tbilisi-airport'
            },
            {
                componentType: 'SERVICE',
                label: 'Kosher meals through the stay',
                dayOffset: 0,
                required: false,
                serviceSlug: 'kosher-meal-delivery',
                quantityRule: 'PER_PERSON'
            }
        ]
    }
];

/** Prose in the other three languages. Facts stay on the record itself. */
export const PACKAGE_CONTENT = {
    ka: {
        'kakheti-wine-weekend': {
            name: 'ღვინის შაბათ-კვირა კახეთში',
            summary: 'ორი ღამე ვენახებში, ერთი დღე ღვინის მარშრუტზე და მძღოლი, რომელიც თქვენ არ ხართ.'
        },
        'tbilisi-shabbat': {
            name: 'შაბათი თბილისში',
            summary: 'სამი ღამე ძველ ქალაქში, ზედამხედველობითი სამზარეულო და შაბათი, რომლის ორგანიზებაც არავის სჭირდება.'
        },
        'tbilisi-your-choice': {
            name: 'თბილისი, ოთახი თქვენი არჩევანით',
            summary: 'სამი ღამე დედაქალაქში სასტუმროს არჩევანით და ძველი ქალაქი ფეხით.'
        }
    },
    ru: {
        'kakheti-wine-weekend': {
            name: 'Винные выходные в Кахетии',
            summary: 'Две ночи среди виноградников, день на винном маршруте и водитель — не вы.'
        },
        'tbilisi-shabbat': {
            name: 'Шаббат в Тбилиси',
            summary: 'Три ночи в старом городе, кухня под наблюдением и шаббат, который никому не нужно организовывать.'
        },
        'tbilisi-your-choice': {
            name: 'Тбилиси, номер на ваш выбор',
            summary: 'Три ночи в столице с открытым выбором отеля и старый город пешком.'
        }
    },
    he: {
        'kakheti-wine-weekend': {
            name: 'סוף שבוע של יין בקאחתי',
            summary: 'שני לילות בין הכרמים, יום על דרך היין, ומישהו אחר נוהג.'
        },
        'tbilisi-shabbat': {
            name: 'שבת בטביליסי',
            summary: 'שלושה לילות בעיר העתיקה, מטבח בהשגחה, ושבת שאף אחד לא צריך לארגן.'
        },
        'tbilisi-your-choice': {
            name: 'טביליסי, החדר לבחירתכם',
            summary: 'שלושה לילות בבירה כשהמלון פתוח לבחירה, והעיר העתיקה ברגל.'
        }
    }
};
