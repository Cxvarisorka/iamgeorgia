-- The operations alert for an on-request tour booking nobody has answered.
-- The stamp is set in the same statement that enqueues the event, so a crash
-- between the two cannot double-send — the discipline the transfer reminder
-- columns already follow.

-- AlterEnum
ALTER TYPE "notification_kind" ADD VALUE 'TOUR_REQUEST_OVERDUE';

-- AlterTable
ALTER TABLE "tour_bookings" ADD COLUMN "overdue_alert_at" TIMESTAMP(3);
