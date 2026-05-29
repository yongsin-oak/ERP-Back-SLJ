---
name: route-dashboard
description: Developer guide for the dashboard module — read-only aggregate stats, daily revenue, recent orders, and low-stock lists. Use when editing or extending anything under src/modules/dashboard.
---

# Dashboard Module

Read-only reporting endpoints that aggregate over `Order`, `OrderDetail`,
`Product`, and `Employee`. **No entity of its own** — it owns no table and
writes nothing. Revenue/cost are computed in-memory from `OrderDetail`
quantities times the joined `Product` jsonb prices. All time-of-day math uses
the `Asia/Bangkok` timezone via Luxon.

## Files

```
src/modules/dashboard/
├── dashboard.module.ts        # registers Order, OrderDetail, Product, Employee repos
├── dashboard.controller.ts    # @Controller({ path: 'dashboard', version: '1' })
├── dashboard.service.ts       # all aggregation logic
└── dto/
    └── dashboard.dto.ts       # DashboardStatsDto, DailyRevenueDto, RecentOrderDto, LowStockDto
```

## Data (no entity)

Reads from these entities (see [[route-order]], [[route-order-detail]], [[route-product]], [[route-employee]]):

- `OrderDetail.quantityPack` / `quantityCarton` — the quantities summed.
- `Product.sellPrice` / `costPrice` — jsonb `{ pack, carton }` value objects;
  revenue/cost are `qty * price.pack + qty * price.carton`.
- `Order.createdAt` — used for "today" and daily-revenue buckets.
- `Product.remaining` / `minStock` — low-stock thresholds.

Shared revenue math lives in `calcRevenue(details)` (private), which reduces a
list of details to `{ revenue, cost }`. Missing quantities/prices coalesce to `0`.

## Endpoints (all under `/api/v1/dashboard`)

Controller guarded by `JwtAuthGuard, RolesGuard`; every handler is `@Roles('*')`
(any authenticated role). Query params arrive as strings and are `parseInt`-ed.

| Method | Path | Roles | Query → response shape |
|---|---|---|---|
| GET | `/stats` | `*` | none → `DashboardStatsDto` (single object) |
| GET | `/daily-revenue` | `*` | `days?` (default `7`) → `DailyRevenueDto[]` |
| GET | `/recent-orders` | `*` | `limit?` (default `5`) → `RecentOrderDto[]` |
| GET | `/low-stock` | `*` | `threshold?` (default `5`) → `LowStockDto[]` |

All wrapped in `ok(...)` → standard single-response envelope (arrays are
returned as plain `data: T[]`, **not** paginated).

### `DashboardStatsDto` (GET /stats)

| Field | Meaning |
|---|---|
| `totalOrders` | `orderRepo.count()` (all orders) |
| `totalRevenue` | revenue over **all** order details |
| `totalCost` | cost over all order details |
| `totalProducts` | `productRepo.count()` |
| `totalEmployees` | `employeeRepo.count()` |
| `todayOrders` | orders with `createdAt` in today's Bangkok day |
| `todayRevenue` | revenue from today's order details |
| `todayCost` | cost from today's order details |
| `lowStockCount` | products where `remaining <= COALESCE(minStock, 5)` |

> The frontend doc `api/dashboard.md` omits `totalCost`, `todayCost`, and
> `lowStockCount`. The DTO and service return all nine fields — **code wins**.

### `DailyRevenueDto[]` (GET /daily-revenue)

One entry per day for the last `days` days, **oldest → newest**. Each:
`{ date: 'yyyy-MM-dd', revenue, cost }`. Buckets by `Order.createdAt` within
each Bangkok day (inner-join detail → order).

### `RecentOrderDto[]` (GET /recent-orders)

Latest `limit` orders by `createdAt DESC`. Each:
`{ id, shopName, platform, totalPrice, createdAt }`.
`shopName`/`platform` come from the joined `shop` (empty string if null);
`totalPrice` is the **revenue** of that order's details (no cost).

### `LowStockDto[]` (GET /low-stock)

Products with `remaining <= threshold`, ordered `remaining ASC`. Each:
`{ barcode, name, remaining, minStock }` (`minStock` coalesces to `0` if null).

## Service logic & rules

- **Two different low-stock conditions** — be careful:
  - `/stats.lowStockCount` uses `p.remaining <= COALESCE(p.minStock, 5)`
    (per-product threshold, default 5).
  - `/low-stock` list uses `p.remaining <= :threshold` (a single query param,
    default 5) — it ignores each product's `minStock` for filtering and only
    returns `minStock` as a display field.
- `getStats` fires counts in `Promise.all`, then loads **all** order details
  with their products (`detailRepo.find({ relations: ['product'] })`) to total
  lifetime revenue/cost — O(all details) in memory. Watch this at scale.
- `getDailyRevenue` loops day-by-day and runs one query per day (N queries for
  N days), each inner-joining `d.order` filtered on `o.createdAt BETWEEN`.
- Today's window: `DateTime.now().setZone('Asia/Bangkok').startOf('day')` →
  `.endOf('day')`, converted to JS dates for `Between`.
- Revenue/cost never include shipping/discount — purely qty × jsonb unit price.

## Conventions & gotchas

- Stateless/read-only: no writes, no audit logging here.
- Timezone is hardcoded `'Asia/Bangkok'`; daily buckets shift if you change it.
- Returns are arrays-in-envelope, not paginated — don't switch to
  `paginatedResponse` without coordinating with the frontend.
- `days`/`limit`/`threshold` are unbounded — no max cap is enforced in code.
- Update `.claude/skills/api/dashboard.md` when fields/shapes change (and add
  the missing cost/count fields there).

## Related

- [[route-order]] / [[route-order-detail]] — source of revenue/cost and timestamps.
- [[route-product]] — jsonb `sellPrice`/`costPrice`, `remaining`, `minStock`.
- [[route-employee]] — counted in `totalEmployees`.
- [[route-report]] — heavier date-range analytics (uses `startRecordAt`, not `createdAt`).
- Shared helpers: `@app/common/helpers/response` (`ok`).
