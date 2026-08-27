import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { childNightCents, priceNight, priceTaxes, quoteStay, resolveMarkupBps } from '../services/hotel/pricing.service.js';
import { DEFAULT_CHILD_POLICY, categorise } from '../services/hotel/occupancy.service.js';

// Pure arithmetic, no database. Search calls this for every candidate offer and
// booking calls it again before committing; the two have to agree exactly.

const ratePlan = (overrides = {}) => ({ baseOccupancy: 2, currency: 'GEL', ...overrides });

const rate = (overrides = {}) => ({
    netCents: 20_000,
    sellCents: null,
    extraAdultCents: null,
    extraChildCents: null,
    singleOccupancyCents: null,
    ...overrides
});

const BANDS = [
    { minAge: 0, maxAge: 2, label: 'Infant', chargeMode: 'FREE', chargeValue: 0 },
    { minAge: 3, maxAge: 11, label: 'Child', chargeMode: 'PERCENT_OF_ADULT', chargeValue: 5_000 },
    { minAge: 12, maxAge: 99, label: 'Adult', chargeMode: 'FULL_ADULT', chargeValue: 0 }
];

const nightsOf = (count, overrides = {}) =>
    Array.from({ length: count }, (unused, index) => ({
        date: `2026-12-${String(20 + index).padStart(2, '0')}`,
        rate: rate(overrides)
    }));

describe('pricing one night', () => {
    const party = (adults, childAges = []) => categorise(adults, childAges, DEFAULT_CHILD_POLICY);

    it('charges the room rate for the occupancy it was priced for', () => {
        const night = priceNight({ rate: rate(), ratePlan: ratePlan(), party: party(2), bands: BANDS });

        assert.equal(night.netCents, 20_000);
    });

    it('uses the single-occupancy rate when one guest takes a double', () => {
        const night = priceNight({
            rate: rate({ singleOccupancyCents: 15_000 }),
            ratePlan: ratePlan(),
            party: party(1),
            bands: BANDS
        });

        assert.equal(night.netCents, 15_000, 'a discount, not a reduction of the base');
    });

    it('charges the full room when there is no single-occupancy rate', () => {
        const night = priceNight({ rate: rate(), ratePlan: ratePlan(), party: party(1), bands: BANDS });

        assert.equal(night.netCents, 20_000);
    });

    it('adds an extra adult above the base occupancy', () => {
        const night = priceNight({
            rate: rate({ extraAdultCents: 6_000 }),
            ratePlan: ratePlan(),
            party: party(3),
            bands: BANDS
        });

        assert.equal(night.netCents, 26_000);
    });

    it('implies a per-person cost when the rate does not give one', () => {
        // 20000 for two implies 10000 each.
        const night = priceNight({ rate: rate(), ratePlan: ratePlan(), party: party(3), bands: BANDS });

        assert.equal(night.netCents, 30_000);
    });

    it('prices a child at its band percentage of the adult rate', () => {
        const night = priceNight({
            rate: rate({ extraAdultCents: 6_000 }),
            ratePlan: ratePlan(),
            party: party(2, [7]),
            bands: BANDS
        });

        assert.equal(night.netCents, 23_000, '50% of the 6000 extra-adult rate');
    });

    it('does not price an infant at all', () => {
        const night = priceNight({ rate: rate(), ratePlan: ratePlan(), party: party(2, [1]), bands: BANDS });

        assert.equal(night.netCents, 20_000);
    });

    // A 15-year-old against a 0-11 child band is an adult, and is charged as
    // one. This is the case that produces quote disputes.
    it('charges a child older than the child band as an adult', () => {
        const night = priceNight({
            rate: rate({ extraAdultCents: 6_000 }),
            ratePlan: ratePlan(),
            party: party(2, [15]),
            bands: BANDS
        });

        assert.equal(night.netCents, 26_000);
    });

    it('honours a free-child allowance, youngest first', () => {
        const night = priceNight({
            rate: rate({ extraAdultCents: 6_000 }),
            ratePlan: ratePlan(),
            party: party(2, [10, 4]),
            bands: BANDS,
            childPolicy: { ...DEFAULT_CHILD_POLICY, maxChildrenFreePerRoom: 1 }
        });

        // The four-year-old goes free; the ten-year-old is charged.
        assert.equal(night.netCents, 23_000);
    });

    it('explains every component of the night', () => {
        const night = priceNight({
            rate: rate({ extraAdultCents: 6_000 }),
            ratePlan: ratePlan(),
            party: party(3, [7]),
            bands: BANDS
        });

        // "Why is this 340 and not 300" has to be answerable without reading
        // code, so the breakdown is part of the result rather than derived.
        assert.equal(night.lines.length, 3);
        assert.equal(night.lines.reduce((sum, line) => sum + line.amountCents, 0), night.netCents);
    });
});

