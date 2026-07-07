-- CreateTable
CREATE TABLE "ExternalRepairCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRepairCompany_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ExternalRepairContact" ADD COLUMN "companyId" TEXT;

-- Backfill companies from existing contact companyName values.
INSERT INTO "ExternalRepairCompany" ("id", "name", "createdById", "createdAt", "updatedAt")
SELECT
    CONCAT('company_', md5(BTRIM("companyName"))),
    BTRIM("companyName") AS "name",
    MIN("createdById") AS "createdById",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ExternalRepairContact"
WHERE NULLIF(BTRIM("companyName"), '') IS NOT NULL
GROUP BY BTRIM("companyName")
ON CONFLICT DO NOTHING;

UPDATE "ExternalRepairContact" AS contact
SET "companyId" = company."id"
FROM "ExternalRepairCompany" AS company
WHERE NULLIF(BTRIM(contact."companyName"), '') IS NOT NULL
  AND BTRIM(contact."companyName") = company."name";

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRepairCompany_name_key" ON "ExternalRepairCompany"("name");

-- CreateIndex
CREATE INDEX "ExternalRepairCompany_isActive_idx" ON "ExternalRepairCompany"("isActive");

-- CreateIndex
CREATE INDEX "ExternalRepairCompany_createdById_idx" ON "ExternalRepairCompany"("createdById");

-- CreateIndex
CREATE INDEX "ExternalRepairCompany_name_idx" ON "ExternalRepairCompany"("name");

-- CreateIndex
CREATE INDEX "ExternalRepairContact_companyId_idx" ON "ExternalRepairContact"("companyId");

-- AddForeignKey
ALTER TABLE "ExternalRepairCompany" ADD CONSTRAINT "ExternalRepairCompany_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalRepairContact" ADD CONSTRAINT "ExternalRepairContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "ExternalRepairCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
