-- Add permanent, encrypted personal access-code metadata to users.
ALTER TABLE "User"
ADD COLUMN "publicAccessCodeHash" TEXT,
ADD COLUMN "publicAccessCodeEncrypted" TEXT,
ADD COLUMN "publicAccessCodeFingerprint" TEXT,
ADD COLUMN "publicAccessCodeVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "publicAccessCodeIssuedAt" TIMESTAMP(3),
ADD COLUMN "publicAccessCodeFailedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "publicAccessCodeLockedUntil" TIMESTAMP(3),
ADD COLUMN "publicAccessCodeLastEmailedAt" TIMESTAMP(3),
ADD COLUMN "publicAccessCodeEmailWindowAt" TIMESTAMP(3),
ADD COLUMN "publicAccessCodeEmailCount" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "User_publicAccessCodeFingerprint_key"
ON "User"("publicAccessCodeFingerprint");

-- Remember verified devices with revocable, server-side sessions.
CREATE TABLE "PublicAccessSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "codeVersion" INTEGER NOT NULL,
    "userAgentHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicAccessSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicAccessSession_tokenHash_key"
ON "PublicAccessSession"("tokenHash");
CREATE INDEX "PublicAccessSession_userId_revokedAt_expiresAt_idx"
ON "PublicAccessSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "PublicAccessSession_expiresAt_idx"
ON "PublicAccessSession"("expiresAt");

ALTER TABLE "PublicAccessSession"
ADD CONSTRAINT "PublicAccessSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
