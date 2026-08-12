-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill orderNumber for legacy orders (predate the required-orderNumber rule)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Context: Order.orderNumber changed from nullable → required (NOT NULL) so the
-- UI can show it as the primary identifier instead of the internal id.
--
-- RUN THIS ONCE **before** the API boots with the new entity:
--   • dev (DB_SYNCHRONIZE=true): TypeORM will try `ALTER COLUMN ... SET NOT NULL`
--     on startup — it FAILS if any row still has NULL. Run the UPDATE below first,
--     then restart the API.
--   • prod (DB_SYNCHRONIZE=false): schema is not auto-altered — run BOTH statements
--     as a deploy step.
--
-- "order" is a reserved word in Postgres and the column keeps camelCase, so both
-- are double-quoted.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Backfill: legacy NULL orderNumbers fall back to the order id.
UPDATE "order" SET "orderNumber" = "id" WHERE "orderNumber" IS NULL;

-- 2) Enforce at DB level (needed only when synchronize=false; harmless otherwise).
ALTER TABLE "order" ALTER COLUMN "orderNumber" SET NOT NULL;
