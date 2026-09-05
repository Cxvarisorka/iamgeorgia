-- CreateEnum
CREATE TYPE "service_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "service_category" AS ENUM ('KOSHER_MEAL_DELIVERY', 'SHABBAT_MEALS', 'MASHGIACH', 'SYNAGOGUE_TRANSFER', 'GUIDE', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "service_basis" AS ENUM ('PER_PERSON', 'PER_GROUP', 'PER_DAY', 'PER_PERSON_PER_DAY');

-- CreateEnum
CREATE TYPE "service_booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "package_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "package_component_type" AS ENUM ('HOTEL_STAY', 'TRANSFER', 'TOUR', 'SERVICE');

-- CreateEnum
CREATE TYPE "package_adjustment_kind" AS ENUM ('NONE', 'DISCOUNT_BPS', 'FIXED_SELL', 'PER_PERSON_FIXED');

-- CreateEnum
CREATE TYPE "package_adjustment_scope" AS ENUM ('REQUIRED_ONLY', 'ALL_ITEMS');

-- CreateEnum
CREATE TYPE "package_quantity_rule" AS ENUM ('ONE', 'PER_PERSON', 'PER_ROOM');

-- CreateEnum
CREATE TYPE "shabbat_mode" AS ENUM ('SOLAR', 'FIXED_HOURS', 'NONE');

