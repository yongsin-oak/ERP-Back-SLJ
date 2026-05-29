---
name: route-stock-entry
description: Developer guide for the stock-entry module — stock movement audit trail (in/return/adjust) that mutates product.remaining and records before/after snapshots. Use when editing or extending anything under src/modules/stock-entry.
---

# Stock Entry Module

The append-only audit trail of stock movements. **Every entry mutates
`product.remaining`** and stores `previousRemaining` / `newRemaining` snapshots.
This is the ONLY module that changes `product.remaining` for stock purposes
(orders do not — see [[route-order]]).

> The mutation is `productRepo.update(...)` followed by `stockEntryRepo.save(...)`
> — there is **no DB transaction**, so a save failure after the update leaves
> `remaining` changed without a matching entry. The module writes **no**
> `AuditLogService` records (despite the audit-trail naming — verified in
> `stock-entry.service.ts`).

## Files

```
src/modules/stock-entry/
├── stock-entry.module.ts           # registers StockEntry, Product, Employee repos (no exports)
├── stock-entry.controller.ts       # @Controller({ path: 'stock-entry', version: '1' })
├── stock-entry.service.ts          # all business logic
├── entities/
│   └── stock-entry.entity.ts       # StockEntry (PK id 'STK-...') + StockEntryType enum
└── dto/
    └── stock-entry.dto.ts          # CreateStockEntryDto, BulkCreate*, BulkAdjust*, StockEntryGetDto
```

## Entity: `StockEntry`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `STK-{YYYYMMDD}-{random}` — set via `@BeforeInsert generateId()` (`generateIdWithPrefix({ prefix: 'STK', withDateTime: true })`) |
| `product` | Product | `ManyToOne` → Product, **`nullable: false`, `eager: true`**; FK column `productBarcode` |
| `productBarcode` | string | explicit non-null FK column |
| `type` | `StockEntryType` enum | `in` \| `adjust` \| `return` (no default — required) |
| `quantity` | int | for `in`/`return` = delta added; for `adjust` = the new absolute remaining |
| `previousRemaining` | int | `product.remaining` snapshot before mutation |
| `newRemaining` | int | `product.remaining` after mutation |
| `employee` | Employee | `ManyToOne` → Employee, nullable, **`eager: true`**; FK column `employeeId` |
| `employeeId` | string? | explicit nullable FK column |
| `note` | string? | nullable |
| `createdAt` / `updatedAt` | Date | auto |

`StockEntryType` enum lives in `stock-entry.entity.ts`:
`IN = 'in'`, `ADJUST = 'adjust'`, `RETURN = 'return'`.

### How `type` mutates `product.remaining` (verified in service)

| `type` | Effect on `remaining` | newRemaining = |
|---|---|---|
| `in` | add | `previousRemaining + quantity` |
| `return` | add | `previousRemaining + quantity` |
| `adjust` | **set absolute** | `quantity` (the value passed in) |

`bulk-adjust` uses the dedicated `actualQuantity` field which becomes the new
absolute `remaining` (same as `adjust`, but a clearer input name).

## Endpoints (all under `/api/v1/stock-entry`)

Controller is `@NoCache()`, `@ApiBearerAuth()`, guarded by
`JwtAuthGuard, RolesGuard`. **All routes are `@Roles('*')`** (any logged-in role).

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| GET | `/` | `*` | `StockEntryGetDto` → paginated `StockEntry[]` |
| POST | `/` | `*` | `CreateStockEntryDto` → `StockEntry` (201) |
| POST | `/bulk` | `*` | `BulkCreateStockEntryDto` → `{ created: StockEntry[], errors: string[] }` (201) |
| POST | `/bulk-adjust` | `*` | `BulkAdjustStockEntryDto` → `{ created: StockEntry[], errors: string[] }` (201) |

### DTOs

**`CreateStockEntryDto`** — `{ productBarcode (req), type (req enum), quantity (int >= 0, req), employeeId?, note? }`.
For `adjust`, `quantity` is the new absolute remaining.

**`BulkCreateStockEntryDto`** — `{ employeeId?, note?, entries: BulkStockEntryItemDto[] }`,
each item `{ productBarcode, type, quantity (int >= 0) }`. `employeeId`/`note`
are shared across all entries (validated once, applied to every row).

**`BulkAdjustStockEntryDto`** — `{ employeeId?, note?, adjustments: BulkAdjustItemDto[] }`,
each item `{ productBarcode, actualQuantity (int >= 0) }`. Every row is forced to
`type = adjust`.

**`StockEntryGetDto`** (extends `PaginatedGetAllDto`) — `page`, `limit` + optional
filters: `productBarcode`, `type` (enum), `employeeId`, `dateFrom`/`dateTo`
(ISO8601, on `createdAt`).

## Service logic & rules

- **`create`**: validates `productBarcode` exists (`notFound`); if `employeeId`
  given, validates it exists. Snapshots `previousRemaining`, computes
  `newRemaining` per the table above (unknown type → `badRequest`), runs
  `productRepo.update({ barcode }, { remaining: newRemaining })`, then saves the
  entry. Returns the saved entry.
- **`createBulk`**: resolves shared `employeeId` once (throws if missing — this
  aborts the whole call). Then loops `entries`; per item it does the same
  validate→compute→update→save as `create`, **continuing on error** and
  collecting `"{barcode}: {message}"` into `errors`. Partial success is possible
  (some `created`, some `errors`).
- **`createBulkAdjust`**: same shape as `createBulk` but each row uses
  `actualQuantity` as the new absolute `remaining` and `type = ADJUST`;
  `quantity` is stored as `actualQuantity`.

## Conventions & gotchas

- `quantity` is overloaded: a **delta** for `in`/`return`, an **absolute value**
  for `adjust`. The DTO description notes this — preserve it.
- `bulk-adjust` exists to make the absolute-set semantics explicit
  (`actualQuantity`) for stock-count workflows; prefer it over `adjust` via
  `/bulk` for clarity.
- No transaction wraps the `product.remaining` update + entry save — a failure
  between them desyncs the snapshot from reality. Add a transaction if you need
  atomicity.
- No `AuditLogService` calls anywhere in this module (README's "audit trail"
  refers to the StockEntry rows themselves, not the `audit_log` table).
- `product` and `employee` relations are **eager** — they load on every query
  automatically; `findAll` also explicitly `leftJoinAndSelect`s them.
- Module does not `export` its service (unlike order/order-detail).
- Update `.claude/skills/api/stock-entry.md` when endpoints/shapes change.

## Related

- [[route-product]] — `productBarcode` FK; `remaining` is the mutated field.
- [[route-employee]] — optional `employeeId` who performed the movement.
- [[route-order]] — does NOT touch stock; contrast with this module.
- [[route-audit-log]] — separate system-event log; NOT written by this module.
- Shared: `@app/common/helpers/entity.helper` (`getEntityOrNotFound`),
  `@app/common/helpers/response` (`ok`, `paginatedResponse`, `badRequest`),
  `@app/common/helpers/generateIdWithPrefix.helper`,
  `@app/common/dto/paginated.dto` (`PaginatedGetAllDto`).
- Conventions: [`.claude/README.md`](../../README.md).
