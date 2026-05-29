# Order & Order Detail — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

---

## Order object shape

```jsonc
{
  "id": "ORD-20260529-xxxx",
  "recordBy": { "id": "EMP-xxx", "firstName": "John", "lastName": "Doe", ... } | null,
  "terminal": { "id": "TERM-xxx", "terminalCode": "POS-01", "name": "...", ... } | null,
  "shop": { "id": "SHOP-xxx", "name": "Shopee", "platform": "Shopee", ... } | null,
  "status": "completed",
  "startRecordAt": "2026-05-29T09:00:00.000Z" | null,
  "completedRecordAt": "2026-05-29T09:05:00.000Z" | null,
  "note": null,
  "createdAt": "2026-05-29T09:05:00.000Z",
  "updatedAt": "2026-05-29T09:05:00.000Z",
  "orderDetails": [ /* OrderDetail objects */ ]
}
```

## OrderDetail object shape

```jsonc
{
  "id": "ORDDETAIL-20260529-xxxx",
  "product": { "barcode": "P001", "name": "น้ำดื่ม", "sellPrice": {...}, ... },
  "orderId": "ORD-20260529-xxxx",
  "quantityPack": 2,
  "quantityCarton": 1,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## GET /order — paginated

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | yes | |
| `limit` | int ≥ 1 | yes | |
| `search` | string | no | searches `note` field |
| `status` | `completed` \| `cancelled` | no | |
| `shopId` | string | no | |
| `employeeId` | string | no | filter by `recordBy` |
| `terminalId` | string | no | |
| `dateFrom` | ISO8601 | no | `startRecordAt >= dateFrom` |
| `dateTo` | ISO8601 | no | `startRecordAt <= dateTo` |

**Response:** paginated list of Order objects (without `orderDetails` — use GET /:id for details).

---

## GET /order/:id

**Response `data`:** full Order object including `orderDetails` array.

Errors: `404` order not found

---

## POST /order

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `recordBy` | string | yes | Employee ID `EMP-xxxx` |
| `shopId` | string | yes | `SHOP-xxxx` |
| `terminalId` | string | no | `TERM-xxxx` — if created via terminal |
| `status` | `completed` \| `cancelled` | no | default `completed` |
| `startRecordAt` | ISO8601 | no | |
| `completedRecordAt` | ISO8601 | no | |
| `note` | string | no | |
| `details` | OrderDetailCreateDto[] | no | items to create with the order |

**`details` item:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `productBarcode` | string | yes | |
| `quantityPack` | int ≥ 0 | no | |
| `quantityCarton` | int ≥ 0 | no | |

**Response `data`:** created Order object with `orderDetails` (201).

---

## POST /order/check-exist

**Request body:**
```jsonc
{ "ids": ["ORD-20260529-xxx", "ORD-20260529-yyy"] }
```

**Response `data`:**
```jsonc
{ "existing": ["ORD-20260529-xxx"], "missing": ["ORD-20260529-yyy"] }
```

---

## PATCH /order/:id

**Request body:** any subset of Order create fields (all optional).

**Response `data`:** updated Order object.

Errors: `404` order not found

---

## DELETE /order/bulk

**Request body:**
```jsonc
{ "ids": ["ORD-20260529-xxx", "ORD-20260529-yyy"] }
```

All-or-nothing: if any ID does not exist, the whole request fails with `404`.

**Response `data`:** array of deleted Order IDs.

---

## DELETE /order/:id

**Response `data`:** deleted Order object.

Errors: `404` order not found

---

## Order Detail — read-only

Order details are created with the order (via `details[]` in POST /order).
The `/order-detail` routes provide filtered read access.

### GET /order-detail — paginated

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | yes | |
| `limit` | int ≥ 1 | yes | |
| `orderId` | string | no | filter by order |
| `productBarcode` | string | no | filter by product |
| `dateFrom` | ISO8601 | no | `createdAt >= dateFrom` |
| `dateTo` | ISO8601 | no | `createdAt <= dateTo` |

**Response:** paginated list of OrderDetail objects.

### GET /order-detail/:orderId

Returns all details for a single order.

**Response `data`:** array of OrderDetail objects.

Errors: `404` if order has no details (or order doesn't exist)
