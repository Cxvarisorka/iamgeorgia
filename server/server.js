import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { connect, disconnect } from './db/index.js';
import { disconnectRateLimitStore } from './middleware/rateLimit.js';
import { auditSweep, sweepExpiredHolds } from './services/hotel/availability.service.js';
import { sweepExpiringCertifications } from './services/hotel/kosher.service.js';
import { drainOutbox } from './services/notifications/outbox.service.js';
import { sweepReminders } from './services/transfer/reminder.service.js';

const start = async () => {
    await connect();

    const app = createApp();
    const server = app.listen(config.port, () => {
        logger.info(`Server is running on http://localhost:${config.port}`);
    });

    // How long a client may take to send a whole request. Node defaults to
    // five minutes, which lets a slow-loris client pin a socket for the
    // duration. The headers window is Node's own default unless the whole
    // request is allowed less than that — headers cannot be given longer than
    // the request they belong to.
    server.requestTimeout = config.requestTimeoutMs;
    server.headersTimeout = Math.min(server.headersTimeout, config.requestTimeoutMs);

    /**
     * Returns expired holds to the pool.
     *
     * Lives here rather than in a request path because it is process
     * lifecycle, not something a visitor triggers. `held_units` is a counter,
     * so until this runs an abandoned checkout still blocks its rooms — this
     * interval is the worst-case delay before one comes back.
     *
     * Safe to run on every instance: the sweep takes a Postgres advisory lock
     * and any instance that does not get it does nothing.
     */
    const sweeper = setInterval(() => {
        sweepExpiredHolds()
            .then(({ swept }) => auditSweep(swept))
            .catch((err) => logger.error({ err }, 'Hold sweep failed'));
    }, config.hotel.holdSweepIntervalMs);

    // Never hold the process open for a sweep that has not fired yet.
    sweeper.unref();

    /**
     * Says when a kosher certificate is about to lapse.
     *
     * Unlike the hold sweep this one **changes no state**. Expiry is derived on
     * every read, so a lapsed certificate stops counting as verified the moment
     * it lapses whether or not this has run — which is deliberate, because a job
     * that has to run for the data to be right is a job whose failure is
     * invisible. What this adds is a human hearing about it first.
     *
     * Same advisory-lock discipline as the hold sweep, so every instance may run
     * it and only one will.
     */
    const certificationSweeper = setInterval(() => {
        sweepExpiringCertifications()
            .then(({ notified, skipped }) => {
                if (!skipped && notified > 0) {
                    logger.info({ notified }, 'Kosher certificate expiry notices recorded');
                }
            })
            .catch((err) => logger.error({ err }, 'Kosher certificate sweep failed'));
    }, config.hotel.certificationSweepIntervalMs);

    certificationSweeper.unref();

    /**
     * Turns dispatch events into emails and in-app notices.
     *
     * The events were written in the same transaction as the state change
     * they describe; this is the other half. Same advisory-lock discipline:
     * every instance may run it and only one will.
     */
    const outboxDrainer = setInterval(() => {
        drainOutbox().catch((err) => logger.error({ err }, 'Outbox drain failed'));
    }, config.transfer.dispatch.outboxDrainIntervalMs);

    outboxDrainer.unref();

    /** Reminders, driver details and "still no driver" alerts, by the clock. */
    const reminderSweeper = setInterval(() => {
        sweepReminders().catch((err) => logger.error({ err }, 'Transfer reminder sweep failed'));
    }, config.transfer.dispatch.reminderSweepIntervalMs);

    reminderSweeper.unref();

    let shuttingDown = false;

    const shutdown = async (reason, exitCode = 0) => {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        logger.info({ reason }, 'Shutting down');
        clearInterval(sweeper);
        clearInterval(certificationSweeper);
        clearInterval(outboxDrainer);
        clearInterval(reminderSweeper);

        // A client holding a keep-alive socket can stop server.close() from
        // ever completing, so give in-flight requests a window and then take
        // the remaining sockets down.
        const forceExit = setTimeout(() => {
            logger.error('Shutdown timed out, forcing exit');
            process.exit(1);
        }, config.shutdownTimeoutMs);
        forceExit.unref();

        const closed = new Promise((resolve) => server.close(resolve));
        server.closeIdleConnections();
        const closeRemaining = setTimeout(() => server.closeAllConnections(), config.shutdownTimeoutMs / 2);

        try {
            await closed;
            clearTimeout(closeRemaining);
            await disconnect();
            await disconnectRateLimitStore();
            logger.info('Shutdown complete');
            process.exit(exitCode);
        } catch (err) {
            logger.error({ err }, 'Error during shutdown');
            process.exit(1);
        }
    };

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
        process.on(signal, () => shutdown(signal));
    });

    // An uncaught exception leaves the process in an unknown state; the only
    // safe move is to log it and exit non-zero so the supervisor restarts us.
    process.on('uncaughtException', (err) => {
        logger.fatal({ err }, 'Uncaught exception');
        shutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', (reason) => {
        logger.fatal({ err: reason }, 'Unhandled rejection');
        shutdown('unhandledRejection', 1);
    });

    return server;
};

start().catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
});