describe('child charge modes', () => {
    const context = { rate: rate({ extraAdultCents: 8_000 }), bands: BANDS, baseOccupancy: 2 };

    it('applies each mode', () => {
        assert.equal(childNightCents(1, context), 0, 'FREE');
        assert.equal(childNightCents(7, context), 4_000, 'PERCENT_OF_ADULT at 50%');
        assert.equal(childNightCents(30, context), 8_000, 'FULL_ADULT');
    });

    it('applies a fixed nightly charge', () => {
        const bands = [{ minAge: 0, maxAge: 11, label: 'Child', chargeMode: 'FIXED_PER_NIGHT', chargeValue: 2_500 }];

        assert.equal(childNightCents(7, { ...context, bands }), 2_500);
    });

    // An unpriced child being free is the safer failure: the alternative
    // overcharges a guest and nobody notices.
    it('falls back to the rate, then to free, when no band matches', () => {
        assert.equal(childNightCents(7, { ...context, bands: [] }), 0);
        assert.equal(
            childNightCents(7, { rate: rate({ extraChildCents: 3_000 }), bands: [], baseOccupancy: 2 }),
            3_000
        );
    });
});

describe('taxes and fees', () => {
    const base = { nights: 3, roomNetCents: 60_000, guests: { total: 3, adults: 2 }, rooms: 1 };

    it('applies a percentage of the room total', () => {
        const taxes = priceTaxes({
            ...base,
            taxFees: [{ name: 'VAT', basis: 'PERCENT', value: 1_800, includedInRate: true, currency: 'GEL' }]
        });

        assert.equal(taxes.applied[0].amountCents, 10_800);
        assert.equal(taxes.includedCents, 10_800);
        assert.equal(taxes.payableAtPropertyCents, 0);
    });

    it('applies a per-person-per-night fee', () => {
        const taxes = priceTaxes({
            ...base,
            taxFees: [
                { name: 'Resort tax', basis: 'PER_NIGHT_PER_PERSON', value: 500, includedInRate: false, currency: 'GEL' }
            ]
        });

        assert.equal(taxes.applied[0].amountCents, 4_500, '500 x 3 nights x 3 guests');
        assert.equal(taxes.payableAtPropertyCents, 4_500);
    });

    it('can exempt children from a per-person fee', () => {
        const taxes = priceTaxes({
            ...base,
            taxFees: [
                {
                    name: 'City tax',
                    basis: 'PER_NIGHT_PER_PERSON',
                    value: 500,
                    appliesToChildren: false,
                    includedInRate: false,
                    currency: 'GEL'
                }
            ]
        });

        assert.equal(taxes.applied[0].amountCents, 3_000, 'adults only');
    });

    // Presenting a payable-at-hotel tax as part of the price is a complaint at
    // check-out, so the two totals are kept apart all the way through.
    it('keeps included and payable-at-property apart', () => {
        const taxes = priceTaxes({
            ...base,
            taxFees: [
                { name: 'VAT', basis: 'PERCENT', value: 1_800, includedInRate: true, currency: 'GEL' },
                { name: 'City tax', basis: 'PER_STAY', value: 1_000, includedInRate: false, currency: 'GEL' }
            ]
        });

        assert.equal(taxes.includedCents, 10_800);
        assert.equal(taxes.payableAtPropertyCents, 1_000);
    });
});

