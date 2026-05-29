# Dashboard, Report, Audit Log — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

All three modules are read-only.

---

## Dashboard — `/dashboard` (any role)

All dashboard endpoints are non-paginated — they return arrays or single objects directly.

### GET /dashboard/stats

No query params.

**Response `data`:**
| Field | Type | Notes |
|---|---|---|
| `totalOrders` | int | all-time order count |
| `totalRevenue` | number | all-time sell revenue (bath) |
| `totalCost` | number | all-time cost (bath) |
| `totalProducts` | int | total product count |
| `totalEmployees` | int | total employee count |
| `todayOrders` | int | orders created today (Bangkok time) |
| `todayRevenue` | number | today's revenue |
| `todayCost` | number | today's cost |
| `lowStockCount` | int | products where `remaining <= minStock` (default 5) |

Revenue = `quantityPack × sellPrice.pack + quantityCarton × sellPrice.carton` summed across all order details.

### GET /dashboard/daily-revenue

**Query:** `days` (int, optional, default 7)

Returns the last `days` calendar days (Bangkok time), most-recent last.

**Response `data`:** array of:
| Field | Type | Notes |
|---|---|---|
| `date` | string | `"yyyy-MM-dd"` |
| `revenue` | number | |
| `cost` | number | |

### GET /dashboard/recent-orders

**Query:** `limit` (int, optional, default 5)

**Response `data`:** array of:
| Field | Type | Notes |
|---|---|---|
| `id` | string | Order ID |
| `shopName` | string | |
| `platform` | string | Platform enum value |
| `totalPrice` | number | Revenue for this order |
| `createdAt` | Date | |

### GET /dashboard/low-stock

**Query:** `threshold` (int, optional, default 5) — returns products with `remaining <= threshold`.

**Response `data`:** array sorted by `remaining` ASC:
| Field | Type | Notes |
|---|---|---|
| `barcode` | string | |
| `name` | string | |
| `remaining` | int | |
| `minStock` | int | |

---

## Report — `/report` (any role)

All report endpoints require `dateFrom` and `dateTo`. Reports bucket on `Order.startRecordAt`.

### GET /report/sales-summary

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `dateFrom` | ISO8601 | yes | |
| `dateTo` | ISO8601 | yes | |
| `shopId` | string | no | filter to one shop |
| `groupBy` | `day` \| `week` \| `month` | no | default `day` |

**Response `data`:** array sorted by date ASC:
| Field | Type | Notes |
|---|---|---|
| `date` | string | `yyyy-MM-dd` / `yyyy-MM` / `yyyy-WXX` depending on groupBy |
| `revenue` | number | |
| `cost` | number | |
| `profit` | number | revenue − cost |
| `orderCount` | int | distinct orders in bucket |

### GET /report/sales-by-shop

**Query:** `dateFrom`, `dateTo` (both required, ISO8601).

**Response `data`:** array (one row per shop):
| Field | Type |
|---|---|
| `shopId` | string |
| `shopName` | string |
| `platform` | string |
| `revenue` | number |
| `cost` | number |
| `orderCount` | int |

### GET /report/sales-by-product

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `dateFrom` | ISO8601 | yes | |
| `dateTo` | ISO8601 | yes | |
| `shopId` | string | no | |
| `categoryId` | string | no | |
| `brandId` | string | no | |

**Response `data`:** array (one row per product):
| Field | Type |
|---|---|
| `barcode` | string |
| `name` | string |
| `quantityPack` | int |
| `quantityCarton` | int |
| `revenue` | number |
| `cost` | number |
| `profit` | number |

### GET /report/man-hour

Requires orders to have both `startRecordAt` and `completedRecordAt` set.
Orders missing either timestamp are excluded.

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `dateFrom` | ISO8601 | yes | |
| `dateTo` | ISO8601 | yes | |
| `employeeId` | string | no | filter to one employee |

**Response `data`:** array (one row per employee):
| Field | Type |
|---|---|
| `employeeId` | string |
| `name` | string |
| `orderCount` | int |
| `totalMinutes` | int | rounded |
| `avgMinutesPerOrder` | int | rounded |

---

## Audit Log — `/audit-log` (SuperAdmin only, read-only)

### AuditLog object shape

```jsonc
{
  "id": "AUDIT-20260529-xxxx",
  "actorType": "user",
  "actorId": "nanoid12chars",
  "action": "create",
  "resourceType": "Product",
  "resourceId": "8850999123456",
  "beforeData": null,
  "afterData": { "name": "...", "remaining": 100, ... },
  "ipAddress": "192.168.1.1",
  "createdAt": "2026-05-29T10:00:00.000Z"
}
```

`actorType` values: `user` | `terminal` | `employee` | `system`

`action` values: `login` | `logout` | `create` | `update` | `delete` | `stock_in` | `stock_adjust` | `stock_return` | `order_complete` | `order_cancel` | `pin_verify`

### GET /audit-log — paginated

**Query:** `page`, `limit` (required). Sorted newest first.

**Response:** paginated list of AuditLog objects.

### GET /audit-log/:id

**Response `data`:** AuditLog object.

Errors: `404` log not found
