-- New values on existing enums, in their own migration ahead of the tables
-- that need them. Postgres refuses to *use* a value added to an enum inside
-- the same transaction that added it, and Prisma runs each migration as one
-- transaction — the same split `transfer_fleet_enums` made for the same reason.

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'TOUR_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_PUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_UNPUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_OPTION_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_OPTION_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_OPTION_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_SEASON_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_SEASON_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_INVENTORY_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_CONFIRMED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_DECLINED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_AMENDED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_BOOKING_COMPLETED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_HOLD_EXPIRED';
ALTER TYPE "audit_action" ADD VALUE 'TOUR_INVENTORY_RECONCILED';

-- AlterEnum
ALTER TYPE "file_category" ADD VALUE 'TOUR_IMAGE';
