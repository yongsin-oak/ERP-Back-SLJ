# Supplier  `/api/v1/supplier`

---

### GET `/api/v1/supplier`
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
    "id": "SUP-xxxx",
    "name": "บริษัท โค้กไทย จำกัด",
    "contactName": "คุณสมศักดิ์",
    "phone": "02-111-1111",
    "email": "order@co.th",
    "address": null,
    "taxId": "0105537000001",
    "isActive": true,
    "note": null,
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1, "hasNextPage": false, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/supplier/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "SUP-xxxx", "..." } }
```

---

### POST `/api/v1/supplier`
ต้อง auth — **SuperAdmin**

**Body**
```json
{
  "name": "บริษัท โค้กไทย จำกัด",
  "contactName": "คุณสมศักดิ์ (optional)",
  "phone": "02-111-1111 (optional)",
  "email": "order@co.th (optional)",
  "address": "string (optional)",
  "taxId": "0105537000001 (optional)",
  "isActive": true,
  "note": "string (optional)"
}
```
> `name` ต้อง unique

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "SUP-xxxx", "..." } }
```

---

### PATCH `/api/v1/supplier/:id`
ต้อง auth — **SuperAdmin** — Body: Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { "id": "SUP-xxxx", "..." } }
```

---

### DELETE `/api/v1/supplier/:id`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Deleted", "data": { "id": "SUP-xxxx", "..." } }
```
