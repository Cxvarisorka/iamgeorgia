-- CreateEnum
CREATE TYPE "meal_plan_code" AS ENUM ('RO', 'BB', 'HB', 'HB_PLUS', 'FB', 'FB_PLUS', 'AI', 'UAI');

-- CreateEnum
CREATE TYPE "cancellation_kind" AS ENUM ('FLEXIBLE', 'NON_REFUNDABLE', 'TIERED');

-- CreateEnum
CREATE TYPE "charge_basis" AS ENUM ('PERCENT_OF_TOTAL', 'PERCENT_OF_FIRST_NIGHT', 'FIXED_AMOUNT', 'NIGHTS');

-- CreateEnum
CREATE TYPE "payment_timing" AS ENUM ('PAY_NOW', 'PAY_LATER', 'DEPOSIT', 'PAY_AT_HOTEL', 'CREDIT_ACCOUNT');

-- CreateEnum
CREATE TYPE "rate_plan_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "rate_plan_visibility" AS ENUM ('PUBLIC', 'PARTNER_ONLY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'RATE_PLAN_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'RATE_PLAN_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'RATE_PLAN_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'CANCELLATION_POLICY_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'CANCELLATION_POLICY_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'PAYMENT_POLICY_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'PAYMENT_POLICY_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_MEAL_PLAN_UPDATED';

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "code" "meal_plan_code" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_meal_plans" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "description" TEXT,
    "inclusions" TEXT[],
    "service_times" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_policies" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT,
    "name" TEXT NOT NULL,
    "kind" "cancellation_kind" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_rules" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "hours_before_check_in" INTEGER NOT NULL,
    "charge_basis" "charge_basis" NOT NULL,
    "charge_value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_policies" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT,
    "name" TEXT NOT NULL,
    "timing" "payment_timing" NOT NULL,
    "deposit_bps" INTEGER,
    "balance_due_days_before_check_in" INTEGER,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plans" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "rate_plan_status" NOT NULL DEFAULT 'ACTIVE',
    "visibility" "rate_plan_visibility" NOT NULL DEFAULT 'PUBLIC',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "meal_plan_id" TEXT NOT NULL,
    "cancellation_policy_id" TEXT NOT NULL,
    "payment_policy_id" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "base_occupancy" INTEGER NOT NULL DEFAULT 2,
    "min_adults" INTEGER,
    "max_adults" INTEGER,
    "max_children" INTEGER,
    "sellable_from" DATE,
    "sellable_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_plan_restrictions" (
    "id" TEXT NOT NULL,
    "rate_plan_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "min_stay" INTEGER,
    "max_stay" INTEGER,
    "min_advance_days" INTEGER,
    "max_advance_days" INTEGER,
    "closed_to_arrival" BOOLEAN NOT NULL DEFAULT false,
    "closed_to_departure" BOOLEAN NOT NULL DEFAULT false,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_plan_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plans_code_key" ON "meal_plans"("code");

-- CreateIndex
CREATE INDEX "hotel_meal_plans_meal_plan_id_idx" ON "hotel_meal_plans"("meal_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_meal_plans_hotel_id_meal_plan_id_key" ON "hotel_meal_plans"("hotel_id", "meal_plan_id");

-- CreateIndex
CREATE INDEX "cancellation_policies_hotel_id_is_active_idx" ON "cancellation_policies"("hotel_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_rules_policy_id_hours_before_check_in_key" ON "cancellation_rules"("policy_id", "hours_before_check_in");

-- CreateIndex
CREATE INDEX "payment_policies_hotel_id_is_active_idx" ON "payment_policies"("hotel_id", "is_active");

-- CreateIndex
CREATE INDEX "rate_plans_room_type_id_status_idx" ON "rate_plans"("room_type_id", "status");

-- CreateIndex
CREATE INDEX "rate_plans_meal_plan_id_idx" ON "rate_plans"("meal_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "rate_plans_room_type_id_code_key" ON "rate_plans"("room_type_id", "code");

-- CreateIndex
CREATE INDEX "rate_plan_restrictions_rate_plan_id_start_date_end_date_idx" ON "rate_plan_restrictions"("rate_plan_id", "start_date", "end_date");

-- AddForeignKey
ALTER TABLE "hotel_meal_plans" ADD CONSTRAINT "hotel_meal_plans_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_meal_plans" ADD CONSTRAINT "hotel_meal_plans_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_policies" ADD CONSTRAINT "cancellation_policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_rules" ADD CONSTRAINT "cancellation_rules_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "cancellation_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_policies" ADD CONSTRAINT "payment_policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_payment_policy_id_fkey" FOREIGN KEY ("payment_policy_id") REFERENCES "payment_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_plan_restrictions" ADD CONSTRAINT "rate_plan_restrictions_rate_plan_id_fkey" FOREIGN KEY ("rate_plan_id") REFERENCES "rate_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions.
-- ---------------------------------------------------------------------------

-- A cancellation tier that charges a negative amount, or a percentage above
-- 100%, is always a data-entry error. Catching it here means the refund
-- calculation never has to defend against it.
ALTER TABLE "cancellation_rules" ADD CONSTRAINT "cancellation_rules_charge_sane" CHECK (
    hours_before_check_in >= 0
    AND charge_value >= 0
    AND (charge_basis NOT IN ('PERCENT_OF_TOTAL', 'PERCENT_OF_FIRST_NIGHT') OR charge_value <= 10000)
);

ALTER TABLE "payment_policies" ADD CONSTRAINT "payment_policies_deposit_sane" CHECK (
    deposit_bps IS NULL OR deposit_bps BETWEEN 0 AND 10000
);

-- A restriction window that ends before it begins would silently match no
-- nights, which reads as "no restriction" rather than as the mistake it is.
ALTER TABLE "rate_plan_restrictions" ADD CONSTRAINT "rate_plan_restrictions_range_valid" CHECK (
    end_date >= start_date
    AND (min_stay IS NULL OR min_stay >= 1)
    AND (max_stay IS NULL OR max_stay >= 1)
    AND (min_stay IS NULL OR max_stay IS NULL OR max_stay >= min_stay)
);

ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_sellable_range_valid" CHECK (
    sellable_from IS NULL OR sellable_until IS NULL OR sellable_until >= sellable_from
);

ALTER TABLE "rate_plans" ADD CONSTRAINT "rate_plans_occupancy_sane" CHECK (
    base_occupancy >= 1
    AND (min_adults IS NULL OR min_adults >= 0)
    AND (max_adults IS NULL OR max_adults >= 1)
    AND (min_adults IS NULL OR max_adults IS NULL OR max_adults >= min_adults)
);
