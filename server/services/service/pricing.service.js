/**
 * Pricing a service. Pure: plain data in, plain data out.
 *
 * A service is a priced line with no inventory and no dates of its own, so
 * the whole calculation is "how many units, times what". `basis` decides how
 * the quantity, the party and the day count multiply into units; the unit
 * price is the supplier's net marked up for the buyer, unless the catalogue
 * fixes a selling price — the same override `Rate.sellCents` gives a hotel.
 */

/** Basis points of an amount, rounded half-up, in minor units. */
export const applyBps = (amountCents, bps) => Math.round((amountCents * bps) / 10_000);

/** How many priced units this request takes. */
export const unitsFor = (service, { quantity = 1, pax = 1, days = 1 }) => {
    switch (service.basis) {
        case 'PER_PERSON':
            return quantity * pax;
        case 'PER_DAY':
            return quantity * days;
        case 'PER_PERSON_PER_DAY':
            return quantity * pax * days;
        case 'PER_GROUP':
        default:
            return quantity;
    }
};

export const quoteService = ({ service, quantity = 1, pax = 1, days = 1, markupBps }) => {
    const units = unitsFor(service, { quantity, pax, days });
    const unitNetCents = service.netCents;
    const unitSellCents = service.sellCents ?? applyBps(unitNetCents, 10_000 + markupBps);
    const netCents = units * unitNetCents;
    const sellCents = units * unitSellCents;

    return {
        currency: service.currency,
        basis: service.basis,
        quantity,
        pax,
        days,
        units,
        unitNetCents,
        unitSellCents,
        totals: {
            netCents,
            sellCents,
            totalCents: sellCents,
            markupBps,
            marginCents: sellCents - netCents
        }
    };
};
