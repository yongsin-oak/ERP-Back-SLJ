# Order Detail  `/api/v1/order-detail`

---

### GET `/api/v1/order-detail`
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
    "id": "ORDDETAIL-20260506-xxxx",
    "orderId": "ORD-20260506-xxxx",
    "product": { "barcode": "...", "name": "...", "..." },
    "quantityPack": 5,
    "quantityCarton": 2,
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/order-detail/:orderId`
ต้อง auth (all roles) — **ไม่มี pagination**

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "ORDDETAIL-20260506-xxxx",
    "orderId": "ORD-20260506-xxxx",
    "product": { "barcode": "...", "name": "...", "..." },
    "quantityPack": 5,
    "quantityCarton": 2,
    "createdAt": "...", "updatedAt": "..."
  }]
}
```
