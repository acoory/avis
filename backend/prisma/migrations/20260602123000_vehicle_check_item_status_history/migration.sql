-- Add cancelled status for repair lines
ALTER TYPE "VehicleCheckItemOperationalStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateTable
CREATE TABLE "VehicleCheckItemStatusHistory" (
  "id" TEXT NOT NULL,
  "vehicleCheckItemId" TEXT NOT NULL,
  "userId" TEXT,
  "fromStatus" "VehicleCheckItemOperationalStatus" NOT NULL,
  "toStatus" "VehicleCheckItemOperationalStatus" NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VehicleCheckItemStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCheckItemStatusHistory_vehicleCheckItemId_idx" ON "VehicleCheckItemStatusHistory"("vehicleCheckItemId");

-- CreateIndex
CREATE INDEX "VehicleCheckItemStatusHistory_userId_idx" ON "VehicleCheckItemStatusHistory"("userId");

-- CreateIndex
CREATE INDEX "VehicleCheckItemStatusHistory_createdAt_idx" ON "VehicleCheckItemStatusHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "VehicleCheckItemStatusHistory"
ADD CONSTRAINT "VehicleCheckItemStatusHistory_vehicleCheckItemId_fkey"
FOREIGN KEY ("vehicleCheckItemId") REFERENCES "VehicleCheckItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckItemStatusHistory"
ADD CONSTRAINT "VehicleCheckItemStatusHistory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
