CREATE TYPE "VehicleCheckStatus_new" AS ENUM (
    'DRAFT',
    'TO_ANALYZE',
    'SUMMARY_READY',
    'CANCELLED'
);

ALTER TABLE "VehicleCheck"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "VehicleCheck"
ALTER COLUMN "status" TYPE "VehicleCheckStatus_new"
USING (
    CASE "status"::text
        WHEN 'COMPLETED' THEN 'SUMMARY_READY'
        ELSE "status"::text
    END
)::"VehicleCheckStatus_new";

DROP TYPE "VehicleCheckStatus";
ALTER TYPE "VehicleCheckStatus_new" RENAME TO "VehicleCheckStatus";

ALTER TABLE "VehicleCheck"
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "VehicleCheck"
ADD COLUMN "fieldCompletedAt" TIMESTAMP(3),
ADD COLUMN "summaryFinalizedAt" TIMESTAMP(3);

UPDATE "VehicleCheck"
SET
    "fieldCompletedAt" = COALESCE("updatedAt", "checkDate"),
    "summaryFinalizedAt" = COALESCE("updatedAt", "checkDate")
WHERE "status" = 'SUMMARY_READY';

ALTER TABLE "VehicleCheckItem"
ADD COLUMN "selectedForSummary" BOOLEAN NOT NULL DEFAULT true;
