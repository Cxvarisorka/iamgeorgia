import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isTrade } from '../middleware/auth.js';

/**
 * Who buys at trade. `User.role` is not nullable, so the old test —
 * `Boolean(viewer?.role)` — was true for every signed-in account and "trade"
 * quietly meant "logged in": a driver saw hotels closed to the public and the
 * rate plans marked PARTNER_ONLY.
 */
describe('the trade viewer', () => {
    const partner = (status, role = 'PARTNER_AGENT') => ({ role, partnerId: 'p1', partner: { id: 'p1', status } });

    it('is an admin', () => {
        assert.equal(isTrade({ role: 'ADMIN' }), true);
        assert.equal(isTrade({ role: 'SUPER_ADMIN' }), true);
    });

    it('is an approved partner', () => {
        assert.equal(isTrade(partner('APPROVED')), true);
        assert.equal(isTrade(partner('APPROVED', 'PARTNER_OWNER')), true);
    });

    it('is not a partner still waiting for approval, or one that lost it', () => {
        for (const status of ['INVITED', 'REGISTRATION_IN_PROGRESS', 'PENDING_APPROVAL', 'REJECTED', 'SUSPENDED']) {
            assert.equal(isTrade(partner(status)), false, status);
        }
    });

    it('is not platform staff outside the admin roles', () => {
        assert.equal(isTrade({ role: 'DRIVER' }), false);
        assert.equal(isTrade({ role: 'DISPATCHER' }), false);
    });

    it('is not an anonymous visitor', () => {
        assert.equal(isTrade(undefined), false);
        assert.equal(isTrade(null), false);
        assert.equal(isTrade({}), false);
    });

    // A system caller or a test builds a viewer from a partnerId alone.
    it('takes a bare partnerId at its word when the relation was not loaded', () => {
        assert.equal(isTrade({ partnerId: 'p1' }), true);
    });
});
