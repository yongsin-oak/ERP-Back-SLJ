# Stock Entry  `/api/v1/stock-entry`

บันทึก audit trail การเปลี่ยนแปลง stock — ทุกครั้งที่สร้าง entry จะอัปเดต `product.remaining` อัตโนมัติ

| type | ผลต่อ remaining |
|---|---|
| `in` | `remaining += quantity` |
| `return` | `remaining += quantity` |
| `adjust` | `remaining = quantity` (set ค่าใหม่ตรงๆ) |

---

### GET `/api/v1/stock-entry`
ต้อง auth (all roles)

**Query**
```
page            number    required
limit           number    required
productBarcode  string?   filter เฉพาะสินค้านั้น
type            string?   'in' | 'return' | 'adjust'
employeeId      string?   filter ตามพนักงาน
dateFrom        string?   ISO8601 — createdAt >= dateFrom
dateTo          string?   ISO8601 — createdAt <= dateTo
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "STK-20260506-xxxx",
    "productBarcode": "8850999123456",
    "product": { "barcode": "...", "name": "...", "remaining": 500, "..." },
    "type": "in",
    "quantity": 100,
    "previousRemaining": 400,
    "newRemaining": 500,
    "employee": { "id": "EMP-xxxx", "firstName": "string", "..." },
    "employeeId": "EMP-xxxx",
    "note": "string | null",
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 200, "totalPages": 20, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### POST `/api/v1/stock-entry`
ต้อง auth (all roles)

**Body**
```json
{
  "productBarcode": "8850999123456",
  "type": "in",
  "quantity": 100,
  "employeeId": "EMP-xxxx (optional)",
  "note": "string (optional)"
}
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "STK-20260506-xxxx", "..." } }
```

---

### POST `/api/v1/stock-entry/bulk`
ต้อง auth (all roles) — รับสินค้าเข้าหลายรายการพร้อมกัน

**Body**
```json
{
  "employeeId": "EMP-xxxx (optional)",
  "note": "string (optional)",
  "entries": [
    { "productBarcode": "8850999123456", "type": "in", "quantity": 120 },
    { "productBarcode": "8850999654321", "type": "in", "quantity": 60 }
  ]
}
```

**Response 201**
```json
{
  "success": true, "statusCode": 201, "message": "Created",
  "data": {
    "created": [{ "id": "STK-xxxx", "productBarcode": "...", "newRemaining": 620, "..." }],
    "errors": []
  }
}
```

---

### POST `/api/v1/stock-entry/bulk-adjust`
ต้อง auth (all roles) — นับสต็อกจริงแล้ว set ค่าทีเดียวหลายรายการ

**Body**
```json
{
  "employeeId": "EMP-xxxx (optional)",
  "note": "นับสต็อกประจำเดือน พ.ค. 2026",
  "adjustments": [
    { "productBarcode": "8850999123456", "actualQuantity": 450 },
    { "productBarcode": "8850999654321", "actualQuantity": 88 }
  ]
}
```

**Response 201**
```json
{
  "success": true, "statusCode": 201, "message": "Created",
  "data": { "created": [...], "errors": [] }
}
```
