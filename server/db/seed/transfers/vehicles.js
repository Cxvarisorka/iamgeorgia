/**
 * The fleet: five suppliers and nine sellable classes.
 *
 * Two vocabularies meet here and it is worth being explicit about which is
 * which. `vehicleClass` is the **commercial product** from the operator's brief
 * — Economy, Comfort, Minivan, Van, Group, 4x4, VIP — and it is what a price
 * list is written against. `body` is what the vehicle physically is, and it
 * only decides which illustration the client draws. A Comfort and an Economy
 * are both sedans; they are not the same product.
 *
 * Prices here are the **fallback** fare model, used only where an admin has not
 * priced a route. They are carried over from the client prototype in US dollars
 * and converted at seed time, because that is where the numbers were tuned
 * against real journeys and re-inventing them in GEL would lose that.
 */

export const TRANSFER_PROVIDERS = [
    { slug: 'georgian-transfer', name: 'Georgian Transfer', rating: 4.8, reviewCount: 1240, verified: true, yearsActive: 9 },
    { slug: 'caucasus-travel-transport', name: 'Caucasus Travel Transport', rating: 4.7, reviewCount: 860, verified: true, yearsActive: 12 },
    { slug: 'tbilisi-premium-transfers', name: 'Tbilisi Premium Transfers', rating: 4.9, reviewCount: 415, verified: true, yearsActive: 6 },
    { slug: 'kartli-road-transfers', name: 'Kartli Road Transfers', rating: 4.6, reviewCount: 622, verified: true, yearsActive: 8 },
    { slug: 'iberia-coach', name: 'Iberia Coach Company', rating: 4.5, reviewCount: 298, verified: true, yearsActive: 15 }
];

/**
 * `usd` is the prototype's fare model and is converted at seed time.
 * `b2cEnabled` mirrors the client's `b2cSlugs`: the trade-only classes stay
 * closed to the public until someone decides otherwise in the panel.
 */
