/**
 * The pure half of `scripts/clear-data.js`: arguments, scope resolution, the
 * production guard, and the SQL that follows foreign keys.
 *
 * Nothing here touches the database, so all of it is unit-tested. The script
 * reads the foreign keys from Postgres itself (`pg_constraint`) and hands them
 * to `deletionPredicates`, which is why a relation added by a later migration
 * is followed without anyone remembering to update a list.
 */

/** Execution order. Children before parents: whatever holds a Restrict key goes first. */
export const SCOPE_ORDER = Object.freeze([
    'demo-fleet',
    'demo-bookings',
    'packages',
    'kosher',
    'hotels',
    'tours',
    'services',
    'transfers'
]);

export const CATALOGUE = 'catalogue';
export const DATABASE = 'database';

export const KNOWN_SCOPES = Object.freeze([...SCOPE_ORDER, CATALOGUE, DATABASE]);

export class UsageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UsageError';
    }
}

/**
 * `node scripts/clear-data.js <scope[,scope]> [--yes] [--confirm <db>] [--wipe-production]`
 *
 * Scopes may be comma-separated, space-separated, or both. Unknown scopes and
 * unknown flags are errors: a typo must never fall through to a default.
 */
export const parseArgs = (argv) => {
    const options = { scopes: [], yes: false, confirm: undefined, wipeProduction: false, help: false };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--yes') {
            options.yes = true;
        } else if (arg === '--wipe-production') {
            options.wipeProduction = true;
        } else if (arg === '--confirm' || arg.startsWith('--confirm=')) {
            const value = arg === '--confirm' ? argv[(index += 1)] : arg.slice('--confirm='.length);

            if (!value || value.startsWith('--')) {
                throw new UsageError('--confirm needs the database name, e.g. --confirm iamgeorgia');
            }

            options.confirm = value;
        } else if (arg.startsWith('-')) {
            throw new UsageError(`Unknown option: ${arg}`);
        } else {
            for (const scope of arg.split(',').map((part) => part.trim()).filter(Boolean)) {
                if (!KNOWN_SCOPES.includes(scope)) {
                    throw new UsageError(`Unknown scope: ${scope}. Known scopes: ${KNOWN_SCOPES.join(', ')}`);
                }

                if (!options.scopes.includes(scope)) {
                    options.scopes.push(scope);
                }
            }
        }
    }

    if (!options.help && options.scopes.length === 0) {
        throw new UsageError(`Name at least one scope: ${KNOWN_SCOPES.join(', ')}`);
    }

    return options;
};

/**
 * Turns the requested scopes into what actually runs, in dependency order.
 *
 * `database` stands alone. `catalogue` is every other scope. `kosher` is
 * skipped when `hotels` runs, because deleting a hotel already cascades its
 * kosher profile and facilities.
 */
export const resolveScopes = (requested) => {
    if (requested.includes(DATABASE)) {
        if (requested.length > 1) {
            throw new UsageError('`database` wipes everything and cannot be combined with other scopes.');
        }

        return { mode: DATABASE, scopes: [], skipped: [] };
    }

    const wanted = new Set(requested.includes(CATALOGUE) ? SCOPE_ORDER : requested);
    const skipped = [];

    if (wanted.has('kosher') && wanted.has('hotels')) {
        wanted.delete('kosher');
        skipped.push({ scope: 'kosher', reason: 'covered by `hotels`: deleting a hotel cascades its kosher profile' });
    }

    return { mode: 'scopes', scopes: SCOPE_ORDER.filter((scope) => wanted.has(scope)), skipped };
};

/**
 * Whether a run may write. A dry run always may; `--yes` must clear the guard.
 *
 * @returns {string|null} why the run is refused, or null when it may go ahead
 */
export const refusalReason = ({ mode, yes, confirm, wipeProduction, isDeployed, databaseName }) => {
    if (!yes) {
        return null;
    }

    const needsConfirm = isDeployed || mode === DATABASE;

    if (needsConfirm && confirm === undefined) {
        return mode === DATABASE
            ? `Wiping the whole database needs --confirm ${databaseName}`
            : `This environment is deployed (NODE_ENV is not development/test): add --confirm ${databaseName}`;
    }

    if (needsConfirm && confirm !== databaseName) {
        return `--confirm ${JSON.stringify(confirm)} does not match the connected database ${JSON.stringify(databaseName)}`;
    }

    if (mode === DATABASE && isDeployed && !wipeProduction) {
        return 'Wiping a deployed database also needs --wipe-production';
    }

    return null;
};

// --- SQL helpers ---------------------------------------------------------------

export const quoteIdent = (name) => `"${String(name).replaceAll('"', '""')}"`;

const columnList = (alias, columns) =>
    columns.length === 1 ? `${alias}.${quoteIdent(columns[0])}` : `(${columns.map((column) => `${alias}.${quoteIdent(column)}`).join(', ')})`;

const selectList = (alias, columns) => columns.map((column) => `${alias}.${quoteIdent(column)}`).join(', ');

