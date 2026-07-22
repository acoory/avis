CREATE TYPE "RepairExecutionMode" AS ENUM ('ON_SITE', 'EXTERNAL_PROVIDER');

ALTER TABLE "VehicleCheckItem"
ADD COLUMN "executionMode" "RepairExecutionMode";

UPDATE "VehicleCheckItem"
SET "executionMode" = 'EXTERNAL_PROVIDER'
WHERE "selectedForSummary" = true
  AND "vehicleCheckId" IN (
    SELECT "id"
    FROM "VehicleCheck"
    WHERE "summaryFinalizedAt" IS NOT NULL
  );

CREATE INDEX "VehicleCheckItem_executionMode_idx"
ON "VehicleCheckItem"("executionMode");
