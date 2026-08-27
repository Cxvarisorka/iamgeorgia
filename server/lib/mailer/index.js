import nodemailer from 'nodemailer';

import { config } from '../../config.js';
import { logger } from '../logger.js';
import { templates } from './templates.js';

export * from './templates.js';

/**
 * Messages the capture transport has collected. Exported so the test suite can
 * assert that approving a partner actually emailed them, rather than trusting
 * that the call was made.
 */
export const outbox = [];

export const clearOutbox = () => {
    outbox.length = 0;
};

let smtpTransport;

// Built on first use, not at import: a development process that never sends an
// email should not open a connection to an SMTP server it has no credentials
// for, and the test suite should not need one to exist at all.
const getSmtpTransport = () => {
    smtpTransport ??= nodemailer.createTransport({
        host: config.mail.smtp.host,
        port: config.mail.smtp.port,
        secure: config.mail.smtp.secure,
        auth: config.mail.smtp.user ? { user: config.mail.smtp.user, pass: config.mail.smtp.pass } : undefined,
        // Bounded, because a relay that accepts the TCP connection and then
        // says nothing would otherwise hold the request that triggered the
        // email for as long as the socket lived.
        connectionTimeout: config.mail.smtp.connectionTimeoutMs,
        greetingTimeout: config.mail.smtp.connectionTimeoutMs,
        socketTimeout: config.mail.smtp.socketTimeoutMs
    });

    return smtpTransport;
};

const dispatch = {
    smtp: (message) => getSmtpTransport().sendMail(message),

    // The link is the part a developer actually needs, and it is buried in the
    // body, so it is pulled out to the top level of the log line.
    log: (message, meta) => {
        logger.info(
            { to: message.to, subject: message.subject, url: meta.url },
            `Email (${meta.template}) not sent: MAIL_TRANSPORT=log`
        );
        logger.debug({ text: message.text }, 'Email body');

        return Promise.resolve({ transport: 'log' });
    },

    capture: (message, meta) => {
        outbox.push({ ...message, template: meta.template, url: meta.url, data: meta.data, sentAt: new Date() });

        return Promise.resolve({ transport: 'capture' });
    }
};

/**
 * Renders and sends one notification.
 *
 * Throws when the transport fails. Callers decide whether that matters: an
 * invitation whose email never left is worth failing the request over, because
 * the admin would otherwise believe a link is on its way that is not.
 */
export const sendMail = async ({ to, template, data = {} }) => {
    const render = templates[template];

    if (!render) {
        throw new Error(`Unknown email template: ${template}`);
    }

    const { subject, text, html } = render(data);

    const message = {
        from: config.mail.from,
        ...(config.mail.replyTo ? { replyTo: config.mail.replyTo } : {}),
        to,
        subject,
        text,
        html
    };

    const transport = dispatch[config.mail.transport];

    // config.js refuses to boot on a name that is not in `dispatch`, so this
    // cannot be reached — but the alternative of falling back to `log` is how a
    // deploy once printed every email instead of sending it, and that must not
    // quietly come back.
    if (!transport) {
        throw new Error(`Unknown mail transport: ${config.mail.transport}`);
    }

    await transport(message, { template, url: data.url, data });

    return message;
};

/**
 * Sends without letting a mail failure fail the request.
 *
 * Used for notifications that report something already committed — an approval
 * has happened whether or not the email describing it arrived, and rolling the
 * approval back because a mail server was briefly down would be worse than a
 * missing notification.
 */
export const sendMailQuietly = async (options) => {
    try {
        return await sendMail(options);
    } catch (err) {
        logger.error({ err, template: options.template, to: options.to }, 'Notification email failed');

        return null;
    }
};
