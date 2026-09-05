import { defineMachine } from '../stateMachine.js';
import { ACTOR } from '../transfer/machines.js';

/**
 * The life of an order, and of one item in it.
 *
 * An order's status is never set directly by a request: it is rolled up from
 * its items after every change (`rollUpOrderStatus`), and the table below
 * says which roll-ups are legal for whom. The actors are the transfer
 * module's — OPS, PARTNER, GUEST, SYSTEM — because they are the same people.
 */

const { OPS, PARTNER, GUEST, SYSTEM } = ACTOR;

const CANCELLERS = [OPS, PARTNER, GUEST, SYSTEM];

export const orderMachine = defineMachine({
    name: 'order',
    terminal: ['CANCELLED', 'COMPLETED'],
    transitions: {
        PENDING_CONFIRMATION: {
            CONFIRMED: [OPS, SYSTEM],
            PARTIALLY_CANCELLED: CANCELLERS,
            CANCELLED: CANCELLERS
        },
        CONFIRMED: {
            PARTIALLY_CANCELLED: CANCELLERS,
            CANCELLED: [OPS, PARTNER, GUEST],
            COMPLETED: [OPS, SYSTEM]
        },
        PARTIALLY_CANCELLED: {
            CANCELLED: [OPS, PARTNER, GUEST],
            COMPLETED: [OPS, SYSTEM]
        }
    }
});

export const orderItemMachine = defineMachine({
    name: 'order item',
    terminal: ['DECLINED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'],
    transitions: {
        REQUESTED: {
            CONFIRMED: [OPS, SYSTEM],
            DECLINED: [OPS],
            CANCELLED: CANCELLERS
        },
        CONFIRMED: {
            CANCELLED: CANCELLERS,
            COMPLETED: [OPS, SYSTEM],
            NO_SHOW: [OPS, SYSTEM]
        }
    }
});

/** The item states that still owe the order something. */
export const LIVE_ITEM_STATUSES = ['REQUESTED', 'CONFIRMED'];

/**
 * The order status its items imply.
 *
 * Any item still awaiting an operator: PENDING_CONFIRMATION. Every item gone:
 * CANCELLED. Every surviving item finished: COMPLETED. Some gone, some not:
 * PARTIALLY_CANCELLED. Otherwise CONFIRMED.
 */
export const impliedOrderStatus = (items) => {
    const statuses = items.map((item) => item.status);

    if (statuses.some((status) => status === 'REQUESTED')) {
        return 'PENDING_CONFIRMATION';
    }

    const gone = statuses.filter((status) => status === 'CANCELLED' || status === 'DECLINED');

    if (gone.length === statuses.length) {
        return 'CANCELLED';
    }

    const surviving = statuses.filter((status) => status !== 'CANCELLED' && status !== 'DECLINED');

    if (surviving.every((status) => status === 'COMPLETED' || status === 'NO_SHOW')) {
        return 'COMPLETED';
    }

    // A supplier's decline of an optional part is not a cancellation by the
    // buyer: the order they hold is simply the survivors, and stays CONFIRMED.
    // Only an item the buyer (or operations) cancelled makes the order partial.
    return statuses.some((status) => status === 'CANCELLED') ? 'PARTIALLY_CANCELLED' : 'CONFIRMED';
};
