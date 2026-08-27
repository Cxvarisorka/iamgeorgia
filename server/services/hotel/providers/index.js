import { BadGatewayError } from '../../../lib/errors.js';
import { manualProvider } from './manual.js';

/**
 * The availability provider registry.
 *
 * Every read of availability and every write of a hold goes through here, even
 * though there is exactly one implementation today. That is the point: when a
 * channel manager or a PMS arrives it becomes a second entry in this map and a
 * new file beside `manual.js`, and search and booking do not change at all.
 *
 * The interface a provider implements:
 *
 *   searchCandidates(criteria) -> [{ hotelId, roomTypeId, ratePlanId, netTotalCents, availableUnits }]
 *   loadRates(ratePlanIds, checkIn, checkOut) -> Map<ratePlanId, Map<date, rate>>
 *   availabilityFor(roomTypeId, checkIn, checkOut) -> { availableUnits }
 *
 * Holds and commits join it in Phase 6.
 */
const providers = new Map([[manualProvider.code, manualProvider]]);

export const providerFor = (sourceType = 'MANUAL') => {
    const provider = providers.get(sourceType);

    if (!provider) {
        // A hotel configured against a provider that is not deployed is an
        // upstream problem, not a bad request: 502 says so without pretending
        // the caller did anything wrong.
        throw new BadGatewayError(`No availability provider is configured for ${sourceType}`);
    }

    return provider;
};

/**
 * The provider that answers a mixed search.
 *
 * While MANUAL is the only implementation this is simply that. When external
 * sources arrive, search fans out per source and merges — which is why callers
 * ask for a provider rather than importing one.
 */
export const defaultProvider = () => providerFor('MANUAL');

export const registerProvider = (provider) => providers.set(provider.code, provider);
