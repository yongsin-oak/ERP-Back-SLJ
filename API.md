# SLJ Supply Center API — Frontend Guide

Source of truth for the frontend. Everything you need to call this backend.
Split docs (each ≤400 lines):

- **This file** — base URL, auth, response envelope, enums, ID formats.
- [docs/frontend/routes.md](docs/frontend/routes.md) — every endpoint.
- [docs/frontend/errors.md](docs/frontend/errors.md) — error shape, status codes, validation messages.

> Last verified against code: 2026-05-29. Updated envelope shapes: 2026-05-29. Backend: NestJS 11 + TypeORM + PostgreSQL.

---

## Base

```
Base URL (dev) : http://localhost:5050
API prefix     : /api/v1            (global prefix "api" + URI version "1")
Example        : http://localhost:5050/api/v1/product
Swagger        : http://localhost:5050/swagger
```

All routes are versioned `/api/v1/...`. CORS allows the configured origin with
**credentials** (cookies are sent/stored), default dev origin `http://localhost:5173`.

---

## Auth model (cookie-based, not Authorization header)

- On login the server sets an **HTTP-only cookie** `token` (and `refreshToken`
  for user sessions). The browser sends them automatically — **do not** set an
  `Authorization` header; just send requests with `credentials: 'include'`.
- Two session types:

| Session | Login with | Refresh | Extra step |
|---|---|---|---|
| `user` | `username` + `password` | `POST /auth/refresh-token` (refresh cookie) | — |
| `terminal` | `terminalCode` + `password` | none (re-login) | PIN → actor token before actions |

### Flow
1. `POST /auth/login` with either `{ username, password }` or
   `{ terminalCode, password }` → cookie(s) set. **Raw response** (not wrapped — see below).
2. Call any endpoint; the cookie authenticates you.
3. On **401** (user session): call `POST /auth/refresh-token`, then retry the
   request once. Terminal sessions must re-login.
4. **Terminal only:** before performing an action, have an employee verify a PIN:
   `POST /auth/pin/verify` (terminal must be logged in) → returns an
   `actor_token`. Send it as header `X-Actor-Token` on subsequent action calls.
5. `POST /auth/logout` clears cookies.

`GET /auth/me` returns the current identity. Full auth detail:
[.claude/skills/api/auth.md](.claude/skills/api/auth.md).

---

## Response envelope

Every normal response is wrapped by the server.

### Success — single
```jsonc
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { /* entity */ },
  "meta": { "requestId": "uuid-v4", "timestamp": "2026-05-29T10:00:00.000Z" }
}
```

### Success — paginated (list endpoints)
```jsonc
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [ /* items */ ],
  "pagination": {
    "page": 1, "limit": 10, "total": 100, "totalPages": 10,
    "hasNextPage": true, "hasPreviousPage": false
  },
  // summary: present only on endpoints that return aggregates (e.g. totalRevenue).
  // Shape is endpoint-specific. Absent when the endpoint has no aggregates.
  "summary": { "totalRevenue": 150000 },
  "meta": { "requestId": "uuid-v4", "timestamp": "2026-05-29T10:00:00.000Z" }
}
```

### `meta` (always present on success)

| Field | Type | Description |
|---|---|---|
| `requestId` | string (UUID v4) | Unique ID for this request — correlate with server logs |
| `timestamp` | string (ISO 8601) | Server time the response was generated |

### `summary` (paginated only, optional)

Present only when an endpoint returns aggregate data alongside the list.
Shape is endpoint-specific (documented per-route where applicable).
Aggregates cover the **full result set** (all matching rows), not just the current page.

### Default `message` by method
GET → `OK` · POST → `Created` · PATCH/PUT → `Updated` · DELETE → `Deleted`
(handlers may override with a custom message).

### Error
```jsonc
{
  "success": false, "statusCode": 400,
  "message": "Barcode 123 not found",   // string OR string[] for validation
  "error": "Bad Request",
  "timestamp": "2026-05-29T10:00:00.000Z",
  "path": "/api/v1/product/123"
}
```

