-- CreateTable
CREATE TABLE "VehiclePart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePart_pkey" PRIMARY KEY ("id")
);

-- Seed the fallback part before adding a required relation on historical items.
INSERT INTO "VehiclePart" ("id", "name", "code", "category", "displayOrder", "isActive", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000001', 'Non precise', 'UNKNOWN', 'GENERAL', 0, true, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "ManufacturerRepairRule" ADD COLUMN "vehiclePartId" TEXT;

-- AlterTable
ALTER TABLE "VehicleCheckItem" ADD COLUMN "vehiclePartId" TEXT;

UPDATE "VehicleCheckItem"
SET "vehiclePartId" = '00000000-0000-0000-0000-000000000001'
WHERE "vehiclePartId" IS NULL;

ALTER TABLE "VehicleCheckItem" ALTER COLUMN "vehiclePartId" SET NOT NULL;

-- DropIndex
DROP INDEX "ManufacturerRepairRule_manufacturerId_repairTypeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePart_code_key" ON "VehiclePart"("code");

-- CreateIndex
CREATE INDEX "VehiclePart_category_idx" ON "VehiclePart"("category");

-- CreateIndex
CREATE INDEX "VehiclePart_displayOrder_idx" ON "VehiclePart"("displayOrder");

-- CreateIndex
CREATE INDEX "VehiclePart_isActive_idx" ON "VehiclePart"("isActive");

-- CreateIndex
CREATE INDEX "ManufacturerRepairRule_vehiclePartId_idx" ON "ManufacturerRepairRule"("vehiclePartId");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerRepairRule_manufacturerId_repairTypeId_vehiclePartId_key" ON "ManufacturerRepairRule"("manufacturerId", "repairTypeId", "vehiclePartId");

-- CreateIndex
CREATE INDEX "VehicleCheckItem_vehiclePartId_idx" ON "VehicleCheckItem"("vehiclePartId");

-- AddForeignKey
ALTER TABLE "ManufacturerRepairRule" ADD CONSTRAINT "ManufacturerRepairRule_vehiclePartId_fkey" FOREIGN KEY ("vehiclePartId") REFERENCES "VehiclePart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckItem" ADD CONSTRAINT "VehicleCheckItem_vehiclePartId_fkey" FOREIGN KEY ("vehiclePartId") REFERENCES "VehiclePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
