-- Drop the previous whole-check revision audit.
-- Repair status history is now tracked per VehicleCheckItem instead.
DROP TABLE IF EXISTS "VehicleCheckRevision";

DROP TYPE IF EXISTS "VehicleCheckRevisionReason";
