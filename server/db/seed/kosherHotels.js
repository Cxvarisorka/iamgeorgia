/**
 * Kosher data for the catalogue properties.
 *
 * The point of this fixture is **coverage, not volume**. Eight properties is
 * enough to put every state the feature can be in on a screen at once, which is
 * what makes the admin panel and the B2B page reviewable without anybody
 * hand-typing a certificate to find out what "expired" looks like:
 *
 *   vera-house-tbilisi      FULL      · verified, runs for months   → certified
 *   abanotubani-residence   PARTIAL   · verified, RESTAURANT scope  → NOT certified
 *   sighnaghi-wine-house    FRIENDLY  · verified, expires in 40 days → expiry warning
 *   gudauri-alpine-hotel    FULL      · lapsed, with a predecessor  → EXPIRED + history
 *   borjomi-forest-spa      PARTIAL   · awaiting our review         → PENDING
 *   batumi-marine-hotel     FRIENDLY  · none, and a held supplier update
 *   mestia-tower-lodge      ON_REQUEST· none                        → the minimum
 *   hotel-tbilisi           NONE      · none                        → "we asked, no"
 *
 * The two rows worth staring at are Abanotubani and Gudauri. Both hold a
 * certificate whose `verification` column says VERIFIED, and both come back
 * `certified: false` — one because a certified restaurant inside a hotel is not
 * a certified hotel, the other because the date has passed. Neither needed a job
 * to run. If a change ever makes those two read as certified, something load-
 * bearing has broken.
 *
 * **Dates are relative to the day the seed runs**, never literals: a fixture
 * with a hard-coded 2027 expiry silently becomes an expired-certificate fixture
 * in 2027, and the case it was written to demonstrate quietly stops existing.
 *
 * The certifying bodies below are **illustrative names**. The properties
 * themselves are this platform's own editorial fixtures rather than real
 * hotels, and attributing a supervision to an actual rabbinate — for a hotel
 * that does not exist — is not a claim worth putting in a database.
 */

/**
 * Facility codes must exist in `kosherAmenities.js`; the seeder fails loudly on
 * one that does not, rather than quietly attaching nothing.
 */
