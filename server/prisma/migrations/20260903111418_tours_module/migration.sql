-- CreateEnum
CREATE TYPE "tour_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "tour_option_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "tour_option_kind" AS ENUM ('SHARED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "tour_pricing_basis" AS ENUM ('PER_PERSON', 'PER_GROUP');

-- CreateEnum
CREATE TYPE "tour_unit_kind" AS ENUM ('SEAT', 'GROUP');

-- CreateEnum
CREATE TYPE "tour_schedule_kind" AS ENUM ('SCHEDULED', 'ON_DEMAND');

-- CreateEnum
CREATE TYPE "confirmation_mode" AS ENUM ('INSTANT', 'ON_REQUEST');

-- CreateEnum
CREATE TYPE "tour_booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- DropForeignKey
ALTER TABLE "tours" DROP CONSTRAINT "tours_destination_id_fkey";

-- DropIndex
DROP INDEX "tours_destination_id_idx";

-- DropIndex
DROP INDEX "tours_featured_idx";

-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "b2c_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "child_max_age" INTEGER NOT NULL DEFAULT 11,
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
ADD COLUMN     "infant_max_age" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "meeting_point_id" TEXT,
ADD COLUMN     "meeting_time" TEXT,
ADD COLUMN     "min_age" INTEGER,
ADD COLUMN     "status" "tour_status" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
ALTER COLUMN "price_from_cents" SET DEFAULT 0,
ALTER COLUMN "rating" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "tour_options" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "tour_option_status" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "kind" "tour_option_kind" NOT NULL,
    "pricing_basis" "tour_pricing_basis" NOT NULL,
    "unit_kind" "tour_unit_kind" NOT NULL,
    "schedule_kind" "tour_schedule_kind" NOT NULL DEFAULT 'ON_DEMAND',
    "confirmation_mode" "confirmation_mode" NOT NULL DEFAULT 'INSTANT',
    "visibility" "rate_plan_visibility" NOT NULL DEFAULT 'PUBLIC',
    "min_pax" INTEGER NOT NULL DEFAULT 1,
    "max_pax" INTEGER NOT NULL,
    "start_time" TEXT,
    "duration_minutes" INTEGER,
    "languages" TEXT[],
    "operates_on_weekdays" INTEGER[],
    "notice_hours" INTEGER NOT NULL DEFAULT 24,
    "horizon_days" INTEGER NOT NULL DEFAULT 365,
    "cancellation_policy_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_seasons" (
    "id" TEXT NOT NULL,
    "tour_option_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_until" DATE NOT NULL,
    "weekdays" INTEGER[],
    "priority" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_season_tiers" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "min_pax" INTEGER NOT NULL,
    "max_pax" INTEGER,
    "adult_net_cents" INTEGER,
    "child_net_cents" INTEGER,
    "infant_net_cents" INTEGER NOT NULL DEFAULT 0,
    "group_net_cents" INTEGER,
    "adult_sell_cents" INTEGER,
    "child_sell_cents" INTEGER,
    "group_sell_cents" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_season_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_inventory" (
    "tour_option_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_units" INTEGER NOT NULL,
    "blocked_units" INTEGER NOT NULL DEFAULT 0,
    "booked_units" INTEGER NOT NULL DEFAULT 0,
    "held_units" INTEGER NOT NULL DEFAULT 0,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "departure_time" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_inventory_pkey" PRIMARY KEY ("tour_option_id","date")
);

-- CreateTable
CREATE TABLE "tour_holds" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tour_option_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL,
    "child_ages" INTEGER[],
    "quoted_net_cents" INTEGER NOT NULL,
    "quoted_sell_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "hold_status" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "booking_id" TEXT,
    "created_by_user_id" TEXT,
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "tour_booking_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "partner_id" TEXT,
    "booked_by_user_id" TEXT,
    "tour_id" TEXT NOT NULL,
    "tour_option_id" TEXT,
    "date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL,
    "child_ages" INTEGER[],
    "units" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "net_total_cents" INTEGER NOT NULL,
    "sell_total_cents" INTEGER NOT NULL,
    "markup_bps" INTEGER NOT NULL,
    "lead_traveller_name" TEXT NOT NULL,
    "lead_traveller_email" TEXT NOT NULL,
    "lead_traveller_phone" TEXT,
    "special_requests" TEXT,
    "pickup_note" TEXT,
    "tour_snapshot" JSONB NOT NULL,
    "price_lines" JSONB NOT NULL,
    "cancellation_summary" TEXT,
    "cancellation_schedule" JSONB NOT NULL,
    "confirmation_mode" "confirmation_mode" NOT NULL,
    "requested_at" TIMESTAMP(3),
    "request_deadline_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_charge_cents" INTEGER,
    "cancellation_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_booking_travellers" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "type" "booking_guest_type" NOT NULL DEFAULT 'ADULT',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "age" INTEGER,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "unit_net_cents" INTEGER NOT NULL DEFAULT 0,
    "unit_sell_cents" INTEGER NOT NULL DEFAULT 0,
    "passport_number" TEXT,
    "nationality" CHAR(2),
    "dietary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tour_booking_travellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_images" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_translations" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "location" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "highlights" TEXT[],
    "included" TEXT[],
    "excluded" TEXT[],
    "important_info" TEXT[],
    "meeting_point" TEXT,
    "duration_label" TEXT,
    "group_size" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_options_tour_id_status_idx" ON "tour_options"("tour_id", "status");

-- CreateIndex
CREATE INDEX "tour_options_cancellation_policy_id_idx" ON "tour_options"("cancellation_policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_options_tour_id_code_key" ON "tour_options"("tour_id", "code");

-- CreateIndex
CREATE INDEX "tour_seasons_tour_option_id_valid_from_valid_until_idx" ON "tour_seasons"("tour_option_id", "valid_from", "valid_until");

-- CreateIndex
CREATE UNIQUE INDEX "tour_season_tiers_season_id_min_pax_key" ON "tour_season_tiers"("season_id", "min_pax");

-- CreateIndex
CREATE INDEX "tour_inventory_date_idx" ON "tour_inventory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "tour_holds_token_key" ON "tour_holds"("token");

-- CreateIndex
CREATE UNIQUE INDEX "tour_holds_booking_id_key" ON "tour_holds"("booking_id");

-- CreateIndex
CREATE INDEX "tour_holds_status_expires_at_idx" ON "tour_holds"("status", "expires_at");

-- CreateIndex
CREATE INDEX "tour_holds_tour_option_id_date_idx" ON "tour_holds"("tour_option_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "tour_bookings_reference_key" ON "tour_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "tour_bookings_idempotency_key_key" ON "tour_bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "tour_bookings_tour_id_date_idx" ON "tour_bookings"("tour_id", "date");

-- CreateIndex
CREATE INDEX "tour_bookings_tour_option_id_date_idx" ON "tour_bookings"("tour_option_id", "date");

-- CreateIndex
CREATE INDEX "tour_bookings_partner_id_created_at_idx" ON "tour_bookings"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "tour_bookings_status_date_idx" ON "tour_bookings"("status", "date");

-- CreateIndex
CREATE INDEX "tour_booking_travellers_booking_id_idx" ON "tour_booking_travellers"("booking_id");

-- CreateIndex
CREATE INDEX "tour_images_tour_id_sort_order_idx" ON "tour_images"("tour_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "tour_images_tour_id_file_asset_id_key" ON "tour_images"("tour_id", "file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_translations_tour_id_locale_key" ON "tour_translations"("tour_id", "locale");

-- CreateIndex
CREATE INDEX "tours_destination_id_status_idx" ON "tours"("destination_id", "status");

-- CreateIndex
CREATE INDEX "tours_supplier_id_idx" ON "tours"("supplier_id");

-- CreateIndex
CREATE INDEX "tours_status_featured_idx" ON "tours"("status", "featured");

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_meeting_point_id_fkey" FOREIGN KEY ("meeting_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_options" ADD CONSTRAINT "tour_options_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_options" ADD CONSTRAINT "tour_options_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_seasons" ADD CONSTRAINT "tour_seasons_tour_option_id_fkey" FOREIGN KEY ("tour_option_id") REFERENCES "tour_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_season_tiers" ADD CONSTRAINT "tour_season_tiers_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "tour_seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_inventory" ADD CONSTRAINT "tour_inventory_tour_option_id_fkey" FOREIGN KEY ("tour_option_id") REFERENCES "tour_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_holds" ADD CONSTRAINT "tour_holds_tour_option_id_fkey" FOREIGN KEY ("tour_option_id") REFERENCES "tour_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_holds" ADD CONSTRAINT "tour_holds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "tour_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_holds" ADD CONSTRAINT "tour_holds_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_holds" ADD CONSTRAINT "tour_holds_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_tour_option_id_fkey" FOREIGN KEY ("tour_option_id") REFERENCES "tour_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_booking_travellers" ADD CONSTRAINT "tour_booking_travellers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "tour_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_images" ADD CONSTRAINT "tour_images_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_translations" ADD CONSTRAINT "tour_translations_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions, beyond what Prisma generates.
-- ---------------------------------------------------------------------------

-- The last line of defence beneath the conditional UPDATE the claim path
-- uses: even a writer that bypasses lib/inventory/counter.js entirely cannot
-- oversell a departure. Raised as 23514, which the error handler renders as
-- a 409. Identical in shape to room_inventory_no_oversell.
ALTER TABLE "tour_inventory" ADD CONSTRAINT "tour_inventory_no_oversell" CHECK (
    booked_units + held_units + blocked_units <= total_units
);

ALTER TABLE "tour_inventory" ADD CONSTRAINT "tour_inventory_counts_non_negative" CHECK (
    total_units >= 0 AND blocked_units >= 0 AND booked_units >= 0 AND held_units >= 0
);

ALTER TABLE "tour_options" ADD CONSTRAINT "tour_options_pax_range_valid" CHECK (
    min_pax >= 1 AND max_pax >= min_pax AND notice_hours >= 0 AND horizon_days >= 1
);

ALTER TABLE "tour_seasons" ADD CONSTRAINT "tour_seasons_range_valid" CHECK (
    valid_until >= valid_from
);

ALTER TABLE "tour_season_tiers" ADD CONSTRAINT "tour_season_tiers_range_valid" CHECK (
    min_pax >= 1 AND (max_pax IS NULL OR max_pax >= min_pax)
);

ALTER TABLE "tour_season_tiers" ADD CONSTRAINT "tour_season_tiers_amounts_non_negative" CHECK (
    (adult_net_cents IS NULL OR adult_net_cents >= 0)
    AND (child_net_cents IS NULL OR child_net_cents >= 0)
    AND infant_net_cents >= 0
    AND (group_net_cents IS NULL OR group_net_cents >= 0)
    AND (adult_sell_cents IS NULL OR adult_sell_cents >= 0)
    AND (child_sell_cents IS NULL OR child_sell_cents >= 0)
    AND (group_sell_cents IS NULL OR group_sell_cents >= 0)
);

ALTER TABLE "tour_holds" ADD CONSTRAINT "tour_holds_party_valid" CHECK (
    quantity >= 1 AND adults >= 1
);

ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_range_valid" CHECK (
    end_date >= date AND units >= 1 AND adults >= 1
);

ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_totals_non_negative" CHECK (
    net_total_cents >= 0 AND sell_total_cents >= 0
    AND (cancellation_charge_cents IS NULL OR cancellation_charge_cents >= 0)
);

-- A cancelled booking has to say when; a live one must not claim to have
-- been cancelled. Same rule as hotel_bookings_cancellation_coherent.
ALTER TABLE "tour_bookings" ADD CONSTRAINT "tour_bookings_cancellation_coherent" CHECK (
    (status <> 'CANCELLED' AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
);

-- The public reference: TUR-000001. A sequence rather than max()+1 so
-- concurrent confirmations cannot be handed the same number.
CREATE SEQUENCE "tour_booking_reference_seq" START WITH 1 INCREMENT BY 1;

-- At most one cover image per tour. Prisma cannot express a WHERE clause on
-- an index, so it is written here, exactly as for hotel_images.
CREATE UNIQUE INDEX "tour_images_one_cover_per_tour"
    ON "tour_images" ("tour_id") WHERE "is_cover" = true;

-- The sweeper reads exactly this. A partial index keeps it to the rows that
-- can actually expire, rather than every hold ever taken.
CREATE INDEX "tour_holds_sweep_idx"
    ON "tour_holds" ("expires_at") WHERE "status" = 'ACTIVE';
