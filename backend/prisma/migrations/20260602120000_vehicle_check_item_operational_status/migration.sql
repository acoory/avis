-- CreateEnum
CREATE TYPE "VehicleCheckItemOperationalStatus" AS ENUM ('ACTIVE', 'IMPOSSIBLE');

-- AlterTable
ALTER TABLE "VehicleCheckItem"
ADD COLUMN "operationalStatus" "VehicleCheckItemOperationalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "operationalComment" TEXT;

-- CreateIndex
CREATE INDEX "VehicleCheckItem_operationalStatus_idx" ON "VehicleCheckItem"("operationalStatus");