-- CreateEnum
CREATE TYPE "order_kind" AS ENUM ('PACKAGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING_CONFIRMATION', 'CONFIRMED', 'PARTIALLY_CANCELLED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "order_item_status" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "order_item_fulfilment" AS ENUM ('INTERNAL', 'ON_REQUEST', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "pricing_product_type" AS ENUM ('HOTEL', 'TRANSFER', 'TOUR', 'SERVICE', 'PACKAGE');

-- AlterTable
ALTER TABLE "pricing_rules" ADD COLUMN     "package_id" TEXT,
ADD COLUMN     "product_type" "pricing_product_type",
ADD COLUMN     "service_id" TEXT,
ADD COLUMN     "tour_id" TEXT;

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "service_status" NOT NULL DEFAULT 'DRAFT',
    "category" "service_category" NOT NULL,
    "destination_id" TEXT,
    "supplier_id" TEXT,
    "basis" "service_basis" NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "sell_cents" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "cancellation_policy_id" TEXT NOT NULL,
    "notice_hours" INTEGER NOT NULL DEFAULT 48,
    "confirmation_mode" "confirmation_mode" NOT NULL DEFAULT 'INSTANT',
    "is_kosher" BOOLEAN NOT NULL DEFAULT false,
    "kosher_authority" TEXT,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "included" TEXT[],
    "b2c_enabled" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_translations" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "included" TEXT[],

    CONSTRAINT "service_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "service_booking_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "partner_id" TEXT,
    "booked_by_user_id" TEXT,
    "service_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pax" INTEGER NOT NULL DEFAULT 1,
    "days" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "net_total_cents" INTEGER NOT NULL,
    "sell_total_cents" INTEGER NOT NULL,
    "markup_bps" INTEGER NOT NULL,
    "lead_name" TEXT NOT NULL,
    "lead_email" TEXT NOT NULL,
    "lead_phone" TEXT,
    "notes" TEXT,
    "service_snapshot" JSONB NOT NULL,
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

    CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "package_status" NOT NULL DEFAULT 'DRAFT',
    "destination_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "image" TEXT NOT NULL DEFAULT '',
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "nights" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
    "b2c_enabled" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "min_adults" INTEGER NOT NULL DEFAULT 1,
    "max_adults" INTEGER,
    "max_children" INTEGER,
    "max_pax" INTEGER,
    "adjustment_kind" "package_adjustment_kind" NOT NULL DEFAULT 'NONE',
    "adjustment_value" INTEGER NOT NULL DEFAULT 0,
    "adjustment_applies_to" "package_adjustment_scope" NOT NULL DEFAULT 'REQUIRED_ONLY',
    "sellable_from" DATE,
    "sellable_until" DATE,
    "valid_from" DATE,
    "valid_until" DATE,
    "price_from_cents" INTEGER NOT NULL DEFAULT 0,
    "price_from_at" TIMESTAMP(3),
    "kosher_override_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_components" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "component_type" "package_component_type" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "day_offset" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER,
    "time_of_day" TEXT,
    "quantity_rule" "package_quantity_rule" NOT NULL DEFAULT 'ONE',
    "hotel_id" TEXT,
    "allowed_room_type_ids" TEXT[],
    "allowed_rate_plan_ids" TEXT[],
    "allowed_meal_plan_codes" "meal_plan_code"[],
    "from_point_id" TEXT,
    "to_point_id" TEXT,
    "route_id" TEXT,
    "allowed_vehicle_classes" "transfer_vehicle_class"[],
    "trip_type" "transfer_trip_type",
    "tour_id" TEXT,
    "allowed_tour_option_ids" TEXT[],
    "service_id" TEXT,
    "kosher_min_service_level" "kosher_service_level",
    "kosher_certified_required" BOOLEAN,
    "kosher_certification_scopes" "kosher_certification_scope"[],
    "constraints" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "package_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_images" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_translations" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "summary" TEXT,
    "description" TEXT[],

    CONSTRAINT "package_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kosher_package_profiles" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "min_service_level" "kosher_service_level" NOT NULL DEFAULT 'FULL',
    "certified_required" BOOLEAN NOT NULL DEFAULT true,
    "certification_scopes" "kosher_certification_scope"[] DEFAULT ARRAY['PROPERTY', 'KITCHEN']::"kosher_certification_scope"[],
    "require_cert_valid_through_stay" BOOLEAN NOT NULL DEFAULT true,
    "required_meal_plan_codes" "meal_plan_code"[],
    "hotel_request_codes" TEXT[],
    "shabbat_mode" "shabbat_mode" NOT NULL DEFAULT 'SOLAR',
    "shabbat_fixed_start" TEXT,
    "shabbat_fixed_end" TEXT,
    "candle_lighting_offset_min" INTEGER NOT NULL DEFAULT 18,
    "havdalah_offset_min" INTEGER NOT NULL DEFAULT 42,
    "no_transfers_in_shabbat" BOOLEAN NOT NULL DEFAULT true,
    "no_tours_on_shabbat" BOOLEAN NOT NULL DEFAULT true,
    "extra_rest_days" JSONB NOT NULL DEFAULT '[]',
    "supervision_authority" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kosher_package_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tour_kosher_profiles" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "kosher_meals_available" BOOLEAN NOT NULL DEFAULT false,
    "operates_on_shabbat" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_kosher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "order_status" NOT NULL,
    "idempotency_key" TEXT,
    "partner_id" TEXT,
    "booked_by_user_id" TEXT,
    "kind" "order_kind" NOT NULL DEFAULT 'PACKAGE',
    "package_id" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "adults" INTEGER NOT NULL,
    "child_ages" INTEGER[],
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL,
    "components_net_cents" INTEGER NOT NULL,
    "components_sell_cents" INTEGER NOT NULL,
    "adjustment_cents" INTEGER NOT NULL DEFAULT 0,
    "sell_total_cents" INTEGER NOT NULL,
    "lead_name" TEXT NOT NULL,
    "lead_email" TEXT NOT NULL,
    "lead_phone" TEXT,
    "special_requests" TEXT,
    "package_snapshot" JSONB NOT NULL,
    "request_deadline_at" TIMESTAMP(3),
    "overdue_alert_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_charge_cents" INTEGER,
    "cancellation_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "component_type" "package_component_type" NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "order_item_status" NOT NULL,
    "fulfilment" "order_item_fulfilment" NOT NULL DEFAULT 'INTERNAL',
    "hotel_booking_id" TEXT,
    "transfer_booking_id" TEXT,
    "tour_booking_id" TEXT,
    "service_booking_id" TEXT,
    "net_cents" INTEGER NOT NULL,
    "sell_cents" INTEGER NOT NULL,
    "adjustment_cents" INTEGER NOT NULL DEFAULT 0,
    "line_total_cents" INTEGER NOT NULL,
    "cancellation_charge_cents" INTEGER,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_status_category_idx" ON "services"("status", "category");

-- CreateIndex
CREATE INDEX "services_destination_id_status_idx" ON "services"("destination_id", "status");

-- CreateIndex
CREATE INDEX "services_supplier_id_idx" ON "services"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_translations_service_id_locale_key" ON "service_translations"("service_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "service_bookings_reference_key" ON "service_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "service_bookings_idempotency_key_key" ON "service_bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "service_bookings_service_id_date_idx" ON "service_bookings"("service_id", "date");

-- CreateIndex
CREATE INDEX "service_bookings_partner_id_created_at_idx" ON "service_bookings"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "service_bookings_status_date_idx" ON "service_bookings"("status", "date");

-- CreateIndex
CREATE UNIQUE INDEX "packages_slug_key" ON "packages"("slug");

-- CreateIndex
CREATE INDEX "packages_destination_id_status_idx" ON "packages"("destination_id", "status");

-- CreateIndex
CREATE INDEX "packages_status_featured_idx" ON "packages"("status", "featured");

-- CreateIndex
CREATE INDEX "package_components_hotel_id_idx" ON "package_components"("hotel_id");

-- CreateIndex
CREATE INDEX "package_components_tour_id_idx" ON "package_components"("tour_id");

-- CreateIndex
CREATE INDEX "package_components_service_id_idx" ON "package_components"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_components_package_id_slot_index_key" ON "package_components"("package_id", "slot_index");

-- CreateIndex
CREATE INDEX "package_images_package_id_sort_order_idx" ON "package_images"("package_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "package_images_package_id_file_asset_id_key" ON "package_images"("package_id", "file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_translations_package_id_locale_key" ON "package_translations"("package_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "kosher_package_profiles_package_id_key" ON "kosher_package_profiles"("package_id");

-- CreateIndex
CREATE UNIQUE INDEX "tour_kosher_profiles_tour_id_key" ON "tour_kosher_profiles"("tour_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE INDEX "orders_partner_id_created_at_idx" ON "orders"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_status_start_date_idx" ON "orders"("status", "start_date");

-- CreateIndex
CREATE INDEX "orders_package_id_idx" ON "orders"("package_id");

-- CreateIndex
CREATE INDEX "orders_status_request_deadline_at_idx" ON "orders"("status", "request_deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_hotel_booking_id_key" ON "order_items"("hotel_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_transfer_booking_id_key" ON "order_items"("transfer_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_tour_booking_id_key" ON "order_items"("tour_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_service_booking_id_key" ON "order_items"("service_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_order_id_slot_index_key" ON "order_items"("order_id", "slot_index");

-- CreateIndex
CREATE INDEX "pricing_rules_tour_id_is_active_idx" ON "pricing_rules"("tour_id", "is_active");

-- CreateIndex
CREATE INDEX "pricing_rules_service_id_is_active_idx" ON "pricing_rules"("service_id", "is_active");

-- CreateIndex
CREATE INDEX "pricing_rules_package_id_is_active_idx" ON "pricing_rules"("package_id", "is_active");

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_translations" ADD CONSTRAINT "service_translations_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_from_point_id_fkey" FOREIGN KEY ("from_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_to_point_id_fkey" FOREIGN KEY ("to_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_translations" ADD CONSTRAINT "package_translations_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kosher_package_profiles" ADD CONSTRAINT "kosher_package_profiles_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tour_kosher_profiles" ADD CONSTRAINT "tour_kosher_profiles_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_transfer_booking_id_fkey" FOREIGN KEY ("transfer_booking_id") REFERENCES "transfer_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tour_booking_id_fkey" FOREIGN KEY ("tour_booking_id") REFERENCES "tour_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_service_booking_id_fkey" FOREIGN KEY ("service_booking_id") REFERENCES "service_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written. Everything below is invariant the schema cannot express.
-- ---------------------------------------------------------------------------

-- An order item points at exactly one child booking. The alternative — a
-- polymorphic (type, id) pair — cannot carry a foreign key, so an orphaned
-- item would be invisible to the database. Four nullable keys and this CHECK
-- keep Restrict semantics and plain includes.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_exactly_one_child" CHECK (
    (CASE WHEN hotel_booking_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN transfer_booking_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN tour_booking_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN service_booking_id IS NOT NULL THEN 1 ELSE 0 END) = 1
);

-- And the child it points at is the kind its slot says it is.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_child_matches_type" CHECK (
    (component_type = 'HOTEL_STAY' AND hotel_booking_id IS NOT NULL)
    OR (component_type = 'TRANSFER' AND transfer_booking_id IS NOT NULL)
    OR (component_type = 'TOUR' AND tour_booking_id IS NOT NULL)
    OR (component_type = 'SERVICE' AND service_booking_id IS NOT NULL)
);

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_non_negative" CHECK (
    net_cents >= 0 AND sell_cents >= 0 AND line_total_cents >= 0
    AND (cancellation_charge_cents IS NULL OR cancellation_charge_cents >= 0)
);

ALTER TABLE "orders" ADD CONSTRAINT "orders_range_valid" CHECK (
    end_date >= start_date AND adults >= 1 AND rooms >= 1
);

ALTER TABLE "orders" ADD CONSTRAINT "orders_totals_non_negative" CHECK (
    components_net_cents >= 0 AND components_sell_cents >= 0 AND sell_total_cents >= 0
    AND (cancellation_charge_cents IS NULL OR cancellation_charge_cents >= 0)
);

-- Same rule as hotel_bookings_cancellation_coherent.
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancellation_coherent" CHECK (
    (status <> 'CANCELLED' AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
);

-- A slot's constraint columns belong to its type. A HOTEL_STAY slot must
-- say how many nights; nothing else may.
ALTER TABLE "package_components" ADD CONSTRAINT "package_components_type_columns" CHECK (
    (component_type = 'HOTEL_STAY' AND nights IS NOT NULL AND nights >= 1
        AND from_point_id IS NULL AND to_point_id IS NULL AND route_id IS NULL AND tour_id IS NULL AND service_id IS NULL)
    OR (component_type = 'TRANSFER' AND nights IS NULL
        AND hotel_id IS NULL AND tour_id IS NULL AND service_id IS NULL)
    OR (component_type = 'TOUR' AND nights IS NULL
        AND hotel_id IS NULL AND from_point_id IS NULL AND to_point_id IS NULL AND route_id IS NULL AND service_id IS NULL)
    OR (component_type = 'SERVICE' AND nights IS NULL AND service_id IS NOT NULL
        AND hotel_id IS NULL AND from_point_id IS NULL AND to_point_id IS NULL AND route_id IS NULL AND tour_id IS NULL)
);

ALTER TABLE "package_components" ADD CONSTRAINT "package_components_offsets_valid" CHECK (
    slot_index >= 0 AND day_offset >= 0
);

ALTER TABLE "packages" ADD CONSTRAINT "packages_shape_valid" CHECK (
    nights >= 0 AND min_adults >= 1 AND adjustment_value >= 0 AND price_from_cents >= 0
    AND (max_adults IS NULL OR max_adults >= min_adults)
    AND (max_children IS NULL OR max_children >= 0)
    AND (max_pax IS NULL OR max_pax >= min_adults)
);

ALTER TABLE "packages" ADD CONSTRAINT "packages_windows_valid" CHECK (
    (sellable_from IS NULL OR sellable_until IS NULL OR sellable_until >= sellable_from)
    AND (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)
);

ALTER TABLE "services" ADD CONSTRAINT "services_amounts_valid" CHECK (
    net_cents >= 0 AND (sell_cents IS NULL OR sell_cents >= 0)
    AND min_quantity >= 1 AND (max_quantity IS NULL OR max_quantity >= min_quantity)
    AND notice_hours >= 0
);

ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_range_valid" CHECK (
    end_date >= date AND quantity >= 1 AND pax >= 1 AND days >= 1
);

ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_totals_non_negative" CHECK (
    net_total_cents >= 0 AND sell_total_cents >= 0
    AND (cancellation_charge_cents IS NULL OR cancellation_charge_cents >= 0)
);

ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_cancellation_coherent" CHECK (
    (status <> 'CANCELLED' AND cancelled_at IS NULL)
    OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
);

-- A rule names at most one product. Naming two would be a rule nothing can
-- match, and the resolver's specificity count assumes one.
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_one_named_product" CHECK (
    (CASE WHEN hotel_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN tour_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN service_id IS NOT NULL THEN 1 ELSE 0 END)
    + (CASE WHEN package_id IS NOT NULL THEN 1 ELSE 0 END) <= 1
);

-- The public references: SVC-000001 and ORD-000001.
CREATE SEQUENCE "service_booking_reference_seq" START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE "order_reference_seq" START WITH 1 INCREMENT BY 1;

-- At most one cover image per package, exactly as for hotels and tours.
CREATE UNIQUE INDEX "package_images_one_cover_per_package"
    ON "package_images" ("package_id") WHERE "is_cover" = true;

-- The on-request queues read exactly these rows.
CREATE INDEX "service_bookings_pending_idx"
    ON "service_bookings" ("request_deadline_at") WHERE "status" = 'PENDING';
CREATE INDEX "orders_pending_idx"
    ON "orders" ("request_deadline_at") WHERE "status" = 'PENDING_CONFIRMATION';
