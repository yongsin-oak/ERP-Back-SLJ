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

## Known gaps in this repo (documented, not yet fixed)

- **stock-entry** ([src/modules/stock-entry/stock-entry.service.ts](../../../src/modules/stock-entry/stock-entry.service.ts),
  see [[route-stock-entry]]) mutates `product.remaining` **and** saves a
  `stock_entry` **without** a transaction. If the second write fails, stock and
  its audit trail desync. This is the canonical case to fix first.
- **order** creation persists order + cascaded details via one `save` (cascade) —
  acceptable today — but if order creation ever also writes stock or audit rows,
  it must become transactional.

## How to write it

### Option A — `dataSource.transaction` (callback)
```ts
constructor(private readonly dataSource: DataSource) {}

await this.dataSource.transaction(async (manager) => {
  const product = await manager.findOne(Product, { where: { barcode } });
  product.remaining += qty;
  await manager.save(product);
  await manager.save(manager.create(StockEntry, { ... }));
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
`adjust` (absolute set) can be a plain `set({ remaining: qty })`.

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

- [[route-stock-entry]] (the gap) · [[route-order]] (cascade write) ·
  [[standard-performance]] (atomic update, concurrency) ·
  [[standard-shared-helpers]].
