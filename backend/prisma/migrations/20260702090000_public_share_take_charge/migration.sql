ALTER TABLE "VehicleCheckPublicShare"
ADD COLUMN "takenInChargeAt" TIMESTAMP(3);

CREATE INDEX "VehicleCheckPublicShare_takenInChargeAt_idx" ON "VehicleCheckPublicShare"("takenInChargeAt");
