import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    SCOPE_ORDER,
    UsageError,
    danglingReferenceQueries,
    deletionPredicates,
    folderOf,
    orphanedAssetsQuery,
    parseArgs,
    refusalReason,
    resolveScopes,
    textArray
} from '../scripts/lib/clear-data-scopes.js';

/**
 * The decisions `scripts/clear-data.js` makes before it touches a database:
 * which scopes run and in what order, whether a run may write, and the SQL
 * that follows foreign keys from the rows it deletes to everything they take
 * with them. The database half is exercised against a real Postgres by hand;
 * this half has no database anywhere near it.
 */

const fk = (child, parent, onDelete, childColumns = [`${parent}_id`], parentColumns = ['id']) => ({
    child,
    parent,
    onDelete,
    childColumns,
    parentColumns
});

describe('clear-data: arguments', () => {
    it('accepts comma- and space-separated scopes, deduplicated', () => {
        assert.deepEqual(parseArgs(['hotels,packages', 'hotels']).scopes, ['hotels', 'packages']);
    });

    it('reads --yes, --confirm in both spellings, and --wipe-production', () => {
        assert.deepEqual(parseArgs(['database', '--yes', '--confirm', 'iag', '--wipe-production']), {
            scopes: ['database'],
            yes: true,
            confirm: 'iag',
            wipeProduction: true,
            help: false
        });
        assert.equal(parseArgs(['hotels', '--confirm=iag']).confirm, 'iag');
    });

    it('is a dry run unless --yes is given', () => {
        assert.equal(parseArgs(['catalogue']).yes, false);
    });

    for (const [argv, pattern] of [
        [['hotelz'], /Unknown scope: hotelz/],
        [['hotels', '--force'], /Unknown option: --force/],
        [['hotels', '--confirm'], /--confirm needs the database name/],
        [['hotels', '--confirm', '--yes'], /--confirm needs the database name/],
        [[], /Name at least one scope/],
        [['--yes'], /Name at least one scope/]
    ]) {
        it(`refuses ${JSON.stringify(argv)}`, () => {
            assert.throws(() => parseArgs(argv), (err) => err instanceof UsageError && pattern.test(err.message));
        });
    }

    it('allows --help without a scope', () => {
        assert.equal(parseArgs(['--help']).help, true);
    });
});

describe('clear-data: scope resolution', () => {
    it('always runs in dependency order, whatever order they were named in', () => {
        assert.deepEqual(resolveScopes(['transfers', 'hotels', 'packages', 'demo-bookings']).scopes, [
            'demo-bookings',
            'packages',
            'hotels',
            'transfers'
        ]);
    });

    it('expands catalogue to every scope, with kosher covered by hotels', () => {
        const resolved = resolveScopes(['catalogue']);

        assert.deepEqual(resolved.scopes, SCOPE_ORDER.filter((scope) => scope !== 'kosher'));
        assert.equal(resolved.skipped[0].scope, 'kosher');
    });

    it('keeps kosher when hotels is not running', () => {
        assert.deepEqual(resolveScopes(['kosher']).scopes, ['kosher']);
    });

    it('runs database alone and refuses to combine it', () => {
        assert.equal(resolveScopes(['database']).mode, 'database');
        assert.throws(() => resolveScopes(['database', 'hotels']), UsageError);
        assert.throws(() => resolveScopes(['catalogue', 'database']), UsageError);
    });

    it('puts every child scope before the parent it holds a key to', () => {
        const at = (scope) => SCOPE_ORDER.indexOf(scope);

        assert.ok(at('demo-fleet') < at('demo-bookings'), 'assignments reference both');
        assert.ok(at('demo-bookings') < at('transfers'), 'bookings hold vehicle classes (Restrict)');
        assert.ok(at('packages') < at('hotels') && at('packages') < at('tours') && at('packages') < at('services'));
        assert.ok(at('tours') < at('transfers'), 'tours hold meeting points');
    });
});

