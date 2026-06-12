---
name: standard-database-transactions
description: When and how to wrap multi-step / multi-table writes in a TypeORM transaction (or atomic SQL) so partial failures can't corrupt data. TRIGGER when a service writes more than one row/table in one operation, mutates a counter like product.remaining, cascades child rows, or does read-modify-write on shared state.
---

# Database Transaction Standard

Rule: **any operation that must leave the DB consistent across more than one
write runs in a single transaction.** A partial success is a bug.

## When a transaction is required

- Writing to **two or more tables** in one logical operation
  (e.g. order + order_detail, stock_entry + product.remaining).
- **Read-modify-write** on a shared field (stock counts, balances) — concurrent
  requests can otherwise lose updates.
- **Bulk** operations that must be all-or-nothing.

A single `repo.save(oneEntity)` or a single cascade `save` (TypeORM wraps one
`save` in its own transaction) does **not** need an explicit transaction.

## Implemented reference (stock writes)

- **stock-entry** / **stock-count** wrap the `product.remaining` update **and** the
  `stock_entry` write in one `dataSource.transaction`, loading the product with a
  **`pessimistic_write`** lock (`SELECT … FOR UPDATE`) so the read-modify-write
  can't lose a concurrent update — see `applyStockEntry` in
  [stock-entry.service.ts](../../../src/modules/stock-entry/stock-entry.service.ts)
  and `applyAdjustments` in
  [stock-count.service.ts](../../../src/modules/stock-count/stock-count.service.ts).
  Copy this shape for any new multi-table stock/inventory write. Bulk endpoints run
  **one transaction per item** (partial-success error collection); apply-all
  operations run one transaction and lock rows in a deterministic order (sorted by
  key) to avoid deadlock.
- **order** creation persists order + cascaded details via one `save` (cascade) —
  acceptable today — but if order creation ever also writes stock or audit rows,
  it must become transactional.

## How to write it

### Option A — `dataSource.transaction` (callback)
```ts
constructor(private readonly dataSource: DataSource) {}

await this.dataSource.transaction(async (manager) => {
  // Lock the row so concurrent writers serialise (no lost update). Keep this read
  // join-free — Postgres rejects FOR UPDATE on the nullable side of an outer join.
  const product = await manager.findOne(Product, {
    where: { barcode },
    lock: { mode: 'pessimistic_write' },
  });
  const previousRemaining = product.remaining;
  await manager.update(Product, { barcode }, { remaining: previousRemaining + qty });
  await manager.save(manager.create(StockEntry, { previousRemaining, ... }));
});
```
Everything via the passed `manager` commits or rolls back together.

### Option B — atomic SQL for pure counters (best for concurrency)
```ts
await manager
  .createQueryBuilder()
  .update(Product)
  .set({ remaining: () => 'remaining + :q' })
  .where('barcode = :barcode', { barcode })
  .setParameters({ q: qty })
  .execute();
```
Avoids the read-modify-write race entirely. Use for `in`/`return` increments;
`adjust` (absolute set) can be a plain `set({ remaining: qty })`. **But** when you
must record the *previous* value (as `stock_entry` does for ADJUST), you can't get
it from `SET … RETURNING` — use Option A's `pessimistic_write` lock instead.

### Option C — QueryRunner (manual)
Use when you need explicit `startTransaction`/`commit`/`rollback` with custom
isolation. Always `release()` in `finally`.

## Rules & gotchas

- Inside a transaction use the transaction's `manager` (or repos bound to the
  QueryRunner) — calling the **injected** repos escapes the transaction.
- Validate/throw **before** writes where possible so most failures never open a
  transaction; errors thrown inside roll everything back.
- Keep transactions short — no external HTTP/slow work between begin and commit.
- For high-contention counters prefer Option B over read-modify-write.
- Errors thrown inside still surface through `AllExceptionsFilter`
  (see [[standard-api-responses]]) — throw the specific helper.

## Related

- [[route-stock-entry]] (stock write pattern) · [[route-order]] (cascade write) ·
  [[standard-performance]] (atomic update, concurrency) ·
  [[standard-shared-helpers]].