describe('quoting a stay', () => {
    it('sums the nights and applies markup per night', () => {
        const quote = quoteStay({
            nights: nightsOf(3),
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 1_500
        });

        assert.equal(quote.totals.netCents, 60_000);
        assert.equal(quote.totals.sellCents, 69_000);
        assert.equal(quote.totals.marginCents, 9_000);
    });

    // The reason markup is applied per night rather than to the total.
    it('keeps the nightly figures summing to the total', () => {
        const quote = quoteStay({
            nights: nightsOf(3, { netCents: 10_001 }),
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 1_733
        });

        const summed = quote.nights.reduce((total, night) => total + night.sellCents, 0);

        assert.equal(summed, quote.totals.sellCents, 'an invoice whose lines do not add up is a support ticket');
    });

    it('prices seasonal nights individually', () => {
        const quote = quoteStay({
            nights: [
                { date: '2026-12-23', rate: rate({ netCents: 20_000 }) },
                { date: '2026-12-24', rate: rate({ netCents: 35_000 }) },
                { date: '2026-12-25', rate: rate({ netCents: 35_000 }) }
            ],
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 0
        });

        assert.equal(quote.totals.netCents, 90_000);
        assert.equal(quote.nights[1].netCents, 35_000, 'Christmas Eve is its own price');
    });

    // A negotiated price is a price, not a starting point.
    it('lets a fixed sell price override the markup entirely', () => {
        const quote = quoteStay({
            nights: nightsOf(2, { netCents: 20_000, sellCents: 21_000 }),
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 5_000
        });

        assert.equal(quote.totals.sellCents, 42_000);
        assert.equal(quote.totals.netCents, 40_000);
    });

    it('adds taxes on top of the sell price, not the net', () => {
        const quote = quoteStay({
            nights: nightsOf(2),
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 1_000,
            taxFees: [{ name: 'VAT', basis: 'PERCENT', value: 1_800, includedInRate: true, currency: 'GEL' }]
        });

        // 40000 net -> 44000 sell -> 18% of 44000 = 7920.
        assert.equal(quote.totals.sellCents, 44_000);
        assert.equal(quote.totals.taxIncludedCents, 7_920);
        assert.equal(quote.totals.totalCents, 51_920);
    });

    it('reports the party it priced, so a quote can be checked against a request', () => {
        const quote = quoteStay({
            nights: nightsOf(1),
            ratePlan: ratePlan(),
            adults: 2,
            childAges: [1, 7],
            bands: BANDS
        });

        assert.equal(quote.party.adults, 2);
        assert.equal(quote.party.children, 1);
        assert.equal(quote.party.infants, 1);
    });

    it('multiplies by the number of rooms', () => {
        const single = quoteStay({ nights: nightsOf(2), ratePlan: ratePlan(), adults: 2, bands: BANDS, markupBps: 0 });
        const double = quoteStay({
            nights: nightsOf(2),
            ratePlan: ratePlan(),
            adults: 2,
            bands: BANDS,
            markupBps: 0,
            rooms: 2
        });

        assert.equal(double.totals.sellCents, single.totals.sellCents * 2);
    });
});

describe('resolving markup', () => {
    it('uses the partner commission rate when there is one', () => {
        assert.equal(resolveMarkupBps({ commissionRateBps: 1_200 }), 1_200);
    });

    it('falls back to the platform default for an anonymous buyer', () => {
        assert.equal(typeof resolveMarkupBps(null), 'number');
        assert.ok(resolveMarkupBps(null) > 0);
    });
});
