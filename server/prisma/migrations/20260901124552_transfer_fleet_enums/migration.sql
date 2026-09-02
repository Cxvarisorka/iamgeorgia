-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_FLEET_VEHICLE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_FLEET_VEHICLE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_FLEET_VEHICLE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_VERIFIED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_DEACTIVATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_REACTIVATED';
ALTER TYPE "audit_action" ADD VALUE 'DRIVER_ACCOUNT_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ASSIGNMENT_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ASSIGNMENT_ACCEPTED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ASSIGNMENT_DECLINED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ASSIGNMENT_REVOKED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_LEG_STATUS_CHANGED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_LEG_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BOOKING_COMPLETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BOOKING_NO_SHOW';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BLOCK_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BLOCK_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_RATING_SUBMITTED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_RATING_MODERATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_DOCUMENT_UPLOADED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_DOCUMENT_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_VEHICLE_DOCUMENT_UPLOADED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_VEHICLE_DOCUMENT_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_PICKUP_REMINDER_SENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "file_category" ADD VALUE 'FLEET_IMAGE';
ALTER TYPE "file_category" ADD VALUE 'DRIVER_PHOTO';
ALTER TYPE "file_category" ADD VALUE 'DRIVER_DOCUMENT';
ALTER TYPE "file_category" ADD VALUE 'VEHICLE_DOCUMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "role" ADD VALUE 'DISPATCHER';
ALTER TYPE "role" ADD VALUE 'DRIVER';
