# Routes — Full Endpoint Reference

All paths are prefixed with `/api/v1`. Auth is via cookie (send
`credentials: 'include'`). Roles: `*` = any logged-in role; `SuperAdmin` = admin
only. See [/API.md](../../API.md) for the response envelope and auth flow.

> Verified against controllers on 2026-05-29. Updated: 2026-05-29.

## Auth — `/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | none | body `{ username \| terminalCode, password }`; **raw** response; sets cookies |
| POST | `/auth/refresh-token` | refresh cookie | user sessions only; **raw** response |
| POST | `/auth/pin/verify` | terminal JWT | body `{ pin }` (+ employee) → `{ actor_token }` |
| GET | `/auth/me` | any | current identity |
| PATCH | `/auth/update-password` | user session | change own password |
| POST | `/auth/logout` | any | clears cookies |

## Product — `/product` (PK = barcode)

| Method | Path | Roles | Body / Query |
|---|---|---|---|
| GET | `/product` | `*` | `page, limit, search, brandId, categoryId, isActive` → paginated |
| GET | `/product/dropdown-search` | `*` | `search` → up to 50 lite items |
| POST | `/product/check-exist` | `*` | `{ barcodes[] }` → `{ existing[], missing[] }` |
| GET | `/product/:barcode` | `*` | includes brand, category |
| POST | `/product` | SuperAdmin | create |
| POST | `/product/bulk` | SuperAdmin | array create |
| PATCH | `/product/bulk` | SuperAdmin | bulk update |
| DELETE | `/product/bulk` | SuperAdmin | `{ barcodes[] }` → `{ deleted[], errors[] }` |
| PATCH | `/product/:barcode` | SuperAdmin | update |
| DELETE | `/product/:barcode` | SuperAdmin | delete |
| GET | `/product/:barcode/shop-price` | `*` | list shop prices |
| POST | `/product/:barcode/shop-price` | SuperAdmin | set shop price |
| PATCH | `/product/:barcode/shop-price/:shopId` | SuperAdmin | update shop price |
| DELETE | `/product/:barcode/shop-price/:shopId` | SuperAdmin | delete shop price |

## Order — `/order`

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/order` | `*` | paginated; filters incl. date on `startRecordAt` |
| GET | `/order/:id` | `*` | with details |
| POST | `/order` | `*` | creates order + cascaded order details |
| POST | `/order/check-exist` | `*` | check existing order ids |
| PATCH | `/order/:id` | `*` | update |
| DELETE | `/order/bulk` | `*` | bulk delete (all-or-nothing on existence) |
| DELETE | `/order/:id` | `*` | delete |

## Order Detail — `/order-detail` (read-only)

| Method | Path | Roles | Query |
|---|---|---|---|
| GET | `/order-detail` | `*` | `orderId, productBarcode, dateFrom, dateTo` (+ `page,limit`) |
| GET | `/order-detail/:orderId` | `*` | details of one order (**404 if none**) |

## Stock Entry — `/stock-entry`

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/stock-entry` | `*` | paginated |
| POST | `/stock-entry` | `*` | `type` in/adjust/return; mutates product.remaining |
| POST | `/stock-entry/bulk` | `*` | bulk create |
| POST | `/stock-entry/bulk-adjust` | `*` | stock count: `actualQuantity` sets absolute remaining |

## Employee — `/employee`

| Method | Path | Roles |
|---|---|---|
| GET | `/employee` | `*` (filters: search, department, isActive) |
| GET | `/employee/:id` | `*` |
| POST | `/employee` | SuperAdmin |
| PATCH | `/employee/:id` | SuperAdmin |
| PATCH | `/employee/:id/pin` | SuperAdmin (`{ pin }`) |
| DELETE | `/employee/bulk` | SuperAdmin (`{ ids[] }`) |
| DELETE | `/employee/:id` | SuperAdmin |

## Terminal — `/terminal` (SuperAdmin only)

| Method | Path |
|---|---|
| GET | `/terminal` , `/terminal/:id` |
| POST | `/terminal` |
| PATCH | `/terminal/:id` |
| DELETE | `/terminal/:id` |

## Brand — `/brand`

| Method | Path | Roles |
|---|---|---|
| GET | `/brand`, `/brand/:id` | `*` |
| POST | `/brand` | SuperAdmin |
| POST | `/brand/bulk` | SuperAdmin |
| PATCH | `/brand/:id` | SuperAdmin |
| DELETE | `/brand/:id` | SuperAdmin |

## Category — `/category` (tree)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/category` | `*` | list |
| GET | `/category/tree` | `*` | roots with children |
| GET | `/category/:id` | `*` | |
| POST | `/category` | SuperAdmin | `parentId` optional |
| PATCH | `/category/:id` | SuperAdmin | omitting `parentId` detaches parent |
| DELETE | `/category/:id` | SuperAdmin | blocked if children unless `?deleteChild=true` |

## Shop — `/shop`

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/shop`, `/shop/:id` | `*` | |
| POST/PATCH/DELETE | `/shop`, `/shop/:id` | SuperAdmin | `platform` is a Platform enum; unique (name, platform) |

## Supplier — `/supplier`

| Method | Path | Roles |
|---|---|---|
| GET | `/supplier`, `/supplier/:id` | `*` |
| POST/PATCH/DELETE | `/supplier`, `/supplier/:id` | SuperAdmin |

Fields: `name` (unique), `contactName`, `phone`, `email`, `address`, `taxId`,
`isActive`, `note`. Delete is hard delete (use `isActive: false` to retire).

## User — `/user` (SuperAdmin only)

| Method | Path |
|---|---|
| GET/POST/PATCH/DELETE | `/user`, `/user/:id` |

## Dashboard — `/dashboard` (`*`)

| Method | Path | Returns |
|---|---|---|
| GET | `/dashboard/stats` | totals incl. revenue, cost, lowStockCount, etc. |
| GET | `/dashboard/daily-revenue` | per-day revenue series |
| GET | `/dashboard/recent-orders` | latest orders |
| GET | `/dashboard/low-stock` | `?threshold` (default 5): products with `remaining <= threshold` |

## Report — `/report` (`*`)

| Method | Path | Query |
|---|---|---|
| GET | `/report/sales-summary` | date range + `groupBy` (day/week/month) |
| GET | `/report/sales-by-shop` | date range |
| GET | `/report/sales-by-product` | date range |
| GET | `/report/man-hour` | date range; needs orders with start+complete timestamps |

Report buckets on `Order.startRecordAt`.

## Audit Log — `/audit-log` (SuperAdmin only, read-only)

| Method | Path |
|---|---|
| GET | `/audit-log` (paginated, filters) |
| GET | `/audit-log/:id` |

---

## Per-resource request/response field reference

| Module | Detailed doc |
|---|---|
| Auth | [docs/frontend/auth.md](auth.md) |
| Product + shop-price | [docs/frontend/product.md](product.md) |
| Order + order-detail | [docs/frontend/order.md](order.md) |
| Stock entry | [docs/frontend/stock-entry.md](stock-entry.md) |
| Employee + terminal | [docs/frontend/employee.md](employee.md) |
| Brand, category, shop, supplier | [docs/frontend/catalog.md](catalog.md) |
| User management | [docs/frontend/user.md](user.md) |
| Dashboard, report, audit log | [docs/frontend/analytics.md](analytics.md) |
