-- CreateEnum
CREATE TYPE "transfer_driver_verification" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "transfer_leg_status" AS ENUM ('UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'ON_BOARD', 'COMPLETED', 'NO_SHOW_REPORTED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "transfer_assignment_status" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'REVOKED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "transfer_rating_status" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "transfer_rating_source" AS ENUM ('GUEST', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('TRANSFER_ASSIGNMENT_OFFERED', 'TRANSFER_ASSIGNMENT_ACCEPTED', 'TRANSFER_ASSIGNMENT_DECLINED', 'TRANSFER_ASSIGNMENT_REVOKED', 'TRANSFER_LEG_UNASSIGNED_ALERT', 'TRANSFER_LEG_STATUS_CHANGED', 'TRANSFER_LEG_NO_SHOW_REPORTED', 'TRANSFER_BOOKING_CANCELLED', 'TRANSFER_PICKUP_REMINDER', 'TRANSFER_DRIVER_DETAILS', 'TRANSFER_RATING_RECEIVED');

-- AlterTable
ALTER TABLE "transfer_booking_legs" ADD COLUMN     "driver_details_sent_at" TIMESTAMP(3),
ADD COLUMN     "reminder_sent_at" TIMESTAMP(3),
ADD COLUMN     "status" "transfer_leg_status" NOT NULL DEFAULT 'UNASSIGNED',
ADD COLUMN     "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "unassigned_alert_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "transfer_bookings" ADD COLUMN     "completed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "transfer_fleet_vehicles" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "vehicle_class_id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "colour" TEXT,
    "body" "transfer_vehicle_body" NOT NULL,
    "plate_number" TEXT NOT NULL,
    "plate_normalized" TEXT NOT NULL,
    "vin" TEXT,
    "passenger_capacity" INTEGER NOT NULL,
    "luggage_capacity" INTEGER NOT NULL,
    "cabin_bag_capacity" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "description" TEXT,
    "internal_notes" TEXT,
    "main_image_id" TEXT,
    "status" "transfer_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_fleet_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_fleet_vehicle_images" (
    "id" TEXT NOT NULL,
    "fleet_vehicle_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_fleet_vehicle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_fleet_vehicle_documents" (
    "id" TEXT NOT NULL,
    "fleet_vehicle_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "label" TEXT,
    "valid_until" DATE,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_fleet_vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_drivers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "provider_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "languages" TEXT[],
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "photo_file_asset_id" TEXT,
    "licence_number" TEXT,
    "licence_expires_on" DATE,
    "date_of_birth" DATE,
    "internal_notes" TEXT,
    "verification_status" "transfer_driver_verification" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMP(3),
    "verified_by_user_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "deactivation_reason" TEXT,
    "home_base_point_id" TEXT,
    "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "completed_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_driver_documents" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "label" TEXT,
    "valid_until" DATE,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_driver_vehicles" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_vehicle_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_driver_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_assignments" (
    "id" TEXT NOT NULL,
    "leg_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "fleet_vehicle_id" TEXT,
    "status" "transfer_assignment_status" NOT NULL DEFAULT 'OFFERED',
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "pre_buffer_minutes" INTEGER NOT NULL,
    "post_buffer_minutes" INTEGER NOT NULL,
    "assigned_by_user_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overrides" TEXT[],
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "superseded_by_assignment_id" TEXT,
    "en_route_at" TIMESTAMP(3),
    "arrived_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "no_show_reported_at" TIMESTAMP(3),
    "driver_notes" TEXT,
    "dispatcher_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_resource_blocks" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT,
    "fleet_vehicle_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "created_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_resource_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_driver_ratings" (
    "id" TEXT NOT NULL,
    "leg_id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "fleet_vehicle_id" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "source" "transfer_rating_source" NOT NULL,
    "submitted_by_user_id" TEXT,
    "submitted_by_email" TEXT,
    "status" "transfer_rating_status" NOT NULL DEFAULT 'PENDING',
    "moderated_at" TIMESTAMP(3),
    "moderated_by_user_id" TEXT,
    "moderation_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_driver_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transfer_fleet_vehicles_provider_id_status_idx" ON "transfer_fleet_vehicles"("provider_id", "status");

-- CreateIndex
CREATE INDEX "transfer_fleet_vehicles_vehicle_class_id_idx" ON "transfer_fleet_vehicles"("vehicle_class_id");

-- CreateIndex
CREATE INDEX "transfer_fleet_vehicle_images_fleet_vehicle_id_sort_order_idx" ON "transfer_fleet_vehicle_images"("fleet_vehicle_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_fleet_vehicle_images_fleet_vehicle_id_file_asset_i_key" ON "transfer_fleet_vehicle_images"("fleet_vehicle_id", "file_asset_id");

-- CreateIndex
CREATE INDEX "transfer_fleet_vehicle_documents_fleet_vehicle_id_doc_type_idx" ON "transfer_fleet_vehicle_documents"("fleet_vehicle_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_fleet_vehicle_documents_fleet_vehicle_id_file_asse_key" ON "transfer_fleet_vehicle_documents"("fleet_vehicle_id", "file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_drivers_user_id_key" ON "transfer_drivers"("user_id");

-- CreateIndex
CREATE INDEX "transfer_drivers_provider_id_is_active_idx" ON "transfer_drivers"("provider_id", "is_active");

-- CreateIndex
CREATE INDEX "transfer_drivers_verification_status_idx" ON "transfer_drivers"("verification_status");

-- CreateIndex
CREATE INDEX "transfer_driver_documents_driver_id_doc_type_idx" ON "transfer_driver_documents"("driver_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_driver_documents_driver_id_file_asset_id_key" ON "transfer_driver_documents"("driver_id", "file_asset_id");

-- CreateIndex
CREATE INDEX "transfer_driver_vehicles_fleet_vehicle_id_idx" ON "transfer_driver_vehicles"("fleet_vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_driver_vehicles_driver_id_fleet_vehicle_id_key" ON "transfer_driver_vehicles"("driver_id", "fleet_vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_assignments_superseded_by_assignment_id_key" ON "transfer_assignments"("superseded_by_assignment_id");

-- CreateIndex
CREATE INDEX "transfer_assignments_driver_id_window_start_idx" ON "transfer_assignments"("driver_id", "window_start");

-- CreateIndex
CREATE INDEX "transfer_assignments_fleet_vehicle_id_window_start_idx" ON "transfer_assignments"("fleet_vehicle_id", "window_start");

-- CreateIndex
CREATE INDEX "transfer_assignments_leg_id_status_idx" ON "transfer_assignments"("leg_id", "status");

-- CreateIndex
CREATE INDEX "transfer_assignments_booking_id_idx" ON "transfer_assignments"("booking_id");

-- CreateIndex
CREATE INDEX "transfer_assignments_status_window_start_idx" ON "transfer_assignments"("status", "window_start");

-- CreateIndex
CREATE INDEX "transfer_resource_blocks_driver_id_starts_at_idx" ON "transfer_resource_blocks"("driver_id", "starts_at");

-- CreateIndex
CREATE INDEX "transfer_resource_blocks_fleet_vehicle_id_starts_at_idx" ON "transfer_resource_blocks"("fleet_vehicle_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_driver_ratings_leg_id_key" ON "transfer_driver_ratings"("leg_id");

-- CreateIndex
CREATE INDEX "transfer_driver_ratings_driver_id_status_idx" ON "transfer_driver_ratings"("driver_id", "status");

-- CreateIndex
CREATE INDEX "transfer_driver_ratings_status_created_at_idx" ON "transfer_driver_ratings"("status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_read_at_created_at_idx" ON "notifications"("recipient_user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_processed_at_next_attempt_at_idx" ON "outbox_events"("processed_at", "next_attempt_at");

-- CreateIndex
CREATE INDEX "transfer_booking_legs_status_pickup_at_idx" ON "transfer_booking_legs"("status", "pickup_at");

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicles" ADD CONSTRAINT "transfer_fleet_vehicles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "transfer_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicles" ADD CONSTRAINT "transfer_fleet_vehicles_vehicle_class_id_fkey" FOREIGN KEY ("vehicle_class_id") REFERENCES "transfer_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicles" ADD CONSTRAINT "transfer_fleet_vehicles_main_image_id_fkey" FOREIGN KEY ("main_image_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicle_images" ADD CONSTRAINT "transfer_fleet_vehicle_images_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicle_images" ADD CONSTRAINT "transfer_fleet_vehicle_images_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicle_documents" ADD CONSTRAINT "transfer_fleet_vehicle_documents_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicle_documents" ADD CONSTRAINT "transfer_fleet_vehicle_documents_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_fleet_vehicle_documents" ADD CONSTRAINT "transfer_fleet_vehicle_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_drivers" ADD CONSTRAINT "transfer_drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_drivers" ADD CONSTRAINT "transfer_drivers_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "transfer_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_drivers" ADD CONSTRAINT "transfer_drivers_photo_file_asset_id_fkey" FOREIGN KEY ("photo_file_asset_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_drivers" ADD CONSTRAINT "transfer_drivers_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_drivers" ADD CONSTRAINT "transfer_drivers_home_base_point_id_fkey" FOREIGN KEY ("home_base_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_documents" ADD CONSTRAINT "transfer_driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transfer_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_documents" ADD CONSTRAINT "transfer_driver_documents_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_documents" ADD CONSTRAINT "transfer_driver_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_vehicles" ADD CONSTRAINT "transfer_driver_vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transfer_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_vehicles" ADD CONSTRAINT "transfer_driver_vehicles_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_leg_id_fkey" FOREIGN KEY ("leg_id") REFERENCES "transfer_booking_legs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transfer_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transfer_drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_assignments" ADD CONSTRAINT "transfer_assignments_superseded_by_assignment_id_fkey" FOREIGN KEY ("superseded_by_assignment_id") REFERENCES "transfer_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_resource_blocks" ADD CONSTRAINT "transfer_resource_blocks_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transfer_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_resource_blocks" ADD CONSTRAINT "transfer_resource_blocks_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_resource_blocks" ADD CONSTRAINT "transfer_resource_blocks_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_leg_id_fkey" FOREIGN KEY ("leg_id") REFERENCES "transfer_booking_legs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transfer_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "transfer_drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "transfer_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_fleet_vehicle_id_fkey" FOREIGN KEY ("fleet_vehicle_id") REFERENCES "transfer_fleet_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_driver_ratings" ADD CONSTRAINT "transfer_driver_ratings_moderated_by_user_id_fkey" FOREIGN KEY ("moderated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written, beyond what Prisma generates.
-- ---------------------------------------------------------------------------

-- btree_gist is what lets one exclusion constraint combine "same driver" (an
-- equality on an id) with "overlapping time" (an overlap on a range). Trusted
-- on Postgres 13+, the same privilege path PostGIS already needed.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Two more platform-side roles. Both are listed explicitly on both sides of
-- the rule so that a role added later without a decision here fails on its
-- first write rather than quietly landing on whichever side the old shape
-- put it. A DRIVER carries no partner_id on purpose: affiliation lives on
-- the driver profile, so every partner-scoped query on the platform is closed
-- to drivers by construction.
ALTER TABLE "users" DROP CONSTRAINT "users_partner_role_requires_partner";
ALTER TABLE "users" ADD CONSTRAINT "users_partner_role_requires_partner" CHECK (
    ("role" IN ('SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'DRIVER') AND "partner_id" IS NULL)
    OR ("role" IN ('PARTNER_OWNER', 'PARTNER_ADMIN', 'PARTNER_AGENT', 'PARTNER_FINANCE') AND "partner_id" IS NOT NULL)
);

-- Fleet -----------------------------------------------------------------------

ALTER TABLE "transfer_fleet_vehicles"
    ADD CONSTRAINT "transfer_fleet_vehicles_capacity_sane" CHECK (
        "passenger_capacity" > 0 AND "luggage_capacity" >= 0 AND "cabin_bag_capacity" >= 0
    );

ALTER TABLE "transfer_fleet_vehicles"
    ADD CONSTRAINT "transfer_fleet_vehicles_year_sane" CHECK (
        "year" IS NULL OR ("year" BETWEEN 1980 AND 2100)
    );

-- A registration is unique among the cars still on the road. An archived car
-- keeps its plate for the record, and the plate may be reissued to its
-- replacement.
CREATE UNIQUE INDEX "transfer_fleet_vehicles_plate_active"
    ON "transfer_fleet_vehicles" ("plate_normalized")
    WHERE "status" <> 'ARCHIVED';

-- At most one cover image per car, exactly as hotel_images does it.
CREATE UNIQUE INDEX "transfer_fleet_vehicle_images_one_cover"
    ON "transfer_fleet_vehicle_images" ("fleet_vehicle_id")
    WHERE "is_cover";

-- At most one primary car per driver.
CREATE UNIQUE INDEX "transfer_driver_vehicles_one_primary"
    ON "transfer_driver_vehicles" ("driver_id")
    WHERE "is_primary";

-- Drivers ---------------------------------------------------------------------

-- Verification metadata travels together or not at all.
ALTER TABLE "transfer_drivers"
    ADD CONSTRAINT "transfer_drivers_verified_coherent" CHECK (
        ("verification_status" <> 'VERIFIED') OR ("verified_at" IS NOT NULL)
    );

ALTER TABLE "transfer_drivers"
    ADD CONSTRAINT "transfer_drivers_counters_sane" CHECK (
        "rating_avg" >= 0 AND "rating_avg" <= 5 AND "rating_count" >= 0 AND "completed_count" >= 0
    );

-- Assignments -----------------------------------------------------------------

ALTER TABLE "transfer_assignments"
    ADD CONSTRAINT "transfer_assignments_window_ordered" CHECK ("window_end" > "window_start");

ALTER TABLE "transfer_assignments"
    ADD CONSTRAINT "transfer_assignments_buffers_sane" CHECK (
        "pre_buffer_minutes" >= 0 AND "post_buffer_minutes" >= 0
    );

-- One live offer per leg. Two dispatchers assigning the same leg at once is a
-- unique violation for the second, not a second driver at the kerb.
CREATE UNIQUE INDEX "transfer_assignments_one_active_per_leg"
    ON "transfer_assignments" ("leg_id")
    WHERE "status" IN ('OFFERED', 'ACCEPTED');

-- The no-double-booking rule, stated where it cannot be forgotten. A driver
-- may hold at most one live assignment for any instant; so may a car. Rows
-- that have been declined, revoked or finished drop out of the predicate and
-- stop occupying time. The service pre-checks under a row lock and reports a
-- friendly list of conflicts; this is the backstop for a writer that did not.
--
-- tsrange rather than tstzrange because Prisma stores instants as
-- timestamp(3) in UTC, and casting to timestamptz inside an index expression
-- is not immutable.
ALTER TABLE "transfer_assignments"
    ADD CONSTRAINT "transfer_assignments_driver_no_overlap"
    EXCLUDE USING gist (
        "driver_id" WITH =,
        (tsrange("window_start", "window_end", '[)')) WITH &&
    )
    WHERE ("status" IN ('OFFERED', 'ACCEPTED'));

-- A null vehicle never conflicts: `NULL = NULL` is not true, so a driver-only
-- assignment needs no extra predicate.
ALTER TABLE "transfer_assignments"
    ADD CONSTRAINT "transfer_assignments_vehicle_no_overlap"
    EXCLUDE USING gist (
        "fleet_vehicle_id" WITH =,
        (tsrange("window_start", "window_end", '[)')) WITH &&
    )
    WHERE ("status" IN ('OFFERED', 'ACCEPTED'));

-- Blocks ----------------------------------------------------------------------

ALTER TABLE "transfer_resource_blocks"
    ADD CONSTRAINT "transfer_resource_blocks_one_target" CHECK (
        ("driver_id" IS NOT NULL) <> ("fleet_vehicle_id" IS NOT NULL)
    );

ALTER TABLE "transfer_resource_blocks"
    ADD CONSTRAINT "transfer_resource_blocks_window_ordered" CHECK ("ends_at" > "starts_at");

-- Ratings ---------------------------------------------------------------------

ALTER TABLE "transfer_driver_ratings"
    ADD CONSTRAINT "transfer_driver_ratings_score_range" CHECK ("score" BETWEEN 1 AND 5);

-- A published or rejected rating names when that happened.
ALTER TABLE "transfer_driver_ratings"
    ADD CONSTRAINT "transfer_driver_ratings_moderated_coherent" CHECK (
        ("status" = 'PENDING') OR ("moderated_at" IS NOT NULL)
    );

-- Occupancy, both sources in one place ----------------------------------------

-- What the schedule screen and the dispatcher's pre-check read: every live
-- claim on a driver's or a car's time, whether it is a job or a day off.
-- A view rather than a table so it can never drift from the rows it shows.
CREATE VIEW "transfer_occupancy" AS
    SELECT 'DRIVER'::text                                   AS "resource_type",
           a."driver_id"                                    AS "resource_id",
           tsrange(a."window_start", a."window_end", '[)')  AS "window",
           'ASSIGNMENT'::text                               AS "source_kind",
           a."id"                                           AS "source_id",
           a."status"::text                                 AS "status",
           a."booking_id"                                   AS "booking_id"
      FROM "transfer_assignments" a
     WHERE a."status" IN ('OFFERED', 'ACCEPTED')
    UNION ALL
    SELECT 'VEHICLE', a."fleet_vehicle_id",
           tsrange(a."window_start", a."window_end", '[)'),
           'ASSIGNMENT', a."id", a."status"::text, a."booking_id"
      FROM "transfer_assignments" a
     WHERE a."fleet_vehicle_id" IS NOT NULL AND a."status" IN ('OFFERED', 'ACCEPTED')
    UNION ALL
    SELECT 'DRIVER', b."driver_id",
           tsrange(b."starts_at", b."ends_at", '[)'),
           'BLOCK', b."id", b."reason", NULL
      FROM "transfer_resource_blocks" b
     WHERE b."driver_id" IS NOT NULL
    UNION ALL
    SELECT 'VEHICLE', b."fleet_vehicle_id",
           tsrange(b."starts_at", b."ends_at", '[)'),
           'BLOCK', b."id", b."reason", NULL
      FROM "transfer_resource_blocks" b
     WHERE b."fleet_vehicle_id" IS NOT NULL;

-- Backfill --------------------------------------------------------------------

-- Every existing leg was created before legs had an operational state. The
-- commercial state of its booking is the best evidence of what happened to it.

-- A cancelled booking's legs were cancelled with it.
UPDATE "transfer_booking_legs" l
   SET "status" = 'CANCELLED',
       "status_changed_at" = COALESCE(b."cancelled_at", b."updated_at")
  FROM "transfer_bookings" b
 WHERE l."booking_id" = b."id"
   AND b."status" = 'CANCELLED';

-- A booking already closed as a no-show (only the demo seeder ever wrote
-- one) had legs nobody boarded.
UPDATE "transfer_booking_legs" l
   SET "status" = 'NO_SHOW',
       "status_changed_at" = l."pickup_at"
  FROM "transfer_bookings" b
 WHERE l."booking_id" = b."id"
   AND b."status" = 'NO_SHOW';

-- A confirmed booking whose pick-up has passed is taken to have been driven:
-- nothing in the system before this migration could have recorded otherwise.
-- Legs still ahead stay UNASSIGNED and appear on the dispatch board.
UPDATE "transfer_booking_legs" l
   SET "status" = 'COMPLETED',
       "status_changed_at" = l."pickup_at" + (l."duration_minutes" * INTERVAL '1 minute')
  FROM "transfer_bookings" b
 WHERE l."booking_id" = b."id"
   AND b."status" IN ('CONFIRMED', 'COMPLETED')
   AND l."pickup_at" < (now() AT TIME ZONE 'UTC');

-- Bookings the seeder had already marked COMPLETED gain the timestamp the
-- roll-up would have written.
UPDATE "transfer_bookings" b
   SET "completed_at" = COALESCE(
           (SELECT max(l."status_changed_at") FROM "transfer_booking_legs" l WHERE l."booking_id" = b."id"),
           b."updated_at")
 WHERE b."status" = 'COMPLETED'
   AND b."completed_at" IS NULL;

-- Roll up: a confirmed booking with every leg now COMPLETED is a completed
-- booking, and each one gets an audit row saying the migration decided so.
WITH closed AS (
    UPDATE "transfer_bookings" b
       SET "status" = 'COMPLETED',
           "completed_at" = (SELECT max(l."status_changed_at")
                               FROM "transfer_booking_legs" l
                              WHERE l."booking_id" = b."id")
     WHERE b."status" = 'CONFIRMED'
       AND EXISTS (SELECT 1 FROM "transfer_booking_legs" l WHERE l."booking_id" = b."id")
       AND NOT EXISTS (SELECT 1 FROM "transfer_booking_legs" l
                        WHERE l."booking_id" = b."id" AND l."status" <> 'COMPLETED')
    RETURNING b."id", b."reference", b."completed_at"
)
INSERT INTO "audit_logs" ("id", "action", "actor_email", "entity_type", "entity_id", "summary", "metadata", "created_at", "updated_at")
SELECT replace(gen_random_uuid()::text, '-', ''),
       'TRANSFER_BOOKING_COMPLETED',
       'system',
       'TransferBooking',
       c."id",
       'Closed as completed by the fleet migration: pick-up had passed while CONFIRMED',
       jsonb_build_object('reference', c."reference", 'completedAt', c."completed_at", 'source', 'migration'),
       now(), now()
  FROM closed c;
