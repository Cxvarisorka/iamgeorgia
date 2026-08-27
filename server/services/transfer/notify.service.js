import { sendMailQuietly } from '../../lib/mailer/index.js';

/**
 * The voucher email.
 *
 * Sent with `sendMailQuietly`, which is the difference between an inconvenience
 * and a lost booking: the transfer is already confirmed and paid for by the
 * time this runs, and a mail server having a bad afternoon must not turn a
 * successful confirmation into a 500 the traveller reads as a failure. The
 * failure is logged there and the booking stands; nothing here needs to catch.
 */
export const sendTransferVoucher = (booking) =>
    sendMailQuietly({
        to: booking.leadPassengerEmail,
        template: 'transferConfirmed',
        data: {
            reference: booking.reference,
            leadPassengerName: booking.leadPassengerName,
            fromName: booking.routeSnapshot?.fromName ?? '',
            toName: booking.routeSnapshot?.toName ?? '',
            pickupAt: booking.pickupAt,
            returnPickupAt: booking.returnPickupAt,
            timezone: booking.routeSnapshot?.fromTimezone ?? 'Asia/Tbilisi',
            vehicleName: booking.vehicleSnapshot?.name ?? '',
            passengers: booking.adults + booking.children,
            pickupAddress: booking.pickupAddress,
            flightNumber: booking.flightNumber,
            pickupProcedure: booking.vehicleSnapshot?.pickupProcedure ?? '',
            currency: booking.currency,
            totalCents: booking.sellTotalCents
        }
    });
