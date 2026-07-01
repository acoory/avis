ALTER TABLE "VehicleCheckPublicShare"
ADD COLUMN "externalRepairContactId" TEXT;

CREATE INDEX "VehicleCheckPublicShare_externalRepairContactId_idx" ON "VehicleCheckPublicShare"("externalRepairContactId");

ALTER TABLE "VehicleCheckPublicShare"
ADD CONSTRAINT "VehicleCheckPublicShare_externalRepairContactId_fkey"
FOREIGN KEY ("externalRepairContactId") REFERENCES "ExternalRepairContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
