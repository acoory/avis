-- CreateTable
CREATE TABLE "ExternalRepairContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRepairContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCheckPublicShare" (
    "id" TEXT NOT NULL,
    "vehicleCheckId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleCheckPublicShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRepairContact_email_key" ON "ExternalRepairContact"("email");

-- CreateIndex
CREATE INDEX "ExternalRepairContact_isActive_idx" ON "ExternalRepairContact"("isActive");

-- CreateIndex
CREATE INDEX "ExternalRepairContact_createdById_idx" ON "ExternalRepairContact"("createdById");

-- CreateIndex
CREATE INDEX "ExternalRepairContact_companyName_idx" ON "ExternalRepairContact"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCheckPublicShare_vehicleCheckId_key" ON "VehicleCheckPublicShare"("vehicleCheckId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleCheckPublicShare_token_key" ON "VehicleCheckPublicShare"("token");

-- CreateIndex
CREATE INDEX "VehicleCheckPublicShare_token_idx" ON "VehicleCheckPublicShare"("token");

-- CreateIndex
CREATE INDEX "VehicleCheckPublicShare_isEnabled_idx" ON "VehicleCheckPublicShare"("isEnabled");

-- CreateIndex
CREATE INDEX "VehicleCheckPublicShare_createdById_idx" ON "VehicleCheckPublicShare"("createdById");

-- AddForeignKey
ALTER TABLE "ExternalRepairContact" ADD CONSTRAINT "ExternalRepairContact_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckPublicShare" ADD CONSTRAINT "VehicleCheckPublicShare_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCheckPublicShare" ADD CONSTRAINT "VehicleCheckPublicShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
