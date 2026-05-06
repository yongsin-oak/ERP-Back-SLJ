# Shop  `/api/v1/shop`

---

### GET `/api/v1/shop`
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
  "data": [{ "id": "SHOP-xxxx", "name": "string", "description": "string | null", "platform": "Shopee", "createdAt": "...", "updatedAt": "..." }],
  "pagination": { "page": 1, "limit": 10, "total": 3, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/shop/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee", "..." } }
```

---

### POST `/api/v1/shop`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "name": "string", "platform": "Shopee", "description": "string (optional)" }
```
> Unique constraint: (name + platform) — ชื่อเดียวกันใน platform เดียวกันซ้ำไม่ได้

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "SHOP-xxxx", "..." } }
```

---

### PATCH `/api/v1/shop/:id`
ต้อง auth — **SuperAdmin**

**Body** — Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "SHOP-xxxx", "..." } }
```

---

### DELETE `/api/v1/shop/:id`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "SHOP-xxxx", "..." } }
```
