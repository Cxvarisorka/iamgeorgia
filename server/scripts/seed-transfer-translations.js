/**
 * Loads the Georgian, Russian and Hebrew transfer copy into the database.
 *
 *     node scripts/seed-transfer-translations.js
 *
 * The prose was written for the front-end prototype and lived in
 * `client/data/i18n/transfers.ts` and `transferLocations.ts`. Those files are
 * gone — the catalogue is in Postgres now — but the translations are real work
 * by a translator and belong with the rows they describe rather than in a
 * deleted file's history.
 *
 * Read from the last commit that held them rather than from a copy: a copy is a
 * second source of truth that starts drifting the day it is made, and this only
 * ever needs to run once per environment.
 *
 * Idempotent. Re-running overwrites the same translation rows with the same
 * values.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { prisma, connect, disconnect } from '../db/index.js';
import { logger } from '../lib/logger.js';
import { SUPPORTED_LOCALES, defaultLocale } from '../lib/locales.js';

/** The commit the fixtures were last present in. */
const SOURCE_REF = process.env.TRANSFER_I18N_REF ?? 'HEAD';

/**
 * Prototype ids to catalogue slugs.
 *
 * Most match. These four do not, because the seeded catalogue names airports
 * after the city rather than the IATA code, and uses the Georgian spelling of
 * Stepantsminda's district.
 */
const POINT_ALIASES = {
    'tbs-airport': 'tbilisi-airport',
    'kut-airport': 'kutaisi-airport',
    'bus-airport': 'batumi-airport',
    stepantsminda: 'kazbegi'
};

/** The prototype keyed offers by id; the catalogue keys vehicles by slug. */
const VEHICLE_BY_OFFER_ID = {
    'transfer-1': 'comfort-sedan-private-transfer',
    'transfer-2': 'economy-sedan-private-transfer',
    'transfer-3': 'executive-sedan-private-transfer',
    'transfer-4': 'premium-suv-private-transfer',
    'transfer-5': 'comfort-minivan-private-transfer',
    'transfer-6': 'group-van-private-transfer',
    'transfer-7': 'private-coach-transfer',
    'transfer-8': 'shared-shuttle-transfer',
    'transfer-9': 'shared-coach-seat-transfer'
};

/**
 * Pulls a file out of git into a temp directory and imports it.
 *
 * The fixtures are TypeScript with type-only imports, which Node strips at load
 * time — the same mechanism `seed-catalogue.js` relies on to read the client's
 * data files directly. The type imports are dropped first because they point at
 * client paths that do not resolve from here.
 */
const importFromGit = async (path, exportName) => {
    const source = execFileSync('git', ['show', `${SOURCE_REF}:${path}`], {
        cwd: join(process.cwd(), '..'),
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024
    });

    const withoutTypeImports = source
        .split('\n')
        .filter((line) => !line.startsWith('import type'))
        .join('\n')
        .replace(/: LocalisedContent<[^>]+>/g, '');

    const dir = mkdtempSync(join(tmpdir(), 'iag-i18n-'));
    const file = join(dir, 'fixture.mjs');

    writeFileSync(file, withoutTypeImports);

    const module = await import(pathToFileURL(file).href);

    return module[exportName];
};

const localesToWrite = SUPPORTED_LOCALES.filter((locale) => locale !== defaultLocale);

const seedPointTranslations = async (content) => {
    const points = await prisma.transferPoint.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(points.map((point) => [point.slug, point.id]));

    let written = 0;
    let skipped = 0;

    for (const locale of localesToWrite) {
        for (const [key, fields] of Object.entries(content[locale] ?? {})) {
            const slug = POINT_ALIASES[key] ?? key;
            const pointId = bySlug.get(slug);

            if (!pointId) {
                // A prototype hotel pick-up point with no catalogue equivalent.
                // Not an error: the fixture had three invented hotels.
                skipped += 1;
                continue;
            }

            const data = {
                ...(fields.name ? { name: fields.name } : {}),
                ...(fields.region ? { regionLabel: fields.region } : {})
            };

            if (Object.keys(data).length === 0) continue;

            await prisma.transferPointTranslation.upsert({
                where: { pointId_locale: { pointId, locale } },
                create: { pointId, locale, ...data },
                update: data
            });

            written += 1;
        }
    }

    logger.info(`Point translations: ${written} written, ${skipped} with no catalogue match`);
};

