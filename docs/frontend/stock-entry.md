# Stock Entry — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

All roles can read and write stock entries.

---

## StockEntry object shape

```jsonc
{
  "id": "STK-20260529-xxxx",
  "product": { "barcode": "P001", "name": "น้ำดื่ม", ... },
  "productBarcode": "P001",
  "type": "in",
  "quantity": 50,
  "previousRemaining": 100,
  "newRemaining": 150,
  "employee": { "id": "EMP-xxx", "firstName": "John", ... } | null,
  "employeeId": "EMP-xxx" | null,
  "note": null,
  "createdAt": "2026-05-29T10:00:00.000Z",
  "updatedAt": "2026-05-29T10:00:00.000Z"
}
```

`product` and `employee` are eagerly loaded (always present in response).

---

## GET /stock-entry — paginated

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | yes | |
| `limit` | int ≥ 1 | yes | |
| `productBarcode` | string | no | |
| `type` | `in` \| `adjust` \| `return` | no | |
| `employeeId` | string | no | |
| `dateFrom` | ISO8601 | no | `createdAt >= dateFrom` |
| `dateTo` | ISO8601 | no | `createdAt <= dateTo` |

**Response:** paginated list of StockEntry objects.

---

## POST /stock-entry

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `productBarcode` | string | yes | |
| `type` | `in` \| `adjust` \| `return` | yes | |
| `quantity` | int ≥ 0 | yes | For `in`/`return`: delta added. For `adjust`: the **new absolute remaining** value |
| `employeeId` | string | no | `EMP-xxxx` |
| `note` | string | no | |

> **`adjust` vs `in`/`return`:** `type: "adjust"` sets `remaining` to the value of `quantity`
> directly (stock count). `type: "in"` and `type: "return"` add `quantity` to the
> current remaining.

**Response `data`:** created StockEntry object (201). `product.remaining` is already updated.

Errors: `404` product not found

---

## POST /stock-entry/bulk

Create multiple entries in one call.

**Request body:**
```jsonc
{
  "employeeId": "EMP-xxxx",
  "note": "Delivery from supplier",
  "entries": [
    { "productBarcode": "P001", "type": "in", "quantity": 100 },
    { "productBarcode": "P002", "type": "in", "quantity": 50 }
  ]
}
```

`employeeId` and `note` apply to all entries in the batch.

**Response `data`:** array of created StockEntry objects (201).

---

## POST /stock-entry/bulk-adjust

Stock-count operation — sets each product's remaining to the exact counted value.

**Request body:**
```jsonc
{
  "employeeId": "EMP-xxxx",
  "note": "Monthly stock count",
  "adjustments": [
    { "productBarcode": "P001", "actualQuantity": 95 },
    { "productBarcode": "P002", "actualQuantity": 210 }
  ]
}
```

`actualQuantity` is the physically-counted value — it becomes the new `remaining` regardless of the current value.
Creates one `type: "adjust"` StockEntry per item.

**Response `data`:** array of created StockEntry objects (201).

Errors: `404` any product barcode not found
