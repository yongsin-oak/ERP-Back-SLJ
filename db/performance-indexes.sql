-- ─────────────────────────────────────────────────────────────────────────────
-- Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Production runs with synchronize=false (see db/data-source.ts) and the repo has
-- no TypeORM migrations configured, so index changes ship as a reviewed deploy
-- step — same convention as db/backfill-order-number.sql.
--
-- HOW TO RUN
--   psql "$DATABASE_URL" -f db/performance-indexes.sql
--
--   • Every statement uses CREATE INDEX CONCURRENTLY so writes are not blocked.
--     A plain CREATE INDEX on "order" or order_detail takes a lock that stalls
--     every insert for the duration — do not remove CONCURRENTLY.
--   • CONCURRENTLY cannot run inside a transaction block. Do NOT wrap this file
--     in BEGIN/COMMIT, and do not run it through a tool that opens one implicitly.
--   • Each statement is independent and re-runnable (IF NOT EXISTS).
--   • If a CONCURRENTLY build fails it leaves an INVALID index behind. Check with
--       SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--     then DROP INDEX CONCURRENTLY that name and re-run the statement.
--   • On a large table each build takes minutes. Run during a quiet window.
--
-- MEASURE FIRST. Per .claude/skills/standard-database-query-review, these are
-- predicted from query shape, not from observed plans. Before adding an index,
-- EXPLAIN (ANALYZE, BUFFERS) the endpoint it targets; after adding it, re-run to
-- confirm the plan actually changed. Drop anything that does not earn its keep —
-- every index is write overhead on the POS hot path.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Product search (highest impact) ───────────────────────────────────────
-- applyKeywordSearch builds `col ILIKE '%token%'` and dropdownSearch adds
-- `similarity(barcode, …)`. A leading wildcard makes a B-tree useless, so today
-- the POS typeahead sequentially scans product on every keystroke in production.
-- src/modules/product/product.service.ts creates the name index at runtime but
-- only when NODE_ENV != 'production' — these are the production equivalents.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS product_name_trgm_idx
  ON product USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS product_barcode_trgm_idx
  ON product USING gin (barcode gin_trgm_ops);

-- ⚠️ SCOPE OF THE ABOVE — read before assuming the typeahead got faster.
-- gin_trgm_ops serves ILIKE '%x%' patterns, so these indexes DO help the plain
-- keyword paths (applyKeywordSearch, and applySmartSearch when fuzzy is off).
-- They do NOT help the fuzzy branch: applySmartSearch emits
--     similarity(col, :term) >= :threshold        (src/common/helpers/query.helper.ts)
-- and a function call compared with >= is not an indexable operator for
-- gin_trgm_ops — only the `%` operator is. Because that arm is OR'd with the
-- ILIKE arm, the whole predicate still seq-scans on the fuzzy dropdown search.
-- To make the index pay off there, that branch has to become
--     col % :term        with SET pg_trgm.similarity_threshold = 0.3
-- which is an application change in query.helper.ts, not an index change.


-- ── 2. Low-stock lookups ─────────────────────────────────────────────────────
-- /dashboard/low-stock filters `remaining <= :threshold` and sorts by remaining;
-- the column has no index.
-- NOT partial on isActive: getLowStock has no isActive predicate (see
-- src/modules/dashboard/dashboard.service.ts getLowStock), so a partial index
-- would be unusable by the query it exists for.
CREATE INDEX CONCURRENTLY IF NOT EXISTS product_remaining_idx
  ON product (remaining);

-- getStats counts `remaining <= COALESCE("minStock", 5)` — an expression over two
-- columns that no plain B-tree can serve. Only add this if that count shows up in
-- a slow plan; an expression index costs write time on every product update.
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS product_lowstock_expr_idx
--   ON product ((remaining - COALESCE("minStock", 5)))
--   WHERE "isActive" = true;


-- ── 3. Order list, dashboard and reports ─────────────────────────────────────
-- "order" is a reserved word in Postgres and the columns keep camelCase, so both
-- need double quotes.
--
-- findAll filters shopId/status/date but always sorts createdAt DESC. Separate
-- single-column indexes force Postgres to pick one and sort the rest; these
-- composites serve filter and sort together.
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_shop_created_idx
  ON "order" ("shopId", "createdAt" DESC);

-- Dashboard and report aggregates now filter status = 'completed' over a date
-- range, which is exactly this composite.
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_status_created_idx
  ON "order" (status, "createdAt" DESC);


-- ── 4. Order detail ──────────────────────────────────────────────────────────
-- order-detail findAll filters orderId and sorts createdAt DESC. Also the join
-- key for every revenue aggregate.
CREATE INDEX CONCURRENTLY IF NOT EXISTS order_detail_order_created_idx
  ON order_detail ("orderId", "createdAt" DESC);


-- ── 5. Stock entry ───────────────────────────────────────────────────────────
-- stock-entry findAll filters productBarcode and sorts createdAt DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS stock_entry_product_created_idx
  ON stock_entry ("productBarcode", "createdAt" DESC);


-- ── 6. Dropdown keyset cursors ───────────────────────────────────────────────
-- Every /<entity>/dropdown-search runs the same shape (src/common/helpers/cursor.helper.ts):
--
--   WHERE (name, id) > ($cursorName, $cursorId)
--   ORDER BY name, id
--   LIMIT $limit + 1
--
-- The row-wise comparison and the sort share one tuple, so a composite index on
-- exactly (name, id) turns each page into a single index seek plus a short scan
-- — no sort node, and no growing cost as the user scrolls deeper. That last part
-- is the whole point of moving dropdowns off OFFSET: an offset page N had to walk
-- and discard N×limit rows, so the picker got slower the further it scrolled.
--
-- Column order matters: (id, name) would not serve this query at all.
-- Note the quoted mixed-case identifiers — TypeORM creates camelCase columns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS brand_name_id_idx
  ON brand (name, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS category_name_id_idx
  ON category (name, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS supplier_name_id_idx
  ON supplier (name, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS shop_name_id_idx
  ON shop (name, id);

-- Employee has no single name column — the picker sorts on firstName.
CREATE INDEX CONCURRENTLY IF NOT EXISTS employee_firstname_id_idx
  ON employee ("firstName", id);

-- Product keys on its PK, barcode. product_name_trgm_idx above serves the
-- *matching* half (ILIKE '%…%' / similarity); this serves the keyset seek.
CREATE INDEX CONCURRENTLY IF NOT EXISTS product_name_barcode_idx
  ON product (name, barcode);


-- ── Verify ───────────────────────────────────────────────────────────────────
-- All indexes valid?
--   SELECT indexrelid::regclass AS index, indisvalid
--   FROM pg_index WHERE indexrelid::regclass::text LIKE ANY (ARRAY[
--     'product_%', 'order_%', 'stock_entry_%',
--     'brand_%', 'category_%', 'supplier_%', 'shop_%', 'employee_%']);
--
-- Actually being used, after some production traffic?
--   SELECT relname, indexrelname, idx_scan
--   FROM pg_stat_user_indexes
--   WHERE indexrelname IN (
--     'product_name_trgm_idx', 'product_barcode_trgm_idx',
--     'product_remaining_active_idx', 'order_shop_created_idx',
--     'order_status_created_idx', 'order_detail_order_created_idx',
--     'stock_entry_product_created_idx',
--     'brand_name_id_idx', 'category_name_id_idx', 'supplier_name_id_idx',
--     'shop_name_id_idx', 'employee_firstname_id_idx', 'product_name_barcode_idx')
--   ORDER BY idx_scan;
-- An idx_scan of 0 after a representative period means the index is pure
-- overhead — drop it.
