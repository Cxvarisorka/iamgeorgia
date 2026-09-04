import { toDateOnly, weekdayOf } from '../../lib/time.js';
import { categorise } from '../hotel/occupancy.service.js';

/**
 * Tour pricing: turning a party, a date and a season's price sheet into a
 * total.
 *
 * Pure — plain data in, plain data out, no Prisma and no `req` — for the same
 * reason `services/hotel/pricing.service.js` is: availability calls it for
 * every candidate date and booking calls it again before it commits, and both
 * have to agree exactly.
 *
 * Two rules carried over from the hotel engine:
 *
 *   1. **Round once, per line.** A unit sell price is rounded, then multiplied
 *      by the count, so the lines always sum to the total on the voucher.
 *   2. **Net and sell are different numbers.** Net is what the operator
 *      charges us and never leaves the building without a permission check;
 *      sell is what the buyer pays. A fixed sell price on a tier overrides
 *      the markup entirely, exactly as `Rate.sellCents` does.
 */

const applyBps = (amountCents, bps) => Math.round((amountCents * (10_000 + bps)) / 10_000);

const dateOnly = (value) => (typeof value === 'string' ? value : toDateOnly(value));

/** The two age lines a tour draws, in the shape `categorise` expects. */
export const tourChildPolicy = (tour) => ({
    infantMaxAge: tour?.infantMaxAge ?? 2,
    childMaxAge: tour?.childMaxAge ?? 11,
    // An infant is carried, not seated: they never take a unit of inventory
    // and never count toward the option's party limits.
    childrenCountTowardOccupancy: false,
    maxChildrenFreePerRoom: null
});

/**
 * The party as this tour charges for it. `pax` is what counts toward seats and
 * party limits — adults and children, never infants.
 */
export const partyFor = (tour, adults, childAges = []) => {
    const party = categorise(adults, childAges, tourChildPolicy(tour));

    return { ...party, pax: party.adults + party.children.length };
};

/** Inventory units one booking of this party takes: seats, or one group. */
export const unitsFor = (option, party) => (option.unitKind === 'GROUP' ? 1 : party.pax);

/** Whether the option is written for a party this size at all. */
export const fitsOption = (option, party) => party.pax >= option.minPax && party.pax <= option.maxPax;

/**
 * The season that prices a date.
 *
 * Every active season whose window contains the date and whose weekday mask
 * (empty = every day) matches is a candidate; the highest priority wins, and
 * among equals the most recently created. No candidate means the date is not
 * for sale, exactly as a missing `Rate` row does for a room.
 */
export const resolveSeason = (seasons = [], date) => {
    const weekday = weekdayOf(date);

    const candidates = seasons.filter(
        (season) =>
            season.isActive !== false &&
            dateOnly(season.validFrom) <= date &&
            date <= dateOnly(season.validUntil) &&
            (!season.weekdays?.length || season.weekdays.includes(weekday))
    );

    return (
        candidates.sort(
            (a, b) =>
                (b.priority ?? 0) - (a.priority ?? 0) ||
                new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        )[0] ?? null
    );
};

/**
 * The tier that prices a party size: the one with the highest `minPax` that
 * the party still reaches, provided it has no ceiling or the party is under
 * it. Tiers are "from N travellers", so a sheet of {1, 3, 6} prices a party
 * of four on the 3-tier.
 */
export const resolveTier = (season, pax) => {
    const tiers = (season?.tiers ?? []).filter(
        (tier) => tier.minPax <= pax && (tier.maxPax === null || tier.maxPax === undefined || pax <= tier.maxPax)
    );

    return tiers.sort((a, b) => b.minPax - a.minPax)[0] ?? null;
};

const line = (travellerType, count, unitNetCents, unitSellCents) => ({
    travellerType,
    count,
    unitNetCents,
    unitSellCents,
    netCents: unitNetCents * count,
    sellCents: unitSellCents * count
});

/**
 * The whole quote for one option on one date.
 *
 * Returns null when the tier cannot price this option — a PER_PERSON option
 * needs an adult price, a PER_GROUP option a group price — so an incomplete
 * sheet is an offer that does not appear rather than one priced at zero.
 */
export const quoteTour = ({ option, tier, party, markupBps, currency }) => {
    if (!tier) {
        return null;
    }

    const sellFor = (netCents, fixedSellCents) =>
        fixedSellCents !== null && fixedSellCents !== undefined ? fixedSellCents : applyBps(netCents, markupBps);

    let lines;

    if (option.pricingBasis === 'PER_GROUP') {
        if (tier.groupNetCents === null || tier.groupNetCents === undefined) {
            return null;
        }

        lines = [line('GROUP', 1, tier.groupNetCents, sellFor(tier.groupNetCents, tier.groupSellCents))];
    } else {
        if (tier.adultNetCents === null || tier.adultNetCents === undefined) {
            return null;
        }

        const adultNet = tier.adultNetCents;
        const adultSell = sellFor(adultNet, tier.adultSellCents);
        // An unpriced child pays the adult rate: undercharging silently is the
        // worse failure, and a sheet that means "children free" says so with 0.
        const childPriced = tier.childNetCents !== null && tier.childNetCents !== undefined;
        const childNet = childPriced ? tier.childNetCents : adultNet;
        const childSell = childPriced ? sellFor(childNet, tier.childSellCents) : adultSell;
        const infantNet = tier.infantNetCents ?? 0;
        const infantSell = infantNet === 0 ? 0 : applyBps(infantNet, markupBps);

        lines = [
            line('ADULT', party.adults, adultNet, adultSell),
            line('CHILD', party.children.length, childNet, childSell),
            line('INFANT', party.infants.length, infantNet, infantSell)
        ].filter((entry) => entry.count > 0);
    }

    const netCents = lines.reduce((sum, entry) => sum + entry.netCents, 0);
    const sellCents = lines.reduce((sum, entry) => sum + entry.sellCents, 0);

    return {
        currency,
        pricingBasis: option.pricingBasis,
        unitKind: option.unitKind,
        party: {
            adults: party.adults,
            children: party.children.length,
            infants: party.infants.length,
            pax: party.pax
        },
        units: unitsFor(option, party),
        lines,
        totals: {
            // Supplier side. Gated behind a permission check in the serializer.
            netCents,
            sellCents,
            totalCents: sellCents,
            markupBps,
            marginCents: sellCents - netCents
        }
    };
};

/**
 * The lowest adult sell price an option's sheets name, for the un-dated
 * browse card. Indicative only: it is refreshed when a season is written and
 * is never used to quote or to book.
 */
export const lowestAdultSellCents = (options = [], markupBps) => {
    let lowest = null;

    for (const option of options) {
        if (option.status !== 'ACTIVE') {
            continue;
        }

        for (const season of option.seasons ?? []) {
            if (season.isActive === false) {
                continue;
            }

            for (const tier of season.tiers ?? []) {
                const net = option.pricingBasis === 'PER_GROUP' ? tier.groupNetCents : tier.adultNetCents;
                const fixed = option.pricingBasis === 'PER_GROUP' ? tier.groupSellCents : tier.adultSellCents;

                if (net === null || net === undefined) {
                    continue;
                }

                // A group price is divided by the smallest party it is written
                // for, so a "from" figure is per person either way.
                const divisor = option.pricingBasis === 'PER_GROUP' ? Math.max(1, tier.minPax) : 1;
                const sell = Math.round((fixed ?? applyBps(net, markupBps)) / divisor);

                if (lowest === null || sell < lowest) {
                    lowest = sell;
                }
            }
        }
    }

    return lowest;
};
