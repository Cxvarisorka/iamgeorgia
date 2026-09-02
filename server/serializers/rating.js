/**
 * Driver ratings.
 *
 *   toRatingPublic — what the person who left it, or a partner reading a
 *                    driver's profile, sees: the score, the words, when
 *   toRatingAdmin  — operations: plus who left it, on which transfer, and
 *                    the moderation trail
 */

export const toRatingPublic = (rating) => ({
    id: rating.id,
    score: rating.score,
    comment: rating.status === 'PUBLISHED' ? (rating.comment ?? null) : null,
    status: rating.status,
    source: rating.source,
    createdAt: rating.createdAt
});

const toPerson = (user) =>
    user
        ? { id: user.id, email: user.email, fullName: [user.firstName, user.lastName].filter(Boolean).join(' ') }
        : null;

export const toRatingAdmin = (rating) => ({
    id: rating.id,
    score: rating.score,
    comment: rating.comment ?? null,
    status: rating.status,
    source: rating.source,
    driver: rating.driver
        ? { id: rating.driver.id, firstName: rating.driver.firstName, lastName: rating.driver.lastName }
        : null,
    booking: rating.booking ? { id: rating.booking.id, reference: rating.booking.reference } : null,
    leg: rating.leg
        ? {
              id: rating.leg.id,
              legIndex: rating.leg.legIndex,
              pickupAt: rating.leg.pickupAt,
              from: rating.leg.fromPointName,
              to: rating.leg.toPointName
          }
        : null,
    submittedBy: toPerson(rating.submittedByUser),
    submittedByEmail: rating.submittedByEmail ?? null,
    moderatedAt: rating.moderatedAt ?? null,
    moderatedBy: toPerson(rating.moderatedByUser),
    moderationNote: rating.moderationNote ?? null,
    createdAt: rating.createdAt
});
