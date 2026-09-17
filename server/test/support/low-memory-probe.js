import v8 from 'node:v8';

import sharp from 'sharp';

/**
 * Started by test/seedProcess.unit.test.js through `seedProcess`: reports what
 * a seed step actually runs with, so the test checks the child process rather
 * than the arguments meant to configure it.
 */
console.log(
    JSON.stringify({
        mallocArenaMax: process.env.MALLOC_ARENA_MAX ?? null,
        mallocTrimThreshold: process.env.MALLOC_TRIM_THRESHOLD_ ?? null,
        heapLimitMb: Math.round(v8.getHeapStatistics().heap_size_limit / 1048576),
        // No argument reads the limits without changing them.
        sharpCacheMemoryMax: sharp.cache().memory.max,
        args: process.argv.slice(2)
    })
);
