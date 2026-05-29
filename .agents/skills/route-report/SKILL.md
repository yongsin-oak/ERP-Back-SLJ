---
name: route-report
description: Developer guide for the report module — date-range sales analytics (summary, by-shop, by-product) and man-hour productivity. Use when editing or extending anything under src/modules/report.
---

# Report Module

Read-only analytics over `Order` + `OrderDetail`. **No entity of its own.**
Unlike [[route-dashboard]] (which buckets by `Order.createdAt`), every report filters
on **`Order.startRecordAt`** within a required `dateFrom`/`dateTo` window. All
date math uses the `Asia/Bangkok` timezone via Luxon; `dateFrom` is taken at
`startOf('day')` and `dateTo` at `endOf('day')`. Revenue/cost are computed
in-memory from detail quantities × the joined `Product` jsonb prices.

## Files

```
src/modules/report/
├── report.module.ts        # registers Order, OrderDetail repos
├── report.controller.ts    # @Controller({ path: 'report', version: '1' }) + @NoCache()
├── report.service.ts       # all aggregation logic
└── dto/
    └── report.dto.ts       # ReportGroupBy enum + query/item DTOs
```

## Data (no entity)

- `OrderDetail.quantityPack` / `quantityCarton` — quantities summed.
- `Product.sellPrice` / `costPrice` — jsonb `{ pack, carton }`; revenue/cost =
  `qty * price.pack + qty * price.carton`. Missing values coalesce to `0`.
- `Order.startRecordAt` — the date all reports bucket/filter on.
- `Order.completedRecordAt` + `recordBy` (Employee) — man-hour duration & owner.
- `Order.shop` (`name`, `platform`) — sales-by-shop grouping.

Shared per-detail math: `calcDetail(detail)` (private) → `{ revenue, cost }`.

`ReportGroupBy` enum (`dto/report.dto.ts`, also in `.claude/README.md`):
`Day='day' | Week='week' | Month='month'`.

## Endpoints (all under `/api/v1/report`)

Controller is `@NoCache()`, guarded by `JwtAuthGuard, RolesGuard`; every handler
is `@Roles('*')`. Queries are validated DTOs (`@IsDateString`, etc.).
`dateFrom`/`dateTo` are **required ISO8601** strings on all four. All responses
are arrays-in-envelope via `ok(...)` (not paginated).

| Method | Path | Roles | Query → response shape |
|---|---|---|---|
| GET | `/sales-summary` | `*` | `dateFrom, dateTo, shopId?, groupBy?` → `SalesSummaryItemDto[]` |
| GET | `/sales-by-shop` | `*` | `dateFrom, dateTo` → `SalesByShopItemDto[]` |
| GET | `/sales-by-product` | `*` | `dateFrom, dateTo, shopId?, categoryId?, brandId?` → `SalesByProductItemDto[]` |
| GET | `/man-hour` | `*` | `dateFrom, dateTo, employeeId?` → `ManHourItemDto[]` |

### `/sales-summary` → `SalesSummaryItemDto[]`

Buckets by time period; sorted ascending by `date` string.
`{ date, revenue, cost, profit, orderCount }` where `profit = revenue - cost`
and `orderCount` is the distinct number of orders in the bucket.
`date` key format depends on `groupBy` (default `day`):

| groupBy | `date` format | example |
|---|---|---|
| `day` | `yyyy-MM-dd` | `2026-05-01` |
| `week` | `{weekYear}-W{ww}` (ISO week) | `2026-W18` |
| `month` | `yyyy-MM` | `2026-05` |

Optional `shopId` filters to one shop.

### `/sales-by-shop` → `SalesByShopItemDto[]`

One row per shop (inner-joins `o.shop`; orders without a shop are skipped).
`{ shopId, shopName, platform, revenue, cost, orderCount }`. No groupBy/shop filter.

### `/sales-by-product` → `SalesByProductItemDto[]`

One row per product barcode (products with no barcode bucket under `'unknown'`).
`{ barcode, name, quantityPack, quantityCarton, revenue, cost, profit }`.
Optional filters: `shopId` (on `o.shopId`), `categoryId`/`brandId` (on
`p.categoryId`/`p.brandId`).

### `/man-hour` → `ManHourItemDto[]`

One row per employee who recorded completed orders in range.
`{ employeeId, name, orderCount, totalMinutes, avgMinutesPerOrder }`.
- `name` = `"{firstName} {lastName}".trim()`.
- `totalMinutes` = sum of `(completedRecordAt - startRecordAt)` in minutes,
  `Math.round`-ed.
- `avgMinutesPerOrder` = `round(totalMinutes / orderCount)` (`0` if no orders).
Optional `employeeId` filters to one employee.

## Service logic & rules

- **All reports filter on `startRecordAt`, never `createdAt`.** Orders with a
  null `startRecordAt` are skipped from buckets.
- `/man-hour` further requires **both** `startRecordAt IS NOT NULL` **and**
  `completedRecordAt IS NOT NULL` — orders missing either timestamp are excluded
  entirely (so an in-progress order contributes nothing).
- Aggregation is done in TypeScript via `Map`s, not SQL `GROUP BY`. Each handler
  loads matching rows then reduces — O(rows) memory; mind large date ranges.
- `getSalesSummary` currently runs three queries (an order-id query for
  `orderCount` plus a details query for revenue/cost; an earlier `getMany` is
  also issued). Profit/cost come only from the details pass.
- Week keys use Luxon ISO `weekYear`/`weekNumber` (zero-padded), so the calendar
  year boundary can differ from `yyyy` in late December / early January.

## Conventions & gotchas

- Timezone hardcoded `'Asia/Bangkok'`; bucketing shifts if changed.
- `groupBy` only applies to `/sales-summary`; the other three ignore it.
- Results are unpaginated arrays — do not switch to `paginatedResponse` without
  coordinating with the frontend.
- Invalid/missing `dateFrom`/`dateTo` → `400` from class-validator.
- Update `.claude/skills/api/report.md` when query params or item shapes change.

## Related

- [[route-order]] — `startRecordAt`, `completedRecordAt`, `recordBy`, `shop`.
- [[route-order-detail]] — quantities aggregated.
- [[route-product]] — jsonb `sellPrice`/`costPrice`, `categoryId`, `brandId`.
- [[route-shop]] / [[route-employee]] / [[route-category]] / [[route-brand]] — filter/group dimensions.
- [[route-dashboard]] — lighter, `createdAt`-based stats.
- Shared helpers: `@app/common/helpers/response` (`ok`).
