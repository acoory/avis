CREATE TYPE "ProviderType" AS ENUM ('DEALERSHIP', 'BODYSHOP', 'GARAGE', 'TIRE_SHOP', 'ASSISTANCE', 'OTHER');
CREATE TYPE "InterventionType" AS ENUM ('BODYWORK', 'DENT_REMOVAL', 'TIRES', 'MECHANICAL', 'SERVICE', 'WINDSHIELD', 'CLEANING', 'UPHOLSTERY', 'DIAGNOSTIC', 'EXPERTISE', 'ASSISTANCE', 'OTHER');
CREATE TYPE "DepartureStatus" AS ENUM ('PLANNED', 'TO_PREPARE', 'READY_TO_LEAVE', 'DEPARTED', 'AT_PROVIDER', 'WORK_IN_PROGRESS', 'READY_FOR_PICKUP', 'PICKUP_PLANNED', 'RETURNED', 'CANCELLED');
CREATE TYPE "DeparturePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "DepartureAttachmentType" AS ENUM ('PHOTO', 'DOCUMENT', 'QUOTE', 'OTHER');

CREATE TABLE "Vehicle" ("id" TEXT NOT NULL, "registration" TEXT NOT NULL, "brand" TEXT, "model" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Provider" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "type" "ProviderType" NOT NULL, "address" TEXT, "phone" TEXT, "email" TEXT, "contactName" TEXT, "notes" TEXT, "displayOrder" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Provider_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VehicleDeparture" ("id" TEXT NOT NULL, "vehicleId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "interventionType" "InterventionType" NOT NULL, "status" "DepartureStatus" NOT NULL DEFAULT 'PLANNED', "description" TEXT, "priority" "DeparturePriority" NOT NULL DEFAULT 'NORMAL', "appointmentAt" TIMESTAMP(3), "plannedDepartureAt" TIMESTAMP(3), "departedAt" TIMESTAMP(3), "estimatedReturnAt" TIMESTAMP(3), "readyAt" TIMESTAMP(3), "returnedAt" TIMESTAMP(3), "estimatedCost" DECIMAL(12,2), "quotedCost" DECIMAL(12,2), "actualCost" DECIMAL(12,2), "assignedUserId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "VehicleDeparture_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DepartureHistory" ("id" TEXT NOT NULL, "departureId" TEXT NOT NULL, "userId" TEXT, "action" TEXT NOT NULL, "oldValue" JSONB, "newValue" JSONB, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DepartureHistory_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DepartureComment" ("id" TEXT NOT NULL, "departureId" TEXT NOT NULL, "userId" TEXT, "message" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DepartureComment_pkey" PRIMARY KEY ("id"));
CREATE TABLE "DepartureAttachment" ("id" TEXT NOT NULL, "departureId" TEXT NOT NULL, "type" "DepartureAttachmentType" NOT NULL, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DepartureAttachment_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "Vehicle_registration_key" ON "Vehicle"("registration");
CREATE INDEX "Vehicle_registration_idx" ON "Vehicle"("registration");
CREATE UNIQUE INDEX "Provider_name_key" ON "Provider"("name");
CREATE INDEX "Provider_isActive_displayOrder_idx" ON "Provider"("isActive", "displayOrder");
CREATE INDEX "VehicleDeparture_vehicleId_status_idx" ON "VehicleDeparture"("vehicleId", "status");
CREATE INDEX "VehicleDeparture_providerId_status_idx" ON "VehicleDeparture"("providerId", "status");
CREATE INDEX "VehicleDeparture_status_createdAt_idx" ON "VehicleDeparture"("status", "createdAt");
CREATE INDEX "VehicleDeparture_estimatedReturnAt_idx" ON "VehicleDeparture"("estimatedReturnAt");
CREATE UNIQUE INDEX "VehicleDeparture_one_active_per_vehicle" ON "VehicleDeparture"("vehicleId") WHERE "status" NOT IN ('RETURNED', 'CANCELLED');
CREATE INDEX "DepartureHistory_departureId_createdAt_idx" ON "DepartureHistory"("departureId", "createdAt");
CREATE INDEX "DepartureHistory_userId_idx" ON "DepartureHistory"("userId");
CREATE INDEX "DepartureComment_departureId_createdAt_idx" ON "DepartureComment"("departureId", "createdAt");
CREATE INDEX "DepartureComment_userId_idx" ON "DepartureComment"("userId");
CREATE INDEX "DepartureAttachment_departureId_createdAt_idx" ON "DepartureAttachment"("departureId", "createdAt");

ALTER TABLE "VehicleDeparture" ADD CONSTRAINT "VehicleDeparture_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDeparture" ADD CONSTRAINT "VehicleDeparture_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VehicleDeparture" ADD CONSTRAINT "VehicleDeparture_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartureHistory" ADD CONSTRAINT "DepartureHistory_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "VehicleDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartureHistory" ADD CONSTRAINT "DepartureHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartureComment" ADD CONSTRAINT "DepartureComment_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "VehicleDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DepartureComment" ADD CONSTRAINT "DepartureComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DepartureAttachment" ADD CONSTRAINT "DepartureAttachment_departureId_fkey" FOREIGN KEY ("departureId") REFERENCES "VehicleDeparture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
