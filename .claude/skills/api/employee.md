# Employee  `/api/v1/employee`

---

### GET `/api/v1/employee`
ต้อง auth (all roles)

**Query**
```
page        number   required, min 1
limit       number   required, min 1
search      string?  ค้นหาจาก firstName, lastName, nickname (ILIKE)
department  Role?    filter ตามแผนก
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    {
      "id": "EMP-xxxx",
      "firstName": "string", "lastName": "string", "nickname": "string",
      "phoneNumber": "string | null",
      "startDate": "2024-01-15 | null",
      "department": "Warehouse",
      "createdAt": "2026-05-06T00:00:00.000Z",
      "updatedAt": "2026-05-06T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5, "hasNextPage": true, "hasPreviousPage": false }
}
```
> `pinHash` ไม่ถูกส่งกลับ (select: false)

---

### GET `/api/v1/employee/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "EMP-xxxx", "..." } }
```

---

### POST `/api/v1/employee`
ต้อง auth — **SuperAdmin เท่านั้น**

**Body**
```json
{
  "firstName": "string",
  "lastName": "string",
  "nickname": "string",
  "phoneNumber": "string (optional)",
  "startDate": "2024-01-15 (optional)",
  "department": "Warehouse"
}
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "EMP-xxxx", "..." } }
```

---

### PATCH `/api/v1/employee/:id`
ต้อง auth — **SuperAdmin เท่านั้น**

**Body** — Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "EMP-xxxx", "..." } }
```

---

### PATCH `/api/v1/employee/:id/pin`
ต้อง auth — **SuperAdmin เท่านั้น**

ตั้ง PIN สำหรับ employee เพื่อใช้ยืนยันตัวตนที่ terminal

**Body**
```json
{ "pin": "1234" }
```
> PIN เป็น 4–6 หลักตัวเลขเท่านั้น

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": null }
```

---

### DELETE `/api/v1/employee/:id`
ต้อง auth — **SuperAdmin เท่านั้น**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "EMP-xxxx", "..." } }
```
