import { prisma, disconnect } from '../db/index.js';
import { KOSHER_BOOKING_REQUEST_SCENARIOS, KOSHER_HOTELS } from '../db/seed/kosherHotels.js';
import { KOSHER_AMENITY_CATEGORIES } from '../db/seed/kosherAmenities.js';
import { addDays, dateOnlyToUtc, todayInTimezone } from '../lib/time.js';

/**
 * Puts kosher data onto the catalogue.
 *
 *   node scripts/seed-kosher.js
 *
 * An overlay, not a catalogue seed: it attaches profiles, certificates,
 * facilities, nearby religious places and booking requirements to properties
 * that already exist. Run it after `seed-reference.js` (the facility
 * vocabulary) and `seed-catalogue.js` (the properties).
 *
 * **Idempotent by hotel, and it never overwrites.** A property that already has
 * a kosher profile is skipped whole — including one somebody entered by hand in
 * the admin panel, which is the case that actually matters. Re-running after
 * adding a property to the fixture seeds only that one.
 *
 * Two things it deliberately does *not* do:
 *
 *   * It does not go through `upsertKosherProfile`. That helper stamps
 *     `lockedAt` and `source: ADMIN` because a human was there; a seed is not a
 *     human, and marking fixture rows as staff-reviewed would make the supplier
 *     lock untestable — the one property with a held supplier update needs the
 *     lock, and gets it explicitly.
 *   * It does not fabricate a certified state through a back door. A row marked
 *     VERIFIED here is a row an admin would have had to verify, and the
 *     serializer still derives `certified` from scope and expiry — which is why
 *     two of the fixtures below carry a VERIFIED certificate and are, correctly,
 *     not certified.
 */

/** Everything is dated from the property's own day, not the server's. */
const TODAY = todayInTimezone('Asia/Tbilisi');

const relativeDate = (days) => (days === undefined || days === null ? null : dateOnlyToUtc(addDays(TODAY, days)));

/**
 * The facility vocabulary, by code.
 *
 * Loaded once and checked against, so a typo in the fixture fails the run with
 * the offending code rather than quietly attaching nothing — a hotel silently
 * missing "Shabbat elevator" is exactly the kind of wrong that only surfaces
 * when an agency complains.
 */
const loadFacilities = async () => {
    const rows = await prisma.amenity.findMany({
        where: { category: { in: KOSHER_AMENITY_CATEGORIES } },
        select: { id: true, code: true }
    });

    if (rows.length === 0) {
        throw new Error('No kosher facilities found — run `node scripts/seed-reference.js` first.');
    }

    return new Map(rows.map((row) => [row.code, row.id]));
};

/**
 * Adds the kosher facilities to whatever the hotel already claims.
 *
 * Additive on purpose. `PUT /amenities` replaces the whole set because that is
 * what a checklist means, but a seed touching one category must not drop the
 * pool and the parking somebody else set.
 */
const attachFacilities = async (hotelId, codes, facilities) => {
    const unknown = codes.filter((code) => !facilities.has(code));

    if (unknown.length > 0) {
        throw new Error(`Unknown kosher facility codes: ${unknown.join(', ')}`);
    }

    if (codes.length === 0) {
        return 0;
    }

    // `skipDuplicates` rather than a delete-then-insert: the join row carries a
    // per-hotel note, and re-creating one would throw that away.
    const { count } = await prisma.hotelAmenity.createMany({
        data: codes.map((code) => ({ hotelId, amenityId: facilities.get(code) })),
        skipDuplicates: true
    });

    return count;
};

/**
 * Merges religious places into the hotel's existing `nearby` list.
 *
 * Matched by name so a re-run does not duplicate the synagogue. The column is
 * validated by the Prisma extension against `nearbyPlaceSchema`, so a malformed
 * entry here fails at the write rather than at render time on the hotel page.
 */
const mergeNearby = async (hotel, additions) => {
    if (!additions?.length) {
        return 0;
    }

    const existing = Array.isArray(hotel.nearby) ? hotel.nearby : [];
    const known = new Set(existing.map((place) => place.name));
    const added = additions.filter((place) => !known.has(place.name));

    if (added.length === 0) {
        return 0;
    }

    await prisma.hotel.update({
        where: { id: hotel.id },
        data: { nearby: [...existing, ...added] }
    });

    return added.length;
};

