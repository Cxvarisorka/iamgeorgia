/**
 * How `seed-all.js` starts each step: the Node arguments and the environment.
 *
 * With `lowMemory`, every step runs with settings measured to cut a seed's
 * peak memory from ~700 MB to ~275 MB with the full data set (the catalogue
 * step, 35 photographs, 400 days of rates) — enough to seed from the shell of
 * a 512 MB instance while the API keeps running beside it:
 *
 *   MALLOC_ARENA_MAX=1, MALLOC_TRIM_THRESHOLD_  glibc hands freed memory back
 *                                              instead of keeping per-thread
 *                                              arenas full of it (sharp's
 *                                              native allocations are the
 *                                              bulk of that)
 *   --max-old-space-size=96                    V8 collects garbage early rather
 *   --max-semi-space-size=2                    than growing the heap to ~150 MB
 *   --import scripts/lib/low-memory.js         libvips' image cache off
 *
 * These are read when a process starts, which is why they are applied to the
 * child processes rather than set from inside a script. The heap limit is
 * sized for today's seed data: a step that outgrows it fails with "JavaScript
 * heap out of memory" (see `isHeapExhaustion`), and runs fine without the flag.
 */

export const LOW_MEMORY_ENV = Object.freeze({
    MALLOC_ARENA_MAX: '1',
    MALLOC_TRIM_THRESHOLD_: '131072'
});

export const LOW_MEMORY_NODE_FLAGS = Object.freeze(['--max-old-space-size=96', '--max-semi-space-size=2']);

/** A file URL, so a checkout path with spaces or non-Latin characters is passed intact. */
export const LOW_MEMORY_PRELOAD = new URL('./low-memory.js', import.meta.url).href;

/**
 * @param {{ script: string, args?: string[], env?: NodeJS.ProcessEnv, lowMemory?: boolean }} step
 * @returns {{ args: string[], env: NodeJS.ProcessEnv }} arguments for `process.execPath`, and the child's environment
 */
export const seedProcess = ({ script, args = [], env = process.env, lowMemory = false }) =>
    lowMemory
        ? {
              args: [...LOW_MEMORY_NODE_FLAGS, '--import', LOW_MEMORY_PRELOAD, script, ...args],
              env: { ...env, ...LOW_MEMORY_ENV }
          }
        : { args: [script, ...args], env };

/**
 * Whether a finished step died of V8 running out of heap: Node aborts, which
 * reaches the parent as SIGABRT or, through a shell, exit status 134.
 */
export const isHeapExhaustion = (result) => result.signal === 'SIGABRT' || result.status === 134;
