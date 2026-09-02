import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    atLeastServiceLevel,
    certificationState,
    daysBetween,
    daysUntilExpiry,
    deriveKosher,
    isExpiringSoon,
    kosherFeaturesOf,
    pickHeadlineCertification,
    PROPERTY_SCOPES,
    SERVICE_LEVEL_ORDER
} from '../services/hotel/kosher.service.js';

/**
 * The derivation half of the kosher module, with no database anywhere near it.
 *
 * This is where the feature's central guarantee is actually tested: **nothing a
 * hotel record can contain makes it read as certified except a verified,
 * unexpired, property-scoped certificate**. Everything below is a way of trying
 * to break that.
 *
 * Every function here takes `today` explicitly, so the clock is an argument
 * rather than an ambient fact — which is what makes the boundary cases
 * (expires today, expired yesterday, never expires) testable at all.
 */

const TODAY = '2026-08-31';

const certificate = (overrides = {}) => ({
    id: 'cert-1',
    scope: 'PROPERTY',
    verification: 'VERIFIED',
    expiresOn: null,
    archivedAt: null,
    authorityName: 'Chief Rabbinate of Georgia',
    ...overrides
});

const profile = (certifications, overrides = {}) => ({
    serviceLevel: 'FULL',
    certifications,
    ...overrides
});

describe('kosher — certificate state', () => {
    it('reports the stored decision while it is not VERIFIED', () => {
        for (const verification of ['UNVERIFIED', 'PENDING_VERIFICATION', 'REJECTED']) {
            assert.equal(certificationState(certificate({ verification }), TODAY), verification);
        }
    });

    it('is VERIFIED when the authority issues no expiry', () => {
        assert.equal(certificationState(certificate({ expiresOn: null }), TODAY), 'VERIFIED');
    });

    it('is still VERIFIED on the day it expires', () => {
        // A certificate valid *until* the 31st is valid on the 31st. Getting
        // this wrong is a day of a property silently losing its badge.
        assert.equal(certificationState(certificate({ expiresOn: TODAY }), TODAY), 'VERIFIED');
    });

    it('is EXPIRED the day after', () => {
        assert.equal(
            certificationState(certificate({ expiresOn: '2026-08-30' }), TODAY),
            'EXPIRED'
        );
    });

    it('derives EXPIRED without any job having run', () => {
        // The whole reason expiry is computed rather than stored: nothing
        // wrote to this record, and it is already right.
        const lapsed = certificate({ expiresOn: '2020-01-01' });

        assert.equal(lapsed.verification, 'VERIFIED');
        assert.equal(certificationState(lapsed, TODAY), 'EXPIRED');
    });

    it('reports an archived certificate as archived whatever it says', () => {
        assert.equal(
            certificationState(certificate({ archivedAt: new Date() }), TODAY),
            'ARCHIVED'
        );
    });

    it('accepts a stored Date as readily as a date-only string', () => {
        assert.equal(
            certificationState(certificate({ expiresOn: new Date('2026-08-30T00:00:00Z') }), TODAY),
            'EXPIRED'
        );
    });
});

describe('kosher — days until expiry', () => {
    it('counts forward, and negative once past', () => {
        assert.equal(daysBetween(TODAY, '2026-09-30'), 30);
        assert.equal(daysBetween(TODAY, TODAY), 0);
        assert.equal(daysBetween(TODAY, '2026-08-24'), -7);
    });

    it('is null for a certificate that never expires', () => {
        assert.equal(daysUntilExpiry(certificate({ expiresOn: null }), TODAY), null);
    });

    it('crosses a month boundary without drifting', () => {
        assert.equal(daysUntilExpiry(certificate({ expiresOn: '2026-09-07' }), TODAY), 7);
    });
});

describe('kosher — the derived position', () => {
    it('is null for a property with no profile', () => {
        assert.equal(deriveKosher(null, TODAY), null);
    });

    it('is certified only with a live, property-scoped certificate', () => {
        const resolved = deriveKosher(profile([certificate({ expiresOn: '2027-01-01' })]), TODAY);

        assert.equal(resolved.certified, true);
        assert.equal(resolved.state, 'VERIFIED');
    });

    it('is NOT certified on an expired certificate', () => {
        const resolved = deriveKosher(profile([certificate({ expiresOn: '2026-01-01' })]), TODAY);

        assert.equal(resolved.certified, false);
        assert.equal(resolved.state, 'EXPIRED');
    });

    it('is NOT certified on a certificate nobody has checked', () => {
        const resolved = deriveKosher(
            profile([certificate({ verification: 'UNVERIFIED' })]),
            TODAY
        );

        assert.equal(resolved.certified, false);
        assert.equal(resolved.state, 'UNVERIFIED');
    });

    it('is NOT certified on a rejected certificate', () => {
        const resolved = deriveKosher(profile([certificate({ verification: 'REJECTED' })]), TODAY);

        assert.equal(resolved.certified, false);
    });

    it('is NOT certified on an archived certificate', () => {
        const resolved = deriveKosher(
            profile([certificate({ archivedAt: new Date() })]),
            TODAY
        );

        assert.equal(resolved.certified, false);
        assert.equal(resolved.state, 'NONE');
    });

    it('is NOT certified by a restaurant-only certificate', () => {
        // The specific misrepresentation the scope column exists to prevent: a
        // certified restaurant inside a hotel is not a certified hotel.
        const resolved = deriveKosher(profile([certificate({ scope: 'RESTAURANT' })]), TODAY);

        assert.equal(resolved.certified, false);
        // Still a real, live certificate — it is shown, it just does not
        // certify the property.
        assert.equal(resolved.state, 'VERIFIED');
        assert.deepEqual(resolved.certifiedScopes, ['RESTAURANT']);
    });

    it('is NOT certified by a Passover-only certificate', () => {
        assert.equal(
            deriveKosher(profile([certificate({ scope: 'PASSOVER' })]), TODAY).certified,
            false
        );
    });

    it('is certified by a KITCHEN certificate', () => {
        assert.equal(
            deriveKosher(profile([certificate({ scope: 'KITCHEN' })]), TODAY).certified,
            true
        );
        assert.deepEqual(PROPERTY_SCOPES, ['PROPERTY', 'KITCHEN']);
    });

    it('is NOT certified by the strongest possible service level alone', () => {
        // The claim at the heart of the design: FULL is a declaration, and a
        // declaration is not an assurance.
        const resolved = deriveKosher(profile([], { serviceLevel: 'FULL' }), TODAY);

        assert.equal(resolved.serviceLevel, 'FULL');
        assert.equal(resolved.certified, false);
        assert.equal(resolved.state, 'NONE');
    });

    it('reports NONE service as not offering kosher', () => {
        const resolved = deriveKosher(profile([], { serviceLevel: 'NONE' }), TODAY);

        assert.equal(resolved.offersKosher, false);
    });

    it('stays certified when one of two certificates has lapsed', () => {
        const resolved = deriveKosher(
            profile([
                certificate({ id: 'old', expiresOn: '2026-01-01' }),
                certificate({ id: 'new', expiresOn: '2027-06-01' })
            ]),
            TODAY
        );

        assert.equal(resolved.certified, true);
        assert.equal(resolved.headline.id, 'new');
    });
});

