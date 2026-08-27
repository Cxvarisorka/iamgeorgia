import { config } from '../../config.js';
import { bandForAge, categorise, DEFAULT_CHILD_POLICY } from './occupancy.service.js';

/**
 * Pricing: turning a stay and a set of nightly rates into a total.
 *
 * Pure — plain data in, plain data out, no Prisma and no `req`. Search calls it
 * for every candidate offer and booking calls it again before it commits, and
 * both have to agree exactly, which is much easier to guarantee when the thing
 * doing the arithmetic cannot read anything.
 *
 * Two rules that are easy to get wrong and expensive when you do:
 *
 *   1. **Round once, per night.** Rounding only the total makes the per-night
 *      lines fail to sum to it, and an invoice whose lines do not add up is a
 *      support ticket every time.
 *   2. **Net and sell are different numbers.** `netCents` is what the supplier
 *      charges us and never leaves the building without an explicit permission
 *      check. `sellCents` is what the buyer pays.
 */

const applyBps = (amountCents, bps) => Math.round((amountCents * bps) / 10_000);

/** The nightly value one additional adult costs, when the rate does not say. */
const impliedPerPersonCents = (rate, baseOccupancy) =>
    rate.extraAdultCents ?? Math.round(rate.netCents / Math.max(1, baseOccupancy));

/**
 * What one child costs for one night, under this hotel's bands.
 *
 * Falls back to the rate's `extraChildCents` when no band matches, and to zero
 * when there is neither — an unpriced child is free rather than silently
 * charged as an adult, because the failure mode of the alternative is a guest
 * being overcharged without anyone noticing.
 */
export const childNightCents = (age, { rate, bands, baseOccupancy }) => {
    const band = bandForAge(age, bands);

    if (!band) {
        return rate.extraChildCents ?? 0;
    }

    switch (band.chargeMode) {
        case 'FREE':
            return 0;
        case 'PERCENT_OF_ADULT':
            return applyBps(impliedPerPersonCents(rate, baseOccupancy), band.chargeValue);
        case 'FIXED_PER_NIGHT':
            return band.chargeValue;
        case 'FULL_ADULT':
            return impliedPerPersonCents(rate, baseOccupancy);
        default:
            return 0;
    }
};

/**
 * The net cost of one night, before taxes and before markup.
 *
 * Order matters: single occupancy replaces the base rate rather than
 * discounting it, extra adults are counted above the plan's base occupancy,
 * and children are priced individually because their bands differ by age.
 */
export const priceNight = ({ rate, ratePlan, party, bands, childPolicy = DEFAULT_CHILD_POLICY }) => {
    const baseOccupancy = ratePlan.baseOccupancy ?? 2;
    const lines = [];

    // A lone guest in a room priced for two pays the single rate when the
    // property offers one, and the full room rate when it does not.
    const useSingle = party.adults === 1 && baseOccupancy >= 2 && rate.singleOccupancyCents != null;
    const baseCents = useSingle ? rate.singleOccupancyCents : rate.netCents;

    lines.push({
        label: useSingle ? 'Single occupancy' : `Room for ${Math.min(party.adults, baseOccupancy)}`,
        amountCents: baseCents
    });

    const extraAdults = Math.max(0, party.adults - baseOccupancy);

    if (extraAdults > 0) {
        const perAdult = rate.extraAdultCents ?? impliedPerPersonCents(rate, baseOccupancy);
        lines.push({ label: `${extraAdults} extra adult(s)`, amountCents: perAdult * extraAdults });
    }

    // Free-child allowance applies to the youngest first, which is the reading
    // most favourable to the guest and the one hotels use.
    const chargeableChildren = [...party.children].sort((a, b) => a - b);
    const freeAllowance = childPolicy.maxChildrenFreePerRoom ?? 0;

    chargeableChildren.forEach((age, index) => {
        if (index < freeAllowance) {
            lines.push({ label: `Child aged ${age} (included)`, amountCents: 0 });
            return;
        }

        const amountCents = childNightCents(age, { rate, bands, baseOccupancy });
        lines.push({ label: `Child aged ${age}`, amountCents });
    });

    // Infants are not priced. If a hotel charges for a cot it is a fee, not a
    // per-person rate, and belongs in HotelTaxFee.
    return {
        netCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
        lines
    };
};

