---
name: route-order-detail
description: Developer guide for the order-detail module — read-only line items belonging to an order (product + pack/carton quantities). Use when editing or extending anything under src/modules/order-detail.
---

# Order Detail Module

A single line item inside an order: a product plus its pack/carton quantities.
Each `Order` has many `OrderDetail` rows. **Detail rows are NOT created or
edited through this module** — they are created/replaced via the order's cascade
(see [[route-order]], `OrderCreateDto.details`). This module is **read-only**: it only
exposes two `GET` endpoints (list with filters, and fetch-by-order).

## Files

```
src/modules/order-detail/
├── order-detail.module.ts          # registers Order, OrderDetail repos; exports OrderDetailService
├── order-detail.controller.ts      # @Controller({ path: 'order-detail', version: '1' })
├── order-detail.service.ts         # read-only query logic
├── entities/
│   └── orderDetail.entity.ts       # OrderDetail (PK id 'ORDDETAIL-...')
└── dto/
    ├── create-order-detail.dto.ts  # OrderDetailCreateDto (consumed by the order module)
    ├── update-order-detail.dto.ts  # OrderDetailUpdateDto (defined, not wired to a route)
    ├── get-order-detail.dto.ts     # GetOrderDetailDto (pagination + filters)
    └── response-order-detail.dto.ts# OrderDetailResponseDto
```

## Entity: `OrderDetail`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `ORDDETAIL-{YYYYMMDD}-{random}` — set via `@BeforeInsert generateId()` (`generateIdWithPrefix({ prefix: 'ORDDETAIL', withDateTime: true })`) |
| `product` | Product | `ManyToOne` → Product, **`nullable: false`**; FK column `productBarcode` (default join column name) |
| `order` | `Promise<Order> \| Order` | `ManyToOne` → Order, `nullable: false`, **`onDelete: 'CASCADE'`**; FK column `orderId` (lazy-capable) |
| `orderId` | string | explicit non-null FK column |
| `quantityPack` | int? | nullable column |
| `quantityCarton` | int? | nullable column |
| `createdAt` / `updatedAt` | Date | auto |

> No `productBarcode` scalar column is declared on the entity, but the `product`
> relation's join column is named `productBarcode`, so the service filters on
> `d.productBarcode` in raw QueryBuilder.

## Endpoints (all under `/api/v1/order-detail`)

Controller is `@ApiBearerAuth()`, guarded by `JwtAuthGuard, RolesGuard`. Both
routes are `@Roles('*')` (any logged-in role). No `@NoCache()` here.

| Method | Path | Roles | Query / Param → response |
|---|---|---|---|
| GET | `/` | `*` | `GetOrderDetailDto` → paginated `OrderDetail[]` |
| GET | `/:orderId` | `*` | param `orderId` → `OrderDetail[]` (NOT paginated; `notFound` if none) |

> Route order: `/` (list) is declared before `/:orderId`. There are no other
> literal routes to collide with.

### `GetOrderDetailDto` (extends `PaginatedGetAllDto`)

`page`, `limit` (required by base) + optional filters:

| Field | Type | Notes |
|---|---|---|
| `orderId` | string? | exact match on `d.orderId` |
| `productBarcode` | string? | exact match on `d.productBarcode` (the product join column) |
| `dateFrom` | ISO8601? | `createdAt >= dateFrom` |
| `dateTo` | ISO8601? | `createdAt <= dateTo` |

> The frontend doc `.claude/skills/api/order-detail.md` only lists `page`/`limit`
> for the list endpoint — the code also accepts the four filters above. **Code
> wins.**

### `OrderDetailCreateDto` (used by the order module, not by a route here)

`{ productBarcode: string (required), quantityPack?: int >= 0, quantityCarton?: int >= 0 }`.
Imported by `OrderCreateDto.details`. The quantity-required rule
(`quantityPack || quantityCarton`) is enforced in the **order** service's
`create`, not here.

## Service logic & rules

- **`findAll(query)`**: QueryBuilder `leftJoinAndSelect('d.product', 'product')`,
  `orderBy('d.createdAt', 'DESC')`; applies `orderId`, `productBarcode`,
  `dateFrom`/`dateTo` (on `createdAt`) filters; paginates via
  `paginatedResponse`. Returns the full product object joined in.
- **`findByOrderId(orderId)`**: `repo.find` with `relations: ['product']`,
  `order: { updatedAt: 'DESC' }`, and a trimmed `select` exposing only
  `product.barcode` + `product.name`. **Throws `notFound` when the order has no
  details** (empty array is treated as not-found).

## Conventions & gotchas

- Read-only module: there are no POST/PATCH/DELETE routes. To add/change detail
  rows, go through the [[route-order]] module (cascade save). `OrderDetailUpdateDto`
  exists but is not wired to any endpoint.
- `findByOrderId` 404s on empty — callers expecting an empty list for a valid
  order with no items will instead get a 404.
- `findAll` returns the **full** `product`; `findByOrderId` returns a **trimmed**
  product (`barcode`, `name` only). Shapes differ between the two endpoints.
- `order` relation is typed `Promise<Order> | Order` (lazy-capable). Avoid
  eager-loading `order` in new queries unless needed.
- Update `.claude/skills/api/order-detail.md` when endpoints/shapes change.

## Related

- [[route-order]] — parent; creates/replaces detail rows via cascade.
- [[route-product]] — `productBarcode` FK (relation `nullable: false`).
- Shared: `@app/common/helpers/response` (`ok`, `paginatedResponse`,
  `notFound`), `@app/common/helpers/generateIdWithPrefix.helper`,
  `@app/common/dto/paginated.dto` (`PaginatedGetAllDto`).
- Conventions: [`.claude/README.md`](../../README.md).