describe('kosher — which certificate leads', () => {
    it('prefers a live certificate to a pending one', () => {
        const picked = pickHeadlineCertification(
            [
                certificate({ id: 'pending', verification: 'PENDING_VERIFICATION' }),
                certificate({ id: 'live', expiresOn: '2027-01-01' })
            ],
            TODAY
        );

        assert.equal(picked.certification.id, 'live');
    });

    it('prefers a pending certificate to a lapsed one', () => {
        const picked = pickHeadlineCertification(
            [
                certificate({ id: 'lapsed', expiresOn: '2020-01-01' }),
                certificate({ id: 'pending', verification: 'PENDING_VERIFICATION' })
            ],
            TODAY
        );

        assert.equal(picked.certification.id, 'pending');
    });

    it('prefers the one that runs longest, and no expiry runs longest of all', () => {
        const picked = pickHeadlineCertification(
            [
                certificate({ id: 'short', expiresOn: '2026-09-30' }),
                certificate({ id: 'forever', expiresOn: null })
            ],
            TODAY
        );

        assert.equal(picked.certification.id, 'forever');
    });

    it('never returns an archived certificate', () => {
        assert.equal(
            pickHeadlineCertification([certificate({ archivedAt: new Date() })], TODAY),
            null
        );
    });

    it('returns null for a property with nothing on file', () => {
        assert.equal(pickHeadlineCertification([], TODAY), null);
    });
});

describe('kosher — the expiry warning', () => {
    it('warns inside sixty days', () => {
        assert.equal(
            isExpiringSoon(deriveKosher(profile([certificate({ expiresOn: '2026-10-01' })]), TODAY)),
            true
        );
    });

    it('says nothing at ninety days out', () => {
        assert.equal(
            isExpiringSoon(deriveKosher(profile([certificate({ expiresOn: '2027-01-01' })]), TODAY)),
            false
        );
    });

    it('says nothing about a certificate that never expires', () => {
        assert.equal(
            isExpiringSoon(deriveKosher(profile([certificate({ expiresOn: null })]), TODAY)),
            false
        );
    });

    it('says nothing about one that has already lapsed — that is not a warning', () => {
        // An expired certificate is reported as EXPIRED, which is a stronger
        // statement than "expiring soon" and is rendered differently.
        assert.equal(
            isExpiringSoon(deriveKosher(profile([certificate({ expiresOn: '2020-01-01' })]), TODAY)),
            false
        );
    });
});

describe('kosher — service level ordering', () => {
    it('is declared weakest-first', () => {
        assert.deepEqual(SERVICE_LEVEL_ORDER, [
            'NONE',
            'ON_REQUEST',
            'KOSHER_FRIENDLY',
            'PARTIAL',
            'FULL'
        ]);
    });

    it('includes everything at or above the level asked for', () => {
        assert.deepEqual(atLeastServiceLevel('PARTIAL'), ['PARTIAL', 'FULL']);
        assert.deepEqual(atLeastServiceLevel('FULL'), ['FULL']);
    });

    it('never includes NONE, even when NONE is asked for', () => {
        // "We checked, and the answer is no" is worth recording and never worth
        // returning from a search.
        assert.ok(!atLeastServiceLevel('NONE').includes('NONE'));
        assert.deepEqual(atLeastServiceLevel('NONE'), [
            'ON_REQUEST',
            'KOSHER_FRIENDLY',
            'PARTIAL',
            'FULL'
        ]);
    });
});

describe('kosher — facilities are projected, not stored', () => {
    const amenity = (code, category) => ({ amenity: { code, category } });

    it('picks out exactly the three kosher categories', () => {
        const codes = kosherFeaturesOf({
            amenities: [
                amenity('wifi', 'General'),
                amenity('kosherRestaurant', 'KosherFood'),
                amenity('shabbatElevator', 'Shabbat'),
                amenity('mikvehOnSite', 'Religious'),
                amenity('skiStorage', 'Ski')
            ]
        });

        assert.deepEqual(codes, ['kosherRestaurant', 'shabbatElevator', 'mikvehOnSite']);
    });

    it('is empty for a hotel with no amenities loaded', () => {
        assert.deepEqual(kosherFeaturesOf({}), []);
        assert.deepEqual(kosherFeaturesOf(null), []);
    });
});
