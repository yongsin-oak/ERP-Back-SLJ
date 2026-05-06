# Category  `/api/v1/category`

---

### GET `/api/v1/category`
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
    "id": "CAT-xxxx", "name": "string",
    "parentId": "CAT-xxxx | null",
    "childrenId": ["CAT-xxxx"],
    "description": "string | null",
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 20, "totalPages": 2, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/category/tree`
ต้อง auth (all roles) — **ไม่มี pagination** — คืนเฉพาะ root nodes (parent = null) พร้อม nested children

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "CAT-xxxx", "name": "เครื่องดื่ม",
    "description": "string | null", "parentId": null,
    "children": [
      { "id": "CAT-yyyy", "name": "น้ำผลไม้", "description": null, "parentId": "CAT-xxxx", "children": [] }
    ]
  }]
}
```

---

### GET `/api/v1/category/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "CAT-xxxx", "name": "string", "children": [...], "..." } }
```

---

### POST `/api/v1/category`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "name": "string", "parentId": "CAT-xxxx (optional)", "description": "string (optional)" }
```
> `name` ต้อง unique

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "CAT-xxxx", "..." } }
```

---

### PATCH `/api/v1/category/:id`
ต้อง auth — **SuperAdmin**

**Body** — Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "CAT-xxxx", "parent": { "id": "...", "name": "..." }, "..." } }
```

---

### DELETE `/api/v1/category/:id`
ต้อง auth — **SuperAdmin**

**Query**
```
deleteChild  'true' | '1' (optional)   ถ้าส่งมาจะลบ children ทั้งหมดด้วย
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "CAT-xxxx", "..." } }
```
