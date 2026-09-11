CREATE TABLE "UserAgency" (
  "userId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAgency_pkey" PRIMARY KEY ("userId", "agencyId")
);

ALTER TABLE "Provider" ADD COLUMN "agencyId" TEXT;
ALTER TABLE "VehicleDeparture" ADD COLUMN "agencyId" TEXT;

INSERT INTO "UserAgency" ("userId", "agencyId")
SELECT u."id", a."id" FROM "User" u CROSS JOIN "Agency" a
ON CONFLICT DO NOTHING;

UPDATE "Provider" p
SET "agencyId" = (SELECT a."id" FROM "Agency" a WHERE a."isActive" = true ORDER BY a."createdAt" ASC LIMIT 1)
WHERE p."agencyId" IS NULL;

UPDATE "VehicleDeparture" d
SET "agencyId" = p."agencyId"
FROM "Provider" p
WHERE d."providerId" = p."id" AND d."agencyId" IS NULL;

DROP INDEX IF EXISTS "Provider_name_key";
CREATE UNIQUE INDEX "Provider_agencyId_name_key" ON "Provider"("agencyId", "name");
CREATE INDEX "Provider_agencyId_idx" ON "Provider"("agencyId");
CREATE INDEX "VehicleDeparture_agencyId_status_idx" ON "VehicleDeparture"("agencyId", "status");
CREATE INDEX "UserAgency_agencyId_idx" ON "UserAgency"("agencyId");

ALTER TABLE "UserAgency" ADD CONSTRAINT "UserAgency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAgency" ADD CONSTRAINT "UserAgency_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleDeparture" ADD CONSTRAINT "VehicleDeparture_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
