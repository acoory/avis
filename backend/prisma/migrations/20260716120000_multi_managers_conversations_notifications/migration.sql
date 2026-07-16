-- CreateEnum
CREATE TYPE "VehicleCheckConversationStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');
CREATE TYPE "VehicleCheckConversationParticipantRole" AS ENUM ('REQUESTER', 'DECISION_MAKER', 'OBSERVER');
CREATE TYPE "NotificationType" AS ENUM ('CONVERSATION_MESSAGE', 'CONVERSATION_PARTICIPANT_ADDED', 'CONVERSATION_STATUS_CHANGED', 'TAKEN_IN_CHARGE', 'VEHICLE_RECOVERED');
CREATE TYPE "NotificationEmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "UserManagerAssignment" (
    "id" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "createdById" TEXT,
    CONSTRAINT "UserManagerAssignment_pkey" PRIMARY KEY ("id")
);

-- Preserve every existing manager/collaborator relation before removing User.managerId.
INSERT INTO "UserManagerAssignment" (
    "id", "collaboratorId", "managerId", "isPrimary", "isActive", "assignedAt"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "managerId",
    true,
    true,
    "createdAt"
FROM "User"
WHERE "managerId" IS NOT NULL;

-- CreateTable
CREATE TABLE "VehicleCheckConversation" (
    "id" TEXT NOT NULL,
    "vehicleCheckId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" "VehicleCheckConversationStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleCheckConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleCheckConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VehicleCheckConversationParticipantRole" NOT NULL,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "VehicleCheckConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleCheckMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "VehicleCheckMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleCheckMessageAttachment" (
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
    CONSTRAINT "VehicleCheckMessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleCheckMessageMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "vehicleCheckItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "VehicleCheckMessageMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "vehicleCheckId" TEXT,
    "conversationId" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "route" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationEmail" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "status" "NotificationEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationEmail_pkey" PRIMARY KEY ("id")
);

-- Convert legacy manager decision shares into one conversation per vehicle check.
INSERT INTO "VehicleCheckConversation" (
    "id", "vehicleCheckId", "createdById", "status", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    shares."vehicleCheckId",
    COALESCE(MIN(shares."createdById"), checks."collaboratorId"),
    'OPEN',
    MIN(shares."createdAt"),
    MAX(shares."updatedAt")
FROM "VehicleCheckDecisionShare" shares
JOIN "VehicleCheck" checks ON checks."id" = shares."vehicleCheckId"
GROUP BY shares."vehicleCheckId", checks."collaboratorId";

INSERT INTO "VehicleCheckConversationParticipant" (
    "id", "conversationId", "userId", "role", "joinedAt", "lastReadAt"
)
SELECT
    gen_random_uuid()::text,
    conversations."id",
    checks."collaboratorId",
    'REQUESTER',
    conversations."createdAt",
    conversations."createdAt"
FROM "VehicleCheckConversation" conversations
JOIN "VehicleCheck" checks ON checks."id" = conversations."vehicleCheckId";

INSERT INTO "VehicleCheckConversationParticipant" (
    "id", "conversationId", "userId", "role", "joinedAt"
)
SELECT DISTINCT ON (conversations."id", shares."managerId")
    gen_random_uuid()::text,
    conversations."id",
    shares."managerId",
    'DECISION_MAKER',
    shares."createdAt"
FROM "VehicleCheckDecisionShare" shares
JOIN "VehicleCheckConversation" conversations ON conversations."vehicleCheckId" = shares."vehicleCheckId"
ORDER BY conversations."id", shares."managerId", shares."createdAt";

INSERT INTO "VehicleCheckMessage" (
    "id", "conversationId", "authorId", "body", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    conversations."id",
    COALESCE(shares."createdById", checks."collaboratorId"),
    shares."requestComment",
    shares."createdAt"
FROM "VehicleCheckDecisionShare" shares
JOIN "VehicleCheckConversation" conversations ON conversations."vehicleCheckId" = shares."vehicleCheckId"
JOIN "VehicleCheck" checks ON checks."id" = shares."vehicleCheckId"
WHERE NULLIF(BTRIM(shares."requestComment"), '') IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserManagerAssignment_collaboratorId_managerId_key" ON "UserManagerAssignment"("collaboratorId", "managerId");
CREATE UNIQUE INDEX "UserManagerAssignment_primary_active_key" ON "UserManagerAssignment"("collaboratorId") WHERE "isPrimary" = true AND "isActive" = true;
CREATE INDEX "UserManagerAssignment_collaboratorId_isActive_idx" ON "UserManagerAssignment"("collaboratorId", "isActive");
CREATE INDEX "UserManagerAssignment_managerId_isActive_idx" ON "UserManagerAssignment"("managerId", "isActive");
CREATE INDEX "UserManagerAssignment_createdById_idx" ON "UserManagerAssignment"("createdById");

CREATE UNIQUE INDEX "VehicleCheckConversation_vehicleCheckId_key" ON "VehicleCheckConversation"("vehicleCheckId");
CREATE INDEX "VehicleCheckConversation_createdById_idx" ON "VehicleCheckConversation"("createdById");
CREATE INDEX "VehicleCheckConversation_status_idx" ON "VehicleCheckConversation"("status");
CREATE INDEX "VehicleCheckConversation_updatedAt_idx" ON "VehicleCheckConversation"("updatedAt");

CREATE UNIQUE INDEX "VehicleCheckConversationParticipant_conversationId_userId_key" ON "VehicleCheckConversationParticipant"("conversationId", "userId");
CREATE INDEX "VehicleCheckConversationParticipant_userId_idx" ON "VehicleCheckConversationParticipant"("userId");
CREATE INDEX "VehicleCheckConversationParticipant_conversationId_lastReadAt_idx" ON "VehicleCheckConversationParticipant"("conversationId", "lastReadAt");

CREATE INDEX "VehicleCheckMessage_conversationId_createdAt_idx" ON "VehicleCheckMessage"("conversationId", "createdAt");
CREATE INDEX "VehicleCheckMessage_authorId_idx" ON "VehicleCheckMessage"("authorId");

CREATE UNIQUE INDEX "VehicleCheckMessageAttachment_publicId_key" ON "VehicleCheckMessageAttachment"("publicId");
CREATE INDEX "VehicleCheckMessageAttachment_messageId_idx" ON "VehicleCheckMessageAttachment"("messageId");
CREATE INDEX "VehicleCheckMessageAttachment_uploadedById_idx" ON "VehicleCheckMessageAttachment"("uploadedById");
CREATE INDEX "VehicleCheckMessageAttachment_createdAt_idx" ON "VehicleCheckMessageAttachment"("createdAt");

CREATE UNIQUE INDEX "VehicleCheckMessageMention_messageId_vehicleCheckItemId_key" ON "VehicleCheckMessageMention"("messageId", "vehicleCheckItemId");
CREATE INDEX "VehicleCheckMessageMention_vehicleCheckItemId_idx" ON "VehicleCheckMessageMention"("vehicleCheckItemId");

CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_vehicleCheckId_idx" ON "Notification"("vehicleCheckId");
CREATE INDEX "Notification_conversationId_idx" ON "Notification"("conversationId");
CREATE INDEX "Notification_messageId_idx" ON "Notification"("messageId");

CREATE UNIQUE INDEX "NotificationEmail_notificationId_key" ON "NotificationEmail"("notificationId");
CREATE INDEX "NotificationEmail_status_createdAt_idx" ON "NotificationEmail"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "UserManagerAssignment" ADD CONSTRAINT "UserManagerAssignment_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserManagerAssignment" ADD CONSTRAINT "UserManagerAssignment_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserManagerAssignment" ADD CONSTRAINT "UserManagerAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VehicleCheckConversation" ADD CONSTRAINT "VehicleCheckConversation_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckConversation" ADD CONSTRAINT "VehicleCheckConversation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckConversationParticipant" ADD CONSTRAINT "VehicleCheckConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "VehicleCheckConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckConversationParticipant" ADD CONSTRAINT "VehicleCheckConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessage" ADD CONSTRAINT "VehicleCheckMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "VehicleCheckConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessage" ADD CONSTRAINT "VehicleCheckMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessageAttachment" ADD CONSTRAINT "VehicleCheckMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "VehicleCheckMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessageAttachment" ADD CONSTRAINT "VehicleCheckMessageAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessageMention" ADD CONSTRAINT "VehicleCheckMessageMention_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "VehicleCheckMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleCheckMessageMention" ADD CONSTRAINT "VehicleCheckMessageMention_vehicleCheckItemId_fkey" FOREIGN KEY ("vehicleCheckItemId") REFERENCES "VehicleCheckItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vehicleCheckId_fkey" FOREIGN KEY ("vehicleCheckId") REFERENCES "VehicleCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "VehicleCheckConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "VehicleCheckMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEmail" ADD CONSTRAINT "NotificationEmail_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill targeted provider notifications for existing events.
INSERT INTO "Notification" (
    "id", "recipientId", "type", "vehicleCheckId", "title", "route", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    recipients."userId",
    'TAKEN_IN_CHARGE',
    shares."vehicleCheckId",
    'Demande prise en charge',
    '/dashboard/vehicle-checks/' || shares."vehicleCheckId",
    shares."takenInChargeAt"
FROM "VehicleCheckPublicShare" shares
JOIN "VehicleCheck" checks ON checks."id" = shares."vehicleCheckId"
CROSS JOIN LATERAL (
    SELECT checks."collaboratorId" AS "userId"
    UNION
    SELECT assignments."managerId"
    FROM "UserManagerAssignment" assignments
    JOIN "User" managers ON managers."id" = assignments."managerId" AND managers."isActive" = true
    WHERE assignments."collaboratorId" = checks."collaboratorId" AND assignments."isActive" = true
) recipients
WHERE shares."takenInChargeAt" IS NOT NULL;

INSERT INTO "Notification" (
    "id", "recipientId", "type", "vehicleCheckId", "title", "route", "createdAt"
)
SELECT
    gen_random_uuid()::text,
    recipients."userId",
    'VEHICLE_RECOVERED',
    shares."vehicleCheckId",
    'Vehicule recupere',
    '/dashboard/vehicle-checks/' || shares."vehicleCheckId",
    shares."vehicleRecoveredAt"
FROM "VehicleCheckPublicShare" shares
JOIN "VehicleCheck" checks ON checks."id" = shares."vehicleCheckId"
CROSS JOIN LATERAL (
    SELECT checks."collaboratorId" AS "userId"
    UNION
    SELECT assignments."managerId"
    FROM "UserManagerAssignment" assignments
    JOIN "User" managers ON managers."id" = assignments."managerId" AND managers."isActive" = true
    WHERE assignments."collaboratorId" = checks."collaboratorId" AND assignments."isActive" = true
) recipients
WHERE shares."vehicleRecoveredAt" IS NOT NULL;

-- Remove the legacy one-manager relation only after it has been backfilled.
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";
DROP INDEX "User_managerId_idx";
ALTER TABLE "User" DROP COLUMN "managerId";
