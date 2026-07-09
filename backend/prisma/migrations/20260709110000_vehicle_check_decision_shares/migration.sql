-- CreateTable
CREATE TABLE "VehicleCheckDecisionShare" (
    "id" TEXT NOT NULL,
    "vehicleCheckId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requestComment" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCheckDecisionShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCheckDecisionShare_token_key" ON "VehicleCheckDecisionShare"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCheckDecisionShare_vehicleCheckId_managerId_key" ON "VehicleCheckDecisionShare"("vehicleCheckId", "managerId");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_vehicleCheckId_idx" ON "VehicleCheckDecisionShare"("vehicleCheckId");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_managerId_idx" ON "VehicleCheckDecisionShare"("managerId");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_token_idx" ON "VehicleCheckDecisionShare"("token");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_isEnabled_idx" ON "VehicleCheckDecisionShare"("isEnabled");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_emailSentAt_idx" ON "VehicleCheckDecisionShare"("emailSentAt");

-- CreateIndex
CREATE INDEX "VehicleCheckDecisionShare_createdById_idx" ON "VehicleCheckDecisionShare"("createdById");

-- AddForeignKey
ALTER TABLE "VehicleCheckDecisionShare" ADD CONSTRAINT "VehicleCheckDecisionShare_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckDecisionShare" ADD CONSTRAINT "VehicleCheckDecisionShare_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckDecisionShare" ADD CONSTRAINT "VehicleCheckDecisionShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
