ALTER TABLE "Agency" ADD COLUMN "code" TEXT;
ALTER TABLE "Agency" ADD COLUMN "region" TEXT;

WITH normalized_agencies AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        UPPER(
          TRIM(
            BOTH '_'
            FROM REGEXP_REPLACE(
              REGEXP_REPLACE("city" || '_' || "name", '[^A-Za-z0-9]+', '_', 'g'),
              '_+',
              '_',
              'g'
            )
          )
        ),
        ''
      ),
      'AGENCY'
    ) AS "baseCode"
  FROM "Agency"
),
ranked_agencies AS (
  SELECT
    "id",
    "baseCode",
    COUNT(*) OVER (PARTITION BY "baseCode") AS "codeCount"
  FROM normalized_agencies
)
UPDATE "Agency"
SET
  "code" = CASE
    WHEN ranked_agencies."codeCount" = 1 THEN ranked_agencies."baseCode"
    ELSE ranked_agencies."baseCode" || '_' || SUBSTRING("Agency"."id" FROM 1 FOR 8)
  END,
  "region" = 'A definir'
FROM ranked_agencies
WHERE "Agency"."id" = ranked_agencies."id";

ALTER TABLE "Agency" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "Agency" ALTER COLUMN "region" SET NOT NULL;

CREATE UNIQUE INDEX "Agency_code_key" ON "Agency"("code");
CREATE INDEX "Agency_region_idx" ON "Agency"("region");
