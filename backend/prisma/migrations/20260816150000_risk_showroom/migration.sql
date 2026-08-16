ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RISK_CLOSED';

CREATE TYPE "RiskVehicleStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CLOSED');
CREATE TYPE "RiskAssignmentRole" AS ENUM ('PRIMARY', 'PARTICIPANT');
CREATE TYPE "RiskPhotoCategory" AS ENUM (
  'EXTERIOR_FRONT_THREE_QUARTER',
  'EXTERIOR_REAR_THREE_QUARTER',
  'DASHBOARD',
  'INTERIOR_FRONT',
  'INTERIOR_REAR',
  'TRUNK',
  'WHEEL_FRONT_LEFT',
  'WHEEL_FRONT_RIGHT',
  'WHEEL_REAR_LEFT',
  'WHEEL_REAR_RIGHT',
  'TIRE_WEAR',
  'TIRE_DAMAGE',
  'DAMAGE_WIDE',
  'DAMAGE_CLOSE_UP'
);

CREATE TABLE "RiskVehicle" (
  "id" TEXT NOT NULL,
  "riskNumber" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "manufacturerId" TEXT NOT NULL,
  "licensePlate" TEXT NOT NULL,
  "licensePlateRaw" TEXT,
  "licensePlateCountry" TEXT NOT NULL DEFAULT 'FR',
  "licensePlateRecognitionConfidence" DOUBLE PRECISION,
  "status" "RiskVehicleStatus" NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "closedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskVehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskVehicleAssignment" (
  "id" TEXT NOT NULL,
  "riskVehicleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "RiskAssignmentRole" NOT NULL DEFAULT 'PARTICIPANT',
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskVehicleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskPhoto" (
  "id" TEXT NOT NULL,
  "riskVehicleId" TEXT NOT NULL,
  "slotKey" TEXT NOT NULL,
  "category" "RiskPhotoCategory" NOT NULL,
  "damageGroupId" TEXT,
  "publicId" TEXT NOT NULL,
  "assetId" TEXT,
  "secureUrl" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "format" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskPhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskConversation" (
  "id" TEXT NOT NULL,
  "riskVehicleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskMessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "publicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "secureUrl" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "format" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RiskStatusHistory" (
  "id" TEXT NOT NULL,
  "riskVehicleId" TEXT NOT NULL,
  "actorId" TEXT,
  "fromStatus" "RiskVehicleStatus" NOT NULL,
  "toStatus" "RiskVehicleStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RiskStatusHistory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification"
  ADD COLUMN "riskVehicleId" TEXT,
  ADD COLUMN "riskMessageId" TEXT;

CREATE UNIQUE INDEX "RiskVehicle_riskNumber_key" ON "RiskVehicle"("riskNumber");
CREATE UNIQUE INDEX "RiskVehicle_licensePlateCountry_licensePlate_key" ON "RiskVehicle"("licensePlateCountry", "licensePlate");
CREATE INDEX "RiskVehicle_creatorId_idx" ON "RiskVehicle"("creatorId");
CREATE INDEX "RiskVehicle_agencyId_idx" ON "RiskVehicle"("agencyId");
CREATE INDEX "RiskVehicle_manufacturerId_idx" ON "RiskVehicle"("manufacturerId");
CREATE INDEX "RiskVehicle_status_idx" ON "RiskVehicle"("status");
CREATE INDEX "RiskVehicle_updatedAt_idx" ON "RiskVehicle"("updatedAt");

CREATE UNIQUE INDEX "RiskVehicleAssignment_riskVehicleId_userId_key" ON "RiskVehicleAssignment"("riskVehicleId", "userId");
CREATE INDEX "RiskVehicleAssignment_userId_role_idx" ON "RiskVehicleAssignment"("userId", "role");
CREATE INDEX "RiskVehicleAssignment_assignedById_idx" ON "RiskVehicleAssignment"("assignedById");

CREATE UNIQUE INDEX "RiskPhoto_publicId_key" ON "RiskPhoto"("publicId");
CREATE UNIQUE INDEX "RiskPhoto_riskVehicleId_slotKey_key" ON "RiskPhoto"("riskVehicleId", "slotKey");
CREATE INDEX "RiskPhoto_riskVehicleId_category_idx" ON "RiskPhoto"("riskVehicleId", "category");
CREATE INDEX "RiskPhoto_damageGroupId_idx" ON "RiskPhoto"("damageGroupId");

CREATE UNIQUE INDEX "RiskConversation_riskVehicleId_key" ON "RiskConversation"("riskVehicleId");
CREATE INDEX "RiskConversation_updatedAt_idx" ON "RiskConversation"("updatedAt");
CREATE INDEX "RiskMessage_conversationId_createdAt_idx" ON "RiskMessage"("conversationId", "createdAt");
CREATE INDEX "RiskMessage_authorId_idx" ON "RiskMessage"("authorId");
CREATE UNIQUE INDEX "RiskMessageAttachment_publicId_key" ON "RiskMessageAttachment"("publicId");
CREATE INDEX "RiskMessageAttachment_messageId_idx" ON "RiskMessageAttachment"("messageId");
CREATE INDEX "RiskMessageAttachment_uploadedById_idx" ON "RiskMessageAttachment"("uploadedById");
CREATE INDEX "RiskStatusHistory_riskVehicleId_createdAt_idx" ON "RiskStatusHistory"("riskVehicleId", "createdAt");
CREATE INDEX "RiskStatusHistory_actorId_idx" ON "RiskStatusHistory"("actorId");
CREATE INDEX "Notification_riskVehicleId_idx" ON "Notification"("riskVehicleId");
CREATE INDEX "Notification_riskMessageId_idx" ON "Notification"("riskMessageId");

ALTER TABLE "RiskVehicle" ADD CONSTRAINT "RiskVehicle_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskVehicle" ADD CONSTRAINT "RiskVehicle_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskVehicle" ADD CONSTRAINT "RiskVehicle_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskVehicle" ADD CONSTRAINT "RiskVehicle_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskVehicleAssignment" ADD CONSTRAINT "RiskVehicleAssignment_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskVehicleAssignment" ADD CONSTRAINT "RiskVehicleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RiskVehicleAssignment" ADD CONSTRAINT "RiskVehicleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskPhoto" ADD CONSTRAINT "RiskPhoto_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskConversation" ADD CONSTRAINT "RiskConversation_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskMessage" ADD CONSTRAINT "RiskMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "RiskConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskMessage" ADD CONSTRAINT "RiskMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskMessageAttachment" ADD CONSTRAINT "RiskMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "RiskMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskMessageAttachment" ADD CONSTRAINT "RiskMessageAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RiskStatusHistory" ADD CONSTRAINT "RiskStatusHistory_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskStatusHistory" ADD CONSTRAINT "RiskStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_riskVehicleId_fkey" FOREIGN KEY ("riskVehicleId") REFERENCES "RiskVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_riskMessageId_fkey" FOREIGN KEY ("riskMessageId") REFERENCES "RiskMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
