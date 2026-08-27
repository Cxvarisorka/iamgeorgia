-- CreateEnum
CREATE TYPE "hotel_booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "booking_room_status" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "hold_status" AS ENUM ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "booking_guest_type" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'BOOKING_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'BOOKING_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'BOOKING_AMENDED';
ALTER TYPE "audit_action" ADD VALUE 'HOLD_EXPIRED';
ALTER TYPE "audit_action" ADD VALUE 'INVENTORY_RECONCILED';

-- DropIndex
DROP INDEX "rates_lookup_idx";

-- DropIndex
DROP INDEX "room_inventory_availability_idx";

-- CreateTable
CREATE TABLE "booking_holds" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
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

    CONSTRAINT "booking_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "hotel_booking_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "partner_id" TEXT,
    "booked_by_user_id" TEXT,
    "hotel_id" TEXT NOT NULL,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "net_total_cents" INTEGER NOT NULL,
    "sell_total_cents" INTEGER NOT NULL,
    "tax_total_cents" INTEGER NOT NULL DEFAULT 0,
    "payable_at_property_cents" INTEGER NOT NULL DEFAULT 0,
    "markup_bps" INTEGER NOT NULL,
    "fx_rate" DECIMAL(18,8),
    "fx_rate_at" TIMESTAMP(3),
    "lead_guest_name" TEXT NOT NULL,
    "lead_guest_email" TEXT NOT NULL,
    "lead_guest_phone" TEXT,
    "special_requests" TEXT,
    "hotel_snapshot" JSONB NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_charge_cents" INTEGER,
    "cancellation_reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_booking_rooms" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "room_type_id" TEXT,
    "rate_plan_id" TEXT,
    "room_type_name" TEXT NOT NULL,
    "rate_plan_name" TEXT NOT NULL,
    "meal_plan_code" TEXT NOT NULL,
    "meal_plan_name" TEXT NOT NULL,
    "bed_configuration_text" TEXT,
    "adults" INTEGER NOT NULL,
    "child_ages" INTEGER[],
    "net_subtotal_cents" INTEGER NOT NULL,
    "sell_subtotal_cents" INTEGER NOT NULL,
    "cancellation_summary" TEXT,
    "cancellation_schedule" JSONB NOT NULL,
    "status" "booking_room_status" NOT NULL DEFAULT 'CONFIRMED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_booking_nights" (
    "booking_room_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "sell_cents" INTEGER NOT NULL,
    "tax_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_booking_nights_pkey" PRIMARY KEY ("booking_room_id","date")
);

-- CreateTable
CREATE TABLE "booking_guests" (
    "id" TEXT NOT NULL,
    "booking_room_id" TEXT NOT NULL,
    "type" "booking_guest_type" NOT NULL DEFAULT 'ADULT',
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "age" INTEGER,
    "is_lead" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "booking_holds_token_key" ON "booking_holds"("token");

-- CreateIndex
CREATE UNIQUE INDEX "booking_holds_booking_id_key" ON "booking_holds"("booking_id");

-- CreateIndex
CREATE INDEX "booking_holds_status_expires_at_idx" ON "booking_holds"("status", "expires_at");

-- CreateIndex
CREATE INDEX "booking_holds_room_type_id_check_in_idx" ON "booking_holds"("room_type_id", "check_in");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_reference_key" ON "hotel_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_idempotency_key_key" ON "hotel_bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "hotel_bookings_hotel_id_check_in_idx" ON "hotel_bookings"("hotel_id", "check_in");

-- CreateIndex
CREATE INDEX "hotel_bookings_partner_id_created_at_idx" ON "hotel_bookings"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "hotel_bookings_status_check_in_idx" ON "hotel_bookings"("status", "check_in");

-- CreateIndex
CREATE INDEX "hotel_booking_rooms_booking_id_idx" ON "hotel_booking_rooms"("booking_id");

-- CreateIndex
CREATE INDEX "hotel_booking_rooms_room_type_id_idx" ON "hotel_booking_rooms"("room_type_id");

-- CreateIndex
CREATE INDEX "booking_guests_booking_room_id_idx" ON "booking_guests"("booking_room_id");

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "hotel_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_rooms" ADD CONSTRAINT "hotel_booking_rooms_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_rooms" ADD CONSTRAINT "hotel_booking_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_rooms" ADD CONSTRAINT "hotel_booking_rooms_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_nights" ADD CONSTRAINT "hotel_booking_nights_booking_room_id_fkey" FOREIGN KEY ("booking_room_id") REFERENCES "hotel_booking_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_guests" ADD CONSTRAINT "booking_guests_booking_room_id_fkey" FOREIGN KEY ("booking_room_id") REFERENCES "hotel_booking_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions.
-- ---------------------------------------------------------------------------

ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_range_valid" CHECK (
    check_out > check_in AND quantity >= 1 AND adults >= 1
);

ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_range_valid" CHECK (
    check_out > check_in AND nights >= 1
);

ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_totals_non_negative" CHECK (
    net_total_cents >= 0 AND sell_total_cents >= 0 AND tax_total_cents >= 0
    AND payable_at_property_cents >= 0
    AND (cancellation_charge_cents IS NULL OR cancellation_charge_cents >= 0)
);

ALTER TABLE "hotel_booking_nights" ADD CONSTRAINT "hotel_booking_nights_non_negative"
    CHECK (net_cents >= 0 AND sell_cents >= 0 AND tax_cents >= 0);

-- A cancelled booking has to say when and for how much; a confirmed one must
-- not claim to have been cancelled. Both are cheap to state and impossible to
-- get wrong later.
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_cancellation_coherent" CHECK (
    (status <> 'CANCELLED' AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
);

-- The sweeper reads exactly this. A partial index keeps it to the rows that can
-- actually expire, rather than every hold ever taken.
CREATE INDEX "booking_holds_sweep_idx"
    ON "booking_holds" ("expires_at") WHERE "status" = 'ACTIVE';
