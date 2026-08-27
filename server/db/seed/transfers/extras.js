/**
 * The add-ons offered on every route, from section 18 of the operator's brief.
 *
 * `usd` is converted at seed time, for the same reason the fleet's fares are:
 * the numbers were tuned in dollars and restating them in GEL by hand would
 * lose whatever judgement went into them.
 *
 * `appliesToClasses` empty means every class. Where it is set, the extra is
 * either physically impossible elsewhere (a ski rack on a saloon) or already
 * included in the price (meet and greet on the VIP class, which is the whole
 * point of that class).
 */

export const TRANSFER_EXTRAS = [
    {
        code: 'childSeat',
        name: 'Child seat',
        description: 'A forward-facing seat or booster, fitted before pick-up. Tell us the age at booking.',
        basis: 'FIXED',
        usd: 8,
        appliesToClasses: ['ECONOMY', 'COMFORT', 'MINIVAN', 'VAN', 'JEEP_4X4', 'VIP'],
        position: 1
    },
    {
        code: 'infantSeat',
        name: 'Infant seat',
        description: 'A rear-facing seat for a child under two.',
        basis: 'FIXED',
        usd: 8,
        appliesToClasses: ['ECONOMY', 'COMFORT', 'MINIVAN', 'VAN', 'JEEP_4X4', 'VIP'],
        position: 2
    },
    {
        code: 'meetGreet',
        name: 'Meet and greet inside the terminal',
        description: 'The driver waits inside arrivals with a name board and helps with luggage, rather than meeting you at the kerb.',
        basis: 'FIXED',
        usd: 12,
        appliesToClasses: ['ECONOMY', 'COMFORT', 'MINIVAN', 'VAN', 'JEEP_4X4'],
        position: 3
    },
    {
        code: 'skiEquipment',
        name: 'Ski and snowboard carriage',
        description: 'A roof box or rack for skis and boards. Priced per vehicle, not per set.',
        basis: 'FIXED',
        usd: 15,
        appliesToClasses: ['COMFORT', 'MINIVAN', 'VAN', 'JEEP_4X4', 'VIP'],
        position: 4
    },
    {
        code: 'extraStop',
        name: 'Additional stop',
        description: 'One extra stop of up to thirty minutes on the way — a viewpoint, a monastery, a shop.',
        basis: 'FIXED',
        usd: 18,
        appliesToClasses: [],
        position: 5
    },
    {
        code: 'sightseeingHour',
        name: 'Sightseeing time',
        description: 'The driver waits while you look around, charged by the hour.',
        basis: 'PER_HOUR',
        usd: 14,
        appliesToClasses: [],
        position: 6
    },
    {
        code: 'englishGuide',
        name: 'English-speaking guide',
        description: 'A licensed guide travelling with you, in addition to the driver.',
        basis: 'PER_HOUR',
        usd: 22,
        appliesToClasses: [],
        position: 7
    },
    {
        code: 'russianDriver',
        name: 'Russian-speaking driver',
        description: 'A driver who speaks Russian rather than English. Subject to availability on the day.',
        basis: 'FIXED',
        usd: 6,
        appliesToClasses: [],
        position: 8
    },
    {
        code: 'extendedWaiting',
        name: 'Extended airport waiting',
        description: 'A further hour of free waiting beyond the allowance, for a connection you expect to be slow.',
        basis: 'PER_HOUR',
        usd: 10,
        appliesToClasses: [],
        position: 9
    },
    {
        code: 'petCarriage',
        name: 'Travelling with a pet',
        description: 'A carrier space and a driver who has agreed to it in advance.',
        basis: 'FIXED',
        usd: 12,
        appliesToClasses: [],
        position: 10
    },
    {
        code: 'extraLuggage',
        name: 'Additional large bag',
        description: 'One bag beyond the vehicle allowance, where there is room for it.',
        basis: 'PER_PASSENGER',
        usd: 5,
        appliesToClasses: [],
        position: 11
    },
    {
        code: 'doorToDoor',
        name: 'Door-to-door pick-up',
        description: 'Collection from your own address rather than the shuttle stand.',
        basis: 'FIXED',
        usd: 10,
        appliesToClasses: ['MINIVAN', 'GROUP'],
        position: 12
    },
    {
        code: 'multiDayDriver',
        name: 'Driver at your disposal',
        description: 'The same driver and vehicle for the day, rather than a single journey. Priced on top of the fare as a proportion of it.',
        basis: 'PERCENT',
        // Basis points, not minor units: 60% of the leg fare.
        bps: 6000,
        appliesToClasses: [],
        position: 13
    },
    {
        code: 'secondDriver',
        name: 'Second driver',
        description: 'Required by law on journeys over eight hours at the wheel, and quoted rather than optional on those routes.',
        basis: 'PERCENT',
        bps: 4500,
        appliesToClasses: ['VAN', 'GROUP'],
        position: 14
    }
];