describe('clear-data: production guard', () => {
    const base = { mode: 'scopes', yes: true, confirm: undefined, wipeProduction: false, isDeployed: false, databaseName: 'iag' };

    it('never refuses a dry run, even for database on production', () => {
        assert.equal(refusalReason({ ...base, yes: false, mode: 'database', isDeployed: true }), null);
    });

    it('lets a local scoped delete through without --confirm', () => {
        assert.equal(refusalReason(base), null);
    });

    it('needs a matching --confirm on a deployed environment', () => {
        assert.match(refusalReason({ ...base, isDeployed: true }), /add --confirm iag/);
        assert.match(refusalReason({ ...base, isDeployed: true, confirm: 'other' }), /does not match/);
        assert.equal(refusalReason({ ...base, isDeployed: true, confirm: 'iag' }), null);
    });

    it('needs --confirm for database even locally', () => {
        assert.match(refusalReason({ ...base, mode: 'database' }), /needs --confirm iag/);
        assert.equal(refusalReason({ ...base, mode: 'database', confirm: 'iag' }), null);
    });

    it('needs --wipe-production on top of --confirm to wipe a deployed database', () => {
        assert.match(refusalReason({ ...base, mode: 'database', isDeployed: true, confirm: 'iag' }), /--wipe-production/);
        assert.equal(refusalReason({ ...base, mode: 'database', isDeployed: true, confirm: 'iag', wipeProduction: true }), null);
    });

    it('checks the database name before --wipe-production', () => {
        assert.match(
            refusalReason({ ...base, mode: 'database', isDeployed: true, confirm: 'wrong', wipeProduction: true }),
            /does not match/
        );
    });
});

describe('clear-data: following foreign keys', () => {
    const keys = [
        fk('rooms', 'hotels', 'CASCADE', ['hotel_id']),
        fk('rates', 'rooms', 'CASCADE', ['room_id']),
        fk('bookings', 'hotels', 'RESTRICT', ['hotel_id']),
        fk('slots', 'hotels', 'SET NULL', ['hotel_id']),
        fk('ratings', 'rooms', 'CASCADE', ['room_id']),
        fk('ratings', 'drivers', 'CASCADE', ['driver_id'])
    ];

    it('cascades through every level from a root', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ["t.slug = 'a'"]]]));

        assert.deepEqual([...predicates.keys()].sort(), ['hotels', 'rates', 'ratings', 'rooms']);
        assert.match(predicates.get('rates'), /t\."room_id" IN \(SELECT t\."id" FROM "rooms" t WHERE .*t\."hotel_id" IN \(SELECT t\."id" FROM "hotels" t WHERE \(t\.slug = 'a'\)\)/);
    });

    it('does not follow RESTRICT or SET NULL keys as deletions', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ["t.slug = 'a'"]]]));

        assert.equal(predicates.has('bookings'), false);
        assert.equal(predicates.has('slots'), false);
    });

    it('ORs together every parent a table cascades from, so a row is counted once', () => {
        const predicates = deletionPredicates(
            keys,
            new Map([
                ['hotels', ["t.slug = 'a'"]],
                ['drivers', ["t.email LIKE '%demo'"]]
            ])
        );

        const ratings = predicates.get('ratings');
        assert.match(ratings, /"room_id" IN/);
        assert.match(ratings, /"driver_id" IN/);
        assert.match(ratings, /\) OR \(/);
    });

    it('combines a root predicate with an inherited one on the same table', () => {
        const predicates = deletionPredicates(
            keys,
            new Map([
                ['hotels', ["t.slug = 'a'"]],
                ['rooms', ["t.code = 'x'"]]
            ])
        );

        assert.match(predicates.get('rooms'), /^\(t\.code = 'x'\) OR \(t\."hotel_id" IN/);
    });

    it('returns nothing for tables no deletion reaches', () => {
        assert.equal(deletionPredicates(keys, new Map()).size, 0);
    });

    it('refuses a cascade cycle instead of guessing', () => {
        const cyclic = [fk('a', 'b', 'CASCADE', ['b_id']), fk('b', 'a', 'CASCADE', ['a_id'])];

        assert.throws(() => deletionPredicates(cyclic, new Map([['a', ['true']]])), /Cascade cycle/);
    });

    it('handles multi-column keys with row constructors', () => {
        const composite = [fk('lines', 'orders', 'CASCADE', ['order_id', 'shop_id'], ['id', 'shop_id'])];
        const predicates = deletionPredicates(composite, new Map([['orders', ['t.total > 0']]]));

        assert.match(predicates.get('lines'), /\(t\."order_id", t\."shop_id"\) IN \(SELECT t\."id", t\."shop_id" FROM "orders" t/);
    });

    it('quotes identifiers so a table name cannot break out of the statement', () => {
        const odd = [fk('we"ird', 'hotels', 'CASCADE', ['hotel_id'])];
        const predicates = deletionPredicates(odd, new Map([['hotels', ['true']]]));

        assert.match(predicates.get('we"ird'), /FROM "hotels" t/);
        assert.ok(danglingReferenceQueries([fk('x', 'we"ird', 'RESTRICT', ['w_id'])], predicates)[0].sql.includes('"we""ird"'));
    });
});

