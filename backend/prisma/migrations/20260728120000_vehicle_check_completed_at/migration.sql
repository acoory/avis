ALTER TABLE "VehicleCheck"
ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "VehicleCheck" AS vehicle_check
SET "completedAt" = CASE
  WHEN vehicle_check."status" = 'CLOSED_NO_DAMAGE' THEN
    COALESCE(
      vehicle_check."summaryFinalizedAt",
      vehicle_check."fieldCompletedAt",
      vehicle_check."updatedAt"
    )
  WHEN vehicle_check."status" = 'COMPLETED' THEN
    GREATEST(
      COALESCE(
        (
          SELECT MAX(item."executionCompletedAt")
          FROM "VehicleCheckItem" AS item
          WHERE item."vehicleCheckId" = vehicle_check."id"
        ),
        '-infinity'::timestamp
      ),
      COALESCE(
        (
          SELECT public_share."vehicleRecoveredAt"
          FROM "VehicleCheckPublicShare" AS public_share
          WHERE public_share."vehicleCheckId" = vehicle_check."id"
        ),
        '-infinity'::timestamp
      ),
      COALESCE(vehicle_check."summaryFinalizedAt", '-infinity'::timestamp),
      vehicle_check."updatedAt"
    )
  ELSE NULL
END
WHERE vehicle_check."status" IN ('CLOSED_NO_DAMAGE', 'COMPLETED');

CREATE INDEX "VehicleCheck_completedAt_idx"
ON "VehicleCheck"("completedAt");
