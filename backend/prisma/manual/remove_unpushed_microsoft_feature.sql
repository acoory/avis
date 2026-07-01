BEGIN;

DROP TABLE IF EXISTS "MicrosoftOAuthState" CASCADE;
DROP TABLE IF EXISTS "MicrosoftConnection" CASCADE;

DELETE FROM "_prisma_migrations"
WHERE "migration_name" = '20260617180000_microsoft_connections';

COMMIT;
