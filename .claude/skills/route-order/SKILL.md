---
name: route-order
description: Developer guide for the order module — packing/sales orders with man-hour tracking, recordBy employee, terminal, shop, and cascaded order details. Use when editing or extending anything under src/modules/order.
---

# Order Module

A recorded packing/sales order. Owns its `OrderDetail` children via cascade
(`OneToMany`, `cascade: true`). Each order links to an `Employee` (recordBy),
an optional `Terminal`, and a `Shop`, and carries man-hour timestamps
(`startRecordAt` / `completedRecordAt`).

> **Order creation does NOT mutate `product.remaining` and does NOT write
> stock entries or audit logs.** Stock movements are a separate concern — see
> [[route-stock-entry]]. Creating an order only persists the order + its details.

## Files

```
src/modules/order/
├── order.module.ts                 # registers Order, OrderDetail, Product, Employee, Terminal, Shop repos; exports OrderService
├── order.controller.ts             # @Controller({ path: 'order', version: '1' })
├── order.service.ts                # all business logic
├── entities/
│   └── order.entity.ts             # Order (PK id 'ORD-...') + OrderStatus enum
└── dto/
    ├── create-order.dto.ts         # OrderCreateDto (embeds OrderDetailCreateDto[])
    ├── update-order.dto.ts         # OrderUpdateDto = PartialType(OrderCreateDto)
    ├── get-order.dto.ts            # GetOrderDto (pagination + filters)
    ├── bulk-delete-order.dto.ts    # BulkDeleteOrderDto { ids: string[] }
    ├── check-exist-order.dto.ts    # CheckExistOrderDto { ids: string[] }
    └── response-order.dto.ts       # OrderResponseDto, OrderIsExistsResponseDto
```

## Entity: `Order`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `ORD-{YYYYMMDD}-{random}` — generated in service via `generateIdWithPrefix({ prefix: 'ORD', withDateTime: true })` (NOT a `@BeforeInsert` hook) |
| `recordBy` | Employee | `ManyToOne` → Employee, nullable; FK column `recordByEmployeeId` |
| `terminal` | Terminal | `ManyToOne` → Terminal, nullable; FK column `terminalId` |
| `terminalId` | string? | explicit column for the terminal FK |
| `shop` | Shop | `ManyToOne` → Shop, nullable; FK column `shopId` |
| `orderDetails` | OrderDetail[] | `OneToMany`, nullable, **`cascade: true`** (saving the order saves its details) |
| `status` | `OrderStatus` enum | default `completed`; values `completed` \| `cancelled` (no `pending`) |
| `startRecordAt` | Date? | timestamp, man-hour start |
| `completedRecordAt` | Date? | timestamp, man-hour end |
| `note` | string? | free text; also the `search` target |
| `createdAt` / `updatedAt` | Date | auto |

`OrderStatus` enum lives in `order.entity.ts`:
`OrderStatus.Completed = 'completed'`, `OrderStatus.Cancelled = 'cancelled'`.

Man-hour per order = `completedRecordAt - startRecordAt` (computed downstream,
e.g. the report module — not stored).

## Endpoints (all under `/api/v1/order`)

Controller is `@NoCache()`, `@ApiBearerAuth()`, guarded by
`JwtAuthGuard, RolesGuard`. **Every route is `@Roles('*')`** (any logged-in
role, including terminal sessions).

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| POST | `/` | `*` | `OrderCreateDto` → `OrderResponseDto` (201) |
| GET | `/` | `*` | `GetOrderDto` → paginated `OrderResponseDto[]` |
| POST | `/check-exist` | `*` | `CheckExistOrderDto` → `{ existing: string[], missing: string[] }` (200) |
| DELETE | `/bulk` | `*` | `BulkDeleteOrderDto` → `{ deleted: OrderResponseDto[], errors: string[] }` |
| GET | `/:id` | `*` | → `OrderResponseDto` (loads recordBy, terminal, shop, orderDetails, orderDetails.product) |
| PATCH | `/:id` | `*` | `OrderUpdateDto` → `OrderResponseDto` |
| DELETE | `/:id` | `*` | → `OrderResponseDto` (the removed order) |

> **Route order matters:** `check-exist` and `bulk` are declared **before**
> `:id` so the param route doesn't swallow them. Keep new literal routes above
> `:id`.

### `OrderCreateDto`

