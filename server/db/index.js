// Prisma 7 no longer ships a Rust query engine: the client talks to Postgres
// through a driver adapter, which is why `pg` is still a direct dependency.
// The generated client lives in ../generated/prisma and is imported straight
// from its TypeScript source — Node strips the types at load time (Node 22.18+).
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../generated/prisma/client.ts';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { BadRequestError } from '../lib/errors.js';
import { jsonFieldSchemas } from '../validation/domain.js';

// The pool is built here rather than left to the adapter so it can be given
// an error listener. pg emits 'error' on the pool when an *idle* client dies —
// a Postgres restart, a failover, a load balancer reaping a quiet socket —
// and with nobody listening that is an uncaughtException, which server.js
// treats as fatal. A dead idle client is not fatal: the pool discards it and
// the next query gets a fresh one.
const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolMax,
    idleTimeoutMillis: config.databaseIdleTimeoutMs,
    connectionTimeoutMillis: config.databaseConnectionTimeoutMs
});

pool.on('error', (err) => logger.error({ err }, 'Idle database connection errored'));

// disposeExternalPool: the adapter only ends a pool it created itself, and a
// pool left open after $disconnect() keeps every test process alive.
const adapter = new PrismaPg(pool, { disposeExternalPool: true });

// Prisma would otherwise print to stdout in its own format, bypassing pino and
// the level the app runs at — so tests that assert on failures would print
// stack traces for errors they expect. Emitted as events instead and routed
// through the app logger, at the same level split as before: warnings are
// developer feedback, not something to page on.
const prismaLog =
    config.logLevel === 'silent'
        ? []
        : [
              { emit: 'event', level: 'error' },
              ...(config.isProduction ? [] : [{ emit: 'event', level: 'warn' }])
          ];

const basePrisma = new PrismaClient({ adapter, log: prismaLog });

// $on only exists on the base client; the extension below returns a proxy
// without it.
for (const { level } of prismaLog) {
    basePrisma.$on(level, (event) => logger[level](event, `Prisma ${level}`));
}

// Prisma allows `field: { set: value }` on updates as well as a bare value.
const unwrap = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value) && 'set' in value
        ? value.set
        : value;

const validateJsonFields = (model, data) => {
    const schemas = jsonFieldSchemas[model];

    if (!schemas || !data) {
        return;
    }

    for (const row of Array.isArray(data) ? data : [data]) {
        for (const [field, schema] of Object.entries(schemas)) {
            if (row?.[field] === undefined) {
                continue;
            }

            const result = schema.safeParse(unwrap(row[field]));

            if (!result.success) {
                throw new BadRequestError(`Invalid ${model}.${field}`, result.error.issues);
            }
        }
    }
};

const writeOperations = new Set([
    'create',
    'createMany',
    'createManyAndReturn',
    'update',
    'updateMany',
    'updateManyAndReturn',
    'upsert'
]);

/**
 * Postgres accepts any JSON in a Json column, so without this the only thing
 * checking the shape of a gallery or a policies object would be the page that
 * renders it. Validating inside the client means every caller is covered —
 * routes, scripts, seeds — rather than just the ones that remember to.
 */
export const prisma = basePrisma.$extends({
    name: 'validateJsonFields',
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                if (writeOperations.has(operation)) {
                    validateJsonFields(model, args.data);
                    validateJsonFields(model, args.create);
                    validateJsonFields(model, args.update);
                }

                return query(args);
            }
        }
    }
});

// Postgres in Docker accepts TCP connections a moment before it is ready to
// answer queries, so the first attempts after `docker compose up` can fail.
export const connect = async ({ retries = 5, delayMs = 2000 } = {}) => {
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            const [{ version }] = await prisma.$queryRaw`SELECT version()`;
            logger.info(`Connected to database: ${version.split(',')[0]}`);
            return;
        } catch (err) {
            if (attempt === retries) {
                throw new Error(`Could not connect to database after ${retries} attempts: ${err.message}`);
            }

            logger.warn(`Database not ready (attempt ${attempt}/${retries}): ${err.message}`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
};

export const disconnect = () => basePrisma.$disconnect();

export default prisma;
