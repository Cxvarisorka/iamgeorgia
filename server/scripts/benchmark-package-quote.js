import { performance } from 'node:perf_hooks';

import pg from 'pg';

/**
 * Measures `quotePackage` against the seeded catalogue.
 *
 *   node --env-file=.env scripts/benchmark-package-quote.js [runs]
 *
 * A package quote is the most expensive read the platform serves: it resolves
 * one slot per component through that product's own engine — a hotel search, a
 * transfer quote, a tour availability lookup — and a five-slot package is
 * therefore five searches deep. This is the number that says whether that is a
 * problem.
 *
 * Two things are reported and they answer different questions. **Wall clock**
 * says what a buyer waits. **Queries** says whether the cost is the database
 * or the round trips: a slot count that rises with party size or with nights
 * is an N+1, and shows up here as a query count that moves when it should not.
 *
 * The driver is instrumented rather than Prisma, because the exported client
 * is an extension proxy with no `$on`. Patching the prototypes before the pool
 * is built catches every statement the adapter issues, including the ones
 * inside a transaction.
 */

const RUNS = Number(process.argv[2]) || 12;

// --- query counting ----------------------------------------------------------

let counting = false;
let queries = 0;
/** Every statement of the last counted quote, for the table breakdown. */
let statements = [];

const instrument = (target) => {
    const original = target.query;

    target.query = function patched(...args) {
        if (counting) {
            queries += 1;
            const sql = typeof args[0] === 'string' ? args[0] : (args[0]?.text ?? '');
            statements.push(sql.replace(/\s+/g, ' '));
        }

        return original.apply(this, args);
    };
};

instrument(pg.Pool.prototype);
instrument(pg.Client.prototype);

// Imported after the patch, so the pool this builds is already instrumented.
const { prisma, disconnect } = await import('../db/index.js');
const { quotePackage } = await import('../services/package/quote.service.js');
const { addDays, todayInTimezone } = await import('../lib/time.js');

const percentile = (values, p) => {
    const sorted = [...values].sort((a, b) => a - b);

    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length * p) / 100))];
};

const ms = (value) => `${value.toFixed(0)}ms`.padStart(7);

/** One quote, timed and counted, with the counters reset around it. */
const measure = async (criteria, viewer) => {
    queries = 0;
    statements = [];
    counting = true;
    const started = performance.now();

    let quote;
    let failure = null;

    try {
        quote = await quotePackage(criteria, viewer);
    } catch (error) {
        failure = error.message;
    }

    const elapsed = performance.now() - started;
    counting = false;

    return { elapsed, queries, quote, failure, statements: [...statements] };
};

/**
 * Where a quote's statements go, by table.
 *
 * The useful axis: a table appearing forty times for a five-slot package is a
 * relation being loaded once per parent rather than once per query, and no
 * amount of concurrency fixes that — it only makes the round trips overlap.
 */
const byTable = (sql) => {
    const counts = new Map();

    for (const statement of sql) {
        const match = /(?:FROM|INTO|UPDATE|JOIN)\s+"?public"?\.?"?([a-z_]+)"?/i.exec(statement);
        const table = match ? match[1] : '(other)';

        counts.set(table, (counts.get(table) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const main = async () => {
    const packages = await prisma.package.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, name: true, nights: true, timezone: true, _count: { select: { components: true } } },
        orderBy: { slug: 'asc' }
    });

    if (packages.length === 0) {
        throw new Error('No active packages. Run `node scripts/seed-packages.js` first.');
    }

    // Staff, so every slot resolves: a trade-only service hidden from an
    // anonymous caller would make the benchmark measure a shorter package
    // than the one an agency actually quotes.
    const viewer = { role: 'ADMIN' };
    const today = todayInTimezone('Asia/Tbilisi');
    const startDate = addDays(today, 45);

    console.log(`Quoting ${packages.length} packages, ${RUNS} runs each, from ${startDate}\n`);
    console.log('package                      slots      p50      p95     max   queries  available');
    console.log('-'.repeat(84));

    const overall = [];

    for (const pkg of packages) {
        const criteria = {
            slugOrId: pkg.slug,
            startDate,
            adults: 2,
            childAges: [],
            rooms: 1,
            choices: {},
            locale: 'en'
        };

        // One warm-up outside the sample: the first quote of a package pays
        // for connection setup and a cold plan cache, which is not what a
        // buyer's second page view costs.
        await measure(criteria, viewer);

        const timings = [];
        let queryCount = 0;
        let available = null;
        let failure = null;

        for (let run = 0; run < RUNS; run += 1) {
            const result = await measure(criteria, viewer);

            timings.push(result.elapsed);
            queryCount = result.queries;
            available = result.quote?.available ?? null;
            failure = result.failure ?? failure;
        }

        overall.push(...timings);

        const status = failure ? `error: ${failure.slice(0, 24)}` : available ? 'yes' : 'no';

        console.log(
            `${pkg.slug.padEnd(28)}${String(pkg._count.components).padStart(5)}` +
                `${ms(percentile(timings, 50))}${ms(percentile(timings, 95))}${ms(Math.max(...timings))}` +
                `${String(queryCount).padStart(10)}  ${status}`
        );
    }

    console.log('-'.repeat(84));
    console.log(
        `all${' '.repeat(30)}${ms(percentile(overall, 50))}${ms(percentile(overall, 95))}${ms(Math.max(...overall))}\n`
    );

    // --- where do the statements go? ---------------------------------------
    //
    // Reported for the widest package, because that is the one whose shape a
    // fix would be judged on.
    const widest = packages.reduce((a, b) => (b._count.components > a._count.components ? b : a));
    const breakdown = await measure(
        { slugOrId: widest.slug, startDate, adults: 2, childAges: [], rooms: 1, choices: {}, locale: 'en' },
        viewer
    );

    console.log(`Statements by table on ${widest.slug} (${breakdown.queries} total):`);

    for (const [table, count] of byTable(breakdown.statements).slice(0, 8)) {
        console.log(`  ${String(count).padStart(5)}  ${table}`);
    }

    console.log('');

    // --- does the cost scale with the party, or only with the slots? --------
    //
    // A quote that costs more for four travellers than for two is pricing per
    // head somewhere it should be pricing per stay. The query count is the
    // honest signal: timings move with load, statement counts do not.
    const wide = packages[0];
    const parties = [
        { label: '2 adults', adults: 2, childAges: [] },
        { label: '2 + 2 children', adults: 2, childAges: [6, 9] },
        { label: '6 adults', adults: 6, childAges: [] }
    ];

    console.log(`Party sensitivity on ${wide.slug}:`);

    for (const party of parties) {
        const result = await measure(
            {
                slugOrId: wide.slug,
                startDate,
                adults: party.adults,
                childAges: party.childAges,
                rooms: 1,
                choices: {},
                locale: 'en'
            },
            viewer
        );

        console.log(
            `  ${party.label.padEnd(16)}${ms(result.elapsed)}${String(result.queries).padStart(8)} queries` +
                `${result.failure ? `  (${result.failure.slice(0, 40)})` : ''}`
        );
    }

    // --- and with the nights? ----------------------------------------------
    console.log(`\nNights sensitivity (same package, ${wide.nights} nights fixed by the template):`);
    console.log('  A package length is a template constant, so this is a note rather than a sweep.');
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(disconnect);
