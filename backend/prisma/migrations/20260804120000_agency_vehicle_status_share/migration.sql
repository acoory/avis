-- CreateTable
CREATE TABLE "AgencyVehicleStatusShare" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyVehicleStatusShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVehicleStatusShare_agencyId_key" ON "AgencyVehicleStatusShare"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVehicleStatusShare_token_key" ON "AgencyVehicleStatusShare"("token");

-- CreateIndex
CREATE INDEX "AgencyVehicleStatusShare_token_idx" ON "AgencyVehicleStatusShare"("token");

-- CreateIndex
CREATE INDEX "AgencyVehicleStatusShare_isEnabled_idx" ON "AgencyVehicleStatusShare"("isEnabled");

-- AddForeignKey
ALTER TABLE "AgencyVehicleStatusShare" ADD CONSTRAINT "AgencyVehicleStatusShare_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
