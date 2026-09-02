import { config } from '../../config.js';

/**
 * Every value interpolated into an email body is attacker-influenced: a company
 * name, a contact name, a rejection reason typed by an admin. Escaping is not
 * optional even though the recipient is a mail client rather than a browser —
 * several render HTML, and a stray tag would at minimum break the layout.
 */
const escapeHtml = (value) =>
    String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

const link = (path) => `${config.appUrl.replace(/\/$/, '')}${path}`;

export const invitationUrl = (token) => link(`/partners/register/${token}`);
export const activationUrl = (token) => link(`/activate/${token}`);
export const passwordResetUrl = (token) => link(`/reset-password/${token}`);
export const portalUrl = () => link('/portal');
export const driverPanelUrl = (assignmentId) => link(assignmentId ? `/driver/assignments/${assignmentId}` : '/driver');
export const ratingUrl = (token) => link(`/transfers/rate/${token}`);

const formatDate = (date) =>
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(date);

/** The same, read as a wall clock somewhere in particular. */
const formatLocal = (date, timeZone) =>
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone }).format(
        date instanceof Date ? date : new Date(date)
    );

/** Minor units back into something a person reads. */
const formatMoney = (cents, currency) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(cents / 100);

/**
 * One plain wrapper for every message. Deliberately table-free and
 * inline-styled with a system font stack: transactional mail has to survive
 * clients that strip stylesheets, and a link that renders as a bare URL when
 * everything else fails is better than a button that disappears with it.
 */
