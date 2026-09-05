-- Enum values for the services, packages and orders module.
--
-- In their own migration, before the tables that use them: Postgres refuses
-- to use a value added to an enum inside the transaction that added it, so a
-- migration that both extends audit_action and inserts rows would fail.
-- Same discipline as 20260903111400_tours_enum_values.

ALTER TYPE "audit_action" ADD VALUE 'SERVICE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_PUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_UNPUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_BOOKING_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_BOOKING_CONFIRMED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_BOOKING_DECLINED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_BOOKING_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'SERVICE_BOOKING_COMPLETED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_PUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_UNPUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'PACKAGE_KOSHER_OVERRIDDEN';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_CONFIRMED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_ITEM_CONFIRMED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_ITEM_DECLINED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_ITEM_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_COMPLETED';
ALTER TYPE "audit_action" ADD VALUE 'ORDER_AMENDED';
ALTER TYPE "file_category" ADD VALUE 'PACKAGE_IMAGE';
ALTER TYPE "notification_kind" ADD VALUE 'ORDER_REQUEST_OVERDUE';
ALTER TYPE "notification_kind" ADD VALUE 'PACKAGE_KOSHER_ELIGIBILITY_CHANGED';
