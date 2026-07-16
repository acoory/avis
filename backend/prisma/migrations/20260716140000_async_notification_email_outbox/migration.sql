-- Turn the existing notification email outbox into a durable asynchronous queue.
ALTER TYPE "NotificationEmailStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

ALTER TABLE "NotificationEmail"
ADD COLUMN "processingStartedAt" TIMESTAMP(3),
ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE INDEX "NotificationEmail_status_nextAttemptAt_createdAt_idx"
ON "NotificationEmail"("status", "nextAttemptAt", "createdAt");