/** One property: profile, certificates, facilities, nearby places. */
const seedHotelKosher = async (slug, fixture, facilities) => {
    const hotel = await prisma.hotel.findUnique({
        where: { slug },
        select: { id: true, name: true, nearby: true, kosher: { select: { id: true } } }
    });

    if (!hotel) {
        console.log(`  skipped ${slug}: no such property`);
        return { skipped: true };
    }

    if (hotel.kosher) {
        // Somebody has been here — possibly a person, in the panel. Their record
        // wins over a fixture, every time.
        console.log(`  exists  ${slug}: left untouched`);
        return { skipped: true };
    }

    const isSupplierHeld = Boolean(fixture.pendingSupplierData);

    const profile = await prisma.hotelKosherProfile.create({
        data: {
            hotelId: hotel.id,
            serviceLevel: fixture.serviceLevel,
            notes: fixture.notes ?? null,
            contactName: fixture.contactName ?? null,
            contactEmail: fixture.contactEmail ?? null,
            contactPhone: fixture.contactPhone ?? null,
            source: 'ADMIN',
            // Only the property with a supplier disagreement is locked, because
            // the lock is what makes that disagreement a *held* update rather
            // than an applied one. Locking every fixture would leave nothing to
            // demonstrate the unlocked path with.
            ...(isSupplierHeld
                ? {
                      lockedAt: new Date(),
                      pendingSupplierData: {
                          ...fixture.pendingSupplierData,
                          receivedAt: new Date().toISOString()
                      }
                  }
                : {})
        }
    });

    for (const certificate of fixture.certifications ?? []) {
        const verified = certificate.verification === 'VERIFIED';

        await prisma.hotelKosherCertification.create({
            data: {
                profileId: profile.id,
                authorityName: certificate.authorityName,
                authorityWebsite: certificate.authorityWebsite ?? null,
                name: certificate.name ?? null,
                reference: certificate.reference ?? null,
                scope: certificate.scope,
                issuedOn: relativeDate(certificate.issuedOnDaysFromToday),
                expiresOn: relativeDate(certificate.expiresOnDaysFromToday),
                verification: certificate.verification,
                // The CHECK constraint insists a VERIFIED row carries a
                // timestamp, and it is right to: a verification nobody can date
                // is not one anybody can audit.
                verifiedAt: certificate.verification === 'UNVERIFIED' ? null : new Date(),
                verificationNotes: certificate.verificationNotes ?? null,
                source: 'ADMIN',
                archivedAt: certificate.archived ? new Date() : null
            }
        });

        if (verified && !certificate.archived) {
            const expiry = certificate.expiresOnDaysFromToday;
            const state = expiry !== null && expiry !== undefined && expiry < 0 ? 'EXPIRED' : 'live';

            console.log(`          certificate ${certificate.reference} · ${certificate.scope} · ${state}`);
        }
    }

    const facilityCount = await attachFacilities(hotel.id, fixture.features ?? [], facilities);
    const nearbyCount = await mergeNearby(hotel, fixture.nearby);

    console.log(
        `  seeded  ${slug}: ${fixture.serviceLevel}, ${facilityCount} facilities` +
            `${nearbyCount > 0 ? `, ${nearbyCount} nearby` : ''}` +
            `${isSupplierHeld ? ', supplier update held' : ''}`
    );

    return { skipped: false };
};

/**
 * Attaches one scenario to one booking, so the answer flow has something real
 * to act on.
 *
 * Every code is checked against what the property actually claims — the same
 * rule `POST /bookings` enforces. Unsupported preferences are dropped rather
 * than failing the run: which facilities a property offers is the fixture's
 * business, but which properties have bookings is not, and a scenario landing
 * on an unexpected hotel should degrade to the fallback rather than stop the
 * seed.
 */