export const KOSHER_HOTELS = {
    // --- certified, and the reference case -------------------------------
    'vera-house-tbilisi': {
        serviceLevel: 'FULL',
        notes:
            'The kitchen has operated under continuous supervision since 2019. Meat and dairy ' +
            'are prepared in separate rooms with separate staff, and the restaurant closes for ' +
            'Shabbat rather than switching to a cold service.',
        contactName: 'Front office',
        contactEmail: 'kosher@verahouse.example',
        contactPhone: '+995322901145',
        features: [
            'kosherRestaurant',
            'kosherKitchen',
            'kosherBreakfast',
            'kosherLunch',
            'kosherDinner',
            'separateMeatDairy',
            'kosherWine',
            'passoverKosher',
            'shabbatElevator',
            'shabbatMeals',
            'manualRoomKeys',
            'shabbatLighting',
            'shabbatHotPlate',
            'shabbatLateCheckout',
            'prayerRoom',
            'minyanDaily',
            'synagogueNearby',
            'mikvehNearby',
            'eruv'
        ],
        certifications: [
            {
                authorityName: 'Georgian Kashrut Board',
                authorityWebsite: 'https://kashrut.example.ge',
                name: 'Annual property certificate',
                reference: 'GKB-2026-0114',
                scope: 'PROPERTY',
                issuedOnDaysFromToday: -55,
                expiresOnDaysFromToday: 310,
                verification: 'VERIFIED',
                verificationNotes: 'Certificate confirmed with the board by telephone.'
            }
        ],
        nearby: [
            {
                name: 'Great Synagogue',
                type: 'Synagogue',
                kind: 'SYNAGOGUE',
                distance: '400 m',
                walkingMinutes: 6,
                latitude: 41.6913,
                longitude: 44.8078
            },
            {
                name: 'Community mikveh',
                type: 'Mikveh',
                kind: 'MIKVEH',
                distance: '450 m',
                walkingMinutes: 7,
                latitude: 41.6916,
                longitude: 44.8083
            }
        ]
    },

    // --- a certified restaurant is not a certified hotel ------------------
    'abanotubani-residence': {
        serviceLevel: 'PARTIAL',
        notes:
            'The ground-floor restaurant is supervised and operates independently of the ' +
            'house kitchen, which is not. Room service outside restaurant hours is not kosher.',
        contactName: 'Restaurant manager',
        contactEmail: 'dining@abanotubani.example',
        features: [
            'kosherRestaurant',
            'kosherDinner',
            'separateMeatDairy',
            'kosherWine',
            'kosherMealOnRequest',
            'manualRoomKeys',
            'synagogueNearby',
            'mikvehNearby',
            'eruv'
        ],
        certifications: [
            {
                authorityName: 'Tbilisi Kashrut Supervision',
                name: 'Restaurant supervision',
                reference: 'TKS-R-2026-88',
                // The whole reason this fixture exists: verified, live, and it
                // still must not produce a certified *property*.
                scope: 'RESTAURANT',
                issuedOnDaysFromToday: -120,
                expiresOnDaysFromToday: 245,
                verification: 'VERIFIED',
                verificationNotes: 'Covers the restaurant only. The property is not certified.'
            }
        ],
        nearby: [
            {
                name: 'Great Synagogue',
                type: 'Synagogue',
                kind: 'SYNAGOGUE',
                distance: '260 m',
                walkingMinutes: 4,
                latitude: 41.6913,
                longitude: 44.8078
            }
        ]
    },

    // --- live, but close enough to lapsing to warn ------------------------
    'sighnaghi-wine-house': {
        serviceLevel: 'KOSHER_FRIENDLY',
        notes:
            'A small guesthouse with a supervised kitchen. Kosher meals need three days ' +
            'notice outside the summer season.',
        contactName: 'Nino Ratiani',
        contactEmail: 'stay@sighnaghiwine.example',
        contactPhone: '+995355231018',
        features: [
            'kosherKitchen',
            'kosherBreakfast',
            'kosherMealOnRequest',
            'kosherWine',
            'separateMeatDairy',
            'shabbatMeals',
            'manualRoomKeys'
        ],
        certifications: [
            {
                authorityName: 'Kakheti Kashrut Council',
                name: 'Kitchen certificate',
                reference: 'KKC-2025-233',
                scope: 'KITCHEN',
                issuedOnDaysFromToday: -325,
                // Inside the 60-day notice window, so the admin panel shows the
                // warning and the nightly sweep has something to find.
                expiresOnDaysFromToday: 40,
                verification: 'VERIFIED',
                verificationNotes: 'Renewal requested from the council.'
            }
        ]
    },

    // --- expired, with the certificate it replaced still on file ----------
    'gudauri-alpine-hotel': {
        serviceLevel: 'FULL',
        notes:
            'Operates fully kosher through the ski season. Supervision lapsed at the end of ' +
            'the last season and the renewal has not yet been filed.',
        contactName: 'Guest services',
        contactEmail: 'guestservices@gudaurialpine.example',
        features: [
            'kosherRestaurant',
            'kosherKitchen',
            'kosherBreakfast',
            'kosherDinner',
            'separateMeatDairy',
            'shabbatElevator',
            'shabbatMeals',
            'shabbatHotPlate',
            'manualRoomKeys',
            'prayerRoom'
        ],
        certifications: [
            {
                authorityName: 'Georgian Kashrut Board',
                name: 'Season certificate',
                reference: 'GKB-2025-0442',
                scope: 'PROPERTY',
                issuedOnDaysFromToday: -400,
                // Verified once, and lapsed since. Nothing wrote to this row to
                // make it expired — the date did.
                expiresOnDaysFromToday: -35,
                verification: 'VERIFIED',
                verificationNotes: 'Valid for the 2025/26 season only.'
            },
            {
                authorityName: 'Georgian Kashrut Board',
                name: 'Season certificate',
                reference: 'GKB-2024-0391',
                scope: 'PROPERTY',
                issuedOnDaysFromToday: -760,
                expiresOnDaysFromToday: -395,
                verification: 'VERIFIED',
                verificationNotes: 'Superseded by GKB-2025-0442.',
                // History rather than a delete: "they were certified until
                // March" is a fact somebody eventually has to answer for.
                archived: true
            }
        ]
    },

    // --- waiting on us ----------------------------------------------------
    'borjomi-forest-spa': {
        serviceLevel: 'PARTIAL',
        notes: 'A supervised kitchen serving the main restaurant. The spa cafe is not covered.',
        contactName: 'Reception',
        contactEmail: 'reception@borjomiforest.example',
        features: [
            'kosherKitchen',
            'kosherBreakfast',
            'kosherDinner',
            'kosherMealOnRequest',
            'separateMeatDairy',
            'shabbatMeals',
            'shabbatLateCheckout'
        ],
        certifications: [
            {
                authorityName: 'Samtskhe Kashrut Supervision',
                name: 'Kitchen certificate',
                reference: 'SKS-2026-17',
                scope: 'KITCHEN',
                issuedOnDaysFromToday: -20,
                expiresOnDaysFromToday: 345,
                // Submitted and not yet checked. Reads as offering kosher
                // services, never as certified.
                verification: 'PENDING_VERIFICATION'
            }
        ]
    },

    // --- facilities only, plus a supplier who disagrees with us -----------
    'batumi-marine-hotel': {
        serviceLevel: 'KOSHER_FRIENDLY',
        notes:
            'No kosher kitchen of its own. The hotel arranges meals through a supervised ' +
            'caterer in the old town and can hold them for late Shabbat arrivals.',
        contactName: 'Concierge',
        contactEmail: 'concierge@batumimarine.example',
        contactPhone: '+995422275500',
        features: [
            'kosherMealOnRequest',
            'shabbatMeals',
            'shabbatElevator',
            'manualRoomKeys',
            'shabbatLateCheckout',
            'synagogueNearby',
            'mikvehNearby'
        ],
        /**
         * A channel manager reporting this property as fully kosher, refused
         * because staff have written the record.
         *
         * Parked rather than applied and rather than dropped: silently winning
         * and silently losing are both wrong, and an admin seeing "the supplier
         * now says FULL, we say KOSHER_FRIENDLY" is the only useful outcome.
         */
        pendingSupplierData: {
            serviceLevel: 'FULL',
            notes: 'Glatt kosher hotel',
            source: 'SUPPLIER',
            sourceRef: 'CM-BTM-4471'
        },
        nearby: [
            {
                name: 'Batumi Synagogue',
                type: 'Synagogue',
                kind: 'SYNAGOGUE',
                distance: '1.1 km',
                walkingMinutes: 14,
                latitude: 41.6501,
                longitude: 41.6362
            }
        ]
    },

    // --- the minimum a property can offer and still be listed -------------
    'mestia-tower-lodge': {
        serviceLevel: 'ON_REQUEST',
        notes:
            'Meals are brought in from Tbilisi and need a week of notice. There is no kosher ' +
            'kitchen and no supervision on site.',
        contactEmail: 'lodge@mestiatower.example',
        features: ['kosherMealOnRequest', 'manualRoomKeys']
    },

    // --- asked, and the answer was no -------------------------------------
    'hotel-tbilisi': {
        // Worth a row of its own: it stops the question being asked again, and
        // it never matches a kosher filter.
        serviceLevel: 'NONE',
        notes: 'Asked in February 2026. The property has no kosher provision and none planned.',
        features: []
    }
};