> **Exception:** `POST /auth/login` and `POST /auth/refresh-token` return **raw
> JSON** (not wrapped) because they set cookies directly. Read their bodies as-is.

Full details + how to handle each status: [docs/frontend/errors.md](docs/frontend/errors.md).

---

## Pagination request

List endpoints accept `?page=<n>&limit=<n>` (both integers ≥ 1, **required** by
the validator unless the endpoint sets defaults). Many lists also accept
`search` and entity-specific filters — see each route in
[docs/frontend/routes.md](docs/frontend/routes.md).

## Dropdown / infinite-scroll pattern

Two kinds of dropdown endpoints exist:

| Kind | Example | page/limit | Notes |
|---|---|---|---|
| **Dedicated lite endpoint** | `GET /product/dropdown-search` | optional (default 1/20, max limit 50) | Returns a subset of fields only; use for large catalogues |
| **Regular paginated list** | `GET /employee`, `GET /shop`, etc. | required (no default) | Returns full entity; use when full fields are needed in the picker |

For both kinds the response is the standard **paginated envelope** (`data[]` + `pagination` + `meta`).
Use `pagination.hasNextPage` to decide whether to fetch the next page on scroll-bottom.

Current dedicated dropdown endpoints:

| Endpoint | Lite fields returned |
|---|---|
| `GET /product/dropdown-search` | `barcode`, `name`, `remaining`, `sellPrice` |

---

## Caching

Most data endpoints send `Cache-Control: no-cache` — responses are not cached.
Don't rely on browser caching for dynamic data.

---

## Enums (allowed values)

```
Role           = Operator | SuperAdmin | Admin | Accountant | Warehouse | Sales | Marketing | HR
Platform       = Shopee | Lazada | TikTok | LineOA | LineMan | Offline
StockEntryType = in | adjust | return
OrderStatus    = completed | cancelled            // default completed; no "pending"
ReportGroupBy  = day | week | month
AuditActorType = user | terminal | employee | system
AuditAction    = login | logout | create | update | delete | stock_in | stock_adjust
               | stock_return | order_complete | order_cancel | pin_verify
```

Send enum fields exactly as written (case-sensitive). An invalid value returns a
400 with a validation message.

---

## ID formats (what the server returns)

| Resource | Format |
|---|---|
| user | nanoid(12) |
| terminal | `TERM-{random}` |
| brand | `BRD-{random}` |
| category | `CAT-{random}` |
| employee | `EMP-{random}` |
| shop | `SHOP-{random}` |
| supplier | `SUP-{random}` |
| product | `barcode` (client-defined, PK) |
| product shop price | `PSP-{random}` |
| order | `ORD-{YYYYMMDD}-{random}` |
| order_detail | `ORDDETAIL-{YYYYMMDD}-{random}` |
| stock_entry | `STK-{YYYYMMDD}-{random}` |
| audit_log | `AUDIT-{YYYYMMDD}-{random}` |

`product` is keyed by `barcode` — its routes use `:barcode`, not `:id`.

---

## Per-resource field/shape detail

For exact request/response fields per resource:

| Module | Doc |
|---|---|
| Auth | [docs/frontend/auth.md](docs/frontend/auth.md) |
| Product + shop-price | [docs/frontend/product.md](docs/frontend/product.md) |
| Order + order-detail | [docs/frontend/order.md](docs/frontend/order.md) |
| Stock entry | [docs/frontend/stock-entry.md](docs/frontend/stock-entry.md) |
| Employee + terminal | [docs/frontend/employee.md](docs/frontend/employee.md) |
| Brand / category / shop / supplier | [docs/frontend/catalog.md](docs/frontend/catalog.md) |
| User management | [docs/frontend/user.md](docs/frontend/user.md) |
| Dashboard / report / audit log | [docs/frontend/analytics.md](docs/frontend/analytics.md) |
