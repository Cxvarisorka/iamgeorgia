/**
 * Every pick-up and drop-off point in the transfer catalogue.
 *
 * Coordinates are real and were checked against the places themselves, because
 * they are not decoration: with no curated price on a route, the distance
 * between two of these *is* the fare. A transposed pair would not look wrong on
 * a map nobody renders — it would quietly sell a Tbilisi–Batumi drive for the
 * price of a ride across town.
 *
 * `region` is the second line of every option row in the picker. It is free
 * text rather than a relation because several of these sit in regions that have
 * no destination page and may never have one.
 *
 * `destination` names a slug in the marketing tree when there is a sensible
 * one, and the seed resolves it to an id. A missing match is not an error: an
 * airport terminal is not a place anyone browses holidays by.
 */

export const TRANSFER_POINTS = [
    // --- Airports ----------------------------------------------------------
    {
        slug: 'tbilisi-airport',
        name: 'Tbilisi International Airport',
        kind: 'AIRPORT',
        iataCode: 'TBS',
        region: 'Tbilisi',
        latitude: 41.6692,
        longitude: 44.9547,
        popular: true,
        destination: 'tbilisi'
    },
    {
        slug: 'kutaisi-airport',
        name: 'Kutaisi International Airport',
        kind: 'AIRPORT',
        iataCode: 'KUT',
        region: 'Imereti',
        latitude: 42.1767,
        longitude: 42.4826,
        popular: true
    },
    {
        slug: 'batumi-airport',
        name: 'Batumi International Airport',
        kind: 'AIRPORT',
        iataCode: 'BUS',
        region: 'Adjara',
        latitude: 41.6103,
        longitude: 41.5997,
        popular: true,
        destination: 'batumi'
    },
    {
        slug: 'mestia-airport',
        name: 'Queen Tamar Airport, Mestia',
        kind: 'AIRPORT',
        // No IATA code: Queen Tamar is served by domestic charter only.
        region: 'Svaneti',
        latitude: 43.0537,
        longitude: 42.7489,
        destination: 'svaneti'
    },
    {
        slug: 'ambrolauri-airport',
        name: 'Ambrolauri Airport',
        kind: 'AIRPORT',
        region: 'Racha',
        latitude: 42.5119,
        longitude: 43.1327
    },

    // --- Cities ------------------------------------------------------------
    {
        slug: 'tbilisi',
        name: 'Tbilisi',
        kind: 'CITY',
        region: 'Tbilisi',
        latitude: 41.7151,
        longitude: 44.8271,
        popular: true,
        destination: 'tbilisi'
    },
    {
        slug: 'kutaisi',
        name: 'Kutaisi',
        kind: 'CITY',
        region: 'Imereti',
        latitude: 42.2679,
        longitude: 42.718,
        popular: true
    },
    {
        slug: 'batumi',
        name: 'Batumi',
        kind: 'CITY',
        region: 'Adjara',
        latitude: 41.6168,
        longitude: 41.6367,
        popular: true,
        destination: 'batumi'
    },
    { slug: 'mtskheta', name: 'Mtskheta', kind: 'CITY', region: 'Mtskheta-Mtianeti', latitude: 41.8458, longitude: 44.7208, destination: 'mtskheta' },
    { slug: 'gori', name: 'Gori', kind: 'CITY', region: 'Shida Kartli', latitude: 41.9847, longitude: 44.1086 },
    { slug: 'zugdidi', name: 'Zugdidi', kind: 'CITY', region: 'Samegrelo', latitude: 42.5088, longitude: 41.8709 },
    { slug: 'poti', name: 'Poti', kind: 'CITY', region: 'Samegrelo', latitude: 42.1462, longitude: 41.673 },
    { slug: 'ozurgeti', name: 'Ozurgeti', kind: 'CITY', region: 'Guria', latitude: 41.9245, longitude: 42.0075 },
    { slug: 'telavi', name: 'Telavi', kind: 'CITY', region: 'Kakheti', latitude: 41.9197, longitude: 45.4731, destination: 'kakheti' },
    { slug: 'sighnaghi', name: 'Sighnaghi', kind: 'CITY', region: 'Kakheti', latitude: 41.6197, longitude: 45.9217, popular: true, destination: 'kakheti' },
    { slug: 'kvareli', name: 'Kvareli', kind: 'CITY', region: 'Kakheti', latitude: 41.9497, longitude: 45.8156, destination: 'kakheti' },
    { slug: 'gurjaani', name: 'Gurjaani', kind: 'CITY', region: 'Kakheti', latitude: 41.7452, longitude: 45.8003, destination: 'kakheti' },
    { slug: 'lagodekhi', name: 'Lagodekhi', kind: 'CITY', region: 'Kakheti', latitude: 41.8265, longitude: 46.2758, destination: 'kakheti' },
    { slug: 'dedoplistskaro', name: 'Dedoplistskaro', kind: 'CITY', region: 'Kakheti', latitude: 41.4658, longitude: 46.1035, destination: 'kakheti' },
    { slug: 'napareuli', name: 'Napareuli', kind: 'CITY', region: 'Kakheti', latitude: 42.0189, longitude: 45.4056, destination: 'kakheti' },
    { slug: 'tsinandali', name: 'Tsinandali', kind: 'CITY', region: 'Kakheti', latitude: 41.8964, longitude: 45.5661, destination: 'kakheti' },
    { slug: 'akhaltsikhe', name: 'Akhaltsikhe', kind: 'CITY', region: 'Samtskhe-Javakheti', latitude: 41.6394, longitude: 42.9826 },
    { slug: 'akhalkalaki', name: 'Akhalkalaki', kind: 'CITY', region: 'Samtskhe-Javakheti', latitude: 41.4053, longitude: 43.4864 },
    { slug: 'martvili', name: 'Martvili', kind: 'CITY', region: 'Samegrelo', latitude: 42.4145, longitude: 42.3789 },
    { slug: 'tsageri', name: 'Tsageri', kind: 'CITY', region: 'Racha-Lechkhumi', latitude: 42.6472, longitude: 42.7592 },
    { slug: 'ambrolauri', name: 'Ambrolauri', kind: 'CITY', region: 'Racha', latitude: 42.5205, longitude: 43.1583 },
    { slug: 'oni', name: 'Oni', kind: 'CITY', region: 'Racha', latitude: 42.5786, longitude: 43.4406 },
    { slug: 'lentekhi', name: 'Lentekhi', kind: 'CITY', region: 'Lower Svaneti', latitude: 42.7908, longitude: 42.7208 },
    { slug: 'keda', name: 'Keda', kind: 'CITY', region: 'Adjara', latitude: 41.5936, longitude: 41.9436 },
    { slug: 'shuakhevi', name: 'Shuakhevi', kind: 'CITY', region: 'Adjara', latitude: 41.6303, longitude: 42.1908 },
    { slug: 'khulo', name: 'Khulo', kind: 'CITY', region: 'Adjara', latitude: 41.6472, longitude: 42.3097 },

    // --- Resorts -----------------------------------------------------------
    { slug: 'gudauri', name: 'Gudauri', kind: 'RESORT', region: 'Mtskheta-Mtianeti', latitude: 42.4781, longitude: 44.4783, popular: true, destination: 'gudauri' },
    { slug: 'kazbegi', name: 'Stepantsminda (Kazbegi)', kind: 'RESORT', region: 'Mtskheta-Mtianeti', latitude: 42.6579, longitude: 44.6408, popular: true, destination: 'kazbegi' },
    { slug: 'juta', name: 'Juta', kind: 'RESORT', region: 'Mtskheta-Mtianeti', latitude: 42.55, longitude: 44.75, destination: 'kazbegi' },
    { slug: 'bakuriani', name: 'Bakuriani', kind: 'RESORT', region: 'Samtskhe-Javakheti', latitude: 41.748, longitude: 43.532, popular: true },
    { slug: 'borjomi', name: 'Borjomi', kind: 'RESORT', region: 'Samtskhe-Javakheti', latitude: 41.8397, longitude: 43.3906, popular: true, destination: 'borjomi' },
    { slug: 'goderdzi', name: 'Goderdzi', kind: 'RESORT', region: 'Adjara', latitude: 41.6333, longitude: 42.4833 },
    { slug: 'mestia', name: 'Mestia', kind: 'RESORT', region: 'Svaneti', latitude: 43.045, longitude: 42.7278, popular: true, destination: 'svaneti' },
    { slug: 'ushguli', name: 'Ushguli', kind: 'RESORT', region: 'Svaneti', latitude: 42.9167, longitude: 43.0167, destination: 'svaneti' },
    { slug: 'tetnuldi', name: 'Tetnuldi', kind: 'RESORT', region: 'Svaneti', latitude: 43.05, longitude: 42.85, destination: 'svaneti' },
    { slug: 'hatsvali', name: 'Hatsvali', kind: 'RESORT', region: 'Svaneti', latitude: 43.0167, longitude: 42.7333, destination: 'svaneti' },
    { slug: 'adishi', name: 'Adishi', kind: 'RESORT', region: 'Svaneti', latitude: 43.0, longitude: 42.9333, destination: 'svaneti' },
    { slug: 'shovi', name: 'Shovi', kind: 'RESORT', region: 'Racha', latitude: 42.6822, longitude: 43.6789 },
    { slug: 'omalo', name: 'Omalo (Tusheti)', kind: 'RESORT', region: 'Tusheti', latitude: 42.3667, longitude: 45.6333 },
    { slug: 'shatili', name: 'Shatili', kind: 'RESORT', region: 'Khevsureti', latitude: 42.6597, longitude: 45.1583 },
    { slug: 'tskaltubo', name: 'Tskaltubo', kind: 'RESORT', region: 'Imereti', latitude: 42.3419, longitude: 42.5967 },
    { slug: 'ureki', name: 'Ureki', kind: 'RESORT', region: 'Guria', latitude: 41.9822, longitude: 41.7856 },
    { slug: 'shekvetili', name: 'Shekvetili', kind: 'RESORT', region: 'Guria', latitude: 41.9333, longitude: 41.7667 },
    { slug: 'grigoleti', name: 'Grigoleti', kind: 'RESORT', region: 'Guria', latitude: 42.0333, longitude: 41.75 },
    { slug: 'kobuleti', name: 'Kobuleti', kind: 'RESORT', region: 'Adjara', latitude: 41.8203, longitude: 41.7761, popular: true },
    { slug: 'chakvi', name: 'Chakvi', kind: 'RESORT', region: 'Adjara', latitude: 41.7333, longitude: 41.7333 },
    { slug: 'tsikhisdziri', name: 'Tsikhisdziri', kind: 'RESORT', region: 'Adjara', latitude: 41.7667, longitude: 41.75 },
    { slug: 'makhinjauri', name: 'Makhinjauri', kind: 'RESORT', region: 'Adjara', latitude: 41.6739, longitude: 41.6883 },
    { slug: 'gonio', name: 'Gonio', kind: 'RESORT', region: 'Adjara', latitude: 41.5731, longitude: 41.5744 },
    { slug: 'kvariati', name: 'Kvariati', kind: 'RESORT', region: 'Adjara', latitude: 41.55, longitude: 41.55 },
    { slug: 'sarpi', name: 'Sarpi', kind: 'RESORT', region: 'Adjara', latitude: 41.5219, longitude: 41.5461 },

    // --- Landmarks ---------------------------------------------------------
    { slug: 'uplistsikhe', name: 'Uplistsikhe', kind: 'LANDMARK', region: 'Shida Kartli', latitude: 41.9667, longitude: 44.2072 },
    { slug: 'vardzia', name: 'Vardzia', kind: 'LANDMARK', region: 'Samtskhe-Javakheti', latitude: 41.3811, longitude: 43.2836 },
    { slug: 'ananuri', name: 'Ananuri', kind: 'LANDMARK', region: 'Mtskheta-Mtianeti', latitude: 42.1631, longitude: 44.7031 },
    { slug: 'davit-gareja', name: 'Davit Gareja', kind: 'LANDMARK', region: 'Kakheti', latitude: 41.4472, longitude: 45.3778, destination: 'kakheti' },
    { slug: 'bodbe', name: 'Bodbe Monastery', kind: 'LANDMARK', region: 'Kakheti', latitude: 41.6019, longitude: 45.9231, destination: 'kakheti' },
    { slug: 'kvareli-lake', name: 'Kvareli Lake', kind: 'LANDMARK', region: 'Kakheti', latitude: 41.9667, longitude: 45.8167, destination: 'kakheti' },
    { slug: 'sataplia', name: 'Sataplia Nature Reserve', kind: 'LANDMARK', region: 'Imereti', latitude: 42.3167, longitude: 42.6667 },
    { slug: 'prometheus-cave', name: 'Prometheus Cave', kind: 'LANDMARK', region: 'Imereti', latitude: 42.3767, longitude: 42.6003 },
    { slug: 'okatse', name: 'Okatse Canyon', kind: 'LANDMARK', region: 'Imereti', latitude: 42.45, longitude: 42.5167 },
    { slug: 'makhuntseti', name: 'Makhuntseti Waterfall', kind: 'LANDMARK', region: 'Adjara', latitude: 41.6333, longitude: 41.8667 },

    // --- Stations ----------------------------------------------------------
    { slug: 'kutaisi-railway', name: 'Kutaisi Railway Station', kind: 'STATION', region: 'Imereti', latitude: 42.25, longitude: 42.7 }
];

/** Slug lookup, so the route catalogue can be written as pairs of slugs. */
export const POINT_SLUGS = new Set(TRANSFER_POINTS.map((point) => point.slug));