/**
 * Requirement scenarios to attach to live bookings.
 *
 * Deliberately **not** keyed by hotel slug. Which properties have bookings is
 * decided by whoever has been using the platform, not by this file, and a
 * fixture naming `vera-house-tbilisi` seeds nothing on a database whose only
 * live booking happens to be somewhere else. The seeder walks the bookings that
 * actually exist at kosher properties and applies these in order.
 *
 * Each scenario is filtered to codes the property genuinely claims, because
 * that is the rule `POST /bookings` enforces — a fixture describing a state the
 * API would answer 422 to is a fixture describing nothing real. `preferred` is
 * dropped when unsupported; `fallback` always applies, because
 * `kosherMealOnRequest` is askable of any kosher property.
 *
 * The three scenarios are chosen to fill the admin queue with one of each
 * outcome: something waiting, something agreed, and something refused with a
 * reason an agency can pass on.
 */
export const KOSHER_BOOKING_REQUEST_SCENARIOS = [
    {
        label: 'awaiting the property',
        fallback: {
            code: 'kosherMealOnRequest',
            note: 'Two kosher dinners, Friday and Saturday',
            status: 'REQUESTED'
        },
        preferred: [
            { code: 'shabbatElevator', status: 'REQUESTED' },
            { code: 'manualRoomKeys', note: 'Both rooms, please', status: 'REQUESTED' }
        ]
    },
    {
        label: 'agreed',
        fallback: {
            code: 'kosherMealOnRequest',
            note: 'Kosher breakfast for two, every morning',
            status: 'CONFIRMED'
        },
        preferred: [
            { code: 'kosherBreakfast', status: 'CONFIRMED' },
            { code: 'shabbatMeals', note: 'Friday evening, four covers', status: 'CONFIRMED' }
        ]
    },
    {
        label: 'refused, with a reason',
        fallback: {
            code: 'kosherMealOnRequest',
            note: 'Kosher lunch on the Sunday',
            status: 'DECLINED',
            responseNote: 'Our caterer does not deliver on Sundays. Friday and Saturday are fine.'
        },
        preferred: [
            {
                code: 'shabbatLateCheckout',
                note: 'Saturday, after 20:00',
                status: 'DECLINED',
                responseNote: 'The rooms are re-let that evening. We can hold luggage until 21:00.'
            }
        ]
    }
];
