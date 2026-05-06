# Terminal  `/api/v1/terminal`

จัดการ Terminal (POS/kiosk) — **SuperAdmin เท่านั้น**

Terminal คือเครื่องที่ login ด้วย `terminalCode` + `password` แทน username  
มี role กำหนดไว้ล่วงหน้า และต้องให้ employee ยืนยัน PIN ก่อนทำรายการ

---

### GET `/api/v1/terminal`

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    {
      "id": "TERM-AB12CD34EF",
      "terminalCode": "POS-01",
      "name": "POS หน้าร้าน 1",
      "role": "Operator",
      "isActive": true,
      "location": "ห้องแพ็คของ 1",
      "lastSeenAt": "2026-05-06T09:00:00.000Z",
      "createdAt": "2026-05-06T00:00:00.000Z",
      "updatedAt": "2026-05-06T00:00:00.000Z"
    }
  ]
}
```
> `passwordHash` ไม่ถูกส่งกลับในทุก endpoint (select: false)

---

### GET `/api/v1/terminal/:id`

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { "id": "TERM-xxxx", "terminalCode": "POS-01", "name": "POS หน้าร้าน 1", "role": "Operator", "isActive": true, "location": "ห้องแพ็คของ 1", "lastSeenAt": "...", "..." }
}
```

---

### POST `/api/v1/terminal`

**Body**
```json
{
  "terminalCode": "POS-01",
  "name": "POS หน้าร้าน 1",
  "role": "Operator",
  "password": "terminal1234",
  "location": "ห้องแพ็คของ 1 (optional)"
}
```
> `password` ต้องอย่างน้อย 8 ตัวอักษร — `terminalCode` ต้อง unique

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "TERM-xxxx", "terminalCode": "POS-01", "location": "ห้องแพ็คของ 1", "..." } }
```

---

### PATCH `/api/v1/terminal/:id`

**Body** — ทุก field เป็น optional
```json
{
  "terminalCode": "POS-02",
  "name": "POS คลังสินค้า",
  "role": "Warehouse",
  "password": "newpassword1234",
  "isActive": false,
  "location": "โกดัง B"
}
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "TERM-xxxx", "isActive": false, "location": "โกดัง B", "..." } }
```

---

### DELETE `/api/v1/terminal/:id`

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": null }
```

---

## New Fields

| Field | Type | หมายเหตุ |
|---|---|---|
| `location` | string nullable | ตำแหน่งทางกายภาพของเครื่อง |
| `lastSeenAt` | timestamp nullable | เวลา activity ล่าสุด (อัปเดตทุก request จาก terminal) |
