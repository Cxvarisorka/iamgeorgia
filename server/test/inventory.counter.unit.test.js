import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { COUNTER_TABLES, moveCounterUnits, nightDates } from '../lib/inventory/counter.js';

/**
 * The counter helper is the one statement every counter-shaped inventory
 * claims through, and the table name is interpolated as a raw identifier.
 * These tests pin the two things that make that safe: the whitelist, and the
 * fact that nothing reaches the database for a name outside it.
 */
describe('inventory counter', () => {
    it('knows the room and tour counter tables and their keys', () => {
        assert.equal(COUNTER_TABLES.room_inventory.key, 'room_type_id');
        assert.equal(COUNTER_TABLES.tour_inventory.key, 'tour_option_id');
        assert.ok(Object.isFrozen(COUNTER_TABLES));
    });

    it('refuses a table outside the whitelist before touching the client', async () => {
        let queried = false;
        const tx = {
            $queryRaw: async () => {
                queried = true;
                return [];
            }
        };

        await assert.rejects(
            () =>
                moveCounterUnits(tx, {
                    table: 'users; DROP TABLE users',
                    keyId: 'x',
                    dates: [],
                    quantity: 1,
                    to: 'held'
                }),
            /Unknown inventory counter table/
        );
        assert.equal(queried, false);
    });

    it('claims every night of a stay in ascending order, check-out exclusive', () => {
        const dates = nightDates('2027-03-01', '2027-03-04');

        assert.deepEqual(
            dates.map((date) => date.toISOString().slice(0, 10)),
            ['2027-03-01', '2027-03-02', '2027-03-03']
        );
    });

    it('reports how many rows it asked for so a short claim is detectable', async () => {
        const tx = { $queryRaw: async () => [{ date: new Date('2027-03-01') }] };
        const result = await moveCounterUnits(tx, {
            table: 'room_inventory',
            keyId: 'rt',
            dates: nightDates('2027-03-01', '2027-03-03'),
            quantity: 1,
            to: 'held',
            requireAvailable: true
        });

        assert.equal(result.expected, 2);
        assert.equal(result.claimed.length, 1);
    });
});
