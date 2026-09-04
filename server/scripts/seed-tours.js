import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { prisma, disconnect } from '../db/index.js';
import { addDays, todayInTimezone } from '../lib/time.js';
import { publishTour } from '../services/tour/tour.service.js';
import { refreshTourPriceFrom } from '../services/tour/option.service.js';
import { setTourInventoryRange } from '../services/tour/inventory.service.js';

/**
 * Seeds the tour catalogue from the client's editorial fixtures.
 *
 *   node scripts/seed-tours.js
 *
 * The prose in `client/data/tours.ts` and its translations in
 * `client/data/i18n/tours.ts` are the platform's actual content — ten Georgian
 * journeys written for this product, in four languages. They are read here
 * rather than copied, so there is one source of truth until the client pages
 * move to the API and the fixtures are deleted.
 *
 * What the fixtures cannot say, this adds: a shared seat option and a private
 * group option per tour, a year of price sheets converted from the fixtures'
 * USD "from" price, and departures — weekly for multi-day journeys, daily for
 * day trips. Multi-day private journeys are ON_REQUEST, because an operator
 * confirms a five-day trek by hand.
 *
 * Idempotent by slug: a tour that already exists is skipped. Prerequisites:
 * `seed-reference.js` (policy templates) and `seed-catalogue.js` (destinations).
 */

const CLIENT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'client');

/** GEL per USD. Fixture prices are USD-denominated; tours contract in GEL. */
const GEL_PER_USD = 2.7;

/** How far ahead price sheets and departures are written. */
const HORIZON_DAYS = 400;

const LOCALES = ['ka', 'ru', 'he'];

const TRANSLATED_FIELDS = [
    'title',
    'location',
    'summary',
    'description',
    'highlights',
    'included',
    'excluded',
    'importantInfo',
    'meetingPoint',
    'durationLabel',
    'groupSize'
];

const usdToGelCents = (usd) => Math.round((usd * GEL_PER_USD * 100) / 100) * 100;

/**
 * Pulls a literal out of a TypeScript module without a bundler.
 *
 * `tours.ts` has a value import (`./i18n/merge`) with an extensionless path
 * that Node's ESM loader refuses, so the module cannot simply be imported. The
 * data itself is a plain literal, which a sandboxed evaluation reads without
 * running anything else in the file.
 */
const evaluateLiteral = async (file, pattern) => {
    const source = await readFile(join(CLIENT, 'data', file), 'utf8');
    const match = source.match(pattern);

    if (!match) {
        throw new Error(`Could not find the fixture literal in ${file}`);
    }

    return vm.runInNewContext(`(${match[1]})`, {}, { timeout: 5000 });
};

const loadFixtures = async () => {
    const tours = await evaluateLiteral('tours.ts', /export const tours: Tour\[\] = (\[[\s\S]*?\n\]);/);
    const b2c = await evaluateLiteral('tours.ts', /new Set<string>\((\[[\s\S]*?\])\)/);
    const content = await evaluateLiteral('i18n/tours.ts', /export const tourContent: LocalisedContent<Tour> = (\{[\s\S]*\n\});/);

    return { tours, b2cSlugs: new Set(b2c), content };
};

const translationFor = (content, locale, fixtureId) => {
    const entry = content[locale]?.[fixtureId];

    if (!entry) {
        return null;
    }

    const data = { locale };

    for (const field of TRANSLATED_FIELDS) {
        if (entry[field] !== undefined) {
            data[field] = entry[field];
        }
    }

    return data;
};

