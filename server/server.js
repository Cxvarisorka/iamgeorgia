import { createApp } from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { connect, disconnect } from './db/index.js';
import { auditSweep, sweepExpiredHolds } from './services/hotel/availability.service.js';

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

    let shuttingDown = false;

    const shutdown = async (reason, exitCode = 0) => {
        if (shuttingDown) {
            return;
        }

        shuttingDown = true;
        logger.info({ reason }, 'Shutting down');
        clearInterval(sweeper);

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
