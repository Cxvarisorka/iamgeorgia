import { ConflictError } from './errors.js';

/**
 * A named transition table.
 *
 * `transitions` is `{ FROM: { TO: [actorKind, ...] } }`: which kinds of actor
 * may move a record from one state to another. The table is deliberately
 * data, not code, so it can be unit-tested pair by pair, rendered to a client
 * as "what may I do next", and read by a human without tracing branches.
 *
 * Guards that need the row — "not before four hours ahead of pick-up" — do not
 * live here. They live beside the service that has the row, keyed on the same
 * `FROM->TO` pair, so the table stays a pure statement of what is legal in
 * principle.
 */
export const defineMachine = ({ name, terminal = [], transitions }) => {
    const states = [...new Set([...Object.keys(transitions), ...Object.values(transitions).flatMap(Object.keys)])];

    const can = (from, to, actorKind) => Boolean(transitions[from]?.[to]?.includes(actorKind));

    /**
     * Throws a 409 unless the move is legal. A request for the state a record
     * is already in returns 'NOOP' rather than throwing: a retried status
     * update from a phone with a flaky connection is not a conflict.
     */
    const assertTransition = (from, to, actorKind) => {
        if (from === to) {
            return 'NOOP';
        }

        if (!can(from, to, actorKind)) {
            throw new ConflictError(`Cannot move ${name} from ${from} to ${to}`, {
                reason: 'INVALID_TRANSITION',
                entity: name,
                from,
                to,
                actor: actorKind
            });
        }

        return 'OK';
    };

    /** The states this actor may move to from here — what a UI renders as buttons. */
    const nextStates = (from, actorKind) =>
        Object.keys(transitions[from] ?? {}).filter((to) => can(from, to, actorKind));

    const isTerminal = (state) => terminal.includes(state);

    return { name, states, terminal, can, assertTransition, nextStates, isTerminal };
};
