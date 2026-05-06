# Product  `/api/v1/product`

---

### GET `/api/v1/product`
ต้อง auth (all roles)

**Query**
```
page        number   required
limit       number   required
search      string?  ค้นหาจาก name หรือ barcode (ILIKE)
brandId     string?  filter — "BRD-xxxx"
categoryId  string?  filter — "CAT-xxxx"
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "barcode": "8850999123456",
    "name": "string",
    "sku": "COKE-CAN-325",
    "brand": { "id": "BRD-xxxx", "name": "string" },
    "category": { "id": "CAT-xxxx", "name": "string" },
    "costPrice": { "pack": 100, "carton": 1100 },
    "sellPrice": { "pack": 120, "carton": 1300 },
    "remaining": 500,
    "minStock": 50,
    "maxStock": 2000,
    "isActive": true,
    "imageUrl": null,
    "piecesPerPack": 12,
    "packPerCarton": 10,
    "productDimensions": { "length": 10, "width": 5, "height": 15, "weight": 0.3 },
    "cartonDimensions": { "length": 50, "width": 40, "height": 60, "weight": 4 },
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 20, "total": 200, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/product/dropdown-search`
ต้อง auth (all roles) — ค้นหาสินค้าสำหรับ dropdown สูงสุด 50 รายการ

**Query**
```
search  string?  ค้นหาจาก name หรือ barcode (ILIKE)
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "barcode": "8850999123456", "name": "Coca-Cola Can 325ml", "remaining": 500, "sellPrice": { "pack": 145, "carton": 1600 } }
  ]
}
```

---

### GET `/api/v1/product/:barcode`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "barcode": "8850999123456", "brand": {...}, "category": {...}, "isActive": true, "..." } }
```

---

### POST `/api/v1/product`
ต้อง auth — **SuperAdmin**

**Body**
```json
{
  "barcode": "8850999123456",
  "name": "string",
  "sku": "string (optional, unique)",
  "brandId": "BRD-xxxx (optional)",
  "categoryId": "CAT-xxxx (optional)",
  "costPrice": { "pack": 100, "carton": 1100 },
  "sellPrice": { "pack": 120, "carton": 1300 },
  "remaining": 0,
  "minStock": 50,
  "maxStock": 2000,
  "isActive": true,
  "imageUrl": "https://... (optional)",
  "piecesPerPack": 12,
  "packPerCarton": 10,
  "productDimensions": { "length": 10, "width": 5, "height": 15, "weight": 0.3 },
  "cartonDimensions": { "length": 50, "width": 40, "height": 60, "weight": 4 }
}
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "barcode": "8850999123456", "..." } }
```

---

### POST `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin** — Body เป็น array ของ POST body ด้านบน

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": [{ "barcode": "...", "..." }] }
```

---

### POST `/api/v1/product/check-exist`
ต้อง auth (all roles)

**Body**
```json
{ "barcodes": ["8850999123456", "8850999654321"] }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "existing": ["8850999123456"], "missing": ["8850999654321"] } }
```

---

### PATCH `/api/v1/product/:barcode`
ต้อง auth — **SuperAdmin** — Body: Partial ของ POST body (ยกเว้น `barcode`)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "barcode": "...", "isActive": false, "..." } }
```

---

### PATCH `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "products": [{ "barcode": "8850999123456", "data": { "name": "new name", "remaining": 100 } }] }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": [{ "barcode": "...", "..." }] }
```

---

### DELETE `/api/v1/product/:barcode`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "barcode": "...", "..." } }
```

---

### DELETE `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "barcodes": ["8850999123456", "8850999654321"] }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "deleted": [{"barcode":"..."}], "errors": [] } }
```

---

## New Fields

| Field | Type | หมายเหตุ |
|---|---|---|
| `isActive` | boolean (default true) | ปิดสินค้าโดยไม่ต้องลบ |
| `sku` | string nullable unique | รหัสสินค้าภายใน แยกจาก barcode |
| `imageUrl` | string nullable | URL รูปภาพสินค้า |
| `maxStock` | int nullable | ขีดบน stock — แจ้งเตือนเมื่อสั่งเกิน |