describe('clear-data: dangling references', () => {
    const keys = [
        fk('rooms', 'hotels', 'CASCADE', ['hotel_id']),
        fk('bookings', 'hotels', 'RESTRICT', ['hotel_id']),
        fk('holds', 'rooms', 'NO ACTION', ['room_id']),
        fk('slots', 'hotels', 'SET NULL', ['hotel_id'])
    ];

    it('asks about RESTRICT/NO ACTION as blocks and SET NULL as unlinks, only for deleted parents', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ['true']]]));
        const queries = danglingReferenceQueries(keys, predicates);

        assert.deepEqual(
            queries.map((query) => [query.key.child, query.kind]),
            [
                ['bookings', 'restrict'],
                ['holds', 'restrict'],
                ['slots', 'unlink']
            ]
        );
    });

    it('only counts referencing rows that survive the delete', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ['true']], ['bookings', ["t.source = 'demo'"]]]));
        const bookings = danglingReferenceQueries(keys, predicates).find((query) => query.key.child === 'bookings');

        assert.match(bookings.sql, /AND NOT COALESCE\(\(\(t\.source = 'demo'\)\), false\)$/);
    });

    it('treats a table nothing deletes from as surviving whole', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ['true']]]));
        const slots = danglingReferenceQueries(keys, predicates).find((query) => query.key.child === 'slots');

        assert.match(slots.sql, /AND true$/);
    });
});

describe('clear-data: files', () => {
    const keys = [
        fk('hotels', 'destinations', 'RESTRICT', ['destination_id']),
        fk('hotel_images', 'hotels', 'CASCADE', ['hotel_id']),
        fk('hotel_images', 'file_assets', 'RESTRICT', ['file_asset_id']),
        fk('hotels', 'file_assets', 'SET NULL', ['featured_image_id']),
        fk('tour_images', 'file_assets', 'RESTRICT', ['file_asset_id']),
        fk('image_variants', 'file_assets', 'CASCADE', ['file_asset_id'])
    ];

    it('does not treat an asset\'s own renditions (CASCADE) as something that keeps it alive', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ["t.slug = 'a'"]]]));

        assert.doesNotMatch(orphanedAssetsQuery(keys, predicates), /image_variants/);
    });

    it('selects assets referenced by a deleted row and by no surviving one', () => {
        const predicates = deletionPredicates(keys, new Map([['hotels', ["t.slug = 'a'"]]]));
        const sql = orphanedAssetsQuery(keys, predicates);

        // Referenced by a deleted gallery row or a deleted hotel's featured image...
        assert.match(sql, /WHERE \(EXISTS \(SELECT 1 FROM "hotel_images" t WHERE t\."file_asset_id" = a\."id" AND \(/);
        assert.match(sql, /EXISTS \(SELECT 1 FROM "hotels" t WHERE t\."featured_image_id" = a\."id" AND \(/);
        // ...and not by anything that stays, tour galleries included.
        assert.match(sql, /AND NOT \(.*EXISTS \(SELECT 1 FROM "tour_images" t WHERE t\."file_asset_id" = a\."id" AND true\)/);
    });

    it('returns null when no deleted table can hold a file', () => {
        const predicates = deletionPredicates(keys, new Map([['destinations', ['true']]]));

        assert.equal(orphanedAssetsQuery(keys, predicates), null);
    });

    it('maps object keys to the folder shared by an asset and its renditions', () => {
        assert.equal(folderOf('hotel-image/0123abcd/original.jpg'), 'hotel-image/0123abcd');
        assert.equal(folderOf('hotel-image/0123abcd/card.webp'), 'hotel-image/0123abcd');
        assert.equal(folderOf('loose.jpg'), 'loose.jpg');
    });
});

describe('clear-data: literals', () => {
    const escape = (value) => `'${value.replaceAll("'", "''")}'`;

    it('builds a typed text array, empty included', () => {
        assert.equal(textArray(['a', "o'k"], escape), "ARRAY['a', 'o''k']::text[]");
        assert.equal(textArray([], escape), 'ARRAY[]::text[]');
    });
});
