import { performance } from 'node:perf_hooks';

import { prisma, disconnect } from '../db/index.js';
import { searchHotels } from '../services/hotel/search.service.js';
import { defaultProvider } from '../services/hotel/providers/index.js';
import { addDays, todayInTimezone } from '../lib/time.js';

/**
 * Measures hotel search against a realistic dataset.
 *
 * Phase 8 of the plan is deliberately measurement-gated: caching, a summary
 * rate calendar, table partitioning and Redis are all things to add when a
 * number says to, not because they are on a list. This is the number.
 *
 *   node scripts/benchmark-search.js [hotels] [days]
 *
 * Seeds into its own destination subtree, measures, and removes everything it
 * created. Safe to run against a database with real data in it, though not
 * against a busy production one — it writes a few hundred thousand rows.
 */

const HOTELS = Number(process.argv[2]) || 200;
const DAYS = Number(process.argv[3]) || 200;
const ROOM_TYPES = 4;
const RATE_PLANS = 2;

const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);

    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))];
};

const seed = async (tag) => {
    const today = todayInTimezone('Asia/Tbilisi');
    const from = addDays(today, 30);
    const to = addDays(from, DAYS - 1);

    const country = await prisma.destination.create({
        data: { slug: `${tag}-country`, name: 'Benchland', type: 'COUNTRY', path: `/${tag}`, countryCode: 'GE' }
    });

    const [mealPlan, cancellation, payment] = await Promise.all([
        prisma.mealPlan.findUnique({ where: { code: 'BB' } }),
        prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: 'FLEXIBLE' } }),
        prisma.paymentPolicy.findFirst({ where: { hotelId: null, timing: 'PAY_NOW' } })
    ]);

    if (!mealPlan || !cancellation || !payment) {
        throw new Error('Run `node scripts/seed-reference.js` first');
    }

    process.stdout.write(`Seeding ${HOTELS} hotels x ${ROOM_TYPES} rooms x ${RATE_PLANS} plans x ${DAYS} days`);

    const hotelRows = Array.from({ length: HOTELS }, (unused, index) => ({
        slug: `${tag}-hotel-${index}`,
        name: `Bench Hotel ${index}`,
        propertyType: 'Hotel',
        status: 'ACTIVE',
        // The timed loop searches as an anonymous visitor, which sees only the
        // B2C catalogue; without this the search matches nothing and the
        // benchmark times the empty-result early return.
        b2cEnabled: true,
        destinationId: country.id,
        countryCode: 'GE',
        starRating: (index % 5) + 1,
        timezone: 'Asia/Tbilisi',
        currency: 'GEL',
        checkInFrom: '14:00'
    }));

    await prisma.hotel.createMany({ data: hotelRows });
    const hotels = await prisma.hotel.findMany({ where: { destinationId: country.id }, select: { id: true } });

    await prisma.roomType.createMany({
        data: hotels.flatMap((hotel) =>
            Array.from({ length: ROOM_TYPES }, (unused, index) => ({
                hotelId: hotel.id,
                code: `rt${index}`,
                name: `Room ${index}`,
                maxOccupancy: 4,
                maxAdults: 3,
                maxChildren: 2,
                standardOccupancy: 2
            }))
        )
    });

    const roomTypes = await prisma.roomType.findMany({
        where: { hotel: { destinationId: country.id } },
        select: { id: true }
    });

    await prisma.ratePlan.createMany({
        data: roomTypes.flatMap((roomType) =>
            Array.from({ length: RATE_PLANS }, (unused, index) => ({
                roomTypeId: roomType.id,
                code: `rp${index}`,
                name: `Plan ${index}`,
                mealPlanId: mealPlan.id,
                cancellationPolicyId: cancellation.id,
                paymentPolicyId: payment.id,
                currency: 'GEL'
            }))
        )
    });

    const ratePlans = await prisma.ratePlan.findMany({
        where: { roomType: { hotel: { destinationId: country.id } } },
        select: { id: true }
    });

    /*
     * Kosher, at a realistic share.
     *
     * Roughly one property in twelve carries a profile and most of those a live
     * certificate, which is what makes the filter selective rather than a
     * no-op — seeding every hotel as kosher would measure a filter that matches
     * everything, and seeding none would measure one that short-circuits.
     */
    const kosherHotels = hotels.filter((unused, index) => index % 12 === 0);

    await prisma.hotelKosherProfile.createMany({
        data: kosherHotels.map((hotel, index) => ({
            hotelId: hotel.id,
            serviceLevel: index % 3 === 0 ? 'FULL' : 'KOSHER_FRIENDLY'
        }))
    });

    const profiles = await prisma.hotelKosherProfile.findMany({
        where: { hotel: { destinationId: country.id } },
        select: { id: true }
    });

    await prisma.hotelKosherCertification.createMany({
        // Three in four are live; the rest are expired or unverified, so the
        // partial index has rows it must skip as well as rows it must return.
        data: profiles.map((profile, index) => ({
            profileId: profile.id,
            authorityName: 'Bench Rabbinate',
            scope: 'PROPERTY',
            verification: index % 4 === 3 ? 'UNVERIFIED' : 'VERIFIED',
            verifiedAt: index % 4 === 3 ? null : new Date(),
            expiresOn: index % 4 === 2 ? new Date('2020-01-01') : new Date('2030-01-01')
        }))
    });

    // Set-based: one statement per table, expanded by generate_series, rather
    // than hundreds of thousands of round trips.
    await prisma.$executeRawUnsafe(
        `INSERT INTO room_inventory (room_type_id, date, total_units, created_at, updated_at)
         SELECT rt.id, day::date, 5, now(), now()
           FROM room_types rt
           JOIN hotels h ON h.id = rt.hotel_id AND h.destination_id = $1
          CROSS JOIN generate_series($2::date, $3::date, '1 day'::interval) AS day`,
        country.id,
        from,
        to
    );

    await prisma.$executeRawUnsafe(
        `INSERT INTO rates (rate_plan_id, date, currency, net_cents, created_at, updated_at)
         SELECT rp.id, day::date, 'GEL', 15000 + (random() * 20000)::int, now(), now()
           FROM rate_plans rp
           JOIN room_types rt ON rt.id = rp.room_type_id
           JOIN hotels h ON h.id = rt.hotel_id AND h.destination_id = $1
          CROSS JOIN generate_series($2::date, $3::date, '1 day'::interval) AS day`,
        country.id,
        from,
        to
    );

    const [{ inventory }] = await prisma.$queryRawUnsafe(
        `SELECT count(*)::int AS inventory FROM room_inventory inv
           JOIN room_types rt ON rt.id = inv.room_type_id
           JOIN hotels h ON h.id = rt.hotel_id AND h.destination_id = $1`,
        country.id
    );
    const [{ rateCount }] = await prisma.$queryRawUnsafe(
        `SELECT count(*)::int AS "rateCount" FROM rates r
           JOIN rate_plans rp ON rp.id = r.rate_plan_id
           JOIN room_types rt ON rt.id = rp.room_type_id
           JOIN hotels h ON h.id = rt.hotel_id AND h.destination_id = $1`,
        country.id
    );

    console.log(`\n  ${inventory.toLocaleString()} inventory rows, ${rateCount.toLocaleString()} rate rows`);

    // ANALYZE so the planner sees what was just written, exactly as it would
    // after autovacuum in a running system.
    await prisma.$executeRawUnsafe('ANALYZE room_inventory, rates, rate_plans, room_types, hotels');

    return { country, from, ratePlanCount: ratePlans.length };
};