/** `pg_constraint.confdeltype` to a name. */
export const ON_DELETE = Object.freeze({ a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT' });

/**
 * Every row a deletion removes, per table, as one SQL predicate over alias `t`.
 *
 * `roots` are the rows deleted explicitly: `Map<table, string[]>`, each string
 * a predicate over `t`. From each root the predicate follows every ON DELETE
 * CASCADE key down to its children, and a child reachable from several parents
 * gets all of them OR-ed together — so a row is counted once however many
 * paths lead to it.
 *
 * Subqueries reuse the alias `t`; SQL scoping makes the inner `t` the parent
 * table, so a predicate can be embedded at any depth unchanged.
 *
 * @param {{ child: string, parent: string, childColumns: string[], parentColumns: string[], onDelete: string }[]} foreignKeys
 * @param {Map<string, string[]>} roots
 * @returns {Map<string, string>} table -> predicate, only for tables with rows to delete
 */
export const deletionPredicates = (foreignKeys, roots) => {
    const cascadesInto = new Map();

    for (const key of foreignKeys) {
        if (key.onDelete !== 'CASCADE') continue;
        if (!cascadesInto.has(key.child)) cascadesInto.set(key.child, []);
        cascadesInto.get(key.child).push(key);
    }

    const memo = new Map();

    const predicateFor = (table, stack) => {
        if (memo.has(table)) return memo.get(table);

        if (stack.includes(table)) {
            throw new Error(`Cascade cycle through ${[...stack, table].join(' -> ')}; refusing to guess what it deletes`);
        }

        const parts = [...(roots.get(table) ?? [])];

        for (const key of cascadesInto.get(table) ?? []) {
            const parent = predicateFor(key.parent, [...stack, table]);

            if (parent) {
                parts.push(
                    `${columnList('t', key.childColumns)} IN (SELECT ${selectList('t', key.parentColumns)} FROM ${quoteIdent(key.parent)} t WHERE ${parent})`
                );
            }
        }

        const predicate = parts.length > 0 ? parts.map((part) => `(${part})`).join(' OR ') : null;
        memo.set(table, predicate);

        return predicate;
    };

    const tables = new Set([...roots.keys(), ...foreignKeys.flatMap((key) => [key.child, key.parent])]);
    const result = new Map();

    for (const table of tables) {
        const predicate = predicateFor(table, []);
        if (predicate) result.set(table, predicate);
    }

    return result;
};

/** `NOT <table's deletion predicate>` over alias `t`, true when the table loses no rows. */
const survives = (predicates, table) => {
    const predicate = predicates.get(table);
    return predicate ? `NOT COALESCE((${predicate}), false)` : 'true';
};

/**
 * Rows that survive the deletion but point at a row that does not.
 *
 * RESTRICT / NO ACTION rows make the database refuse the delete; SET NULL rows
 * are silently unlinked. Both are worth knowing before anything runs.
 *
 * @returns {{ kind: 'restrict'|'unlink', key: object, sql: string }[]} one count query per affected key
 */
export const danglingReferenceQueries = (foreignKeys, predicates) =>
    foreignKeys
        .filter((key) => key.onDelete !== 'CASCADE' && predicates.has(key.parent))
        .map((key) => ({
            kind: key.onDelete === 'SET NULL' || key.onDelete === 'SET DEFAULT' ? 'unlink' : 'restrict',
            key,
            sql:
                `SELECT count(*)::int AS n FROM ${quoteIdent(key.child)} t ` +
                `WHERE ${columnList('t', key.childColumns)} IN (SELECT ${selectList('t', key.parentColumns)} FROM ${quoteIdent(key.parent)} t WHERE ${predicates.get(key.parent)}) ` +
                `AND ${survives(predicates, key.child)}`
        }));

/**
 * File assets that only rows being deleted refer to.
 *
 * An asset qualifies when at least one deleted row references it and no
 * surviving row does, through any key into `file_assets` (gallery joins,
 * featured images, driver photos, documents...).
 *
 * Keys that CASCADE from the asset (`image_variants`) are not references that
 * keep it alive — those rows are part of the asset and go with it.
 */
export const orphanedAssetsQuery = (foreignKeys, predicates, assetTable = 'file_assets') => {
    const keys = foreignKeys.filter((key) => key.parent === assetTable && key.onDelete !== 'CASCADE');

    for (const key of keys) {
        if (key.childColumns.length !== 1 || key.parentColumns.length !== 1) {
            throw new Error(`Multi-column key ${key.child} -> ${assetTable} is not supported`);
        }
    }

    const referenced = keys.filter((key) => predicates.has(key.child));

    if (referenced.length === 0) {
        return null;
    }

    const reference = (key, condition) =>
        `EXISTS (SELECT 1 FROM ${quoteIdent(key.child)} t WHERE t.${quoteIdent(key.childColumns[0])} = a.${quoteIdent(key.parentColumns[0])} AND ${condition})`;

    return (
        `SELECT a.id, a.object_key, a.visibility::text AS visibility FROM ${quoteIdent(assetTable)} a ` +
        `WHERE (${referenced.map((key) => reference(key, `(${predicates.get(key.child)})`)).join(' OR ')}) ` +
        `AND NOT (${keys.map((key) => reference(key, survives(predicates, key.child))).join(' OR ')})`
    );
};

/** The storage folder an object key lives in: every rendition of an asset shares it. */
export const folderOf = (objectKey) => {
    const slash = objectKey.lastIndexOf('/');
    return slash === -1 ? objectKey : objectKey.slice(0, slash);
};

/** A SQL literal for a text array, escaped with the driver's own `escapeLiteral`. */
export const textArray = (values, escapeLiteral) =>
    values.length === 0 ? 'ARRAY[]::text[]' : `ARRAY[${values.map((value) => escapeLiteral(String(value))).join(', ')}]::text[]`;
