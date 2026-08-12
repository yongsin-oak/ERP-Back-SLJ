---
name: standard-database-query-review
description: Diagnose and review TypeORM/PostgreSQL query performance using query plans and measured evidence. TRIGGER when an API or report is slow, query count grows with result size, adding or changing an index, reviewing joins, filters, sorts or aggregates, using EXPLAIN, setting a performance budget, or validating a database performance optimization.
---

# Database Query Review

Measure before optimizing. Identify whether latency comes from query count,
rows scanned, join expansion, sorting, locking, network payload, or application
mapping before changing indexes or SQL.

Read [[standard-performance]] and [[standard-list-query]] first for normal query
construction rules. Use this skill for evidence-based diagnosis and verification.

## Investigation workflow

1. Reproduce with realistic parameters and data volume.
2. Record endpoint latency, response row count/payload size, and SQL query count.
3. Capture the exact SQL and bound parameter shapes without logging secrets.
4. Run `EXPLAIN (ANALYZE, BUFFERS)` only on a safe environment and representative
   query. `ANALYZE` executes the statement; do not use it on a mutating query or
   production without explicit authorization.
5. Find the dominant cost: repeated queries, large scan, bad estimate, join
   multiplication, sort/hash spill, lock wait, or excessive returned columns.
6. Make the smallest change that addresses the measured cause.
7. Repeat the same measurement and record before/after evidence.

Do not claim a performance improvement from code inspection alone.

## Read the plan

Check:

- estimated rows versus actual rows;
- sequential scan size and rows removed by filter;
- index condition versus residual filter;
- nested-loop iterations and repeated inner scans;
- sort method and disk usage;
- hash batches or temporary I/O;
- shared buffer hits versus reads;
- planning time versus execution time;
- duplicate rows introduced by to-many joins.

A sequential scan is not automatically wrong: it is often optimal for a small
table or a query returning a large fraction of rows.

## Query count and N+1

The number of SQL statements must remain roughly constant as the page size grows.
If it scales per result row:

- join a to-one relation;
- bulk-load identifiers with `In(...)` and map in memory;
- aggregate or batch in SQL;
- avoid lazy relation access in serializers and mappers.

Do not solve N+1 by joining every relation. To-many joins can multiply rows,
break pagination counts, and transfer more data than a bounded second query.

## Index decisions

Add an index only for a demonstrated access pattern.

- Put equality predicates before range/sort columns in a composite index when
  supported by the measured query pattern.
- Match index ordering to the actual `WHERE` and `ORDER BY`.
- Consider a partial index for a stable, frequently queried subset.
- Use `pg_trgm` GIN/GiST or full-text search for large leading-wildcard searches;
  a normal B-tree does not accelerate `ILIKE '%term%'`.
- Remember PostgreSQL already indexes primary keys and unique constraints.
- Check write amplification, index size, and redundant-prefix indexes.
- Add production indexes through a reviewed migration with a rollback plan;
  consider concurrent creation where blocking is unacceptable.

Do not add one index per filtered column without checking combined access patterns.

## Aggregation and pagination

- Push large `SUM`, `COUNT`, grouping, and filtering work into PostgreSQL.
- Avoid loading a date range into Node.js solely to aggregate it.
- Paginate before expensive response mapping.
- For deep offset pagination that becomes measurably slow, consider a stable
  keyset cursor; do not change pagination semantics without coordinating clients.
- Keep count queries under review: joins and `DISTINCT` can make total counts more
  expensive than the data page.
- Select only response columns per [[standard-response-contracts]].

## Locking and writes

When latency involves writes, separate CPU/query-plan cost from lock waits.
Inspect transaction scope and concurrent access before adding an index.

- Keep transactions short.
- Lock rows in a consistent order.
- Use atomic SQL or `pessimistic_write` for shared read-modify-write state.
- Keep locked reads join-free when PostgreSQL locking rules require it.
- Follow [[standard-database-transactions]] for correctness; a faster race
  condition is not an optimization.

## Performance budget

Define a budget appropriate to the endpoint before tuning:

- maximum page size and response payload;
- expected SQL query count;
- p95 latency target in a named environment;
- maximum rows scanned relative to rows returned;
- acceptable database and application CPU/memory.

Do not encode universal millisecond or query-count limits without measured
environment baselines. Record the dataset size and environment with benchmark
results so comparisons remain meaningful.

## Review checklist

- [ ] Reproduction uses representative parameters and volume.
- [ ] Baseline includes latency, query count, rows returned, and payload size.
- [ ] Plan analysis identifies the dominant measured cost.
- [ ] The change does not introduce N+1, unbounded reads, or incorrect pagination.
- [ ] New index matches a real query and has migration/rollback consideration.
- [ ] Transaction and concurrency correctness remain intact.
- [ ] Before/after measurements use the same workload and environment.

## Related

- [[standard-performance]] — default scalable data-access rules.
- [[standard-list-query]] — canonical filtering and pagination.
- [[standard-database-transactions]] — locking and atomic writes.
- [[standard-response-contracts]] — selective columns and payload control.
