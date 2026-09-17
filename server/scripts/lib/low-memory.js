import sharp from 'sharp';

/**
 * Preloaded into each seed step by `seed-all.js --low-memory` (via `--import`).
 *
 * Turns off libvips' operation cache, which otherwise holds up to 50 MB of
 * decoded images between calls — worth it for a server resizing the same
 * photograph twice, pure overhead for a seed that touches each one once.
 *
 * This must import `sharp` the same way the services do (ESM), because sharp
 * ships separate ESM and CommonJS builds and each resets the cache when it
 * loads: disabling it through the other build would be undone the moment the
 * media service imported its own.
 */
sharp.cache(false);
