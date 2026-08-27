import { config } from '../config.js';
import { HttpError } from '../lib/errors.js';

export const notFoundHandler = (req, res) => {
    res.status(404).json({ error: { message: `Cannot ${req.method} ${req.path}` } });
};

// Prisma reports constraint violations through error codes rather than types,
// so the common ones are translated into the status a client expects.
//
// The 5-digit entries are Postgres SQLSTATEs, which surface unwrapped when a
// service uses $queryRaw / $executeRaw — the availability claim and the bulk
// inventory writes both do. 23514 is the one that matters: it is what the
// room_inventory no-oversell CHECK raises, and it must read as a conflict
// rather than an internal error, because losing that race is a normal outcome.
const constraintStatus = {
    P2002: { status: 409, message: 'A record with these unique values already exists' },
    P2003: { status: 409, message: 'Related record constraint failed' },
    P2025: { status: 404, message: 'Record not found' },
    23505: { status: 409, message: 'A record with these unique values already exists' },
    23503: { status: 409, message: 'Related record constraint failed' },
    23514: { status: 409, message: 'The request conflicts with current availability' }
};

// Express 5 forwards rejected promises from handlers here, so routes do not
// need a try/catch of their own. Must keep all four arguments: Express
// identifies error middleware by arity.
// eslint-disable-next-line no-unused-vars
// Multer rejects an oversized or unexpected upload with its own error type
// that carries no status, so without this a file one byte over the limit would
// read as an internal failure rather than as the client error it is.
const multerStatus = {
    LIMIT_FILE_SIZE: { status: 413, message: 'That file is too large' },
    LIMIT_FILE_COUNT: { status: 400, message: 'Upload one file at a time' },
    LIMIT_UNEXPECTED_FILE: { status: 400, message: 'Unexpected file field' }
};

export const errorHandler = (err, req, res, next) => {
    const mapped =
        (err?.name === 'MulterError' && multerStatus[err.code]) || (err?.code && constraintStatus[err.code]);

    // Express middleware (body-parser, cors) throws http-errors objects that
    // already carry a status and an `expose` flag saying whether the message
    // is safe to return — a 413 from express.json() must not become a 500.
    const httpErrorStatus = err?.status ?? err?.statusCode;
    const status =
        err instanceof HttpError
            ? err.status
            : mapped?.status ?? (Number.isInteger(httpErrorStatus) ? httpErrorStatus : 500);

    if (status >= 500) {
        (req.log ?? console).error({ err }, 'Unhandled error');
    } else {
        (req.log ?? console).warn({ err: err.message }, 'Request failed');
    }

    // Only errors that were raised deliberately — ours, Prisma's mapped codes,
    // or an http-error marked `expose` — are safe to describe to a client.
    const message =
        err instanceof HttpError
            ? err.message
            : mapped?.message ?? (err?.expose && status < 500 ? err.message : 'Internal server error');

    res.status(status).json({
        error: {
            message,
            ...(err.details ? { details: err.details } : {}),
            ...(config.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {})
        }
    });
};