| Field | Type | Required | Notes |
|---|---|---|---|
| `recordBy` | string | yes | Employee id; validated to exist |
| `shopId` | string | yes | Shop id; validated to exist |
| `terminalId` | string? | no | Terminal id; validated to exist if present |
| `status` | `OrderStatus`? | no | defaults to entity default `completed` if omitted |
| `startRecordAt` | ISO8601 string? | no | converted to `Date` |
| `completedRecordAt` | ISO8601 string? | no | converted to `Date` |
| `note` | string? | no | |
| `details` | `OrderDetailCreateDto[]`? | no | each `{ productBarcode, quantityPack?, quantityCarton? }` — see [[route-order-detail]] |

`OrderUpdateDto` is `PartialType(OrderCreateDto)` — every field optional.

### `GetOrderDto` (extends `PaginatedGetAllDto`)

`page`, `limit` (required by base) + optional filters: `search` (ILIKE on
`note`), `status`, `shopId`, `employeeId` (matches `recordByEmployeeId`),
`terminalId`, `dateFrom`/`dateTo` (ISO8601, applied to **`startRecordAt`**).

## Service logic & rules

- **`create`**: validates `shopId` and `recordBy` exist (`notFound` otherwise);
  generates the `ORD-...` id; converts date strings to `Date`. For each
  `details[]` item it requires at least one of `quantityPack`/`quantityCarton`
  (`badRequest` otherwise), validates `productBarcode` exists, then builds a
  new `OrderDetail` with `quantityPack ?? 0` / `quantityCarton ?? 0`. Saves via
  `orderRepo.save(order)` (cascade persists details), then re-reads with
  `findOne`. **No stock mutation, no audit log.**
- **`update`**: loads the order; conditionally reassigns shop / recordBy /
  terminal (with existence checks), `status`, dates, `note`. If `details[]` is
  provided it **replaces** the whole `orderDetails` array (note: unlike
  `create`, update does NOT enforce the quantity-required rule). Old detail rows
  are reconciled by TypeORM cascade.
- **`findAll`**: QueryBuilder with `leftJoinAndSelect` on recordBy, terminal,
  shop, orderDetails, orderDetails.product; selects a trimmed column set; orders
  by `createdAt DESC`; applies filters above; `paginatedResponse`.
- **`findOne`**: `getEntityOrNotFound` with the shared `orderRelations`
  (relations + trimmed `select` for recordBy/terminal/shop).
- **`remove`**: loads with relations, `repo.remove`, returns the removed entity
  (with its id preserved). Cascade `onDelete: 'CASCADE'` on `OrderDetail.order`
  deletes child detail rows.
- **`checkExist`**: single `In(ids)` query selecting only `id`; returns
  `{ existing, missing }`. Empty input → both empty.
- **`bulkDelete`**: all-or-nothing on existence — gathers all orders first; if
  ANY id is missing it aborts with `{ deleted: [], errors }`. Otherwise removes
  each and collects any per-row failure into `errors`.

## Conventions & gotchas

- `recordBy` in the DTO is an Employee **id string**, but in the entity /
  response it is the populated `Employee` object.
- `status` omitted on create → DB default `completed` (the service passes
  `dto.status` through; `undefined` lets the column default apply).
- Date filters (`dateFrom`/`dateTo`) target `startRecordAt`, NOT `createdAt`.
- Order create/update/delete write **no** `AuditLogService` entries and do
  **not** touch `product.remaining` — confirmed in `order.service.ts`.
- Order entity id is generated in the **service**, not via `@BeforeInsert`
  (contrast with order-detail / stock-entry which use the hook).
- Update `.claude/skills/api/order.md` when endpoints/shapes change.

## Related

- [[route-order-detail]] — child rows; created via `OrderCreateDto.details` cascade.
- [[route-product]] — `details[].productBarcode` must reference an existing product.
- [[route-stock-entry]] — separate module that actually mutates `product.remaining`.
- [[route-employee]] / [[route-terminal]] / [[route-shop]] — `recordBy` / `terminalId` / `shopId`.
- Shared: `@app/common/helpers/entity.helper` (`getEntityOrNotFound`),
  `@app/common/helpers/response` (`ok`, `paginatedResponse`, `badRequest`),
  `@app/common/helpers/generateIdWithPrefix.helper`.
- Conventions: [`.claude/README.md`](../../README.md).
