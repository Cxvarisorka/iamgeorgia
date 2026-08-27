/**
 * Occupancy resolution: can these people stay in this room?
 *
 * Deliberately pure — plain data in, plain data out, no Prisma and no `req`.
 * That is what makes the awkward cases here exhaustively testable without a
 * database, and they are the cases that decide whether a family sees a hotel at
 * all. Search calls this for every candidate room type; booking calls it again
 * before it commits.
 *
 * The rule that catches people out: **age is evaluated at check-in and never
 * changes during the stay.** A child who turns twelve on the third night is a
 * child for the whole booking. That is the industry norm, and stating it here
 * means nobody has to rediscover it from the pricing later.
 */

export const DEFAULT_CHILD_POLICY = {
    infantMaxAge: 2,
    childMaxAge: 11,
    childrenCountTowardOccupancy: false,
    maxChildrenFreePerRoom: null
};

/**
 * Splits the requested party into the categories a hotel actually charges for.
 *
 * Note what happens above `childMaxAge`: a "child" of 15 against a policy whose
 * child band ends at 11 is counted as an adult, and is charged as one. Treating
 * them as a child would undercharge; refusing the request outright would be
 * worse. This is the single most common source of quote disputes, so it is
 * explicit rather than emergent.
 */
export const categorise = (adults, childAges = [], policy = DEFAULT_CHILD_POLICY) => {
    const infants = [];
    const children = [];
    let adultsFromChildren = 0;

    for (const age of childAges) {
        if (age <= policy.infantMaxAge) {
            infants.push(age);
        } else if (age <= policy.childMaxAge) {
            children.push(age);
        } else {
            adultsFromChildren += 1;
        }
    }

    return {
        adults: adults + adultsFromChildren,
        adultsDeclared: adults,
        adultsFromChildren,
        children,
        infants,
        // What counts against the room's maximum. Infants usually do not — a
        // cot is not a bed — and getting that wrong silently shrinks every
        // family room in the catalogue.
        countedOccupancy:
            adults + adultsFromChildren + children.length + (policy.childrenCountTowardOccupancy ? infants.length : 0)
    };
};

/**
 * The room's real capacity, from its beds.
 *
 * Falls back to `standardOccupancy` when no beds have been configured, so a
 * half-finished room type behaves sensibly rather than reporting a capacity of
 * zero and disappearing from every search.
 *
 * Only one bed group is considered at a time: groups are alternative make-ups
 * of the same room ("one king" or "two twins"), so capacity is the best any
 * single group offers, not the sum of all of them.
 */
export const bedCapacity = (roomType) => {
    const beds = roomType.beds ?? [];

    if (beds.length === 0) {
        return roomType.standardOccupancy ?? roomType.maxOccupancy ?? 0;
    }

    const byGroup = new Map();

    for (const bed of beds) {
        const sleeps = (bed.bedType?.sleeps ?? 1) * (bed.quantity ?? 1);
        byGroup.set(bed.groupIndex ?? 0, (byGroup.get(bed.groupIndex ?? 0) ?? 0) + sleeps);
    }

    return Math.max(...byGroup.values());
};

/**
 * Whether a party fits, and if not, exactly why.
 *
 * Returns every failing reason rather than the first, because search uses this
 * to explain "no rooms for 2 adults + 2 children" and one reason at a time
 * makes that a guessing game.
 */
export const resolveOccupancy = ({ roomType, childPolicy = DEFAULT_CHILD_POLICY, adults, childAges = [] }) => {
    const party = categorise(adults, childAges, childPolicy);
    const capacity = bedCapacity(roomType);
    const reasons = [];

    if (party.adults < (roomType.minAdults ?? 0)) {
        reasons.push({
            code: 'MIN_ADULTS',
            message: `This room needs at least ${roomType.minAdults} adult(s)`
        });
    }

    if (party.adults > roomType.maxAdults) {
        reasons.push({
            code: 'MAX_ADULTS',
            message: `This room takes at most ${roomType.maxAdults} adult(s)`
        });
    }

    if (party.children.length + party.infants.length > roomType.maxChildren) {
        reasons.push({
            code: 'MAX_CHILDREN',
            message: `This room takes at most ${roomType.maxChildren} child(ren)`
        });
    }

    if (party.countedOccupancy > roomType.maxOccupancy) {
        reasons.push({
            code: 'MAX_OCCUPANCY',
            message: `This room sleeps at most ${roomType.maxOccupancy} guest(s)`
        });
    }

    // Anyone the beds cannot hold needs a rollaway, and the room has a fixed
    // number it can physically take.
    const extraBedsNeeded = Math.max(0, party.countedOccupancy - capacity);

    if (extraBedsNeeded > (roomType.extraBedCapacity ?? 0)) {
        reasons.push({
            code: 'EXTRA_BEDS',
            message:
                (roomType.extraBedCapacity ?? 0) === 0
                    ? 'This room cannot take an extra bed'
                    : `This room takes at most ${roomType.extraBedCapacity} extra bed(s)`
        });
    }

    return {
        fits: reasons.length === 0,
        reasons,
        ...party,
        bedCapacity: capacity,
        extraBedsNeeded,
        // How many guests the base rate covers. Everything above it prices as
        // an extra person in Phase 4; everything below may qualify for a single
        // occupancy rate.
        standardOccupancy: roomType.standardOccupancy ?? roomType.maxOccupancy,
        extraGuests: Math.max(0, party.countedOccupancy - (roomType.standardOccupancy ?? roomType.maxOccupancy))
    };
};

/**
 * The charge band a given age falls in.
 *
 * Bands are matched most specific first — the narrowest range containing the
 * age wins — so an overlapping pair configured by a hotel resolves predictably
 * instead of depending on insertion order.
 */
export const bandForAge = (age, bands = []) => {
    const matching = bands.filter((band) => age >= band.minAge && age <= band.maxAge);

    if (matching.length === 0) {
        return null;
    }

    return matching.sort((a, b) => a.maxAge - a.minAge - (b.maxAge - b.minAge))[0];
};

/**
 * Which room types can hold this party, each with the reason if it cannot.
 *
 * One pass over already-loaded room types rather than a query per room: search
 * has the whole hotel in memory by this point and asking the database again per
 * room type is where N+1 creeps in.
 */
export const filterRoomTypes = ({ roomTypes, childPolicy, adults, childAges }) =>
    roomTypes.map((roomType) => ({
        roomType,
        occupancy: resolveOccupancy({ roomType, childPolicy, adults, childAges })
    }));
