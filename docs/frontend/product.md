# Product — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

PK = `barcode` (client-defined string). All routes are under `/api/v1/product`.

## Product object shape

```jsonc
{
  "barcode": "8850999123456",
  "name": "น้ำดื่ม 500ml",
  "brand": { "id": "BRD-xxx", "name": "Sprite", ... } | null,
  "category": { "id": "CAT-xxx", "name": "เครื่องดื่ม", ... } | null,
  "costPrice": { "pack": 100, "carton": 1000 } | null,
  "sellPrice": { "pack": 120, "carton": 1200 } | null,
  "remaining": 50,
  "minStock": 5,
  "maxStock": null,
  "piecesPerPack": 24,
  "packPerCarton": 4,
  "productDimensions": { "length": 6, "width": 6, "height": 20, "weight": 0.5 } | null,
  "cartonDimensions": { "length": 40, "width": 30, "height": 25, "weight": 12 } | null,
  "isActive": true,
  "imageUrl": null,
  "sku": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

---

## GET /product — paginated

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | yes | |
| `limit` | int ≥ 1 | yes | |
| `search` | string | no | matches name or barcode |
| `brandId` | string | no | |
| `categoryId` | string | no | |
| `isActive` | `true`/`false` | no | string sent as query param |

**Response:** paginated list of Product objects.

---

## GET /product/dropdown-search

**Query:** `search` (string, optional) — matches name or barcode, returns up to 50 items.

**Response `data`:** array of lite objects:
```jsonc
{ "barcode": "...", "name": "...", "remaining": 10, "sellPrice": { "pack": 120, "carton": 1200 } }
```

---

## POST /product/check-exist

**Request body:**
```jsonc
{ "barcodes": ["P001", "P002", "P003"] }
```

**Response `data`:**
```jsonc
{ "existing": ["P001"], "missing": ["P002", "P003"] }
```

---

## GET /product/:barcode

**Response `data`:** full Product object including `brand` and `category` relations.

Errors: `404` barcode not found

---

## POST /product — SuperAdmin

**Request body (create):**
| Field | Type | Required | Notes |
|---|---|---|---|
| `barcode` | string | yes | client-defined PK |
| `name` | string | yes | |
| `brandId` | string | no | |
| `categoryId` | string | no | |
| `costPrice` | `{ pack, carton }` | no | |
| `sellPrice` | `{ pack, carton }` | no | |
| `remaining` | int ≥ 0 | yes | |
| `minStock` | int ≥ 0 | no | default 5 |
| `maxStock` | int ≥ 0 | no | |
| `piecesPerPack` | int ≥ 0 | no | |
| `packPerCarton` | int ≥ 0 | no | |
| `productDimensions` | `{ length, width, height, weight }` | no | cm / kg |
| `cartonDimensions` | `{ length, width, height, weight }` | no | cm / kg |

**Response `data`:** created Product object (201).

Errors: `409` barcode already exists

---

## POST /product/bulk — SuperAdmin

**Request body:** array of Product create objects (same fields as POST /product, each item).

**Response `data`:** array of created Product objects.

---

## PATCH /product/bulk — SuperAdmin

**Request body:**
```jsonc
{
  "products": [
    { "barcode": "P001", "data": { /* partial ProductCreateDto fields */ } },
    { "barcode": "P002", "data": { "name": "New Name" } }
  ]
}
```

**Response `data`:** array of updated Product objects.

---

## DELETE /product/bulk — SuperAdmin

**Request body:**
```jsonc
{ "barcodes": ["P001", "P002"] }
```

**Response `data`:**
```jsonc
{ "deleted": ["P001"], "errors": [{ "barcode": "P002", "message": "..." }] }
```

---

## PATCH /product/:barcode — SuperAdmin

**Request body:** any subset of Product create fields (all optional).

**Response `data`:** updated Product object.

Errors: `404` barcode not found

---

## DELETE /product/:barcode — SuperAdmin

**Response `data`:** the deleted Product object.

Errors: `404` barcode not found

---

## Shop-price sub-resource

### GET /product/:barcode/shop-price

**Response `data`:** array of:
```jsonc
{
  "id": "PSP-xxx",
  "productBarcode": "P001",
  "shopId": "SHOP-xxx",
  "sellPrice": { "pack": 130, "carton": 1300 },
  "effectiveFrom": "2026-01-01T00:00:00.000Z" | null,
  "effectiveTo": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### POST /product/:barcode/shop-price — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `shopId` | string | yes | e.g. `SHOP-xxxx` |
| `sellPrice` | `{ pack?, carton? }` | yes | |
| `effectiveFrom` | ISO date string | no | |
| `effectiveTo` | ISO date string | no | |

**Response `data`:** created ProductShopPrice object (201).

Errors: `409` (productBarcode, shopId) pair already exists

### PATCH /product/:barcode/shop-price/:shopId — SuperAdmin

**Request body:** any subset of `{ sellPrice, effectiveFrom, effectiveTo }`.

**Response `data`:** updated ProductShopPrice object.

### DELETE /product/:barcode/shop-price/:shopId — SuperAdmin

**Response `data`:** deleted ProductShopPrice object.
