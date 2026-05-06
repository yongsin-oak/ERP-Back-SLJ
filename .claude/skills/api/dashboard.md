# Dashboard  `/api/v1/dashboard`

---

### GET `/api/v1/dashboard/stats`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "totalOrders": 1500,
    "totalRevenue": 2500000,
    "totalCost": 1800000,
    "totalProducts": 250,
    "totalEmployees": 12,
    "todayOrders": 25,
    "todayRevenue": 45000
  }
}
```

---

### GET `/api/v1/dashboard/daily-revenue`
ต้อง auth (all roles)

**Query**
```
days  number?   default 7
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "date": "2026-05-06", "revenue": 45000, "cost": 32000 },
    { "date": "2026-05-05", "revenue": 38000, "cost": 27000 }
  ]
}
```

---

### GET `/api/v1/dashboard/recent-orders`
ต้อง auth (all roles)

**Query**
```
limit  number?   default 5
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "id": "ORD-20260506-xxxx", "shopName": "SLJ Shopee", "platform": "Shopee", "totalPrice": 5400, "createdAt": "..." }
  ]
}
```

---

### GET `/api/v1/dashboard/low-stock`
ต้อง auth (all roles)

**Query**
```
threshold  number?   default 5 — แสดงสินค้าที่ remaining <= threshold
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "barcode": "8850999123456", "name": "string", "remaining": 3, "minStock": 50 }
  ]
}
```
