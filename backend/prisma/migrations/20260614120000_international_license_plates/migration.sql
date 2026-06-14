ALTER TABLE "VehicleCheck"
ADD COLUMN "licensePlateRaw" TEXT,
ADD COLUMN "licensePlateCountry" TEXT NOT NULL DEFAULT 'FR',
ADD COLUMN "licensePlateRecognitionConfidence" DOUBLE PRECISION;

UPDATE "VehicleCheck"
SET "licensePlateRaw" = "licensePlate"
WHERE "licensePlateRaw" IS NULL;

CREATE INDEX "VehicleCheck_licensePlateCountry_idx" ON "VehicleCheck"("licensePlateCountry");
