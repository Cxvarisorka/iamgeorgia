import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    addDays,
    eachNight,
    isValidDateOnly,
    nightsBetween,
    todayInTimezone,
    weekdayOf,
    zonedTimeToInstant
} from '../lib/time.js';
import {
    POLICY_TEMPLATES,
    buildCancellationSchedule,
    calculateRefund,
    chargeForRule,
    freeCancellationUntil
} from '../services/hotel/policy.service.js';

// No database and no clock: every case here is arithmetic, and these are the
// boundaries that decide what a guest is owed.

const templateRules = (name) => POLICY_TEMPLATES.find((template) => template.name === name).rules;

const scheduleFor = (name, overrides = {}) =>
    buildCancellationSchedule({
        rules: templateRules(name),
        checkInDate: '2026-12-20',
        checkInTime: '14:00',
        timezone: 'Asia/Tbilisi',
        nightlyCents: [10_000, 10_000, 10_000],
        currency: 'GEL',
        ...overrides
    });

describe('calendar dates', () => {
    it('counts nights with check-out exclusive', () => {
        // 20 to 23 December is three nights. Counting the departure day is how
        // a system ends up refusing a booking because check-out day is "full".
        assert.equal(nightsBetween('2026-12-20', '2026-12-23'), 3);
        assert.deepEqual(eachNight('2026-12-20', '2026-12-23'), ['2026-12-20', '2026-12-21', '2026-12-22']);
    });

    it('handles a single night and a zero-night range', () => {
        assert.deepEqual(eachNight('2026-12-20', '2026-12-21'), ['2026-12-20']);
        assert.deepEqual(eachNight('2026-12-20', '2026-12-20'), []);
    });

    it('crosses month and year boundaries', () => {
        assert.deepEqual(eachNight('2026-12-30', '2027-01-02'), ['2026-12-30', '2026-12-31', '2027-01-01']);
        assert.equal(addDays('2026-02-28', 1), '2026-03-01');
        // 2028 is a leap year; 2026 is not.
        assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    });

    it('rejects a date that looks valid but is not', () => {
        assert.equal(isValidDateOnly('2026-02-30'), false, 'Date would roll this into March');
        assert.equal(isValidDateOnly('2026-13-01'), false);
        assert.equal(isValidDateOnly('2026-12-20'), true);
        assert.equal(isValidDateOnly('20 Dec 2026'), false);
    });

    it('reports ISO weekdays, Monday first', () => {
        // 2026-12-20 is a Sunday.
        assert.equal(weekdayOf('2026-12-20'), 7);
        assert.equal(weekdayOf('2026-12-21'), 1);
    });

    it('reads today in the property time zone, not the server one', () => {
        // Just past midnight in Tbilisi on the 21st is still the 20th in London.
        const instant = new Date('2026-12-20T21:30:00Z');

        assert.equal(todayInTimezone('Asia/Tbilisi', instant), '2026-12-21');
        assert.equal(todayInTimezone('Europe/London', instant), '2026-12-20');
    });
});

describe('wall-clock times to instants', () => {
    it('resolves a check-in time in the property zone', () => {
        // Tbilisi is UTC+4 year round.
        assert.equal(zonedTimeToInstant('2026-12-20', '14:00', 'Asia/Tbilisi').toISOString(), '2026-12-20T10:00:00.000Z');
    });

    // The correction pass exists for exactly this: without it every deadline
    // within a day of a clock change is an hour out.
    it('gets a summer and a winter time right in a zone that observes DST', () => {
        // Berlin is UTC+1 in January and UTC+2 in July.
        assert.equal(
            zonedTimeToInstant('2026-01-15', '14:00', 'Europe/Berlin').toISOString(),
            '2026-01-15T13:00:00.000Z'
        );
        assert.equal(
            zonedTimeToInstant('2026-07-15', '14:00', 'Europe/Berlin').toISOString(),
            '2026-07-15T12:00:00.000Z'
        );
    });

    it('resolves a time on the day the clocks go back', () => {
        // 25 October 2026, Berlin falls back from 03:00 to 02:00. 14:00 that
        // day is unambiguous and is UTC+1.
        assert.equal(
            zonedTimeToInstant('2026-10-25', '14:00', 'Europe/Berlin').toISOString(),
            '2026-10-25T13:00:00.000Z'
        );
    });

    it('does not throw on a wall-clock time that never happens', () => {
        // 29 March 2026, Berlin springs forward and 02:30 does not exist. A
        // property whose check-in is 02:30 must not become unbookable one day
        // a year.
        const instant = zonedTimeToInstant('2026-03-29', '02:30', 'Europe/Berlin');

        assert.ok(instant instanceof Date && !Number.isNaN(instant.getTime()));
    });
});

