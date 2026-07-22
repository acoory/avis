ALTER TABLE "VehicleCheckItem"
ADD COLUMN "executionCompletedAt" TIMESTAMP(3);

UPDATE "VehicleCheckItem"
SET "executionCompletedAt" = COALESCE("updatedAt", CURRENT_TIMESTAMP)
WHERE "executionMode" = 'ON_SITE'
  AND "vehicleCheckId" IN (
    SELECT "id"
    FROM "VehicleCheck"
    WHERE "status" = 'COMPLETED'
  );
