-- CreateEnum
CREATE TYPE "PartOrderStatus" AS ENUM ('NOT_REQUIRED', 'TO_ORDER', 'ORDERED');

-- AlterTable
ALTER TABLE "VehicleCheckItem" ADD COLUMN     "partOrderPrice" DECIMAL(12,2),
ADD COLUMN     "partOrderReference" TEXT,
ADD COLUMN     "partOrderRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partOrderStatus" "PartOrderStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "partOrderedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VehicleCheckItem_partOrderStatus_idx" ON "VehicleCheckItem"("partOrderStatus");
