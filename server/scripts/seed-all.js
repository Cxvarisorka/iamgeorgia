/**
 * Runs every seed script in dependency order, as one command.
 *
 *   node scripts/seed-all.js                       # catalogue + demo data
 *   node scripts/seed-all.js --no-demo             # catalogue only, nothing test-flavoured
 *   node scripts/seed-all.js --admin you@x.com     # also bootstrap an admin
 *   node scripts/seed-all.js --admin you@x.com --first Tamar --last Gelashvili --password s3cret
 *   node scripts/seed-all.js --no-images           # fleet without generated photographs
 *   node scripts/seed-all.js --bookings 60         # more demo transfer bookings
 *   node scripts/seed-all.js --dry-run             # print the plan, touch nothing
 *   node scripts/seed-all.js --low-memory          # each step capped for a 512 MB instance
 *
 * Each step is the existing script, run as its own process with the same
 * environment — so `DATABASE_URL=... node scripts/seed-all.js` seeds whichever
 * database that points at, exactly as running the scripts by hand would. The
 * scripts stay usable on their own; this only fixes the order and stops at the
 * first failure, because every later step depends on the one before it.
 *
 * "Demo" is the data that only makes sense on a test system: transfer bookings
 * placed by made-up passengers and the drivers and cars that serve them, all
 * under `@demo.iamgeorgia.test`. `--no-demo` leaves those out for a production
 * seed. Everything else is the platform's real editorial catalogue.
 *
 * `--low-memory` starts every step with allocator, heap and image-cache
 * settings that take the heaviest step from ~700 MB to ~275 MB, so a small
 * instance can seed itself from its shell. Without it nothing changes. What
 * each setting does is in scripts/lib/seed-process.js.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { isHeapExhaustion, seedProcess } from './lib/seed-process.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag) => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
};

const noDemo = has('--no-demo');
const dryRun = has('--dry-run');
const lowMemory = has('--low-memory');
const adminEmail = value('--admin');

const fleetArgs = [];
if (has('--no-images')) fleetArgs.push('--no-images');
if (value('--password')) fleetArgs.push('--password', value('--password'));

const bookingArgs = value('--bookings') ? ['--count', value('--bookings')] : [];

/** @type {{ script: string, args?: string[], demo?: boolean, why: string }[]} */
const plan = [
    { script: 'seed-reference.js', why: 'amenities, bed types, meal plans, policy templates' },
    ...(adminEmail
        ? [
              {
                  script: 'create-admin.js',
                  args: [
                      adminEmail,
                      value('--first') || 'Admin',
                      value('--last') || 'I am Georgia',
                      ...(value('--password') ? [value('--password')] : []),
                      '--if-missing'
                  ],
                  why: 'the first administrator'
              }
          ]
        : []),
    { script: 'seed-catalogue.js', why: 'destinations, hotels, rooms, rates, inventory, images' },
    { script: 'seed-transfers.js', why: 'points, vehicle classes, routes, opening prices' },
    { script: 'seed-transfer-translations.js', why: 'ka / ru / he transfer copy' },
    { script: 'seed-kosher.js', why: 'kosher profiles and certificates over the hotels' },
    { script: 'seed-tours.js', why: 'ten journeys, options, price sheets, departures' },
    { script: 'seed-services.js', why: 'the service catalogue packages point at' },
    { script: 'seed-packages.js', why: 'sample packages, resolved from the products above' },
    { script: 'seed-transfer-bookings.js', args: bookingArgs, demo: true, why: 'demo transfer bookings' },
    { script: 'seed-fleet.js', args: fleetArgs, demo: true, why: 'demo drivers and cars, dispatched onto the legs' }
].filter((step) => !(noDemo && step.demo));

const label = (step) => `${step.script}${step.args?.length ? ' ' + step.args.join(' ') : ''}`;

console.log(
    `Seeding ${plan.length} steps${noDemo ? ' (no demo data)' : ''}${lowMemory ? ' (low-memory mode)' : ''}${dryRun ? ' — dry run' : ''}:\n`
);
for (const [i, step] of plan.entries()) {
    console.log(`  ${String(i + 1).padStart(2)}. ${label(step).padEnd(48)} ${step.why}`);
}
console.log('');

if (dryRun) {
    process.exit(0);
}

const startedAll = Date.now();

for (const [i, step] of plan.entries()) {
    const started = Date.now();
    console.log(`\n=== [${i + 1}/${plan.length}] ${label(step)}\n`);

    const child = seedProcess({
        script: path.join(here, step.script),
        args: step.args ?? [],
        env: process.env,
        lowMemory
    });

    const result = spawnSync(process.execPath, child.args, { stdio: 'inherit', env: child.env });

    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    if (result.status !== 0) {
        console.error(
            `\n✗ ${step.script} failed after ${seconds}s (exit ${result.status ?? result.signal}). ` +
                `Stopping — the ${plan.length - i - 1} remaining step(s) depend on it. ` +
                `Fix the cause and re-run; every script is idempotent.`
        );

        if (lowMemory && isHeapExhaustion(result)) {
            console.error(
                '\nThis looks like the --low-memory heap limit (96 MB) being too small for this step. ' +
                    'Run it without --low-memory on an instance with more memory.'
            );
        }

        process.exit(result.status ?? 1);
    }

    console.log(`\n✓ ${step.script} in ${seconds}s`);
}

console.log(`\nAll ${plan.length} steps done in ${((Date.now() - startedAll) / 1000).toFixed(1)}s.`);
