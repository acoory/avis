-- CreateEnum
CREATE TYPE "VehicleCheckRevisionReason" AS ENUM (
  'REPAIR_IMPOSSIBLE',
  'PART_UNAVAILABLE',
  'ENTRY_ERROR',
  'MANUFACTURER_DECISION',
  'OTHER'
);

-- CreateTable
CREATE TABLE "VehicleCheckRevision" (
  "id" TEXT NOT NULL,
  "vehicleCheckId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" "VehicleCheckRevisionReason" NOT NULL,
  "comment" TEXT,
  "beforeSnapshot" JSONB NOT NULL,
  "afterSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VehicleCheckRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleCheckRevision_vehicleCheckId_idx" ON "VehicleCheckRevision"("vehicleCheckId");

-- CreateIndex
CREATE INDEX "VehicleCheckRevision_userId_idx" ON "VehicleCheckRevision"("userId");

-- CreateIndex
CREATE INDEX "VehicleCheckRevision_reason_idx" ON "VehicleCheckRevision"("reason");

-- CreateIndex
CREATE INDEX "VehicleCheckRevision_createdAt_idx" ON "VehicleCheckRevision"("createdAt");

-- AddForeignKey
ALTER TABLE "VehicleCheckRevision"
ADD CONSTRAINT "VehicleCheckRevision_vehicleCheckId_fkey"
FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckRevision"
ADD CONSTRAINT "VehicleCheckRevision_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
