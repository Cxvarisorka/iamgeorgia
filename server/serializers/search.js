import { toHotelSummary } from './hotel.js';
import { toRoomTypeSummary } from './roomType.js';
import { toOfferTerms } from './ratePlan.js';
import { toQuote } from './inventory.js';
import { freeCancellationUntil } from '../services/hotel/policy.service.js';

/**
 * Search results and offers.
 *
 * An offer is the unit a guest compares, so it carries everything needed to
 * compare — board, refundability, total — and a token to carry it into
 * checkout. It never carries a net rate: `toQuote` gates that behind the
 * viewer, and a public search has no viewer to grant it to.
 */

export const toOffer = (offer, viewer) => ({
    token: offer.token,
    roomTypeId: offer.roomType.id,
    ratePlanId: offer.ratePlan.id,
    name: offer.ratePlan.name,
    terms: toOfferTerms(offer.ratePlan, offer.schedule),
    quote: toQuote(offer.quote, viewer, offer.hotel),
    // What the guest needs to know about fit, beyond "it fits".
    occupancy: {
        extraBedsNeeded: offer.occupancy.extraBedsNeeded,
        extraGuests: offer.occupancy.extraGuests
    },
    // A scarcity cue that is true, unlike the prototype's hardcoded string.
    availableUnits: offer.availableUnits,
    freeCancellationUntil: freeCancellationUntil(offer.schedule)
});

/**
 * A search card.
 *
 * `startingFrom` is the cheapest offer that can actually be booked for these
 * exact dates and this exact party — never `hotel.priceFromCents`, which has no
 * dates attached and is therefore not an offer.
 */
export const toSearchResult = ({ hotel, offers }, locale, viewer) => {
    const cheapest = offers[0];

    return {
        ...toHotelSummary(hotel, locale, viewer),
        startingFrom: {
            totalCents: cheapest.quote.totals.totalCents,
            perNightCents: Math.round(cheapest.quote.totals.totalCents / cheapest.quote.totals.nightsCount),
            currency: cheapest.quote.currency
        },
        // Enough to render the card's badges without a second request.
        mealPlans: [...new Set(offers.map((offer) => offer.ratePlan.mealPlan?.code).filter(Boolean))],
        refundable: offers.some((offer) => freeCancellationUntil(offer.schedule) !== null),
        offerCount: offers.length,
        cheapestOffer: toOffer(cheapest, viewer)
    };
};

/**
 * Hotel availability, grouped by room.
 *
 * Three rate plans on one room are three offers for *that room*, not three
 * unrelated rooms. Presenting them flat is both confusing and how a guest books
 * the wrong thing.
 */
export const toRoomAvailability = ({ roomType, offers }, locale, viewer) => ({
    ...toRoomTypeSummary(roomType, locale),
    offers: offers.map((offer) => toOffer(offer, viewer))
});
