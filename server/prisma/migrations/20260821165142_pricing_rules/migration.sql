-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'PRICING_RULE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'PRICING_RULE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'PRICING_RULE_DELETED';

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "partner_id" TEXT,
    "hotel_id" TEXT,
    "destination_id" TEXT,
    "markup_bps" INTEGER NOT NULL,
    "label" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "valid_from" DATE,
    "valid_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_rules_partner_id_is_active_idx" ON "pricing_rules"("partner_id", "is_active");

-- CreateIndex
CREATE INDEX "pricing_rules_hotel_id_is_active_idx" ON "pricing_rules"("hotel_id", "is_active");

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A negative markup would sell below cost, and a rule that expires before it
-- starts matches nothing while looking like it should.
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_sane" CHECK (
    markup_bps >= 0
    AND markup_bps <= 100000
    AND (valid_from IS NULL OR valid_until IS NULL OR valid_until >= valid_from)
);
