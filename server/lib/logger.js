import pino from 'pino';

import { config } from '../config.js';

// Structured JSON logs in production so a log shipper can parse them;
// pino-pretty (a devDependency) makes them readable while developing.
export const logger = pino({
    level: config.logLevel,
    transport:
        config.nodeEnv === 'development'
            ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' } }
            : undefined,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]']
});

export default logger;
