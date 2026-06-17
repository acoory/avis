ALTER TABLE "Agency" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Agency_isActive_idx" ON "Agency"("isActive");