describe('charging one rule', () => {
    const nightlyCents = [20_000, 10_000, 10_000];

    it('takes a percentage of the whole stay', () => {
        assert.equal(chargeForRule({ chargeBasis: 'PERCENT_OF_TOTAL', chargeValue: 5_000 }, { nightlyCents }), 20_000);
    });

    it('takes a percentage of the first night only', () => {
        assert.equal(
            chargeForRule({ chargeBasis: 'PERCENT_OF_FIRST_NIGHT', chargeValue: 10_000 }, { nightlyCents }),
            20_000
        );
    });

    // The expensive night is the one that gets forfeited, not an average of a
    // week that happens to include it.
    it('charges the actual first nights, not an average', () => {
        assert.equal(chargeForRule({ chargeBasis: 'NIGHTS', chargeValue: 2 }, { nightlyCents }), 30_000);
    });

    it('never charges more than the stay is worth', () => {
        assert.equal(
            chargeForRule({ chargeBasis: 'FIXED_AMOUNT', chargeValue: 999_999 }, { nightlyCents }),
            40_000
        );
        assert.equal(chargeForRule({ chargeBasis: 'NIGHTS', chargeValue: 99 }, { nightlyCents }), 40_000);
    });
});

describe('a flexible policy', () => {
    const schedule = scheduleFor('Flexible');
    // Check-in is 2026-12-20 14:00 in Tbilisi = 10:00Z. Free until 7 days
    // before that: 2026-12-13T10:00Z.
    const deadline = Date.parse('2026-12-13T10:00:00Z');

    it('is free right up to the deadline', () => {
        assert.equal(calculateRefund(schedule, new Date(deadline - 60_000)).chargeCents, 0);
        assert.equal(calculateRefund(schedule, new Date(deadline - 60_000)).refundCents, 30_000);
    });

    // Inclusive `fromAt`: the deadline is the first moment the charge applies.
    it('charges the first night from the deadline onwards', () => {
        assert.equal(calculateRefund(schedule, new Date(deadline)).chargeCents, 10_000);
        assert.equal(calculateRefund(schedule, new Date(deadline + 60_000)).chargeCents, 10_000);
    });

    it('charges everything once check-in has passed', () => {
        const afterCheckIn = Date.parse('2026-12-20T10:00:00Z') + 60_000;

        assert.equal(calculateRefund(schedule, new Date(afterCheckIn)).chargeCents, 30_000);
        assert.equal(calculateRefund(schedule, new Date(afterCheckIn)).refundable, false);
    });

    it('reports the deadline a guest can be shown', () => {
        assert.equal(freeCancellationUntil(schedule), '2026-12-13T10:00:00.000Z');
    });
});

describe('a non-refundable policy', () => {
    // Pinned: a non-refundable schedule is defined relative to the moment of
    // booking, which is the whole point — there is no free window because the
    // deadline had already passed when the guest booked.
    const schedule = scheduleFor('Non-refundable', { bookedAt: new Date('2026-08-21T00:00:00Z') });

    it('charges in full from the moment of booking', () => {
        assert.equal(calculateRefund(schedule, new Date('2026-01-01T00:00:00Z')).chargeCents, 30_000);
        assert.equal(calculateRefund(schedule, new Date('2026-12-19T00:00:00Z')).chargeCents, 30_000);
    });

    it('has no free deadline to advertise', () => {
        assert.equal(freeCancellationUntil(schedule), null);
    });
});

