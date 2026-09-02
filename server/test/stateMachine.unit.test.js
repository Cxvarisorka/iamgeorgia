import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defineMachine } from '../lib/stateMachine.js';
import { ACTOR, transferLegMachine, transferBookingMachine } from '../lib/transfer/machines.js';
import { assignmentWindow, windowsOverlap } from '../lib/transfer/schedule.js';
import { ConflictError } from '../lib/errors.js';

const { OPS, DRIVER, PARTNER, GUEST, SYSTEM } = ACTOR;

describe('defineMachine', () => {
    const machine = defineMachine({
        name: 'widget',
        terminal: ['DONE'],
        transitions: { NEW: { OPEN: ['A'] }, OPEN: { DONE: ['A', 'B'] }, DONE: {} }
    });

    it('allows what the table allows and nothing else', () => {
        assert.equal(machine.can('NEW', 'OPEN', 'A'), true);
        assert.equal(machine.can('NEW', 'OPEN', 'B'), false);
        assert.equal(machine.can('NEW', 'DONE', 'A'), false);
        assert.equal(machine.can('NOWHERE', 'OPEN', 'A'), false);
    });

    it('treats a request for the current state as a no-op, not a conflict', () => {
        assert.equal(machine.assertTransition('OPEN', 'OPEN', 'B'), 'NOOP');
        assert.equal(machine.assertTransition('NEW', 'OPEN', 'A'), 'OK');
    });

    it('throws a 409 with the pair named for an illegal move', () => {
        assert.throws(
            () => machine.assertTransition('NEW', 'DONE', 'A'),
            (err) =>
                err instanceof ConflictError &&
                err.details.reason === 'INVALID_TRANSITION' &&
                err.details.from === 'NEW' &&
                err.details.to === 'DONE' &&
                err.details.actor === 'A'
        );
    });

    it('lists the next states per actor and knows the terminal ones', () => {
        assert.deepEqual(machine.nextStates('OPEN', 'B'), ['DONE']);
        assert.deepEqual(machine.nextStates('NEW', 'B'), []);
        assert.equal(machine.isTerminal('DONE'), true);
        assert.equal(machine.isTerminal('OPEN'), false);
        assert.deepEqual([...machine.states].sort(), ['DONE', 'NEW', 'OPEN']);
    });
});

describe('the transfer leg machine', () => {
    const legal = (from, to, actor) => assert.equal(transferLegMachine.can(from, to, actor), true, `${from}->${to} by ${actor}`);
    const illegal = (from, to, actor) =>
        assert.equal(transferLegMachine.can(from, to, actor), false, `${from}->${to} by ${actor}`);

    it('only operations can offer a leg, and only to an unassigned one', () => {
        legal('UNASSIGNED', 'ASSIGNED', OPS);
        illegal('UNASSIGNED', 'ASSIGNED', DRIVER);
        illegal('UNASSIGNED', 'ASSIGNED', PARTNER);
        illegal('ACCEPTED', 'ASSIGNED', OPS);
    });

    it('a driver accepts, declines, and walks the job forward, skipping steps if need be', () => {
        legal('ASSIGNED', 'ACCEPTED', DRIVER);
        legal('ASSIGNED', 'UNASSIGNED', DRIVER);
        legal('ACCEPTED', 'EN_ROUTE', DRIVER);
        legal('ACCEPTED', 'ARRIVED', DRIVER);
        legal('ACCEPTED', 'COMPLETED', DRIVER);
        legal('EN_ROUTE', 'ON_BOARD', DRIVER);
        legal('ARRIVED', 'NO_SHOW_REPORTED', DRIVER);
    });

    it('a driver never moves backwards and never confirms a no-show', () => {
        illegal('ARRIVED', 'EN_ROUTE', DRIVER);
        illegal('COMPLETED', 'ON_BOARD', DRIVER);
        illegal('NO_SHOW_REPORTED', 'NO_SHOW', DRIVER);
        legal('NO_SHOW_REPORTED', 'NO_SHOW', OPS);
        legal('NO_SHOW_REPORTED', 'NO_SHOW', SYSTEM);
        legal('COMPLETED', 'ON_BOARD', OPS);
    });

    it('cancellation stops once a passenger is in the car', () => {
        for (const from of ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED']) {
            legal(from, 'CANCELLED', OPS);
            legal(from, 'CANCELLED', PARTNER);
            legal(from, 'CANCELLED', GUEST);
        }

        for (const from of ['ON_BOARD', 'NO_SHOW_REPORTED', 'COMPLETED', 'NO_SHOW']) {
            illegal(from, 'CANCELLED', OPS);
            illegal(from, 'CANCELLED', PARTNER);
            illegal(from, 'CANCELLED', GUEST);
        }
    });

    it('terminal states go nowhere', () => {
        for (const state of ['COMPLETED', 'NO_SHOW', 'CANCELLED']) {
            assert.equal(transferLegMachine.isTerminal(state), true);
        }

        assert.deepEqual(transferLegMachine.nextStates('NO_SHOW', OPS), []);
        assert.deepEqual(transferLegMachine.nextStates('CANCELLED', OPS), []);
        assert.deepEqual(transferLegMachine.nextStates('COMPLETED', DRIVER), []);
    });
});

describe('the transfer booking machine', () => {
    it('closes only from CONFIRMED, and only by operations or the roll-up', () => {
        assert.equal(transferBookingMachine.can('CONFIRMED', 'COMPLETED', SYSTEM), true);
        assert.equal(transferBookingMachine.can('CONFIRMED', 'NO_SHOW', OPS), true);
        assert.equal(transferBookingMachine.can('CONFIRMED', 'COMPLETED', PARTNER), false);
        assert.equal(transferBookingMachine.can('CANCELLED', 'COMPLETED', OPS), false);
        assert.equal(transferBookingMachine.can('CONFIRMED', 'CANCELLED', GUEST), true);
    });
});

describe('assignment windows', () => {
    const pickupAt = new Date('2026-10-01T10:00:00.000Z');

    it('pads the journey by the buffers it is given', () => {
        const window = assignmentWindow(
            { pickupAt, durationMinutes: 90 },
            { preBufferMinutes: 45, postBufferMinutes: 30 }
        );

        assert.equal(window.windowStart.toISOString(), '2026-10-01T09:15:00.000Z');
        assert.equal(window.windowEnd.toISOString(), '2026-10-01T12:00:00.000Z');
        assert.equal(window.preBufferMinutes, 45);
        assert.equal(window.postBufferMinutes, 30);
    });

    it('accepts an ISO string as well as a Date', () => {
        const window = assignmentWindow(
            { pickupAt: pickupAt.toISOString(), durationMinutes: 60 },
            { preBufferMinutes: 0, postBufferMinutes: 0 }
        );

        assert.equal(window.windowEnd.toISOString(), '2026-10-01T11:00:00.000Z');
    });

    it('treats windows as half-open, so back-to-back jobs do not touch', () => {
        const a = { windowStart: new Date('2026-10-01T09:00:00Z'), windowEnd: new Date('2026-10-01T11:00:00Z') };
        const b = { windowStart: new Date('2026-10-01T11:00:00Z'), windowEnd: new Date('2026-10-01T12:00:00Z') };
        const c = { windowStart: new Date('2026-10-01T10:59:00Z'), windowEnd: new Date('2026-10-01T12:00:00Z') };

        assert.equal(windowsOverlap(a, b), false);
        assert.equal(windowsOverlap(a, c), true);
        assert.equal(windowsOverlap(c, a), true);
    });
});
