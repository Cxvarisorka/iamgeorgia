import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    DEFAULT_CHILD_POLICY,
    bandForAge,
    bedCapacity,
    categorise,
    resolveOccupancy
} from '../services/hotel/occupancy.service.js';

// No database and no HTTP: these are the rules that decide whether a family
// sees a hotel at all, and they deserve to be tested exhaustively and fast.

const roomType = (overrides = {}) => ({
    name: 'Deluxe Double',
    maxOccupancy: 3,
    maxAdults: 2,
    maxChildren: 1,
    minAdults: 1,
    standardOccupancy: 2,
    extraBedCapacity: 1,
    beds: [],
    ...overrides
});

const bed = (sleeps, quantity = 1, groupIndex = 0) => ({
    quantity,
    groupIndex,
    bedType: { sleeps }
});

const reasonCodes = (result) => result.reasons.map((reason) => reason.code);

describe('categorising a party', () => {
    it('splits infants, children and adults by the hotel policy', () => {
        const party = categorise(2, [1, 7], DEFAULT_CHILD_POLICY);

        assert.equal(party.adults, 2);
        assert.deepEqual(party.infants, [1]);
        assert.deepEqual(party.children, [7]);
    });

    // The single most common source of quote disputes, so it is explicit.
    it('counts a "child" older than the child band as an adult', () => {
        const party = categorise(2, [15], DEFAULT_CHILD_POLICY);

        assert.equal(party.adults, 3, 'a 15-year-old is an adult under a 0-11 child band');
        assert.equal(party.adultsDeclared, 2);
        assert.equal(party.adultsFromChildren, 1);
        assert.deepEqual(party.children, []);
    });

    it('leaves infants out of counted occupancy by default', () => {
        const party = categorise(2, [1, 1], DEFAULT_CHILD_POLICY);

        // A cot is not a bed. Counting infants here would silently shrink every
        // family room in the catalogue.
        assert.equal(party.countedOccupancy, 2);
    });

    it('counts infants when the hotel says they occupy a place', () => {
        const party = categorise(2, [1], { ...DEFAULT_CHILD_POLICY, childrenCountTowardOccupancy: true });

        assert.equal(party.countedOccupancy, 3);
    });

    it('honours a hotel that redraws the age bands', () => {
        // Some properties treat under-16s as children.
        const policy = { ...DEFAULT_CHILD_POLICY, infantMaxAge: 3, childMaxAge: 15 };
        const party = categorise(2, [3, 15, 16], policy);

        assert.deepEqual(party.infants, [3]);
        assert.deepEqual(party.children, [15]);
        assert.equal(party.adults, 3, 'the 16-year-old is an adult here');
    });

    it('treats an age exactly on a boundary as belonging to the lower band', () => {
        const party = categorise(0, [2, 11], DEFAULT_CHILD_POLICY);

        assert.deepEqual(party.infants, [2], 'infantMaxAge is inclusive');
        assert.deepEqual(party.children, [11], 'childMaxAge is inclusive');
    });
});

describe('bed capacity', () => {
    it('sums the beds a room actually has', () => {
        assert.equal(bedCapacity(roomType({ beds: [bed(2), bed(1)] })), 3);
    });

    it('multiplies by quantity', () => {
        assert.equal(bedCapacity(roomType({ beds: [bed(1, 2)] })), 2);
    });

    // Groups are alternative make-ups of one room, not additional furniture.
    it('takes the best single group rather than adding groups together', () => {
        const twoWays = roomType({
            beds: [
                bed(2, 1, 0), // one king
                bed(1, 2, 1), // or two twins
                bed(1, 1, 1) // plus a sofa in that make-up
            ]
        });

        assert.equal(bedCapacity(twoWays), 3, 'the twin make-up sleeps three; the king make-up sleeps two');
    });

    it('falls back to standard occupancy when no beds are configured yet', () => {
        assert.equal(bedCapacity(roomType({ beds: [], standardOccupancy: 2 })), 2);
    });
});

