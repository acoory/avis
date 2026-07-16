UPDATE "VehicleCheck" AS vehicle_check
SET "status" = 'COMPLETED'
FROM "VehicleCheckPublicShare" AS public_share
WHERE public_share."vehicleCheckId" = vehicle_check."id"
  AND public_share."vehicleRecoveredAt" IS NOT NULL
  AND vehicle_check."status" = 'SUMMARY_READY';