const run = async () => {
    const tag = `bench-${Date.now().toString(36)}`;
    let country;

    try {
        const seeded = await seed(tag);
        country = seeded.country;

        const checkIn = addDays(seeded.from, 10);
        const criteria = {
            checkIn,
            checkOut: addDays(checkIn, 3),
            adults: 2,
            childAges: [],
            rooms: 1,
            destinationPath: country.path,
            locale: 'en',
            page: 1,
            pageSize: 24
        };

        // Warm the plan cache and the buffer pool; a first-run figure measures
        // cold I/O rather than the query.
        await searchHotels(criteria, null);

        const timings = [];

        for (let index = 0; index < 25; index += 1) {
            const shifted = addDays(checkIn, index % 30);
            const started = performance.now();

            const result = await searchHotels(
                { ...criteria, checkIn: shifted, checkOut: addDays(shifted, 3) },
                null
            );

            timings.push(performance.now() - started);

            if (index === 0) {
                console.log(`  first page: ${result.hotels.length} hotels of ${result.total} matching\n`);
            }
        }

        /*
         * The kosher filters, measured against the same dataset.
         *
         * The claim being checked is that they change the plan's *shape* not at
         * all: the LEFT JOIN is one probe on a unique foreign key, and the
         * certification test is an EXISTS against a partial index holding only
         * live rows. Both should come out at or below the unfiltered figure,
         * because they narrow the set the pricing pass then has to hydrate.
         */
        const measureFilter = async (label, extra) => {
            const runs = [];

            for (let index = 0; index < 15; index += 1) {
                const shifted = addDays(checkIn, index % 30);
                const started = performance.now();

                const result = await searchHotels(
                    { ...criteria, ...extra, checkIn: shifted, checkOut: addDays(shifted, 3) },
                    null
                );

                runs.push(performance.now() - started);

                if (index === 0) {
                    console.log(`  ${label}: ${result.total} matching`);
                }
            }

            return runs;
        };

        console.log('Kosher filters');
        const kosherRuns = await measureFilter('kosher services', { kosher: 'KOSHER_FRIENDLY' });
        const certifiedRuns = await measureFilter('kosher certified', { kosherCertified: true });
        const combinedRuns = await measureFilter('certified + 4 stars', {
            kosherCertified: true,
            minStars: 4
        });

        console.log(
            `\n  kosher services   p50 ${percentile(kosherRuns, 50).toFixed(1)} ms  ` +
                `p95 ${percentile(kosherRuns, 95).toFixed(1)} ms`
        );
        console.log(
            `  kosher certified  p50 ${percentile(certifiedRuns, 50).toFixed(1)} ms  ` +
                `p95 ${percentile(certifiedRuns, 95).toFixed(1)} ms`
        );
        console.log(
            `  + 4 stars         p50 ${percentile(combinedRuns, 50).toFixed(1)} ms  ` +
                `p95 ${percentile(combinedRuns, 95).toFixed(1)} ms\n`
        );

        // Where the time goes, not just how much of it there is. Optimising the
        // wrong stage is the usual result of skipping this: the candidate query
        // looks like the expensive part and frequently is not.
        const provider = defaultProvider();
        const stage = {};

        const measure = async (label, fn) => {
            const started = performance.now();
            const result = await fn();
            stage[label] = performance.now() - started;
            return result;
        };

        const candidates = await measure('candidate SQL', () =>
            provider.searchCandidates({
                checkIn: criteria.checkIn,
                checkOut: criteria.checkOut,
                rooms: 1,
                adults: 2,
                children: 0,
                guests: 2,
                destinationPath: country.path,
                today: todayInTimezone('Asia/Tbilisi')
            })
        );

        const ratePlanIds = [...new Set(candidates.map((row) => row.ratePlanId))];
        const hotelIds = [...new Set(candidates.map((row) => row.hotelId))];

        await measure('rate rows', () =>
            provider.loadRates(ratePlanIds, criteria.checkIn, criteria.checkOut)
        );
        await measure('rate plan hydration', () =>
            prisma.ratePlan.findMany({
                where: { id: { in: ratePlanIds } },
                include: {
                    mealPlan: true,
                    cancellationPolicy: { include: { rules: true } },
                    paymentPolicy: true,
                    roomType: { include: { beds: { include: { bedType: true } } } }
                }
            })
        );
        await measure('hotel hydration', () =>
            prisma.hotel.findMany({
                where: { id: { in: hotelIds } },
                include: {
                    destination: true,
                    images: { where: { isCover: true }, take: 1 },
                    amenities: { include: { amenity: true } },
                    childPolicy: { include: { bands: true } },
                    taxFees: true
                }
            })
        );

        console.log(`Stage breakdown (${candidates.length} candidate offers)`);
        const measured = Object.values(stage).reduce((sum, value) => sum + value, 0);

        for (const [label, value] of Object.entries(stage)) {
            const share = Math.round((value / measured) * 100);
            console.log(
                `  ${label.padEnd(22)} ${value.toFixed(0).padStart(5)} ms  ${String(share).padStart(3)}%  ` +
                    '#'.repeat(Math.round(share / 3))
            );
        }

        console.log('');
        console.log('Search latency over 25 runs');
        console.log(`  min    ${Math.round(Math.min(...timings))} ms`);
        console.log(`  median ${Math.round(percentile(timings, 50))} ms`);
        console.log(`  p95    ${Math.round(percentile(timings, 95))} ms`);
        console.log(`  max    ${Math.round(Math.max(...timings))} ms`);

        const budget = 300;
        const p95 = percentile(timings, 95);

        console.log(
            `\n${p95 < budget ? 'Within' : 'OVER'} the ${budget} ms budget.` +
                (p95 < budget
                    ? ' No Phase 8 work is justified by this measurement.'
                    : ' A summary rate calendar or caching is now worth building.')
        );
    } finally {
        // The dataset is worth keeping when the next step is EXPLAIN, so the
        // planner has real statistics to work against.
        console.log('');

        if (country && process.env.KEEP_DATA === '1') {
            console.log(`Dataset left in place at ${country.path} (KEEP_DATA=1).`);
        } else if (country) {
            process.stdout.write('Cleaning up... ');
            await prisma.hotel.deleteMany({ where: { destinationId: country.id } });
            await prisma.destination.delete({ where: { id: country.id } });
            console.log('done.');
        }
    }
};

run()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(disconnect);
