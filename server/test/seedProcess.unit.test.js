import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
    LOW_MEMORY_ENV,
    LOW_MEMORY_NODE_FLAGS,
    LOW_MEMORY_PRELOAD,
    isHeapExhaustion,
    seedProcess
} from '../scripts/lib/seed-process.js';

/**
 * How `seed-all.js` starts a step, with and without `--low-memory`. The last
 * group starts a real child process, because the settings only matter if the
 * child actually runs with them.
 */

const PROBE = fileURLToPath(new URL('./support/low-memory-probe.js', import.meta.url));

const runProbe = (lowMemory) => {
    const child = seedProcess({ script: PROBE, args: ['--count', '3'], env: process.env, lowMemory });
    const result = spawnSync(process.execPath, child.args, { env: child.env, encoding: 'utf8' });

    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim().split('\n').pop());
};

describe('seed-all: starting a step', () => {
    it('without --low-memory runs the script exactly as before', () => {
        const env = { DATABASE_URL: 'postgres://x' };
        const child = seedProcess({ script: '/app/scripts/seed-catalogue.js', args: ['--count', '3'], env });

        assert.deepEqual(child.args, ['/app/scripts/seed-catalogue.js', '--count', '3']);
        assert.equal(child.env, env, 'the same environment object, untouched');
    });

    it('with --low-memory puts the Node flags and the preload before the script', () => {
        const child = seedProcess({ script: '/app/scripts/seed-catalogue.js', args: ['--x'], env: {}, lowMemory: true });

        assert.deepEqual(child.args, [
            ...LOW_MEMORY_NODE_FLAGS,
            '--import',
            LOW_MEMORY_PRELOAD,
            '/app/scripts/seed-catalogue.js',
            '--x'
        ]);
    });

    it('adds the allocator settings without mutating the parent environment', () => {
        const env = { DATABASE_URL: 'postgres://x', MALLOC_ARENA_MAX: '8' };
        const child = seedProcess({ script: 's.js', env, lowMemory: true });

        assert.deepEqual(child.env, { DATABASE_URL: 'postgres://x', ...LOW_MEMORY_ENV });
        assert.equal(env.MALLOC_ARENA_MAX, '8');
    });

    it('points the preload at a file that exists, as a file URL', () => {
        assert.match(LOW_MEMORY_PRELOAD, /^file:\/\/.*\/scripts\/lib\/low-memory\.js$/);
        assert.ok(existsSync(fileURLToPath(LOW_MEMORY_PRELOAD)));
    });

    it('recognises a step that ran out of heap', () => {
        assert.equal(isHeapExhaustion({ status: null, signal: 'SIGABRT' }), true);
        assert.equal(isHeapExhaustion({ status: 134, signal: null }), true);
        assert.equal(isHeapExhaustion({ status: 1, signal: null }), false);
        assert.equal(isHeapExhaustion({ status: null, signal: 'SIGKILL' }), false);
    });
});

describe('seed-all: what the child process actually runs with', () => {
    it('--low-memory: allocator settings, a small heap, and no image cache', () => {
        const probe = runProbe(true);

        assert.equal(probe.mallocArenaMax, '1');
        assert.equal(probe.mallocTrimThreshold, '131072');
        assert.ok(probe.heapLimitMb <= 128, `heap limit ${probe.heapLimitMb} MB`);
        // The preload and the probe import sharp the same way, so they share
        // one instance: the cache stays off rather than being reset on load.
        assert.equal(probe.sharpCacheMemoryMax, 0);
        assert.deepEqual(probe.args, ['--count', '3']);
    });

    it('without it: Node and sharp defaults', () => {
        const probe = runProbe(false);

        assert.ok(probe.heapLimitMb > 128, `heap limit ${probe.heapLimitMb} MB`);
        assert.equal(probe.sharpCacheMemoryMax, 50);
    });
});
