import { Router } from 'express';

import { authenticate, optionalAuthenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
    amendTransferSchema,
    cancelTransferSchema,
    confirmTransferSchema,
    guestLookupSchema,
    referenceParamSchema,
    transferBookingQuerySchema
} from '../validation/transfer.js';
import {
    amendTransferBooking,
    cancelTransferBooking,
    confirmTransferBooking,
    findTransferBookingOr404,
    listTransferBookings,
    quoteTransferCancellation
} from '../services/transfer/booking.service.js';
import {
    toCancellationQuote,
    toTransferBooking,
    toTransferBookingSummary
} from '../serializers/transfer.js';
import { sendTransferVoucher } from '../services/transfer/notify.service.js';

/**
 * Transfer bookings.
 *
 * Nothing here accepts an amount. The request carries a signed quote token,
 * the people travelling and the paperwork a driver needs; every figure is
 * recomputed from the catalogue before anything is written.
 */
export const transferBookingRoutes = Router();

transferBookingRoutes.use(optionalAuthenticate);

/**
 * Confirms a transfer.
 *
 * Idempotent: an `Idempotency-Key` header, or a key derived from the request,
 * means a retry returns the original booking with 200 rather than dispatching a
 * second car with 201.
 */
transferBookingRoutes.post('/', validate({ body: confirmTransferSchema }), async (req, res) => {
    const { booking, replayed } = await confirmTransferBooking(
        {
            ...req.valid.body,
            idempotencyKey: req.get('idempotency-key') ?? req.valid.body.idempotencyKey
        },
        req.user,
        req
    );

    // After the commit, never inside it: the transaction should not be held
    // open for the length of an SMTP conversation, and a mail server that is
    // down must not roll back a confirmed booking.
    if (!replayed) {
        await sendTransferVoucher(booking);
    }

    res.status(replayed ? 200 : 201).json(toTransferBooking(booking, req.user));
});

transferBookingRoutes.get(
    '/:reference',
    validate({ params: referenceParamSchema, query: guestLookupSchema }),
    async (req, res) => {
        const booking = await findTransferBookingOr404(
            req.valid.params.reference,
            req.user,
            req.valid.query
        );

        res.json(toTransferBooking(booking, req.user));
    }
);

/** What cancelling would cost, read off the frozen schedule. */
transferBookingRoutes.get(
    '/:reference/cancellation-quote',
    validate({ params: referenceParamSchema, query: guestLookupSchema }),
    async (req, res) => {
        const booking = await findTransferBookingOr404(
            req.valid.params.reference,
            req.user,
            req.valid.query
        );

        res.json(toCancellationQuote(quoteTransferCancellation(booking)));
    }
);

/**
 * Amends the paperwork.
 *
 * The lead passenger, how to reach them, the flight and the two addresses.
 * Nothing that was priced is reachable, so this endpoint cannot change what a
 * transfer costs.
 */
transferBookingRoutes.patch(
    '/:reference',
    validate({ params: referenceParamSchema, body: amendTransferSchema }),
    async (req, res) => {
        const booking = await amendTransferBooking(
            req.valid.params.reference,
            req.valid.body,
            req.user,
            req
        );

        res.json(toTransferBooking(booking, req.user));
    }
);

transferBookingRoutes.post(
    '/:reference/cancel',
    validate({ params: referenceParamSchema, body: cancelTransferSchema }),
    async (req, res) => {
        const { booking, quote } = await cancelTransferBooking(
            req.valid.params.reference,
            req.valid.body,
            req.user,
            req
        );

        res.json({
            ...toTransferBookingSummary(booking, req.user),
            cancellation: toCancellationQuote(quote)
        });
    }
);

/** A partner's own transfer bookings, scoped in the query rather than after. */
export const partnerTransferBookingRoutes = Router();

partnerTransferBookingRoutes.use(authenticate);

partnerTransferBookingRoutes.get(
    '/',
    validate({ query: transferBookingQuerySchema }),
    async (req, res) => {
        const { bookings, ...page } = await listTransferBookings(req.valid.query, req.user);

        res.json({
            data: bookings.map((booking) => toTransferBookingSummary(booking, req.user)),
            ...page
        });
    }
);

/** Every transfer booking on the platform. */
export const adminTransferBookingRoutes = Router();

adminTransferBookingRoutes.use(authenticate, requireAdmin);

adminTransferBookingRoutes.get(
    '/',
    validate({ query: transferBookingQuerySchema }),
    async (req, res) => {
        const { bookings, ...page } = await listTransferBookings(req.valid.query, req.user);

        res.json({
            data: bookings.map((booking) => toTransferBookingSummary(booking, req.user)),
            ...page
        });
    }
);

adminTransferBookingRoutes.get(
    '/:reference',
    validate({ params: referenceParamSchema }),
    async (req, res) => {
        const booking = await findTransferBookingOr404(req.valid.params.reference, req.user);

        res.json(toTransferBooking(booking, req.user));
    }
);

adminTransferBookingRoutes.post(
    '/:reference/cancel',
    validate({ params: referenceParamSchema, body: cancelTransferSchema }),
    async (req, res) => {
        const { booking, quote } = await cancelTransferBooking(
            req.valid.params.reference,
            req.valid.body,
            req.user,
            req
        );

        res.json({
            ...toTransferBookingSummary(booking, req.user),
            cancellation: toCancellationQuote(quote)
        });
    }
);
