import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { config } from '../config.js';
import { quoteJourney } from '../services/transfer/pricing.service.js';

/**
 * Markup on a transfer.
 *
 * A vehicle tariff is a rack price — what the public pays, carrying the
 * platform's default margin. The buyer's markup used to be applied to
 * nothing: the sell price was the tariff whoever bought, and the markup only
 * bent the recorded net, so a partner on an agreed commission paid public
 * prices and the same journey was booked at a different "cost" depending on
 * who bought it. Pure arithmetic, no database.
 */
describe('transfer markup', () => {
    const rack = config.transfer.defaultMarkupBps;
    const vehicle = { kind: 'PRIVATE', perKmCents: 100, minimumFareCents: 1, airportFeeCents: 0, paceFactor: 1, currency: 'GEL' };
    const leg = (overrides = {}) => ({
        direction: 'OUTBOUND',
        fromPointName: 'A',
        toPointName: 'B',
        pickupAt: new Date(),
        distanceKm: 100,
        durationMinutes: 110,
        touchesAirport: false,
        curated: null,
        tripType: 'ONE_WAY',
        isNight: false,
        ...overrides
    });
    const quote = (markupBps, overrides = {}) =>
        quoteJourney({ vehicle, legs: [leg(overrides)], passengers: 2, markupBps, currency: 'GEL' });

    it('keeps the rack price exactly at the platform default', () => {
        assert.equal(quote(rack).totals.sellCents, 10_000);
    });

    it('records the same net whoever is buying', () => {
        const net = Math.round((10_000 * 10_000) / (10_000 + rack));

        assert.equal(quote(rack).totals.netCents, net);
        assert.equal(quote(1_000).totals.netCents, net);
        assert.equal(quote(3_000).totals.netCents, net);
    });

    it('charges a partner net plus its own commission', () => {
        const net = Math.round((10_000 * 10_000) / (10_000 + rack));
        const partner = quote(1_000);

        assert.equal(partner.totals.sellCents, Math.round((net * 11_000) / 10_000));
        assert.ok(partner.totals.sellCents < 10_000, 'a lower commission than the platform default is a lower price');
        assert.equal(partner.totals.marginCents, partner.totals.sellCents - net);
    });

    it('applies the commission to a curated net when the supplier has quoted one', () => {
        const curated = { oneWayCents: 19_900, returnCents: null, netCents: 15_000 };

        const pub = quote(rack, { curated });
        const partner = quote(1_000, { curated });

        assert.equal(pub.totals.sellCents, 19_900, 'the curated price is the public price');
        assert.equal(pub.totals.netCents, 15_000);
        assert.equal(partner.totals.sellCents, 16_500, '15,000 plus 10%');
        assert.equal(partner.totals.netCents, 15_000);
    });

    it('passes extras through at their listed price for everyone', () => {
        const extras = [{ extra: { code: 'seat', name: 'Child seat', basis: 'FIXED', priceCents: 2_000 }, quantity: 1 }];
        const pub = quoteJourney({ vehicle, legs: [leg()], passengers: 2, extras, markupBps: rack, currency: 'GEL' });
        const partner = quoteJourney({ vehicle, legs: [leg()], passengers: 2, extras, markupBps: 1_000, currency: 'GEL' });

        assert.equal(pub.totals.sellCents - quote(rack).totals.sellCents, 2_000);
        assert.equal(partner.totals.sellCents - quote(1_000).totals.sellCents, 2_000);
        assert.equal(pub.totals.netCents - quote(rack).totals.netCents, 2_000);
    });
});