export const TRANSFER_VEHICLES = [
    {
        slug: 'economy-sedan-private-transfer',
        name: 'Economy Sedan',
        vehicleClass: 'ECONOMY',
        body: 'sedan',
        kind: 'PRIVATE',
        provider: 'kartli-road-transfers',
        vehicleExample: 'Toyota Prius, Hyundai Elantra or similar',
        maxPassengers: 3,
        maxLuggage: 2,
        maxCabinBags: 1,
        features: ['airConditioning', 'englishDriver', 'flightTracking'],
        summary: 'The straightforward option: a clean, air-conditioned saloon and a driver who knows the road.',
        description: [
            'An economy saloon for one to three travellers with normal luggage. Nothing is stripped out that matters — the car is air-conditioned, the driver speaks English, and an airport pick-up is tracked against the flight.',
            'It is the class most people should book for a city transfer or a run to the airport.'
        ],
        included: ['Private vehicle and driver', 'All road tolls and parking', 'Flight monitoring on airport pick-ups', '60 minutes of free waiting at the airport'],
        excluded: ['Gratuities', 'Child seats unless requested', 'Additional stops not agreed in advance'],
        pickupProcedure:
            'For an airport pick-up the driver waits in arrivals with a name board. For any other address, they call twenty minutes before the agreed time.',
        usd: { perKm: 0.34, minimumFare: 18, airportFee: 4 },
        paceFactor: 1.02,
        recommendedRank: 5,
        b2cEnabled: true
    },
    {
        slug: 'comfort-sedan-private-transfer',
        name: 'Comfort Sedan',
        vehicleClass: 'COMFORT',
        body: 'sedan',
        kind: 'PRIVATE',
        provider: 'georgian-transfer',
        vehicleExample: 'Toyota Camry, Skoda Superb or similar',
        maxPassengers: 3,
        maxLuggage: 2,
        maxCabinBags: 2,
        features: ['airConditioning', 'wifi', 'englishDriver', 'flightTracking', 'bottledWater', 'freeWaiting'],
        summary: 'A step up in room and quiet, for the same journey.',
        description: [
            'A full-size saloon with more leg room and a quieter cabin than the economy class, which matters on a four-hour drive in a way it does not on a twenty-minute one.',
            'Bottled water, on-board wifi and an English-speaking driver come as standard.'
        ],
        included: ['Private vehicle and driver', 'All road tolls and parking', 'Bottled water', 'On-board wifi', 'Flight monitoring and 60 minutes of free waiting'],
        excluded: ['Gratuities', 'Child seats unless requested', 'Meals and entry tickets on sightseeing stops'],
        pickupProcedure:
            'Meet and greet in arrivals with a name board, or a call twenty minutes ahead at any other address.',
        usd: { perKm: 0.45, minimumFare: 25, airportFee: 5 },
        paceFactor: 1,
        recommendedRank: 2,
        b2cEnabled: true
    },
    {
        slug: 'executive-sedan-private-transfer',
        name: 'Executive Sedan',
        vehicleClass: 'VIP',
        body: 'sedan',
        kind: 'PRIVATE',
        provider: 'tbilisi-premium-transfers',
        vehicleExample: 'Mercedes-Benz E-Class, BMW 5 Series or similar',
        maxPassengers: 3,
        maxLuggage: 3,
        maxCabinBags: 2,
        features: ['airConditioning', 'wifi', 'englishDriver', 'meetGreet', 'flightTracking', 'bottledWater', 'freeWaiting'],
        summary: 'A premium car, a professional driver and someone waiting for you inside the terminal.',
        description: [
            'An executive saloon with a driver in a suit, met inside the terminal rather than at the kerb, with help to the car and luggage handled.',
            'Booked mostly for arrivals that matter: a first night, a business trip, or the start of a long journey.'
        ],
        included: ['Premium vehicle and professional driver', 'Meet and greet inside the terminal', 'Luggage assistance', 'Bottled water and on-board wifi', '90 minutes of free waiting'],
        excluded: ['Gratuities', 'Child seats unless requested'],
        pickupProcedure:
            'The driver meets you inside the terminal at the exit from baggage reclaim, with a name board, and walks you to the car.',
        usd: { perKm: 0.78, minimumFare: 55, airportFee: 8 },
        paceFactor: 0.98,
        recommendedRank: 4,
        b2cEnabled: true
    },
    {
        slug: 'premium-suv-private-transfer',
        name: 'Premium 4x4',
        vehicleClass: 'JEEP_4X4',
        body: 'suv',
        kind: 'PRIVATE',
        provider: 'caucasus-travel-transport',
        vehicleExample: 'Toyota Land Cruiser, Mitsubishi Pajero or similar',
        maxPassengers: 4,
        maxLuggage: 4,
        maxCabinBags: 3,
        features: ['airConditioning', 'wifi', 'englishDriver', 'flightTracking', 'bottledWater', 'freeWaiting'],
        summary: 'The class for mountain roads: Gudauri, Svaneti, Tusheti and Racha.',
        description: [
            'A high-clearance four-wheel drive with winter tyres in season. On the roads to Ushguli, Omalo, Shatili and the Goderdzi pass it is not an upgrade, it is the only vehicle that will make the journey.',
            'It is also the comfortable choice for the Georgian Military Highway in winter, when the pass above Gudauri closes at short notice.'
        ],
        included: ['4x4 vehicle and mountain-experienced driver', 'Winter tyres in season', 'All road tolls and parking', 'Bottled water and on-board wifi'],
        excluded: ['Gratuities', 'Overnight driver accommodation on multi-day hires', 'Entry tickets on sightseeing stops'],
        pickupProcedure:
            'The driver calls the evening before to confirm road conditions, then twenty minutes before the pick-up itself.',
        usd: { perKm: 0.75, minimumFare: 45, airportFee: 8 },
        paceFactor: 1.02,
        recommendedRank: 3,
        b2cEnabled: true
    },
    {
        slug: 'comfort-minivan-private-transfer',
        name: 'Comfort Minivan',
        vehicleClass: 'MINIVAN',
        body: 'minivan',
        kind: 'PRIVATE',
        provider: 'georgian-transfer',
        vehicleExample: 'Mercedes-Benz V-Class, Toyota Alphard or similar',
        maxPassengers: 6,
        maxLuggage: 6,
        maxCabinBags: 4,
        features: ['airConditioning', 'wifi', 'childSeat', 'englishDriver', 'flightTracking', 'bottledWater', 'freeWaiting'],
        summary: 'Room for a family and its luggage, without splitting across two cars.',
        description: [
            'A minivan seating up to six with luggage for all of them, which is the point: a family of five in two saloons pays twice and arrives separately.',
            'Child seats are fitted free of charge when you ask for them at booking.'
        ],
        included: ['Private minivan and driver', 'Child seats on request', 'All road tolls and parking', 'Bottled water and on-board wifi', 'Flight monitoring and 60 minutes of free waiting'],
        excluded: ['Gratuities', 'Entry tickets on sightseeing stops'],
        pickupProcedure:
            'Meet and greet in arrivals with a name board, or a call twenty minutes ahead at any other address.',
        usd: { perKm: 0.62, minimumFare: 40, airportFee: 7 },
        paceFactor: 1.06,
        recommendedRank: 1,
        b2cEnabled: true
    },
    {
        slug: 'group-van-private-transfer',
        name: 'Group Van',
        vehicleClass: 'VAN',
        body: 'van',
        kind: 'PRIVATE',
        provider: 'caucasus-travel-transport',
        vehicleExample: 'Mercedes-Benz Sprinter, Ford Transit or similar',
        maxPassengers: 12,
        maxLuggage: 12,
        maxCabinBags: 8,
        features: ['airConditioning', 'englishDriver', 'flightTracking', 'bottledWater', 'freeWaiting'],
        summary: 'One vehicle for a group of up to twelve, with a full luggage allowance each.',
        description: [
            'A high-roof van for a group travelling together, with standing room to load and a separate luggage compartment.',
            'The usual booking for a tour group arriving on one flight, or a party moving between cities.'
        ],
        included: ['Private van and driver', 'All road tolls and parking', 'Bottled water', 'Flight monitoring and 90 minutes of free waiting'],
        excluded: ['Gratuities', 'Overnight driver accommodation on multi-day hires'],
        pickupProcedure:
            'The driver meets the group in arrivals with a name board and waits until everyone has cleared baggage reclaim.',
        usd: { perKm: 0.85, minimumFare: 60, airportFee: 8 },
        paceFactor: 1.12,
        recommendedRank: 6,
        b2cEnabled: true
    },
    {
        slug: 'private-coach-transfer',
        name: 'Private Coach',
        vehicleClass: 'GROUP',
        body: 'bus',
        kind: 'PRIVATE',
        provider: 'iberia-coach',
        vehicleExample: 'Setra or Neoplan 30 to 49 seat coach',
        maxPassengers: 30,
        maxLuggage: 30,
        maxCabinBags: 30,
        features: ['airConditioning', 'englishDriver', 'freeWaiting'],
        summary: 'A full coach, chartered for one group.',
        description: [
            'A touring coach with a hold, a guide microphone and a driver on regulated hours. Booked for conferences, weddings and tour groups moving as one.',
            'Journeys over eight hours are quoted with a second driver, which is a legal requirement rather than an upsell.'
        ],
        included: ['Chartered coach and driver', 'Guide microphone', 'All road tolls and parking'],
        excluded: ['Gratuities', 'Driver accommodation on multi-day charters', 'A second driver on journeys over eight hours'],
        pickupProcedure:
            'The coach parks in the designated coach bay and the driver meets the group leader in arrivals.',
        usd: { perKm: 1.25, minimumFare: 120, airportFee: 12 },
        paceFactor: 1.25,
        recommendedRank: 8,
        b2cEnabled: false
    },
    {
        slug: 'shared-shuttle-transfer',
        name: 'Shared Shuttle',
        vehicleClass: 'MINIVAN',
        body: 'minivan',
        kind: 'SHARED',
        provider: 'kartli-road-transfers',
        vehicleExample: 'Mercedes-Benz Sprinter, 8 seats',
        maxPassengers: 8,
        maxLuggage: 8,
        maxCabinBags: 8,
        features: ['airConditioning', 'englishDriver'],
        summary: 'A seat on a scheduled run, priced per person.',
        description: [
            'The shuttle leaves at fixed times and picks up other travellers on the way, so it takes longer than a private car and costs a fraction of it.',
            'Priced per seat: the fare shown is multiplied by the number of passengers.'
        ],
        included: ['One seat per passenger', 'One large bag and one cabin bag per passenger', 'All road tolls'],
        excluded: ['Door-to-door pick-up', 'Gratuities', 'Child seats'],
        pickupProcedure:
            'Board at the marked shuttle stand outside arrivals. The shuttle departs at the scheduled time whether or not every seat is taken.',
        usd: { perKm: 0.14, minimumFare: 12, airportFee: 2 },
        paceFactor: 1.35,
        recommendedRank: 7,
        b2cEnabled: true
    },
    {
        slug: 'shared-coach-seat-transfer',
        name: 'Shared Coach Seat',
        vehicleClass: 'GROUP',
        body: 'bus',
        kind: 'SHARED',
        provider: 'iberia-coach',
        vehicleExample: 'Setra 49-seat coach',
        maxPassengers: 30,
        maxLuggage: 30,
        maxCabinBags: 30,
        features: ['airConditioning'],
        summary: 'The cheapest way between two cities, on a scheduled coach.',
        description: [
            'A seat on a scheduled intercity coach, with a hold for luggage and a comfort stop on longer routes.',
            'Priced per seat, and slower than everything else here — which is the trade being made.'
        ],
        included: ['One reserved seat', 'One hold bag and one cabin bag', 'A comfort stop on journeys over three hours'],
        excluded: ['Door-to-door pick-up', 'Gratuities', 'Seat selection'],
        pickupProcedure: 'Board at the coach station at least fifteen minutes before departure with your reference.',
        usd: { perKm: 0.09, minimumFare: 8, airportFee: 2 },
        paceFactor: 1.5,
        recommendedRank: 9,
        b2cEnabled: true
    }
];