describe('a tiered policy', () => {
    const schedule = scheduleFor('Tiered');
    const checkIn = Date.parse('2026-12-20T10:00:00Z');
    const hoursBefore = (hours) => new Date(checkIn - hours * 3_600_000);

    it('charges nothing beyond the widest tier', () => {
        assert.equal(calculateRefund(schedule, hoursBefore(1000)).chargeCents, 0);
    });

    // The bands the brief asks for: 30+ days free, 15-29 days 30%, 7-14 days
    // 50%, 0-6 days the whole amount.
    it('walks down the tiers as the stay approaches', () => {
        assert.equal(calculateRefund(schedule, hoursBefore(721)).chargeCents, 0, 'over 30 days out: free');
        assert.equal(calculateRefund(schedule, hoursBefore(719)).chargeCents, 9_000, 'inside 30 days: 30%');
        assert.equal(calculateRefund(schedule, hoursBefore(359)).chargeCents, 15_000, 'inside 15 days: 50%');
        assert.equal(calculateRefund(schedule, hoursBefore(167)).chargeCents, 30_000, 'inside 7 days: all of it');
        assert.equal(calculateRefund(schedule, hoursBefore(1)).chargeCents, 30_000, 'the day of: all of it');
    });

    // Each boundary belongs to the tier it opens, and the test says so in both
    // directions so a future off-by-one has somewhere to fail.
    it('applies a tier from its boundary inclusive', () => {
        assert.equal(calculateRefund(schedule, hoursBefore(720.001)).chargeCents, 0);
        assert.equal(calculateRefund(schedule, hoursBefore(720)).chargeCents, 9_000);
        assert.equal(calculateRefund(schedule, hoursBefore(360)).chargeCents, 15_000);
        assert.equal(calculateRefund(schedule, hoursBefore(168)).chargeCents, 30_000);
        assert.equal(calculateRefund(schedule, hoursBefore(0)).chargeCents, 30_000);
    });

    it('covers every instant with exactly one window', () => {
        const { windows } = schedule;

        assert.equal(windows[0].fromAt, null, 'the first window is open at the start');
        assert.equal(windows.at(-1).toAt, null, 'the last window is open at the end');

        for (let index = 1; index < windows.length; index += 1) {
            assert.equal(
                windows[index - 1].toAt,
                windows[index].fromAt,
                'windows must meet exactly, with no gap and no overlap'
            );
        }
    });
});

describe('the schedule as a frozen artefact', () => {
    // The reason a booking stores a schedule rather than a policy id.
    it('is absolute instants, so a later policy edit cannot change it', () => {
        const schedule = scheduleFor('Tiered');

        assert.ok(schedule.windows.every((w) => w.fromAt === null || !Number.isNaN(Date.parse(w.fromAt))));
        assert.equal(schedule.checkInAt, '2026-12-20T10:00:00.000Z');
        assert.equal(schedule.totalCents, 30_000);
        assert.equal(schedule.currency, 'GEL');
    });

    it('resolves the same deadline differently for two properties in different zones', () => {
        const tbilisi = scheduleFor('Flexible', { timezone: 'Asia/Tbilisi' });
        const berlin = scheduleFor('Flexible', { timezone: 'Europe/Berlin' });

        assert.notEqual(freeCancellationUntil(tbilisi), freeCancellationUntil(berlin));
        // Berlin is behind Tbilisi, so its deadline falls later in absolute time.
        assert.ok(Date.parse(freeCancellationUntil(berlin)) > Date.parse(freeCancellationUntil(tbilisi)));
    });

    it('treats a policy with no rules as fully refundable rather than undefined', () => {
        const schedule = buildCancellationSchedule({
            rules: [],
            checkInDate: '2026-12-20',
            timezone: 'Asia/Tbilisi',
            nightlyCents: [10_000],
            currency: 'GEL'
        });

        const refund = calculateRefund(schedule, new Date('2026-12-19T00:00:00Z'));

        assert.equal(refund.chargeCents, 0);
        assert.equal(refund.refundCents, 10_000);
    });

    it('never refunds more than was paid, whatever the rule says', () => {
        const schedule = buildCancellationSchedule({
            rules: [{ hoursBeforeCheckIn: 0, chargeBasis: 'FIXED_AMOUNT', chargeValue: 500_000 }],
            checkInDate: '2026-12-20',
            timezone: 'Asia/Tbilisi',
            nightlyCents: [10_000, 10_000],
            currency: 'GEL'
        });

        const refund = calculateRefund(schedule, new Date('2026-12-21T00:00:00Z'));

        assert.equal(refund.chargeCents, 20_000);
        assert.equal(refund.refundCents, 0);
    });
});