/**
 * Taxes and fees for a whole stay.
 *
 * `includedInRate` decides whether the guest has already paid it or owes it at
 * the desk. Both are returned, and the totals keep them apart, because
 * presenting a payable-at-hotel city tax as part of the price is a complaint at
 * check-out.
 */
export const priceTaxes = ({ taxFees = [], nights, roomNetCents, guests, rooms = 1 }) => {
    const applied = [];

    for (const fee of taxFees) {
        // Defaults to true, matching the column default. Treating an absent
        // flag as false would silently exempt children from a resort tax and
        // undercharge every family booking without anything failing.
        const chargeableGuests = fee.appliesToChildren === false ? guests.adults : guests.total;

        let amountCents;

        switch (fee.basis) {
            case 'PERCENT':
                amountCents = applyBps(roomNetCents, fee.value);
                break;
            case 'PER_NIGHT_PER_PERSON':
                amountCents = fee.value * nights * chargeableGuests;
                break;
            case 'PER_NIGHT_PER_ROOM':
                amountCents = fee.value * nights * rooms;
                break;
            case 'PER_STAY':
                amountCents = fee.value * rooms;
                break;
            default:
                amountCents = 0;
        }

        applied.push({
            name: fee.name,
            basis: fee.basis,
            amountCents,
            includedInRate: fee.includedInRate,
            currency: fee.currency
        });
    }

    return {
        applied,
        includedCents: applied.filter((f) => f.includedInRate).reduce((s, f) => s + f.amountCents, 0),
        payableAtPropertyCents: applied
            .filter((f) => !f.includedInRate)
            .reduce((s, f) => s + f.amountCents, 0)
    };
};

/**
 * The whole quote: every night, the taxes, and both sides of the margin.
 *
 * `markupBps` resolves to the buyer's commission rate in Phase 7; until then it
 * is the platform default. It is applied per night and rounded there, so the
 * nightly sell figures always sum to the total the guest is charged.
 */
export const quoteStay = ({
    nights,
    ratePlan,
    childPolicy = DEFAULT_CHILD_POLICY,
    bands = [],
    adults,
    childAges = [],
    taxFees = [],
    markupBps = config.hotel.defaultMarkupBps,
    rooms = 1,
    currency
}) => {
    const party = categorise(adults, childAges, childPolicy);

    const priced = nights.map(({ date, rate }) => {
        const night = priceNight({ rate, ratePlan, party, bands, childPolicy });

        // A fixed sell price on the rate overrides the markup entirely: a
        // negotiated price is a price, not a starting point.
        const sellCents =
            rate.sellCents ?? Math.round((night.netCents * (10_000 + markupBps)) / 10_000);

        return {
            date,
            netCents: night.netCents,
            sellCents,
            lines: night.lines
        };
    });

    const roomNetCents = priced.reduce((sum, night) => sum + night.netCents, 0);
    const roomSellCents = priced.reduce((sum, night) => sum + night.sellCents, 0);

    const taxes = priceTaxes({
        taxFees,
        nights: nights.length,
        roomNetCents: roomSellCents,
        guests: { total: party.countedOccupancy, adults: party.adults },
        rooms
    });

    return {
        currency: currency ?? ratePlan.currency,
        nights: priced,
        party: {
            adults: party.adults,
            children: party.children.length,
            infants: party.infants.length,
            countedOccupancy: party.countedOccupancy
        },
        taxes,
        totals: {
            nightsCount: nights.length,
            // Supplier side. Gated behind a permission check in the serializer.
            netCents: roomNetCents * rooms,
            // Buyer side, and what the totals a guest sees are built from.
            sellCents: roomSellCents * rooms,
            taxIncludedCents: taxes.includedCents,
            payableAtPropertyCents: taxes.payableAtPropertyCents,
            // What is taken now: the room plus anything already included.
            totalCents: roomSellCents * rooms + taxes.includedCents,
            markupBps,
            marginCents: roomSellCents * rooms - roomNetCents * rooms
        }
    };
};

/**
 * The markup for a buyer, without touching the database.
 *
 * The real resolution lives in `pricingRule.service.js` and reads the rules
 * table. This stays as the fallback that needs no I/O — used when there is no
 * database in the picture at all, and as the answer when no rule matches.
 */
export const resolveMarkupBps = (partner) =>
    partner?.commissionRateBps ?? config.hotel.defaultMarkupBps;
