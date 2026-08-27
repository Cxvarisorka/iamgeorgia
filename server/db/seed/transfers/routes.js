/**
 * The route catalogue, transcribed from the operator's brief.
 *
 * Written as groups rather than as three hundred literal rows, because that is
 * how the brief itself is organised — "TBS to eastern Georgia", "Batumi to the
 * seaside resorts" — and because a flat list of pairs is a list nobody can
 * check against the source. `expandRoutes()` turns each group into rows.
 *
 * Two conventions worth stating:
 *
 *   * `both: true` seeds the reverse leg as well. Most journeys sell in both
 *     directions, but not all: an airport arrival is a product and an airport
 *     departure is a different one, so the reverse is opt-in and each row ends
 *     up separately priced.
 *   * Tier comes from the brief's own sales priority, and defaults per group.
 *     `tier1` and `tier2` name the exceptions inside a group rather than
 *     splitting one journey list into three.
 */

const AIRPORT = 'AIRPORT';
const CITY = 'CITY';
const RESORT = 'RESORT';
const TOURIST_ROUTE = 'TOURIST_ROUTE';
const COMBINED = 'COMBINED';

export const ROUTE_GROUPS = [
    // --- Tbilisi airport ----------------------------------------------------
    {
        from: 'tbilisi-airport',
        category: AIRPORT,
        both: true,
        tier: 'TIER_3',
        tier1: ['tbilisi', 'gudauri', 'kazbegi', 'batumi', 'kutaisi', 'borjomi', 'bakuriani'],
        tier2: ['mtskheta', 'telavi', 'sighnaghi', 'mestia', 'gori'],
        to: [
            'tbilisi',
            'mtskheta',
            'gori',
            'uplistsikhe',
            'borjomi',
            'bakuriani',
            'akhaltsikhe',
            'vardzia',
            'telavi',
            'sighnaghi',
            'kvareli',
            'lagodekhi',
            'gudauri',
            'kazbegi',
            'juta',
            'shatili',
            'omalo',
            'kutaisi',
            'tskaltubo',
            'martvili',
            'okatse',
            'zugdidi',
            'mestia',
            'ushguli',
            'batumi',
            'kobuleti',
            'ureki',
            'shekvetili',
            'tsikhisdziri',
            'gonio',
            'kvariati',
            'sarpi'
        ]
    },

    // --- Kutaisi airport ----------------------------------------------------
    {
        from: 'kutaisi-airport',
        category: AIRPORT,
        both: true,
        tier: 'TIER_3',
        tier1: ['kutaisi', 'batumi', 'mestia', 'tbilisi'],
        tier2: ['tskaltubo', 'martvili', 'okatse', 'ureki', 'kobuleti', 'borjomi', 'bakuriani'],
        to: [
            'kutaisi',
            'kutaisi-railway',
            'tskaltubo',
            'tsageri',
            'ambrolauri',
            'oni',
            'shovi',
            'lentekhi',
            'martvili',
            'okatse',
            'zugdidi',
            'mestia',
            'ushguli',
            'batumi',
            'kobuleti',
            'ureki',
            'shekvetili',
            'poti',
            'gonio',
            'kvariati',
            'sarpi',
            'gori',
            'mtskheta',
            'tbilisi',
            'borjomi',
            'bakuriani',
            'gudauri',
            'kazbegi',
            'sighnaghi',
            'telavi'
        ]
    },

    // --- Batumi airport -----------------------------------------------------
    {
        from: 'batumi-airport',
        category: AIRPORT,
        both: true,
        tier: 'TIER_3',
        tier1: ['batumi', 'kutaisi', 'mestia'],
        tier2: ['kobuleti', 'gonio', 'kvariati', 'ureki', 'tbilisi'],
        to: [
            'batumi',
            'makhinjauri',
            'gonio',
            'kvariati',
            'sarpi',
            'kobuleti',
            'chakvi',
            'tsikhisdziri',
            'ureki',
            'shekvetili',
            'grigoleti',
            'poti',
            'makhuntseti',
            'keda',
            'shuakhevi',
            'khulo',
            'goderdzi',
            'kutaisi',
            'tskaltubo',
            'martvili',
            'zugdidi',
            'mestia',
            'tbilisi',
            'borjomi',
            'bakuriani',
            'gudauri',
            'kazbegi'
        ]
    },

    // --- Tbilisi to the main cities ----------------------------------------
    {
        from: 'tbilisi',
        category: CITY,
        both: true,
        tier: 'TIER_2',
        tier1: ['batumi', 'kutaisi'],
        to: [
            'batumi',
            'kutaisi',
            'gori',
            'mtskheta',
            'zugdidi',
            'poti',
            'ozurgeti',
            'telavi',
            'sighnaghi',
            'akhaltsikhe',
            'akhalkalaki',
            'ambrolauri',
            'oni',
            'mestia'
        ]
    },

    // --- Tbilisi to the mountain resorts ------------------------------------
    {
        from: 'tbilisi',
        category: RESORT,
        both: true,
        tier: 'TIER_2',
        tier1: ['gudauri', 'kazbegi', 'bakuriani', 'borjomi'],
        tier3: ['omalo', 'shatili', 'juta', 'adishi'],
        to: [
            'gudauri',
            'kazbegi',
            'bakuriani',
            'borjomi',
            'goderdzi',
            'mestia',
            'tetnuldi',
            'hatsvali',
            'shovi',
            'omalo',
            'shatili',
            'juta'
        ]
    },

    // --- Tbilisi to Kakheti, the wine country -------------------------------
    {
        from: 'tbilisi',
        category: TOURIST_ROUTE,
        both: true,
        tier: 'TIER_2',
        tier1: ['telavi', 'sighnaghi'],
        to: [
            'telavi',
            'sighnaghi',
            'kvareli',
            'tsinandali',
            'gurjaani',
            'lagodekhi',
            'dedoplistskaro',
            'napareuli',
            'kvareli-lake',
            'davit-gareja',
            'bodbe'
        ]
    },

    // --- Kutaisi to western Georgia -----------------------------------------
    {
        from: 'kutaisi',
        category: TOURIST_ROUTE,
        both: true,
        tier: 'TIER_2',
        tier1: ['mestia', 'batumi'],
        to: [
            'tskaltubo',
            'sataplia',
            'prometheus-cave',
            'martvili',
            'okatse',
            'zugdidi',
            'mestia',
            'ushguli',
            'lentekhi',
            'ambrolauri',
            'oni',
            'shovi',
            'batumi',
            'kobuleti',
            'ureki',
            'shekvetili',
            'poti'
        ]
    },

    // --- Batumi across western Georgia --------------------------------------
    {
        from: 'batumi',
        category: CITY,
        both: true,
        tier: 'TIER_2',
        tier1: ['mestia', 'kutaisi'],
        to: [
            'kutaisi',
            'zugdidi',
            'mestia',
            'ushguli',
            'martvili',
            'tskaltubo',
            'ozurgeti',
            'ureki',
            'shekvetili',
            'poti',
            'borjomi',
            'tbilisi',
            'ambrolauri',
            'oni',
            'shovi'
        ]
    },

    // --- The Adjara seaside network -----------------------------------------
    {
        from: 'batumi',
        category: RESORT,
        both: true,
        tier: 'TIER_2',
        to: [
            'gonio',
            'kvariati',
            'sarpi',
            'kobuleti',
            'chakvi',
            'tsikhisdziri',
            'makhinjauri',
            'goderdzi',
            'grigoleti'
        ]
    },

    // --- Svaneti, which is its own product ----------------------------------
    //
    // The brief singles these out, and it is right to: Tbilisi to Mestia is
    // seven hours over a mountain road, not a long city hop, and pricing it off
    // the same table as a cross-town run would be wrong in both directions.
    {
        from: 'mestia',
        category: RESORT,
        both: true,
        tier: 'TIER_2',
        tier3: ['adishi', 'tetnuldi'],
        to: ['ushguli', 'adishi', 'hatsvali', 'tetnuldi', 'mestia-airport', 'zugdidi']
    },

    // --- Mestia airport ------------------------------------------------------
    {
        from: 'mestia-airport',
        category: AIRPORT,
        both: true,
        tier: 'TIER_3',
        to: ['mestia', 'ushguli', 'hatsvali', 'tetnuldi']
    },

    // --- Racha, and its airport ---------------------------------------------
    {
        from: 'ambrolauri-airport',
        category: AIRPORT,
        both: true,
        tier: 'TIER_3',
        to: ['ambrolauri', 'oni', 'shovi']
    },
    {
        from: 'ambrolauri',
        category: RESORT,
        both: true,
        tier: 'TIER_3',
        to: ['shovi', 'oni', 'kutaisi-airport']
    },
    { from: 'oni', category: RESORT, both: true, tier: 'TIER_3', to: ['shovi'] },
    { from: 'shovi', category: RESORT, both: true, tier: 'TIER_3', to: ['kutaisi-airport'] },

    // --- Borjomi and Bakuriani ----------------------------------------------
    { from: 'borjomi', category: RESORT, both: true, tier: 'TIER_2', to: ['bakuriani', 'vardzia', 'akhaltsikhe'] },
    {
        from: 'bakuriani',
        category: RESORT,
        both: true,
        tier: 'TIER_3',
        to: ['kutaisi-airport', 'batumi-airport', 'gudauri', 'mestia']
    },

    // --- Gudauri and Kazbegi -------------------------------------------------
    {
        from: 'gudauri',
        category: RESORT,
        both: true,
        tier: 'TIER_2',
        tier1: ['kazbegi'],
        to: ['kazbegi', 'kutaisi-airport', 'batumi', 'mestia', 'ananuri']
    },
    {
        from: 'kazbegi',
        category: RESORT,
        both: true,
        tier: 'TIER_3',
        tier2: ['juta'],
        to: ['juta', 'kutaisi-airport', 'batumi', 'mestia']
    },

    // --- The Guria and Black Sea coast --------------------------------------
    { from: 'kutaisi', category: RESORT, both: true, tier: 'TIER_2', to: ['ureki', 'shekvetili', 'poti'] },
    { from: 'tbilisi', category: RESORT, both: true, tier: 'TIER_3', to: ['ureki', 'shekvetili', 'poti'] },

    // --- Zugdidi, the gateway to Svaneti ------------------------------------
    { from: 'zugdidi', category: CITY, both: true, tier: 'TIER_2', to: ['mestia', 'ushguli', 'martvili'] }
];