const seedVehicleTranslations = async (content) => {
    const vehicles = await prisma.transferVehicle.findMany({ select: { id: true, slug: true } });
    const bySlug = new Map(vehicles.map((vehicle) => [vehicle.slug, vehicle.id]));

    let written = 0;

    for (const locale of localesToWrite) {
        for (const [offerId, fields] of Object.entries(content[locale] ?? {})) {
            const slug = VEHICLE_BY_OFFER_ID[offerId];
            const vehicleId = slug ? bySlug.get(slug) : null;

            if (!vehicleId) continue;

            const data = {
                ...(fields.name ? { name: fields.name } : {}),
                ...(fields.vehicleExample ? { vehicleExample: fields.vehicleExample } : {}),
                ...(fields.summary ? { summary: fields.summary } : {}),
                ...(fields.description ? { description: fields.description } : {}),
                ...(fields.included ? { included: fields.included } : {}),
                ...(fields.excluded ? { excluded: fields.excluded } : {}),
                ...(fields.pickupProcedure ? { pickupProcedure: fields.pickupProcedure } : {})
            };

            if (Object.keys(data).length === 0) continue;

            await prisma.transferVehicleTranslation.upsert({
                where: { vehicleId_locale: { vehicleId, locale } },
                create: { vehicleId, locale, ...data },
                update: data
            });

            written += 1;
        }
    }

    logger.info(`Vehicle translations: ${written} written`);
};

/**
 * Route titles, in each language.
 *
 * Generated from the point translations rather than written: with nearly four
 * hundred routes, "A to B" in three languages is not editorial work, it is a
 * join. A route an operator has given a real title keeps it — the generated
 * form only fills the gap.
 */
const seedRouteTitles = async () => {
    const routes = await prisma.transferRoute.findMany({
        include: {
            fromPoint: { include: { translations: true } },
            toPoint: { include: { translations: true } },
            translations: true
        }
    });

    // "{from} — {to}" reads correctly in all three: an em dash needs no
    // grammar, which a preposition would.
    let written = 0;

    for (const route of routes) {
        for (const locale of localesToWrite) {
            const from = route.fromPoint.translations.find((entry) => entry.locale === locale)?.name;
            const to = route.toPoint.translations.find((entry) => entry.locale === locale)?.name;

            if (!from || !to) continue;

            const existing = route.translations.find((entry) => entry.locale === locale);

            // Never overwrite a title somebody wrote.
            if (existing?.title) continue;

            const title = `${from} — ${to}`;

            await prisma.transferRouteTranslation.upsert({
                where: { routeId_locale: { routeId: route.id, locale } },
                create: { routeId: route.id, locale, title },
                update: { title }
            });

            written += 1;
        }
    }

    logger.info(`Route titles: ${written} written`);
};

const main = async () => {
    await connect();

    const [locationContent, offerContent] = await Promise.all([
        importFromGit('client/data/i18n/transferLocations.ts', 'transferLocationContent'),
        importFromGit('client/data/i18n/transfers.ts', 'transferOfferContent')
    ]);

    await seedPointTranslations(locationContent);
    await seedVehicleTranslations(offerContent);
    await seedRouteTitles();

    const [points, vehicles, routes] = await Promise.all([
        prisma.transferPointTranslation.count(),
        prisma.transferVehicleTranslation.count(),
        prisma.transferRouteTranslation.count()
    ]);

    logger.info(
        `Translations in place: ${points} points, ${vehicles} vehicle classes, ${routes} routes`
    );
};

try {
    await main();
} catch (err) {
    logger.error({ err }, 'Transfer translation seed failed');
    process.exitCode = 1;
} finally {
    await disconnect();
}
