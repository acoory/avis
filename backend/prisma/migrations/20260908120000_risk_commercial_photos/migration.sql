ALTER TYPE "RiskVehicleStatus" ADD VALUE 'COMMERCIAL_PHOTOS';
ALTER TABLE "RiskVehicle" ADD COLUMN "commercialMileage" INTEGER,
ADD COLUMN "commercialEquipment" JSONB,
ADD COLUMN "commercialShareToken" TEXT;
CREATE UNIQUE INDEX "RiskVehicle_commercialShareToken_key" ON "RiskVehicle"("commercialShareToken");
CREATE TABLE "RiskCommercialPhoto" (
 "id" TEXT NOT NULL, "riskVehicleId" TEXT NOT NULL, "slotKey" TEXT NOT NULL,
 "publicId" TEXT NOT NULL, "assetId" TEXT, "secureUrl" TEXT NOT NULL,
 "width" INTEGER NOT NULL, "height" INTEGER NOT NULL, "bytes" INTEGER NOT NULL,
 "format" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "RiskCommercialPhoto_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "RiskCommercialPhoto_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RiskCommercialPhoto_publicId_key" ON "RiskCommercialPhoto"("publicId");
CREATE UNIQUE INDEX "RiskCommercialPhoto_riskVehicleId_slotKey_key" ON "RiskCommercialPhoto"("riskVehicleId", "slotKey");
