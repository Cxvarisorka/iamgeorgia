-- CreateEnum
CREATE TYPE "tax_fee_basis" AS ENUM ('PERCENT', 'PER_NIGHT_PER_PERSON', 'PER_NIGHT_PER_ROOM', 'PER_STAY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'INVENTORY_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'RATE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TAX_FEE_UPDATED';

-- CreateTable
CREATE TABLE "room_inventory" (
    "room_type_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "total_units" INTEGER NOT NULL,
    "blocked_units" INTEGER NOT NULL DEFAULT 0,
    "booked_units" INTEGER NOT NULL DEFAULT 0,
    "held_units" INTEGER NOT NULL DEFAULT 0,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "min_stay" INTEGER,
    "closed_to_arrival" BOOLEAN NOT NULL DEFAULT false,
    "closed_to_departure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_inventory_pkey" PRIMARY KEY ("room_type_id","date")
);

-- CreateTable
CREATE TABLE "rates" (
    "rate_plan_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "sell_cents" INTEGER,
    "extra_adult_cents" INTEGER,
    "extra_child_cents" INTEGER,
    "single_occupancy_cents" INTEGER,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rates_pkey" PRIMARY KEY ("rate_plan_id","date")
);

-- CreateTable
CREATE TABLE "hotel_tax_fees" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basis" "tax_fee_basis" NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "included_in_rate" BOOLEAN NOT NULL DEFAULT false,
    "applies_to_children" BOOLEAN NOT NULL DEFAULT true,
    "start_date" DATE,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_tax_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_inventory_date_idx" ON "room_inventory"("date");

-- CreateIndex
CREATE INDEX "rates_date_idx" ON "rates"("date");

-- CreateIndex
CREATE INDEX "hotel_tax_fees_hotel_id_idx" ON "hotel_tax_fees"("hotel_id");

-- AddForeignKey
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rates" ADD CONSTRAINT "rates_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_tax_fees" ADD CONSTRAINT "hotel_tax_fees_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions.
-- ---------------------------------------------------------------------------

-- The last line of defence against overbooking.
--
-- The booking path claims inventory with a conditional UPDATE whose WHERE
-- clause is the availability check, which is correct on its own. This exists
-- so that a future bug which bypasses that path — a bulk edit, a migration, a
-- channel-manager sync — raises 23514 and rolls back rather than quietly
-- selling a room twice. middleware/errors.js maps 23514 to 409.
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_no_oversell"
    CHECK (booked_units + held_units + blocked_units <= total_units);

ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_non_negative"
    CHECK (total_units >= 0 AND booked_units >= 0 AND held_units >= 0 AND blocked_units >= 0);

ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_min_stay_positive"
    CHECK (min_stay IS NULL OR min_stay >= 1);

-- A negative rate is always a data-entry error, and one that would produce a
-- negative booking total rather than an obvious failure.
ALTER TABLE "rates" ADD CONSTRAINT "rates_amounts_non_negative" CHECK (
    net_cents >= 0
    AND (sell_cents IS NULL OR sell_cents >= 0)
    AND (extra_adult_cents IS NULL OR extra_adult_cents >= 0)
    AND (extra_child_cents IS NULL OR extra_child_cents >= 0)
    AND (single_occupancy_cents IS NULL OR single_occupancy_cents >= 0)
);

ALTER TABLE "hotel_tax_fees" ADD CONSTRAINT "hotel_tax_fees_value_sane" CHECK (
    value >= 0
    AND (basis <> 'PERCENT' OR value <= 10000)
    AND (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

-- Availability is read far more often than it is written, and always as
-- "these room types, over this date range". A covering index means the search
-- query in Phase 5 answers from the index without touching the heap.
CREATE INDEX "room_inventory_availability_idx"
    ON "room_inventory" ("room_type_id", "date")
    INCLUDE ("total_units", "blocked_units", "booked_units", "held_units", "stop_sell");

CREATE INDEX "rates_lookup_idx"
    ON "rates" ("rate_plan_id", "date")
    INCLUDE ("net_cents", "sell_cents", "closed");