/**
 * Multi-stop itineraries, seeded as routes with intermediate stops.
 *
 * The same shape as everything above — a start, an end and a price per class —
 * with the places in between carried as stops. A day trip that takes in Mtskheta
 * on the way to Kazbegi is one product sold once, not three transfers a
 * traveller has to assemble themselves.
 */
export const COMBINED_ROUTES = [
    {
        slug: 'tbilisi-airport-gudauri-kazbegi-tbilisi',
        from: 'tbilisi-airport',
        to: 'tbilisi',
        stops: ['mtskheta', 'ananuri', 'gudauri', 'kazbegi'],
        tier: 'TIER_1',
        title: 'Classic Georgia: Tbilisi Airport, Gudauri and Kazbegi',
        summary:
            'The Georgian Military Highway in one day, from the terminal to Gergeti and back into the city.'
    },
    {
        slug: 'tbilisi-sighnaghi-kvareli-telavi',
        from: 'tbilisi',
        to: 'telavi',
        stops: ['bodbe', 'sighnaghi', 'kvareli'],
        tier: 'TIER_2',
        title: 'Kakheti wine road: Sighnaghi, Kvareli and Telavi',
        summary: 'Three cellars, a walled town above the Alazani valley, and a driver who waits at each.'
    },
    {
        slug: 'tbilisi-mtskheta-telavi',
        from: 'tbilisi',
        to: 'telavi',
        stops: ['mtskheta'],
        tier: 'TIER_3',
        title: 'Mtskheta and on to Telavi',
        summary: 'The old capital in the morning, the wine country by the afternoon.'
    },
    {
        slug: 'tbilisi-davit-gareja-sighnaghi',
        from: 'tbilisi',
        to: 'sighnaghi',
        stops: ['davit-gareja'],
        tier: 'TIER_3',
        title: 'Davit Gareja and Sighnaghi',
        summary: 'The desert monasteries on the Azerbaijani border, then the balcony town above the valley.'
    },
    {
        // Out via Borjomi and back the same day is a RETURN booking on this
        // route, not a route that starts and ends in the same place: the
        // schema refuses that pair, and rightly, because it is not a journey.
        slug: 'tbilisi-borjomi-bakuriani',
        from: 'tbilisi',
        to: 'bakuriani',
        stops: ['borjomi'],
        tier: 'TIER_3',
        title: 'Borjomi and Bakuriani in a day',
        summary: 'Mineral water in the park, then the pine road up to the ski town.'
    },
    {
        slug: 'kutaisi-airport-kutaisi-batumi',
        from: 'kutaisi-airport',
        to: 'batumi',
        stops: ['kutaisi'],
        tier: 'TIER_2',
        title: 'Kutaisi Airport to Batumi, with Kutaisi on the way',
        summary: 'Land, see the cathedral and the canyon, and reach the sea before dinner.'
    },
    {
        slug: 'kutaisi-airport-martvili-mestia',
        from: 'kutaisi-airport',
        to: 'mestia',
        stops: ['martvili', 'zugdidi'],
        tier: 'TIER_2',
        title: 'Kutaisi Airport to Mestia, through Martvili',
        summary: 'The canyon and the Dadiani palace, then the long climb into Svaneti.'
    },
    {
        slug: 'batumi-airport-batumi-mestia',
        from: 'batumi-airport',
        to: 'mestia',
        stops: ['batumi', 'zugdidi'],
        tier: 'TIER_3',
        title: 'Batumi Airport to Mestia',
        summary: 'Sea level to two thousand metres, in one drive.'
    },
    {
        slug: 'tbilisi-gudauri-kazbegi-mestia-ushguli-kutaisi',
        from: 'tbilisi',
        to: 'kutaisi',
        stops: ['gudauri', 'kazbegi', 'mestia', 'ushguli'],
        tier: 'TIER_3',
        title: 'Mountain tour: the Caucasus end to end',
        summary: 'Both of the great mountain roads, and the villages at the end of each.'
    },
    {
        slug: 'tbilisi-airport-kakheti-kazbegi-borjomi-kutaisi-mestia-batumi-airport',
        from: 'tbilisi-airport',
        to: 'batumi-airport',
        stops: ['tbilisi', 'telavi', 'kazbegi', 'borjomi', 'kutaisi', 'mestia', 'batumi'],
        tier: 'TIER_3',
        title: 'Georgia grand tour, terminal to terminal',
        summary: 'The whole country by road, arriving at one airport and leaving from another.'
    }
];

