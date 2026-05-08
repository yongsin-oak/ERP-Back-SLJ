# Order  `/api/v1/order`

---

### GET `/api/v1/order`
ต้อง auth (all roles)

**Query**
```
page          number    required
limit         number    required
search        string?   ค้นหาจาก note
status        string?   'completed' | 'cancelled'
shopId        string?   filter ตาม shop
employeeId    string?   filter ตาม recordBy employee
terminalId    string?   filter ตาม terminal
dateFrom      string?   ISO8601 — startRecordAt >= dateFrom
dateTo        string?   ISO8601 — startRecordAt <= dateTo
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "ORD-20260506-xxxx",
    "recordBy": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "terminal": { "id": "TERM-xxxx", "terminalCode": "POS-01", "name": "POS หน้าร้าน 1", "role": "Operator", "location": "ห้องแพ็คของ 1", "isActive": true },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "status": "completed",
    "startRecordAt": "2026-05-06T09:00:00.000Z",
    "completedRecordAt": "2026-05-06T09:15:00.000Z",
    "note": null,
    "orderDetails": [],
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }
}
```
> `terminal` จะเป็น `null` ถ้า order ถูกสร้างผ่าน web UI (ไม่ใช่ terminal)

---

### GET `/api/v1/order/:id`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "id": "ORD-20260506-xxxx",
    "recordBy": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "terminal": { "id": "TERM-xxxx", "terminalCode": "POS-01", "name": "POS หน้าร้าน 1", "role": "Operator", "location": "ห้องแพ็คของ 1", "isActive": true },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "status": "completed",
    "startRecordAt": "2026-05-06T09:00:00.000Z",
    "completedRecordAt": "2026-05-06T09:15:00.000Z",
    "note": "แพ็คพิเศษ",
    "orderDetails": [{
      "id": "ORDDETAIL-20260506-xxxx",
      "orderId": "ORD-20260506-xxxx",
      "product": { "barcode": "...", "name": "..." },
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
  "recordBy": "EMP-xxxx",
  "shopId": "SHOP-xxxx",
  "terminalId": "TERM-xxxx (optional)",
  "status": "completed (optional, default: completed)",
  "startRecordAt": "2026-05-06T09:00:00.000Z (optional)",
  "completedRecordAt": "2026-05-06T09:15:00.000Z (optional)",
  "note": "string (optional)",
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
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "ORD-20260506-xxxx", "status": "completed", "..." } }
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

---

## Order Status

| status | ความหมาย |
|---|---|
| `completed` | บันทึกเสร็จ — default เมื่อ create |
| `cancelled` | ยกเลิก order |

> ไม่มี `pending` อีกต่อไป — flow จริงคือพนักงานสแกนครบแล้วกด Save ครั้งเดียว

**Man-hour คำนวณจาก:**
```
completedRecordAt - startRecordAt = เวลาที่ใช้ต่อ order
```