describe('resolving occupancy', () => {
    it('accepts the party a room was built for', () => {
        const result = resolveOccupancy({ roomType: roomType({ beds: [bed(2)] }), adults: 2 });

        assert.equal(result.fits, true);
        assert.deepEqual(result.reasons, []);
        assert.equal(result.extraGuests, 0);
    });

    // The case named in the brief.
    it('takes 2 adults + 1 child aged 7 into a room that allows one child', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 3, maxAdults: 2, maxChildren: 1, beds: [bed(2), bed(1)] }),
            adults: 2,
            childAges: [7]
        });

        assert.equal(result.fits, true);
        assert.equal(result.countedOccupancy, 3);
        assert.equal(result.extraBedsNeeded, 0, 'the sofa bed covers the child');
        assert.equal(result.extraGuests, 1, 'but the base rate only covers two');
    });

    it('refuses the same party in a room that allows no children', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 3, maxAdults: 2, maxChildren: 0 }),
            adults: 2,
            childAges: [7]
        });

        assert.equal(result.fits, false);
        assert.ok(reasonCodes(result).includes('MAX_CHILDREN'));
    });

    // maxOccupancy is not maxAdults + maxChildren, and this is what preserves
    // the difference.
    it('refuses a party that fits the adult and child caps but not the total', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 3, maxAdults: 2, maxChildren: 2, extraBedCapacity: 5, beds: [bed(4)] }),
            adults: 2,
            childAges: [7, 9]
        });

        assert.equal(result.fits, false);
        assert.deepEqual(reasonCodes(result), ['MAX_OCCUPANCY']);
    });

    it('reports every failing reason at once, not just the first', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 2, maxAdults: 1, maxChildren: 0, extraBedCapacity: 0, beds: [bed(1)] }),
            adults: 3,
            childAges: [7]
        });

        assert.equal(result.fits, false);
        const codes = reasonCodes(result);
        assert.ok(codes.includes('MAX_ADULTS'));
        assert.ok(codes.includes('MAX_CHILDREN'));
        assert.ok(codes.includes('MAX_OCCUPANCY'));
        assert.ok(codes.length >= 3, 'search has to be able to explain the whole story');
    });

    it('needs an extra bed when the beds cannot hold everyone', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 3, maxChildren: 1, extraBedCapacity: 1, beds: [bed(2)] }),
            adults: 2,
            childAges: [7]
        });

        assert.equal(result.fits, true);
        assert.equal(result.extraBedsNeeded, 1);
    });

    it('refuses when more extra beds are needed than the room can take', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 4, maxChildren: 2, extraBedCapacity: 0, beds: [bed(2)] }),
            adults: 2,
            childAges: [7, 9]
        });

        assert.equal(result.fits, false);
        assert.ok(reasonCodes(result).includes('EXTRA_BEDS'));
    });

    it('enforces a minimum adult count', () => {
        const result = resolveOccupancy({
            roomType: roomType({ minAdults: 2, beds: [bed(2)] }),
            adults: 1
        });

        assert.equal(result.fits, false);
        assert.ok(reasonCodes(result).includes('MIN_ADULTS'));
    });

    it('lets an infant into a room that is otherwise full', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 2, maxAdults: 2, maxChildren: 1, beds: [bed(2)] }),
            adults: 2,
            childAges: [1]
        });

        assert.equal(result.fits, true, 'an infant in a cot does not take a place');
        assert.equal(result.countedOccupancy, 2);
    });

    it('keeps that infant out when the hotel counts infants', () => {
        const result = resolveOccupancy({
            roomType: roomType({ maxOccupancy: 2, maxAdults: 2, maxChildren: 1, extraBedCapacity: 0, beds: [bed(2)] }),
            childPolicy: { ...DEFAULT_CHILD_POLICY, childrenCountTowardOccupancy: true },
            adults: 2,
            childAges: [1]
        });

        assert.equal(result.fits, false);
        assert.ok(reasonCodes(result).includes('MAX_OCCUPANCY'));
    });

    // Age is fixed at check-in. A birthday mid-stay does not reprice, and the
    // resolver has no notion of stay length precisely because of that.
    it('resolves against the age given, with no notion of the stay length', () => {
        const eleven = resolveOccupancy({
            roomType: roomType({ maxChildren: 1, beds: [bed(2), bed(1)] }),
            adults: 2,
            childAges: [11]
        });
        const twelve = resolveOccupancy({
            roomType: roomType({ maxChildren: 1, beds: [bed(2), bed(1)] }),
            adults: 2,
            childAges: [12]
        });

        assert.equal(eleven.children.length, 1);
        assert.equal(twelve.adults, 3, 'a twelfth birthday before check-in changes the answer');
        assert.equal(twelve.fits, false, 'and the room only takes two adults');
    });
});

describe('child charge bands', () => {
    const bands = [
        { minAge: 0, maxAge: 2, label: 'Infant', chargeMode: 'FREE', chargeValue: 0 },
        { minAge: 3, maxAge: 11, label: 'Child', chargeMode: 'PERCENT_OF_ADULT', chargeValue: 5000 },
        { minAge: 12, maxAge: 99, label: 'Adult', chargeMode: 'FULL_ADULT', chargeValue: 0 }
    ];

    it('finds the band an age falls in', () => {
        assert.equal(bandForAge(1, bands).label, 'Infant');
        assert.equal(bandForAge(7, bands).label, 'Child');
        assert.equal(bandForAge(30, bands).label, 'Adult');
    });

    it('includes both ends of a band', () => {
        assert.equal(bandForAge(2, bands).label, 'Infant');
        assert.equal(bandForAge(3, bands).label, 'Child');
        assert.equal(bandForAge(11, bands).label, 'Child');
        assert.equal(bandForAge(12, bands).label, 'Adult');
    });

    it('returns nothing for an age no band covers, rather than guessing', () => {
        assert.equal(bandForAge(120, bands), null);
    });

    // Overlapping bands are a configuration mistake, but they must resolve the
    // same way every time rather than depending on row order.
    it('prefers the narrower band when two overlap', () => {
        const overlapping = [
            { minAge: 0, maxAge: 17, label: 'Broad', chargeMode: 'PERCENT_OF_ADULT', chargeValue: 5000 },
            { minAge: 3, maxAge: 5, label: 'Narrow', chargeMode: 'FREE', chargeValue: 0 }
        ];

        assert.equal(bandForAge(4, overlapping).label, 'Narrow');
        assert.equal(bandForAge(10, overlapping).label, 'Broad');
    });
});
