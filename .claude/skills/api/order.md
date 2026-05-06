# Order  `/api/v1/order`

---

### GET `/api/v1/order`
ต้อง auth (all roles)

**Query**
```
page   number   required
limit  number   required
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "ORD-20260506-xxxx",
    "employee": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "orderDetails": [],
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/order/:id`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "id": "ORD-20260506-xxxx",
    "employee": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "orderDetails": [{
      "id": "ORDDETAIL-20260506-xxxx",
      "orderId": "ORD-20260506-xxxx",
      "product": { "barcode": "...", "name": "...", "..." },
      "quantityPack": 5,
      "quantityCarton": 2,
      "createdAt": "...", "updatedAt": "..."
    }],
    "createdAt": "...", "updatedAt": "..."
  }
}
```

---

### POST `/api/v1/order`
ต้อง auth (all roles)

**Body**
```json
{
  "createdBy": "EMP-xxxx",
  "shopId": "SHOP-xxxx",
  "details": [
    { "productBarcode": "8850999123456", "quantityPack": 5, "quantityCarton": 2 }
  ]
}
```
> `id` ถูก auto-generate → `ORD-{YYYYMMDD}-{random}`

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "ORD-20260506-xxxx", "..." } }
```

---

### PATCH `/api/v1/order/:id`
ต้อง auth (all roles) — Body: Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "ORD-20260506-xxxx", "..." } }
```

---

### DELETE `/api/v1/order/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "ORD-20260506-xxxx", "..." } }
```

---

### DELETE `/api/v1/order/bulk`
ต้อง auth (all roles)

**Body**
```json
{ "ids": ["ORD-20260506-xxxx", "ORD-20260506-yyyy"] }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "deleted": [...], "errors": [] } }
```

---

### POST `/api/v1/order/check-exist`
ต้อง auth (all roles)

**Body**
```json
{ "ids": ["ORD-20260506-xxxx", "ORD-20260506-yyyy"] }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "existing": ["ORD-20260506-xxxx"], "missing": ["ORD-20260506-yyyy"] } }
```
