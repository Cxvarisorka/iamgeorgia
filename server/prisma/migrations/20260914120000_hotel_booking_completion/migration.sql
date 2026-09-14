-- Hotel bookings learn to complete.
--
-- Tours, services, transfers and orders already roll to COMPLETED once their
-- last day has passed; hotel bookings did not, which left any order with a
-- hotel in it CONFIRMED for ever. The column matches the one on the other
-- booking tables, and the audit value is what the sweep writes.
--
-- Hand-written, so the `DROP INDEX "transfer_points_geo_idx"` line Prisma
-- proposes for every migration is not here — see 20260906100000_restore_geo_indexes.

ALTER TABLE "hotel_bookings" ADD COLUMN "completed_at" TIMESTAMP(3);

ALTER TYPE "audit_action" ADD VALUE 'BOOKING_COMPLETED';
