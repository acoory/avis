ALTER TABLE "VehicleCheckPublicShare"
ADD COLUMN "vehicleRecoveredAt" TIMESTAMP(3),
ADD COLUMN "vehicleRecoveredById" TEXT;

CREATE INDEX "VehicleCheckPublicShare_vehicleRecoveredAt_idx" ON "VehicleCheckPublicShare"("vehicleRecoveredAt");
CREATE INDEX "VehicleCheckPublicShare_vehicleRecoveredById_idx" ON "VehicleCheckPublicShare"("vehicleRecoveredById");

ALTER TABLE "VehicleCheckPublicShare"
ADD CONSTRAINT "VehicleCheckPublicShare_vehicleRecoveredById_fkey"
FOREIGN KEY ("vehicleRecoveredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