const seedTour = async (fixture, { destination, policy, b2cSlugs, content, today }) => {
    const multiDay = fixture.durationDays > 1;
    const adultNetCents = usdToGelCents(fixture.priceFrom);

    const tour = await prisma.tour.create({
        data: {
            slug: fixture.slug,
            title: fixture.title,
            location: fixture.location,
            status: 'DRAFT',
            destinationId: destination.id,
            category: fixture.category,
            summary: fixture.summary,
            description: fixture.description ?? [],
            image: fixture.image ?? '',
            gallery: fixture.gallery ?? [],
            durationDays: fixture.durationDays,
            durationLabel: fixture.durationLabel,
            groupSize: fixture.groupSize,
            difficulty: fixture.difficulty,
            timezone: destination.timezone,
            currency: 'GEL',
            meetingPoint: fixture.meetingPoint,
            meetingTime: '08:00',
            rating: fixture.rating ?? 0,
            reviewCount: fixture.reviewCount ?? 0,
            highlights: fixture.highlights ?? [],
            included: fixture.included ?? [],
            excluded: fixture.excluded ?? [],
            importantInfo: fixture.importantInfo ?? [],
            featured: Boolean(fixture.featured),
            b2cEnabled: b2cSlugs.has(fixture.slug),
            itinerary: {
                create: (fixture.itinerary ?? []).map((day) => ({
                    day: day.day,
                    title: day.title,
                    description: day.description,
                    meals: day.meals ?? [],
                    accommodation: day.accommodation ?? ''
                }))
            },
            translations: {
                create: LOCALES.map((locale) => translationFor(content, locale, fixture.id)).filter(Boolean)
            }
        }
    });

    const season = (basis) => ({
        create: [
            {
                name: 'Standard',
                validFrom: new Date(`${today}T00:00:00.000Z`),
                validUntil: new Date(`${addDays(today, HORIZON_DAYS)}T00:00:00.000Z`),
                weekdays: [],
                currency: 'GEL',
                tiers: {
                    create:
                        basis === 'PER_GROUP'
                            ? [{ minPax: 1, groupNetCents: adultNetCents * 3 }]
                            : [{ minPax: 1, adultNetCents, childNetCents: Math.round(adultNetCents * 0.6) }]
                }
            }
        ]
    });

    const shared = await prisma.tourOption.create({
        data: {
            tourId: tour.id,
            code: 'shared',
            name: multiDay ? 'Small group departure' : 'Shared minibus seat',
            kind: 'SHARED',
            pricingBasis: 'PER_PERSON',
            unitKind: 'SEAT',
            scheduleKind: multiDay ? 'SCHEDULED' : 'ON_DEMAND',
            confirmationMode: 'INSTANT',
            minPax: 1,
            maxPax: multiDay ? 8 : 12,
            startTime: '08:00',
            languages: ['en', 'ka', 'ru'],
            operatesOnWeekdays: multiDay ? [6] : [],
            noticeHours: multiDay ? 72 : 24,
            cancellationPolicyId: policy.id,
            sortOrder: 0,
            seasons: season('PER_PERSON')
        }
    });

    const priv = await prisma.tourOption.create({
        data: {
            tourId: tour.id,
            code: 'private',
            name: 'Private journey',
            kind: 'PRIVATE',
            pricingBasis: 'PER_GROUP',
            unitKind: 'GROUP',
            scheduleKind: 'ON_DEMAND',
            // A five-day private trek is confirmed by the operator by hand.
            confirmationMode: multiDay ? 'ON_REQUEST' : 'INSTANT',
            minPax: 1,
            maxPax: 8,
            startTime: '08:00',
            languages: ['en', 'ka', 'ru', 'he'],
            operatesOnWeekdays: [],
            noticeHours: multiDay ? 120 : 24,
            cancellationPolicyId: policy.id,
            sortOrder: 1,
            seasons: season('PER_GROUP')
        }
    });

    const window = { from: today, to: addDays(today, HORIZON_DAYS) };

    await setTourInventoryRange(tour.id, shared.id, { ...window, totalUnits: multiDay ? 8 : 12 }, null, null);
    await setTourInventoryRange(tour.id, priv.id, { ...window, totalUnits: 2 }, null, null);

    await refreshTourPriceFrom(prisma, tour.id);
    await publishTour(tour.id, null, null);

    return tour;
};

const main = async () => {
    const { tours, b2cSlugs, content } = await loadFixtures();

    const policy = await prisma.cancellationPolicy.findFirst({ where: { hotelId: null, kind: 'TIERED' } });

    if (!policy) {
        throw new Error('Run scripts/seed-reference.js first: the tiered cancellation template is missing');
    }

    const today = todayInTimezone('Asia/Tbilisi');
    let created = 0;
    let skipped = 0;

    for (const fixture of tours) {
        const existing = await prisma.tour.findUnique({ where: { slug: fixture.slug }, select: { id: true } });

        if (existing) {
            skipped += 1;
            continue;
        }

        const destination = await prisma.destination.findUnique({ where: { slug: fixture.destinationSlug } });

        if (!destination) {
            console.warn(`Skipping ${fixture.slug}: destination "${fixture.destinationSlug}" is not seeded`);
            skipped += 1;
            continue;
        }

        const tour = await seedTour(fixture, { destination, policy, b2cSlugs, content, today });
        created += 1;
        console.log(`${'Tour'.padEnd(6)} ${tour.slug} (${fixture.durationDays} day${fixture.durationDays > 1 ? 's' : ''})`);
    }

    console.log(`Tours: ${created} created, ${skipped} skipped`);
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(disconnect);
