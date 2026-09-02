/**
 * Occupancy arithmetic for dispatch. Pure: no Prisma, no config, no clock.
 *
 * A leg occupies a driver from some time before the pick-up (getting there,
 * parking, holding the sign) until some time after the drop-off (unloading,
 * getting clear). The buffers are passed in and stored on the assignment row,
 * so what a row meant when it was written cannot be changed by editing an
 * environment variable later.
 */

const MS_PER_MINUTE = 60_000;

/**
 * The window an assignment occupies.
 *
 * `durationMinutes` is the leg's own figure, which already carries the class
 * pace factor from the quote — a minibus over a pass is slower than a sedan.
 */
export const assignmentWindow = ({ pickupAt, durationMinutes }, { preBufferMinutes, postBufferMinutes }) => {
    const pickup = pickupAt instanceof Date ? pickupAt.getTime() : new Date(pickupAt).getTime();

    return {
        windowStart: new Date(pickup - preBufferMinutes * MS_PER_MINUTE),
        windowEnd: new Date(pickup + (durationMinutes + postBufferMinutes) * MS_PER_MINUTE),
        preBufferMinutes,
        postBufferMinutes
    };
};

/** Half-open intervals, `[start, end)`, the same convention as the SQL ranges. */
export const windowsOverlap = (a, b) =>
    a.windowStart.getTime() < b.windowEnd.getTime() && b.windowStart.getTime() < a.windowEnd.getTime();
