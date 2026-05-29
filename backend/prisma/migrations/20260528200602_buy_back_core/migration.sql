-- CreateEnum
CREATE TYPE "VehicleCheckStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepairDecisionStatus" AS ENUM ('ACCEPTED', 'TO_CHECK', 'NOT_PROFITABLE', 'FORBIDDEN', 'MANDATORY', 'WARNING');

-- CreateEnum
CREATE TYPE "ManufacturerRepairRuleStatus" AS ENUM ('ALLOWED', 'FORBIDDEN', 'TO_CHECK', 'MANDATORY', 'CONDITIONAL');

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "defaultInternalSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "defaultInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerRule" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "constructorAllowanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborRate" DECIMAL(12,2),
    "paintRate" DECIMAL(12,2),
    "partsDiscountRate" DECIMAL(5,2),
    "dentRemovalCost" DECIMAL(12,2),
    "servicingCost" DECIMAL(12,2),
    "revisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerRepairRule" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "repairTypeId" TEXT NOT NULL,
    "status" "ManufacturerRepairRuleStatus" NOT NULL DEFAULT 'ALLOWED',
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "thresholdAmount" DECIMAL(12,2),
    "thresholdPercentage" DECIMAL(5,2),
    "customInternalSavingAmount" DECIMAL(12,2),
    "customInternalCost" DECIMAL(12,2),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerRepairRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheck" (
    "id" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "vehicleModelId" TEXT,
    "licensePlate" TEXT NOT NULL,
    "mileage" INTEGER,
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "city" TEXT NOT NULL,
    "status" "VehicleCheckStatus" NOT NULL DEFAULT 'DRAFT',
    "totalInternalSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalExternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDifferenceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "constructorAllowanceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowanceDifferenceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "decisionSummary" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheckItem" (
    "id" TEXT NOT NULL,
    "vehicleCheckId" TEXT NOT NULL,
    "repairTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitInternalSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInternalSavingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unitInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalInternalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "decisionStatus" "RepairDecisionStatus" NOT NULL DEFAULT 'ACCEPTED',
    "decisionMessage" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalQuote" (
    "id" TEXT NOT NULL,
    "vehicleCheckId" TEXT NOT NULL,
    "expertName" TEXT NOT NULL,
    "quoteReference" TEXT,
    "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalQuoteItem" (
    "id" TEXT NOT NULL,
    "externalQuoteId" TEXT NOT NULL,
    "repairTypeId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agency_city_idx" ON "Agency"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_city_key" ON "Agency"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE INDEX "VehicleModel_manufacturerId_idx" ON "VehicleModel"("manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_manufacturerId_name_key" ON "VehicleModel"("manufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "RepairType_code_key" ON "RepairType"("code");

-- CreateIndex
CREATE INDEX "RepairType_isActive_idx" ON "RepairType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerRule_manufacturerId_key" ON "ManufacturerRule"("manufacturerId");

-- CreateIndex
CREATE INDEX "ManufacturerRepairRule_manufacturerId_idx" ON "ManufacturerRepairRule"("manufacturerId");

-- CreateIndex
CREATE INDEX "ManufacturerRepairRule_repairTypeId_idx" ON "ManufacturerRepairRule"("repairTypeId");

-- CreateIndex
CREATE INDEX "ManufacturerRepairRule_status_idx" ON "ManufacturerRepairRule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerRepairRule_manufacturerId_repairTypeId_key" ON "ManufacturerRepairRule"("manufacturerId", "repairTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCheck_checkNumber_key" ON "VehicleCheck"("checkNumber");

-- CreateIndex
CREATE INDEX "VehicleCheck_collaboratorId_idx" ON "VehicleCheck"("collaboratorId");

-- CreateIndex
CREATE INDEX "VehicleCheck_agencyId_idx" ON "VehicleCheck"("agencyId");

-- CreateIndex
CREATE INDEX "VehicleCheck_manufacturerId_idx" ON "VehicleCheck"("manufacturerId");

-- CreateIndex
CREATE INDEX "VehicleCheck_vehicleModelId_idx" ON "VehicleCheck"("vehicleModelId");

-- CreateIndex
CREATE INDEX "VehicleCheck_checkDate_idx" ON "VehicleCheck"("checkDate");

-- CreateIndex
CREATE INDEX "VehicleCheck_status_idx" ON "VehicleCheck"("status");

-- CreateIndex
CREATE INDEX "VehicleCheck_licensePlate_idx" ON "VehicleCheck"("licensePlate");

-- CreateIndex
CREATE INDEX "VehicleCheckItem_vehicleCheckId_idx" ON "VehicleCheckItem"("vehicleCheckId");

-- CreateIndex
CREATE INDEX "VehicleCheckItem_repairTypeId_idx" ON "VehicleCheckItem"("repairTypeId");

-- CreateIndex
CREATE INDEX "VehicleCheckItem_decisionStatus_idx" ON "VehicleCheckItem"("decisionStatus");

-- CreateIndex
CREATE INDEX "ExternalQuote_vehicleCheckId_idx" ON "ExternalQuote"("vehicleCheckId");

-- CreateIndex
CREATE INDEX "ExternalQuote_quoteDate_idx" ON "ExternalQuote"("quoteDate");

-- CreateIndex
CREATE INDEX "ExternalQuoteItem_externalQuoteId_idx" ON "ExternalQuoteItem"("externalQuoteId");

-- CreateIndex
CREATE INDEX "ExternalQuoteItem_repairTypeId_idx" ON "ExternalQuoteItem"("repairTypeId");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerRule" ADD CONSTRAINT "ManufacturerRule_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerRepairRule" ADD CONSTRAINT "ManufacturerRepairRule_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerRepairRule" ADD CONSTRAINT "ManufacturerRepairRule_repairTypeId_fkey" FOREIGN KEY ("repairTypeId") REFERENCES "RepairType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheck" ADD CONSTRAINT "VehicleCheck_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheck" ADD CONSTRAINT "VehicleCheck_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheck" ADD CONSTRAINT "VehicleCheck_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheck" ADD CONSTRAINT "VehicleCheck_vehicleModelId_fkey" FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckItem" ADD CONSTRAINT "VehicleCheckItem_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckItem" ADD CONSTRAINT "VehicleCheckItem_repairTypeId_fkey" FOREIGN KEY ("repairTypeId") REFERENCES "RepairType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalQuote" ADD CONSTRAINT "ExternalQuote_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalQuoteItem" ADD CONSTRAINT "ExternalQuoteItem_externalQuoteId_fkey" FOREIGN KEY ("externalQuoteId") REFERENCES "ExternalQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalQuoteItem" ADD CONSTRAINT "ExternalQuoteItem_repairTypeId_fkey" FOREIGN KEY ("repairTypeId") REFERENCES "RepairType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
