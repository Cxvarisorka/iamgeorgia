import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildCancellationSchedule, calculateRefund } from '../services/hotel/policy.service.js';

/**
 * The tax a guest paid inside the price is part of what a cancellation
 * refunds. A schedule built from the nights alone refunded the room and kept
 * the VAT on a free cancellation — the refund was short by exactly the
 * booking's `taxTotalCents`.
 */
describe('cancellation and included tax', () => {
    const schedule = (rules, includedTaxCents) =>
        buildCancellationSchedule({
            rules,
            checkInDate: '2026-12-20',
            checkInTime: '14:00',
            timezone: 'Asia/Tbilisi',
            nightlyCents: [10_000, 10_000, 10_000],
            includedTaxCents,
            currency: 'GEL',
            bookedAt: new Date('2026-06-01T00:00:00Z')
        });

    it('refunds the tax with the room on a free cancellation', () => {
        const refund = calculateRefund(schedule([], 5_400), new Date('2026-12-01T00:00:00Z'));

        assert.equal(refund.chargeCents, 0);
        assert.equal(refund.refundCents, 35_400, 'three nights plus the VAT paid on them');
    });

    it('reads a percentage of the total against what was actually paid', () => {
        const rules = [{ hoursBeforeCheckIn: 24, chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 5_000 }];
        const refund = calculateRefund(schedule(rules, 5_400), new Date('2026-12-20T05:00:00Z'));

        assert.equal(refund.chargeCents, 17_700, 'half of 35,400');
        assert.equal(refund.refundCents, 17_700);
    });

    it('still charges a night as the night, and refunds the rest with its tax', () => {
        const rules = [{ hoursBeforeCheckIn: 24, chargeBasis: 'NIGHTS', chargeValue: 1 }];
        const refund = calculateRefund(schedule(rules, 5_400), new Date('2026-12-20T05:00:00Z'));

        assert.equal(refund.chargeCents, 10_000);
        assert.equal(refund.refundCents, 25_400);
    });

    it('changes nothing for a stay with no tax in the price', () => {
        const refund = calculateRefund(schedule([], 0), new Date('2026-12-01T00:00:00Z'));

        assert.equal(refund.refundCents, 30_000);
    });
});
