-- AlterEnum
-- Two audit actions for the hard deletes an admin may perform on a car or a
-- driver that has never been on a job. One value per statement, as the
-- earlier fleet migration does.
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_FLEET_VEHICLE_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_DRIVER_DELETED';
