\set ON_ERROR_STOP on
BEGIN;
-- Temporary tables shadow application tables; all test changes are rolled back.
CREATE TEMP TABLE "VehicleModel" ("id" TEXT PRIMARY KEY);
CREATE TEMP TABLE "RiskVehicle" ("id" TEXT PRIMARY KEY, "licensePlate" TEXT NOT NULL);
INSERT INTO "VehicleModel" VALUES ('model-1');
INSERT INTO "RiskVehicle" VALUES ('risk-1', 'AA123BB');

-- Production layout: the three historical fields are absent.
\ir ../prisma/migrations/20260909090000_reconcile_risk_vehicle_fields/migration.sql
UPDATE "RiskVehicle" SET "vehicleModelId" = 'model-1', "mileage" = 45200, "vin" = 'TEST-VIN' WHERE "id" = 'risk-1';

-- Development layout: columns, index and foreign key already exist and contain data.
\ir ../prisma/migrations/20260909090000_reconcile_risk_vehicle_fields/migration.sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "RiskVehicle" WHERE "id" = 'risk-1' AND "licensePlate" = 'AA123BB' AND "mileage" = 45200 AND "vin" = 'TEST-VIN' AND "vehicleModelId" = 'model-1') THEN
    RAISE EXCEPTION 'Existing vehicle data was not preserved';
  END IF;
  BEGIN
    UPDATE "RiskVehicle" SET "vehicleModelId" = 'missing-model';
    RAISE EXCEPTION 'Foreign key was not enforced';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END $$;
DELETE FROM "VehicleModel" WHERE "id" = 'model-1';
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "RiskVehicle" WHERE "vehicleModelId" IS NOT NULL) THEN
    RAISE EXCEPTION 'ON DELETE SET NULL was not applied';
  END IF;
END $$;
ROLLBACK;
