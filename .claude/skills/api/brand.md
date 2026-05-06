# Brand  `/api/v1/brand`

---

### GET `/api/v1/brand`
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
  "data": [{ "id": "BRD-xxxx", "name": "string", "description": "string | null", "createdAt": "...", "updatedAt": "..." }],
  "pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/brand/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "BRD-xxxx", "name": "string", "description": "string | null", "createdAt": "...", "updatedAt": "..." } }
```

---

### POST `/api/v1/brand`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "name": "string", "description": "string (optional)" }
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "BRD-xxxx", "name": "string", "..." } }
```

---

### POST `/api/v1/brand/bulk`
ต้อง auth — **SuperAdmin**

**Body**
```json
[{ "name": "string", "description": "string (optional)" }]
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": [{ "id": "BRD-xxxx", "..." }] }
```

---

### PATCH `/api/v1/brand/:id`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "name": "string (optional)", "description": "string (optional)" }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "BRD-xxxx", "..." } }
```

---

### DELETE `/api/v1/brand/:id`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "BRD-xxxx", "..." } }
```