const layout = ({ heading, paragraphs, cta, footer }) => {
    const body = paragraphs.map((line) => `<p style="margin:0 0 16px">${line}</p>`).join('\n      ');

    const button = cta
        ? `<p style="margin:0 0 16px">
        <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:12px 20px;background:#1f6f5c;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:600">${escapeHtml(cta.label)}</a>
      </p>
      <p style="margin:0 0 16px;font-size:13px;color:#5b6b66">If the button does not work, paste this into your browser:<br><span style="word-break:break-all">${escapeHtml(cta.url)}</span></p>`
        : '';

    return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c2b27;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 20px">${escapeHtml(heading)}</h1>
      ${body}
      ${button}
      <hr style="border:none;border-top:1px solid #e3e8e6;margin:24px 0">
      <p style="margin:0;font-size:13px;color:#5b6b66">${footer ?? 'I am Georgia &middot; partner operations'}</p>
    </div>`;
};

const plain = (lines) => lines.filter(Boolean).join('\n\n');

export const templates = {
    /** 1. An admin invites someone to register a partner company. */
    partnerInvitation: ({ companyName, url, expiresAt, invitedByName }) => {
        const greeting = companyName
            ? `You have been invited to register ${companyName} as a partner of I am Georgia.`
            : 'You have been invited to register as a partner of I am Georgia.';
        const invitedBy = invitedByName ? ` by ${invitedByName}` : '';

        return {
            subject: 'Your I am Georgia partner invitation',
            text: plain([
                greeting,
                `This invitation was sent${invitedBy} to this email address and can only be completed from it.`,
                `Open the link below to complete your company details and choose a password:\n${url}`,
                `The link can be used once and expires on ${formatDate(expiresAt)} UTC.`,
                'If you were not expecting this, you can ignore this email.'
            ]),
            html: layout({
                heading: 'Register as a partner',
                paragraphs: [
                    escapeHtml(greeting),
                    `This invitation was sent${escapeHtml(invitedBy)} to this email address and can only be completed from it.`,
                    `The link can be used once and expires on <strong>${escapeHtml(formatDate(expiresAt))} UTC</strong>.`
                ],
                cta: { label: 'Complete your registration', url },
                footer: 'If you were not expecting this, you can ignore this email.'
            })
        };
    },

    /** 2. Receipt for a submitted application. */
    registrationSubmitted: ({ companyName, reference, contactName }) => ({
        subject: `Application received - ${reference}`,
        text: plain([
            `${contactName ? `Hello ${contactName},` : 'Hello,'}`,
            `We have received the partner application for ${companyName}.`,
            `Your Partner ID is ${reference}. Quote it in any correspondence with us.`,
            'Our team reviews applications and will email you once a decision has been made. You can sign in at any time to check the status of your application.',
            portalUrl()
        ]),
        html: layout({
            heading: 'We have your application',
            paragraphs: [
                `${contactName ? `Hello ${escapeHtml(contactName)},` : 'Hello,'}`,
                `We have received the partner application for <strong>${escapeHtml(companyName)}</strong>.`,
                `Your Partner ID is <strong>${escapeHtml(reference)}</strong>. Quote it in any correspondence with us.`,
                'Our team reviews applications and will email you once a decision has been made.'
            ],
            cta: { label: 'Check your application status', url: portalUrl() }
        })
    }),

    /** 3. Approved. */
    partnerApproved: ({ companyName, reference, contactName }) => ({
        subject: `${companyName} is approved - welcome to I am Georgia`,
        text: plain([
            `${contactName ? `Hello ${contactName},` : 'Hello,'}`,
            `Good news: the partner application for ${companyName} (${reference}) has been approved.`,
            `You now have full access to the partner platform:\n${portalUrl()}`,
            'Sign in with the email address this message was sent to.'
        ]),
        html: layout({
            heading: 'Your partner account is active',
            paragraphs: [
                `${contactName ? `Hello ${escapeHtml(contactName)},` : 'Hello,'}`,
                `The partner application for <strong>${escapeHtml(companyName)}</strong> (${escapeHtml(reference)}) has been approved.`,
                'Sign in with the email address this message was sent to.'
            ],
            cta: { label: 'Open the partner platform', url: portalUrl() }
        })
    }),

    /**
     * 4. Rejected. Carries `reason` — the applicant-facing text — and never
     * the internal note, which is a separate column for exactly this reason.
     */
    partnerRejected: ({ companyName, reference, contactName, reason }) => ({
        subject: `Update on your I am Georgia partner application - ${reference}`,
        text: plain([
            `${contactName ? `Hello ${contactName},` : 'Hello,'}`,
            `Thank you for applying to partner with I am Georgia. After reviewing the application for ${companyName} (${reference}), we are not able to approve it at this time.`,
            `Reason given: ${reason}`,
            'If you believe this decision was made in error, or your circumstances change, reply to this email and we will take another look.'
        ]),
        html: layout({
            heading: 'About your partner application',
            paragraphs: [
                `${contactName ? `Hello ${escapeHtml(contactName)},` : 'Hello,'}`,
                `After reviewing the application for <strong>${escapeHtml(companyName)}</strong> (${escapeHtml(reference)}), we are not able to approve it at this time.`,
                `<strong>Reason given:</strong> ${escapeHtml(reason)}`,
                'If you believe this decision was made in error, or your circumstances change, reply to this email and we will take another look.'
            ]
        })
    }),

    /** 5. An admin created the account; the user still needs a password. */
    accountActivation: ({ contactName, companyName, url, expiresAt }) => ({
        subject: 'Set up your I am Georgia partner account',
        text: plain([
            `${contactName ? `Hello ${contactName},` : 'Hello,'}`,
            `An account has been created for you${companyName ? ` on behalf of ${companyName}` : ''} on the I am Georgia partner platform.`,
            `Choose a password to activate it:\n${url}`,
            `This link can be used once and expires on ${formatDate(expiresAt)} UTC.`
        ]),
        html: layout({
            heading: 'Activate your account',
            paragraphs: [
                `${contactName ? `Hello ${escapeHtml(contactName)},` : 'Hello,'}`,
                `An account has been created for you${companyName ? ` on behalf of <strong>${escapeHtml(companyName)}</strong>` : ''} on the I am Georgia partner platform.`,
                `This link can be used once and expires on <strong>${escapeHtml(formatDate(expiresAt))} UTC</strong>.`
            ],
            cta: { label: 'Choose your password', url }
        })
    }),

    /** A driver's login, created by operations against an existing profile. */
    driverAccountActivation: ({ driverName, url, expiresAt }) => ({
        subject: 'Your I am Georgia driver account',
        text: plain([
            `${driverName ? `Hello ${driverName},` : 'Hello,'}`,
            'A driver account has been created for you on the I am Georgia platform. It is where your assigned transfers, pick-up details and passenger contacts will appear.',
            `Choose a password to activate it:\n${url}`,
            `This link can be used once and expires on ${formatDate(expiresAt)} UTC.`
        ]),
        html: layout({
            heading: 'Activate your driver account',
            paragraphs: [
                `${driverName ? `Hello ${escapeHtml(driverName)},` : 'Hello,'}`,
                'A driver account has been created for you on the I am Georgia platform. It is where your assigned transfers, pick-up details and passenger contacts will appear.',
                `This link can be used once and expires on <strong>${escapeHtml(formatDate(expiresAt))} UTC</strong>.`
            ],
            cta: { label: 'Choose your password', url }
        })
    }),

    /** 6. A replacement invitation, after the first expired or was resent. */
    invitationReissued: ({ companyName, url, expiresAt }) => ({
        subject: 'Your new I am Georgia partner invitation link',
        text: plain([
            `A new registration link has been issued${companyName ? ` for ${companyName}` : ''}.`,
            'Any earlier link you were sent no longer works. Use this one instead:',
            url,
            `It can be used once and expires on ${formatDate(expiresAt)} UTC.`
        ]),
        html: layout({
            heading: 'Here is your new link',
            paragraphs: [
                `A new registration link has been issued${companyName ? ` for <strong>${escapeHtml(companyName)}</strong>` : ''}.`,
                '<strong>Any earlier link you were sent no longer works.</strong> Use this one instead.',
                `It can be used once and expires on <strong>${escapeHtml(formatDate(expiresAt))} UTC</strong>.`
            ],
            cta: { label: 'Complete your registration', url }
        })
    }),

    /**
     * Dispatch. Every one of these describes a fact already committed, and
     * every one goes through `sendMailQuietly` from the outbox drain.
     */
    transferAssignmentOffered: ({ driverName, reference, from, to, pickupAt, timezone, passengers, flightNumber, onBehalf, url }) => ({
        subject: `${onBehalf ? 'New transfer' : 'Transfer offered'}: ${from} to ${to}, ${formatLocal(pickupAt, timezone)}`,
        text: plain([
            `Hello ${driverName},`,
            onBehalf
                ? `Dispatch has assigned you a transfer, ${reference}.`
                : `Dispatch has offered you a transfer, ${reference}. Please accept or decline it in your panel.`,
            `${from} to ${to}\nPick-up: ${formatLocal(pickupAt, timezone)} (${timezone})\nPassengers: ${passengers}${flightNumber ? `\nFlight: ${flightNumber}` : ''}`,
            `Open it here:\n${url}`
        ]),
        html: layout({
            heading: onBehalf ? 'A transfer has been assigned to you' : 'A transfer has been offered to you',
            paragraphs: [
                `Hello ${escapeHtml(driverName)},`,
                onBehalf
                    ? `Dispatch has assigned you <strong>${escapeHtml(reference)}</strong>.`
                    : `Dispatch has offered you <strong>${escapeHtml(reference)}</strong>. Please accept or decline it in your panel.`,
                `<strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong><br>Pick-up ${escapeHtml(formatLocal(pickupAt, timezone))} (${escapeHtml(timezone)})<br>${passengers} passenger${passengers === 1 ? '' : 's'}${flightNumber ? `<br>Flight ${escapeHtml(flightNumber)}` : ''}`
            ],
            cta: { label: onBehalf ? 'See the transfer' : 'Answer the offer', url },
            footer: 'I am Georgia &middot; dispatch'
        })
    }),

    transferAssignmentRevoked: ({ driverName, reference, from, to, pickupAt, timezone, reason }) => {
        const why =
            reason === 'REASSIGNED'
                ? 'It has been reassigned to another driver.'
                : reason === 'BOOKING_CANCELLED'
                  ? 'The booking has been cancelled.'
                  : 'Dispatch has withdrawn it.';

        return {
            subject: `${reference} is no longer yours`,
            text: plain([
                `Hello ${driverName},`,
                `The transfer ${reference} (${from} to ${to}, ${formatLocal(pickupAt, timezone)}) is no longer assigned to you. ${why}`,
                'Nothing more is needed from you for it.'
            ]),
            html: layout({
                heading: `${escapeHtml(reference)} is no longer yours`,
                paragraphs: [
                    `Hello ${escapeHtml(driverName)},`,
                    `The transfer <strong>${escapeHtml(reference)}</strong> (${escapeHtml(from)} → ${escapeHtml(to)}, ${escapeHtml(formatLocal(pickupAt, timezone))}) is no longer assigned to you. ${escapeHtml(why)}`,
                    'Nothing more is needed from you for it.'
                ],
                footer: 'I am Georgia &middot; dispatch'
            })
        };
    },

    transferPickupReminder: ({ driverName, reference, from, to, pickupAt, timezone, passengerName, passengerPhone, pickupAddress, flightNumber, url }) => ({
        subject: `Pick-up soon: ${from} at ${formatLocal(pickupAt, timezone)}`,
        text: plain([
            `Hello ${driverName},`,
            `A reminder of your next transfer, ${reference}.`,
            `${from} to ${to}\nPick-up: ${formatLocal(pickupAt, timezone)} (${timezone})${pickupAddress ? `\nAddress: ${pickupAddress}` : ''}${flightNumber ? `\nFlight: ${flightNumber}` : ''}\nPassenger: ${passengerName}${passengerPhone ? ` (${passengerPhone})` : ''}`,
            `Open it here:\n${url}`
        ]),
        html: layout({
            heading: 'Your next pick-up is coming up',
            paragraphs: [
                `Hello ${escapeHtml(driverName)},`,
                `A reminder of <strong>${escapeHtml(reference)}</strong>.`,
                `<strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong><br>Pick-up ${escapeHtml(formatLocal(pickupAt, timezone))} (${escapeHtml(timezone)})${pickupAddress ? `<br>${escapeHtml(pickupAddress)}` : ''}${flightNumber ? `<br>Flight ${escapeHtml(flightNumber)}` : ''}<br>Passenger: ${escapeHtml(passengerName)}${passengerPhone ? ` (${escapeHtml(passengerPhone)})` : ''}`
            ],
            cta: { label: 'See the transfer', url },
            footer: 'I am Georgia &middot; dispatch'
        })
    }),

    transferDriverAssigned: ({ reference, from, to, pickupAt, timezone, driverName, driverPhone, vehicle }) => ({
        subject: `Driver confirmed for ${reference}`,
        text: plain([
            `A driver has confirmed the transfer ${reference}: ${from} to ${to} on ${formatLocal(pickupAt, timezone)} (${timezone}).`,
            `Driver: ${driverName}${vehicle ? `\nCar: ${vehicle}` : ''}${driverPhone ? `\nPhone: ${driverPhone}` : '\nThe phone number will be shared the day before the pick-up.'}`
        ]),
        html: layout({
            heading: 'Your driver is confirmed',
            paragraphs: [
                `A driver has confirmed <strong>${escapeHtml(reference)}</strong>: ${escapeHtml(from)} → ${escapeHtml(to)} on ${escapeHtml(formatLocal(pickupAt, timezone))} (${escapeHtml(timezone)}).`,
                `<strong>${escapeHtml(driverName)}</strong>${vehicle ? `<br>${escapeHtml(vehicle)}` : ''}${driverPhone ? `<br>${escapeHtml(driverPhone)}` : '<br>The phone number will be shared the day before the pick-up.'}`
            ]
        })
    }),

    transferDriverDetails: ({ reference, from, to, pickupAt, timezone, driverName, driverPhone, vehicle, passengerName }) => ({
        subject: `Your driver for ${from}: ${driverName}`,
        text: plain([
            `${passengerName ? `Hello ${passengerName},` : 'Hello,'}`,
            `Here is who is meeting you for ${reference}, ${from} to ${to} on ${formatLocal(pickupAt, timezone)} (${timezone}).`,
            `Driver: ${driverName}${vehicle ? `\nCar: ${vehicle}` : ''}${driverPhone ? `\nPhone: ${driverPhone}` : ''}`,
            'If anything changes on your side, call the driver or reply to this email.'
        ]),
        html: layout({
            heading: 'Who is meeting you',
            paragraphs: [
                `${passengerName ? `Hello ${escapeHtml(passengerName)},` : 'Hello,'}`,
                `Here is who is meeting you for <strong>${escapeHtml(reference)}</strong>, ${escapeHtml(from)} → ${escapeHtml(to)} on ${escapeHtml(formatLocal(pickupAt, timezone))} (${escapeHtml(timezone)}).`,
                `<strong>${escapeHtml(driverName)}</strong>${vehicle ? `<br>${escapeHtml(vehicle)}` : ''}${driverPhone ? `<br>${escapeHtml(driverPhone)}` : ''}`,
                'If anything changes on your side, call the driver or reply to this email.'
            ],
            footer: 'Need to change something? Reply to this email and quote your reference.'
        })
    }),

    transferRatingInvite: ({ reference, from, to, driverName, passengerName, url }) => ({
        subject: `How was your transfer, ${from} to ${to}?`,
        text: plain([
            `${passengerName ? `Hello ${passengerName},` : 'Hello,'}`,
            `Thank you for travelling with us (${reference}). ${driverName ? `A minute to rate ${driverName} helps us keep the good drivers busy.` : 'A minute to rate your driver helps us keep the good drivers busy.'}`,
            `Rate your transfer:\n${url}`,
            'The link works once and for the next thirty days.'
        ]),
        html: layout({
            heading: 'How was your transfer?',
            paragraphs: [
                `${passengerName ? `Hello ${escapeHtml(passengerName)},` : 'Hello,'}`,
                `Thank you for travelling with us (<strong>${escapeHtml(reference)}</strong>). ${driverName ? `A minute to rate <strong>${escapeHtml(driverName)}</strong> helps us keep the good drivers busy.` : 'A minute to rate your driver helps us keep the good drivers busy.'}`,
                'The link works once and for the next thirty days.'
            ],
            cta: { label: 'Rate your transfer', url },
            footer: 'I am Georgia &middot; transfers'
        })
    }),

    transferUnassignedAlert: ({ reference, from, to, pickupAt, timezone, passengers }) => ({
        subject: `No driver yet: ${reference}, ${formatLocal(pickupAt, timezone)}`,
        text: plain([
            `The transfer ${reference} (${from} to ${to}, ${passengers} passengers) picks up at ${formatLocal(pickupAt, timezone)} (${timezone}) and still has no driver.`,
            'Assign one from the dispatch board.'
        ]),
        html: layout({
            heading: 'A transfer within a day has no driver',
            paragraphs: [
                `<strong>${escapeHtml(reference)}</strong> (${escapeHtml(from)} → ${escapeHtml(to)}, ${passengers} passenger${passengers === 1 ? '' : 's'}) picks up at ${escapeHtml(formatLocal(pickupAt, timezone))} (${escapeHtml(timezone)}) and still has no driver.`,
                'Assign one from the dispatch board.'
            ],
            footer: 'I am Georgia &middot; dispatch'
        })
    }),

    /** Password reset, which falls out of the same token machinery. */
    passwordReset: ({ url, expiresAt }) => ({
        subject: 'Reset your I am Georgia password',
        text: plain([
            'Someone asked to reset the password for this account.',
            `If it was you, choose a new one here:\n${url}`,
            `The link expires on ${formatDate(expiresAt)} UTC and can be used once.`,
            'If it was not you, no action is needed — the password has not changed.'
        ]),
        html: layout({
            heading: 'Reset your password',
            paragraphs: [
                'Someone asked to reset the password for this account.',
                `The link expires on <strong>${escapeHtml(formatDate(expiresAt))} UTC</strong> and can be used once.`
            ],
            cta: { label: 'Choose a new password', url },
            footer: 'If it was not you, no action is needed - the password has not changed.'
        })
    }),

    /**
     * The transfer voucher.
     *
     * The pick-up time is formatted in the pick-up point's own timezone, not in
     * UTC like every other message here. A driver and a traveller agree to meet
     * at nine in the morning in Tbilisi; telling either of them "05:00 UTC" is
     * technically correct and practically useless.
     */
    transferConfirmed: ({
        reference,
        leadPassengerName,
        fromName,
        toName,
        pickupAt,
        returnPickupAt,
        timezone,
        vehicleName,
        passengers,
        pickupAddress,
        flightNumber,
        pickupProcedure,
        currency,
        totalCents
    }) => {
        const journey = `${fromName} to ${toName}`;
        const outbound = formatLocal(pickupAt, timezone);
        const back = returnPickupAt ? formatLocal(returnPickupAt, timezone) : null;
        const total = formatMoney(totalCents, currency);

        return {
            subject: `Your transfer is confirmed - ${reference}`,
            text: plain([
                `${leadPassengerName ? `Hello ${leadPassengerName},` : 'Hello,'}`,
                `Your transfer is booked. Quote ${reference} to your driver.`,
                `${journey}\nPick-up: ${outbound}${back ? `\nReturn pick-up: ${back}` : ''}`,
                `Vehicle: ${vehicleName}, for ${passengers} ${passengers === 1 ? 'passenger' : 'passengers'}`,
                pickupAddress ? `Pick-up address: ${pickupAddress}` : null,
                flightNumber ? `Flight: ${flightNumber}. We track it, so a delay moves your car rather than losing it.` : null,
                pickupProcedure,
                `Total paid: ${total}`
            ]),
            html: layout({
                heading: 'Your transfer is confirmed',
                paragraphs: [
                    `${leadPassengerName ? `Hello ${escapeHtml(leadPassengerName)},` : 'Hello,'}`,
                    `Reference <strong>${escapeHtml(reference)}</strong> - quote it to your driver.`,
                    `<strong>${escapeHtml(journey)}</strong><br>Pick-up: ${escapeHtml(outbound)}${back ? `<br>Return pick-up: ${escapeHtml(back)}` : ''}`,
                    `${escapeHtml(vehicleName)}, for ${passengers} ${passengers === 1 ? 'passenger' : 'passengers'}`,
                    pickupAddress ? `Pick-up address: ${escapeHtml(pickupAddress)}` : null,
                    flightNumber
                        ? `Flight <strong>${escapeHtml(flightNumber)}</strong>. We track it, so a delay moves your car rather than losing it.`
                        : null,
                    escapeHtml(pickupProcedure),
                    `Total paid: <strong>${escapeHtml(total)}</strong>`
                ].filter(Boolean),
                footer: 'Need to change something? Reply to this email and quote your reference.'
            })
        };
    }
};