const seedBookingRequests = async (booking, scenario) => {
    const claimed = await prisma.hotelAmenity.findMany({
        where: { hotelId: booking.hotelId, amenity: { category: { in: KOSHER_AMENITY_CATEGORIES } } },
        select: { amenity: { select: { code: true } } }
    });

    // `kosherMealOnRequest` is askable of any kosher property, mirroring
    // ALWAYS_REQUESTABLE_CODES on the booking path.
    const allowed = new Set([...claimed.map((row) => row.amenity.code), 'kosherMealOnRequest']);

    const requests = [
        scenario.fallback,
        ...scenario.preferred.filter((request) => allowed.has(request.code))
    ];

    await prisma.hotelBookingRequest.createMany({
        data: requests.map((request) => ({
            bookingId: booking.id,
            code: request.code,
            note: request.note ?? null,
            status: request.status,
            // The CHECK constraint requires a timestamp on anything answered,
            // and it is right to: an answer nobody can date is not auditable.
            respondedAt: request.status === 'REQUESTED' ? null : new Date(),
            responseNote: request.responseNote ?? null
        }))
    });

    console.log(
        `  seeded  ${booking.reference} (${booking.hotelSlug}): ` +
            `${requests.length} requirements — ${scenario.label}`
    );
};

/**
 * The bookings worth attaching requirements to.
 *
 * Live bookings at properties that offer kosher services, oldest first so a
 * re-run after a new booking appends rather than reshuffling. Cancelled
 * bookings are excluded: a requirement on a booking nobody is travelling on is
 * a row in a queue that wastes somebody's afternoon.
 */
const bookingsForRequests = async () => {
    const bookings = await prisma.hotelBooking.findMany({
        where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            hotel: { kosher: { is: { serviceLevel: { not: 'NONE' } } } }
        },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            reference: true,
            hotelId: true,
            hotel: { select: { slug: true } },
            requests: { select: { id: true } }
        }
    });

    return bookings.map((booking) => ({ ...booking, hotelSlug: booking.hotel.slug }));
};

const run = async () => {
    const facilities = await loadFacilities();
    console.log(`Vocabulary: ${facilities.size} kosher facilities available\n`);

    console.log('Properties');
    let seeded = 0;

    for (const [slug, fixture] of Object.entries(KOSHER_HOTELS)) {
        const { skipped } = await seedHotelKosher(slug, fixture, facilities);

        if (!skipped) {
            seeded += 1;
        }
    }

    console.log('\nBooking requirements');

    const bookings = await bookingsForRequests();

    if (bookings.length === 0) {
        console.log('  no live bookings at a kosher property — nothing to attach');
    }

    let scenario = 0;

    for (const booking of bookings) {
        if (booking.requests.length > 0) {
            console.log(`  exists  ${booking.reference} (${booking.hotelSlug}): left untouched`);
            continue;
        }

        // Cycled, so three bookings produce one of each outcome and a fourth
        // starts again rather than seeding nothing.
        await seedBookingRequests(booking, KOSHER_BOOKING_REQUEST_SCENARIOS[scenario % KOSHER_BOOKING_REQUEST_SCENARIOS.length]);
        scenario += 1;
    }

    // Counted from the database rather than from the fixture, so the summary
    // describes what is actually there after a partial or repeated run.
    const [profiles, certified, expired, pendingReview, requests] = await Promise.all([
        prisma.hotelKosherProfile.count({ where: { serviceLevel: { not: 'NONE' } } }),
        prisma.hotelKosherCertification.count({
            where: {
                verification: 'VERIFIED',
                archivedAt: null,
                scope: { in: ['PROPERTY', 'KITCHEN'] },
                OR: [{ expiresOn: null }, { expiresOn: { gte: dateOnlyToUtc(TODAY) } }]
            }
        }),
        prisma.hotelKosherCertification.count({
            where: {
                verification: 'VERIFIED',
                archivedAt: null,
                expiresOn: { lt: dateOnlyToUtc(TODAY) }
            }
        }),
        prisma.hotelKosherCertification.count({
            where: { verification: 'PENDING_VERIFICATION', archivedAt: null }
        }),
        prisma.hotelBookingRequest.count({ where: { status: 'REQUESTED' } })
    ]);

    console.log(
        `\n${seeded} properties seeded this run.\n` +
            `Offering kosher services: ${profiles}\n` +
            `Certified properties:     ${certified}   (live, property-scoped)\n` +
            `Expired certificates:     ${expired}\n` +
            `Awaiting review:          ${pendingReview}\n` +
            `Open requirements:        ${requests}`
    );
};

run()
    .catch((err) => {
        console.error(err.message);
        process.exitCode = 1;
    })
    .finally(disconnect);
