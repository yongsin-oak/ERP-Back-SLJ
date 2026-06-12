---
name: standard-performance
description: How to write fast, scalable data access in this TypeORM/Postgres backend — pagination, query building, avoiding N+1, batching, transactions, indexes, and caching. TRIGGER when adding or editing a list/search/aggregate endpoint, a loop that touches the DB, a bulk operation, a multi-step write, or any query you expect to grow with data volume.
---

# Performance

Targets for this codebase: bounded result sets, no N+1, batched writes,
transactional multi-step mutations, and selective column loading. Patterns below
reference real code so you can copy the good ones and avoid the known traps.

## 1. Always paginate lists

Never return an unbounded `find()`. Build a QueryBuilder, apply filters, and hand
it to **`paginateQuery(qb, page, limit, map?)`** — the shared helper does
`skip/take` + `getManyAndCount` + the paginated envelope. Don't hand-roll that
boilerplate per service. Full details: [[standard-list-query]].

```ts
const qb = this.repo.createQueryBuilder('x').orderBy('x.name', 'ASC');
applyKeywordSearch(qb, ['x.name'], search);   // smart multi-token search helper
return paginateQuery(qb, page, limit);
```

- Extend `PaginatedGetAllDto` (required page/limit) or `PaginatedListQueryDto`
  (optional, defaulted, max 200) for query DTOs; enforce a sane max `limit`.
- For typeahead/dropdowns, cap hard and `select` only what the UI needs (see
  `product.dropdownSearch`).

## 2. Avoid N+1 — join, don't loop

- Load relations in one query with `leftJoinAndSelect` (QueryBuilder) or
  `relations: [...]` (`find`), as in `findAll`/`findOne`. Don't fetch a list then
  query each row's relation in a loop.
- **Pattern to follow (already applied):** bulk reads use a single `In([...])`
  query + a `Map` in memory — never one query per row. `product.bulkUpdate`
  validates existence with one `In(...)` then refetches with one `In(...)` reordered
  to the input; `product/brand/employee.createMultiple` check duplicates with one
  query; `checkExist` does `repo.find({ where: { barcode: In(ids) } })`.
- Validate referenced FKs in bulk with one `In(...)`/`count()` lookup, not one query per row.

## 3. Batch writes

- Insert many with a single `repo.save(entities[])`, not a save-per-iteration
  (see `createMultiple`). Same for deletes where the API is bulk.
- When you must loop (per-item error collection like `bulkDelete`), still keep
  each iteration to the minimum queries and consider a transaction (below).

## 4. Use transactions for multi-step mutations

Any operation that writes more than one row and must stay consistent should run
in a transaction (`dataSource.transaction(...)` or a QueryRunner).

- **Reference pattern (already applied):** stock mutations wrap the product update
  **and** the stock_entry write in one `dataSource.transaction`, and load the
  product with a **`pessimistic_write`** lock (`SELECT … FOR UPDATE`) so the
  read-modify-write of `remaining` can't lose a concurrent update — see
  [stock-entry.service.ts](../../../src/modules/stock-entry/stock-entry.service.ts)
  (`applyStockEntry`) and `stock-count.service.ts` (`applyAdjustments`). New
  stock/order/inventory writes that touch multiple tables **must** be transactional.
  The locked read must stay **join-free** (Postgres rejects `FOR UPDATE` on the
  nullable side of an outer join). See [[standard-database-transactions]].

## 5. Select only what you need

- Use `.select([...])` (or `find({ select })`) for list/search responses; don't
  pull jsonb blobs and unused relations into a grid.
- Keep `select: false` on secret columns (`pinHash`, `passwordHash`) — never
  widen them into a default query.

## 6. Index the columns you filter/sort/join on

- Postgres auto-indexes PKs and `unique` columns only. Columns used in `WHERE`,
  `ORDER BY`, or joins at scale (e.g. `brandId`, `categoryId`, `order.startRecordAt`,
  `stock_entry.productBarcode`) should get an `@Index()`.
- `ILIKE '%term%'` (used in product/category search) cannot use a normal B-tree
  index — for large tables consider a trigram (`pg_trgm`) index or full-text
  search instead of leading-wildcard `ILIKE`.

## 7. Aggregations: push down vs in-memory

- The report module aggregates in-memory with Maps over fetched orders
  (see [[route-report]]). That is fine for current volumes but scans the date range
  into app memory. As data grows, move sums/group-bys into SQL
  (`SELECT ... GROUP BY`, `SUM`, `COUNT`) so Postgres does the work and returns
  only the buckets. Dashboard `/stats` already uses SQL aggregates — follow that
  style for new analytics.

## 8. HTTP caching

- Dynamic/authorized data: `@NoCache()` (already the default on most controllers).
- Genuinely static/reference data that rarely changes: `@CacheForMinutes/Hours(n)`
  so clients/proxies can cache (see [[standard-shared-helpers]]). Don't cache per-user or
  mutating responses.

## Quick checklist before merging a data path

- [ ] List endpoint is paginated with a max limit.
- [ ] No relation/lookup inside a per-row loop (no N+1).
- [ ] Bulk reads use `In(...)`; bulk writes use a single `save([])`.
- [ ] Multi-table mutation is wrapped in a transaction (or atomic SQL update).
- [ ] Only needed columns selected; secret columns stay `select:false`.
- [ ] Filter/sort/join columns are indexed; no leading-wildcard `ILIKE` on big tables.
- [ ] Aggregation pushed to SQL when result set is large.

## Related

- [[standard-shared-helpers]] — `paginatedResponse`, `In` usage.
- [[route-stock-entry]] (transaction gap) · [[route-report]] / [[route-dashboard]] (aggregation)
  · [[route-product]] (pagination + bulk patterns) · [[standard-project-structure]].