/**
 * Turns the groups into one row per ordered pair.
 *
 * De-duplicated on the pair, because the groups overlap on purpose — Tbilisi to
 * Mestia appears under both "main cities" and "mountain resorts", and the brief
 * lists it twice for the same reason a shop puts one product on two shelves.
 * The first occurrence wins, so the more specific group listed earlier sets the
 * category.
 */
export const expandRoutes = () => {
    const rows = new Map();

    const add = (from, to, group) => {
        const key = `${from}>${to}`;

        if (from === to || rows.has(key)) {
            return;
        }

        const tier =
            group.tier1?.includes(to) ? 'TIER_1'
            : group.tier2?.includes(to) ? 'TIER_2'
            : group.tier3?.includes(to) ? 'TIER_3'
            : group.tier ?? 'TIER_3';

        rows.set(key, {
            slug: `${from}-to-${to}`,
            fromSlug: from,
            toSlug: to,
            tier,
            category: group.category,
            stops: [],
            featured: tier === 'TIER_1'
        });
    };

    for (const group of ROUTE_GROUPS) {
        for (const to of group.to) {
            add(group.from, to, group);

            if (group.both) {
                // The reverse is its own row and gets the same tier: if the
                // drive out sells, so does the drive back.
                add(to, group.from, { ...group, tier1: group.tier1, tier2: group.tier2, tier3: group.tier3 });
            }
        }
    }

    for (const route of COMBINED_ROUTES) {
        if (route.from === route.to) {
            throw new Error(`Combined route ${route.slug} starts and ends in the same place`);
        }

        rows.set(route.slug, {
            slug: route.slug,
            fromSlug: route.from,
            toSlug: route.to,
            tier: route.tier,
            category: route.category ?? COMBINED,
            stops: route.stops,
            title: route.title,
            summary: route.summary,
            featured: route.tier === 'TIER_1'
        });
    }

    return [...rows.values()];
};
