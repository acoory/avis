-- The original Risk migration was applied in two versions across environments.
-- Preserve existing values and add the fields only where they are missing.
ALTER TABLE "RiskVehicle"
  ADD COLUMN IF NOT EXISTS "vehicleModelId" TEXT,
  ADD COLUMN IF NOT EXISTS "mileage" INTEGER,
  ADD COLUMN IF NOT EXISTS "vin" TEXT;

CREATE INDEX IF NOT EXISTS "RiskVehicle_vehicleModelId_idx"
  ON "RiskVehicle"("vehicleModelId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = '"RiskVehicle"'::regclass
      AND conname = 'RiskVehicle_vehicleModelId_fkey'
  ) THEN
    ALTER TABLE "RiskVehicle"
      ADD CONSTRAINT "RiskVehicle_vehicleModelId_fkey"
      FOREIGN KEY ("vehicleModelId") REFERENCES "VehicleModel"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
