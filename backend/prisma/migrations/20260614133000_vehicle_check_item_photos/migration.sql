CREATE TABLE "VehicleCheckItemPhoto" (
  "id" TEXT NOT NULL,
  "vehicleCheckItemId" TEXT NOT NULL,
  "cloudinaryPublicId" TEXT NOT NULL,
  "cloudinaryAssetId" TEXT,
  "secureUrl" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "format" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VehicleCheckItemPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VehicleCheckItemPhoto_cloudinaryPublicId_key"
ON "VehicleCheckItemPhoto"("cloudinaryPublicId");

CREATE INDEX "VehicleCheckItemPhoto_vehicleCheckItemId_idx"
ON "VehicleCheckItemPhoto"("vehicleCheckItemId");

CREATE INDEX "VehicleCheckItemPhoto_createdAt_idx"
ON "VehicleCheckItemPhoto"("createdAt");

ALTER TABLE "VehicleCheckItemPhoto"
ADD CONSTRAINT "VehicleCheckItemPhoto_vehicleCheckItemId_fkey"
FOREIGN KEY ("vehicleCheckItemId") REFERENCES "VehicleCheckItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
