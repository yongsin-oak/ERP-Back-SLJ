# SLJ Supply Center — API Reference

> สำหรับ Claude Frontend Agent  
> Updated: 2026-04-30

---

## Base

```
Base URL (dev) : http://localhost:5050
API prefix     : /api/v1
Full example   : http://localhost:5050/api/v1/auth/login
Swagger        : http://localhost:5050/swagger
```

---

## Auth & Dev Mode

### Production
- ทุก endpoint (ยกเว้น `/auth/login`, `/auth/refresh-token`) ต้องการ JWT
- Token เก็บใน **HTTP-only cookie** ชื่อ `token` — browser ส่งอัตโนมัติ ไม่ต้องใส่ header
- เมื่อ 401 ให้เรียก `POST /auth/refresh-token` แล้ว retry

### Dev Bypass (`NODE_ENV=development` + `BYPASS_AUTH=true`)
ไม่ต้อง login — ทุก request ถูก inject user นี้อัตโนมัติ:
```json
{ "sub": "dev-bypass", "username": "dev", "role": "SuperAdmin" }
```

---

## Standard Response Shapes

### Success — Single object
```ts
{
  success:    true,
  statusCode: 200 | 201,
  message:    "OK" | "Created",
  data:       T
}
```

### Success — Paginated list
```ts
{
  success:    true,
  statusCode: 200,
  message:    "OK",
  data:       T[],
  pagination: {
    page:            number,
    limit:           number,
    total:           number,
    totalPages:      number,
    hasNextPage:     boolean,
    hasPreviousPage: boolean
  }
}
```

### Error
```ts
{
  success:    false,
  statusCode: number,
  message:    string | string[],   // string[] สำหรับ validation errors
  error:      string,
  timestamp:  string,              // ISO8601
  path:       string               // เช่น "/api/v1/product"
}
```

> **หมายเหตุ**: `/auth/login` และ `/auth/refresh-token` ใช้ `@Res()` โดยตรง → bypasses interceptor → return raw JSON (ไม่มี success/statusCode/message wrapper)

---

## Error Codes & Examples

| Status | error string | เมื่อเกิด |
|---|---|---|
| 400 | `"Bad Request"` | validation fail, FK ไม่มีอยู่ |
| 401 | `"Unauthorized"` | ไม่มี token / token หมดอายุ / credentials ผิด |
| 403 | `"Forbidden"` | role ไม่มีสิทธิ์ |
| 404 | `"Not Found"` | ไม่เจอ resource |
| 409 | `"Conflict"` | duplicate (unique constraint) |
| 422 | `"Unprocessable Entity"` | business rule violation |
| 500 | `"Internal Server Error"` | server error |

**ตัวอย่าง 400 — Validation:**
```json
{
  "success": false, "statusCode": 400,
  "message": ["page must be a number", "limit must be a number"],
  "error": "Bad Request",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "path": "/api/v1/employee"
}
```

**ตัวอย่าง 404:**
```json
{
  "success": false, "statusCode": 404,
  "message": "Product 8850999123456 not found",
  "error": "Not Found",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "path": "/api/v1/product/8850999123456"
}
```

**ตัวอย่าง 409 — Duplicate:**
```json
{
  "success": false, "statusCode": 409,
  "message": "Duplicate entry — record already exists",
  "error": "Conflict",
  "timestamp": "2026-04-30T10:00:00.000Z",
  "path": "/api/v1/brand"
}
```

---

## Response Helpers (Backend Reference)

> หมายเหตุ: section นี้สำหรับ backend agent — frontend ไม่ต้องสนใจ

Import จาก `@app/common/helpers/response`

```ts
// Success — pass-through, interceptor ห่อให้เอง
return ok(entity);
return paginatedResponse(items, page, limit, total);

// Error — throw เพื่อให้ AllExceptionsFilter จัดรูปแบบให้
throw badRequest('Invalid input');
throw unauthorized();                          // default: 'Unauthorized'
throw forbidden();                             // default: 'Forbidden'
throw notFound(`Product ${barcode} not found`);
throw conflict(`Barcode ${barcode} already exists`);
throw unprocessable('Business rule violated');
throw internalError();                         // default: 'Internal server error'
```

---

## Enums

```ts
Role           = 'Operator' | 'SuperAdmin' | 'Admin' | 'Accountant' | 'Warehouse' | 'Sales' | 'Marketing' | 'HR'
Platform       = 'Shopee' | 'Lazada' | 'TikTok'
StockEntryType = 'in' | 'adjust' | 'return'
```

---

## ID Formats

| Table | Format | ตัวอย่าง |
|---|---|---|
| user | nanoid(12) | `Uv3kLmNpQrSt` |
| brand | `BRD-{random}` | `BRD-AB12CD34EF` |
| category | `CAT-{random}` | `CAT-XY98ZW76UV` |
| employee | `EMP-{random}` | `EMP-QR45ST67UV` |
| shop | `SHOP-{random}` | `SHOP-MN23OP45QR` |
| product | barcode (กำหนดเอง) | `8850999123456` |
| order | `ORD-{YYYYMMDD}-{random}` | `ORD-20260430-AB12CD34EF` |
| order_detail | `ORDDETAIL-{YYYYMMDD}-{random}` | `ORDDETAIL-20260430-XY98ZW76` |
| stock_entry | `STK-{YYYYMMDD}-{random}` | `STK-20260430-QR45ST67UV` |

---

## Auth  `/api/v1/auth`

### POST `/api/v1/auth/login`
ไม่ต้อง auth — **raw response (bypasses interceptor)**

**Body**
```json
{ "username": "string", "password": "string" }
```

**Response 200** *(raw — ไม่มี success/statusCode/message wrapper)*
```json
{
  "message": "Login successful",
  "user": { "username": "string", "role": "SuperAdmin" }
}
```
> Set HTTP-only cookies: `token` (10h) + `refreshToken` (7d)

**Error 401**
```json
{ "success": false, "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized", "timestamp": "...", "path": "/api/v1/auth/login" }
```

---

### POST `/api/v1/auth/refresh-token`
ไม่ต้อง auth — **raw response (bypasses interceptor)**

**Body (optional)**
```json
{ "refreshToken": "string" }
```
> ส่งผ่าน cookie `refreshToken` ก็ได้ — browser ส่งอัตโนมัติ

**Response 200** *(raw)*
```json
{ "message": "Refresh successful" }
```
> Rotate cookies — set `token` + `refreshToken` ใหม่

---

### GET `/api/v1/auth/me`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": { "sub": "string", "username": "string", "role": "SuperAdmin" }
}
```

---

### PATCH `/api/v1/auth/update-password`
ต้อง auth (all roles)

**Body**
```json
{ "currentPassword": "string", "newPassword": "string" }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "message": "string" } }
```

---

### POST `/api/v1/auth/logout`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "message": "Logout successful" } }
```
> Clear cookies `token` + `refreshToken`

---

## Employee  `/api/v1/employee`

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
      "createdAt": "2026-04-30T00:00:00.000Z",
      "updatedAt": "2026-04-30T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5, "hasNextPage": true, "hasPreviousPage": false }
}
```

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
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "EMP-xxxx", "..." } }
```

---

### DELETE `/api/v1/employee/:id`
ต้อง auth — **SuperAdmin เท่านั้น**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "EMP-xxxx", "..." } }
```

---

## Brand  `/api/v1/brand`

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
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "BRD-xxxx", "..." } }
```

---

### DELETE `/api/v1/brand/:id`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "BRD-xxxx", "..." } }
```

---

## Category  `/api/v1/category`

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
    "childrenId": ["CAT-xxxx"] ,
    "description": "string | null",
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 20, "totalPages": 2, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/category/tree`
ต้อง auth (all roles) — **ไม่มี pagination**

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
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "CAT-xxxx", "parent": { "id": "...", "name": "..." }, "..." } }
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
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "CAT-xxxx", "..." } }
```

---

## Shop  `/api/v1/shop`

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
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "SHOP-xxxx", "..." } }
```

---

### DELETE `/api/v1/shop/:id`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "SHOP-xxxx", "..." } }
```

---

## Product  `/api/v1/product`

### GET `/api/v1/product`
ต้อง auth (all roles)

**Query**
```
page        number   required
limit       number   required
search      string?  ค้นหาจาก name หรือ barcode (ILIKE)
brandId     string?  filter — "BRD-xxxx"
categoryId  string?  filter — "CAT-xxxx"
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "barcode": "8850999123456",
    "name": "string",
    "brand": { "id": "BRD-xxxx", "name": "string" },
    "category": { "id": "CAT-xxxx", "name": "string" },
    "costPrice": { "pack": 100, "carton": 1100 },
    "sellPrice": { "pack": 120, "carton": 1300 },
    "remaining": 500,
    "minStock": 50,
    "piecesPerPack": 12,
    "packPerCarton": 10,
    "productDimensions": { "length": 10, "width": 5, "height": 15, "weight": 0.3 },
    "cartonDimensions": { "length": 50, "width": 40, "height": 60, "weight": 4 },
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 20, "total": 200, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/product/:barcode`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "barcode": "8850999123456", "brand": {...}, "category": {...}, "..." } }
```

---

### POST `/api/v1/product`
ต้อง auth — **SuperAdmin**

**Body**
```json
{
  "barcode": "8850999123456",
  "name": "string",
  "brandId": "BRD-xxxx (optional)",
  "categoryId": "CAT-xxxx (optional)",
  "costPrice": { "pack": 100, "carton": 1100 },
  "sellPrice": { "pack": 120, "carton": 1300 },
  "remaining": 0,
  "minStock": 50,
  "piecesPerPack": 12,
  "packPerCarton": 10,
  "productDimensions": { "length": 10, "width": 5, "height": 15, "weight": 0.3 },
  "cartonDimensions": { "length": 50, "width": 40, "height": 60, "weight": 4 }
}
```

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "barcode": "8850999123456", "..." } }
```

---

### POST `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin**

**Body** — array ของ POST body ด้านบน

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": [{ "barcode": "...", "..." }] }
```

---

### PATCH `/api/v1/product/:barcode`
ต้อง auth — **SuperAdmin**

**Body** — Partial ของ POST body (ยกเว้น `barcode`)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "barcode": "...", "..." } }
```

---

### PATCH `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin**

**Body**
```json
{
  "products": [
    { "barcode": "8850999123456", "data": { "name": "new name", "remaining": 100 } }
  ]
}
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": [{ "barcode": "...", "..." }] }
```

---

### DELETE `/api/v1/product/:barcode`
ต้อง auth — **SuperAdmin**

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "barcode": "...", "..." } }
```

---

### DELETE `/api/v1/product/bulk`
ต้อง auth — **SuperAdmin**

**Body**
```json
{ "barcodes": ["8850999123456", "8850999654321"] }
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "deleted": [{ "barcode": "...", "..." }],
    "errors": []
  }
}
```

---

## Order  `/api/v1/order`

### GET `/api/v1/order`
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
    "id": "ORD-20260430-xxxx",
    "employee": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "orderDetails": [],
    "createdAt": "...", "updatedAt": "..."
  }],
  "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10, "hasNextPage": true, "hasPreviousPage": false }
}
```

---

### GET `/api/v1/order/:id`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "id": "ORD-20260430-xxxx",
    "employee": { "id": "EMP-xxxx", "firstName": "string", "lastName": "string", "nickname": "string" },
    "shop": { "id": "SHOP-xxxx", "name": "string", "platform": "Shopee" },
    "orderDetails": [{
      "id": "ORDDETAIL-20260430-xxxx",
      "orderId": "ORD-20260430-xxxx",
      "product": { "barcode": "...", "name": "...", "..." },
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
  "createdBy": "EMP-xxxx",
  "shopId": "SHOP-xxxx",
  "details": [
    { "productBarcode": "8850999123456", "quantityPack": 5, "quantityCarton": 2 }
  ]
}
```
> `id` ถูก auto-generate → `ORD-{YYYYMMDD}-{random}`

**Response 201**
```json
{ "success": true, "statusCode": 201, "message": "Created", "data": { "id": "ORD-20260430-xxxx", "..." } }
```

---

### PATCH `/api/v1/order/:id`
ต้อง auth (all roles)

**Body** — Partial ของ POST body

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "ORD-20260430-xxxx", "..." } }
```

---

### DELETE `/api/v1/order/:id`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "OK", "data": { "id": "ORD-20260430-xxxx", "..." } }
```

---

## Order Detail  `/api/v1/order-detail`

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
    "id": "ORDDETAIL-20260430-xxxx",
    "orderId": "ORD-20260430-xxxx",
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
    "id": "ORDDETAIL-20260430-xxxx",
    "orderId": "ORD-20260430-xxxx",
    "product": { "barcode": "...", "name": "...", "..." },
    "quantityPack": 5,
    "quantityCarton": 2,
    "createdAt": "...", "updatedAt": "..."
  }]
}
```

---

## Stock Entry  `/api/v1/stock-entry`

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
page            number   required
limit           number   required
productBarcode  string?  filter เฉพาะสินค้านั้น
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [{
    "id": "STK-20260430-xxxx",
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
{
  "success": true, "statusCode": 201, "message": "Created",
  "data": {
    "id": "STK-20260430-xxxx",
    "productBarcode": "8850999123456",
    "product": { "barcode": "...", "name": "...", "remaining": 500 },
    "type": "in",
    "quantity": 100,
    "previousRemaining": 400,
    "newRemaining": 500,
    "employee": { "..." },
    "employeeId": "EMP-xxxx",
    "note": null,
    "createdAt": "...", "updatedAt": "..."
  }
}
```

---

## Dashboard  `/api/v1/dashboard`

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
> revenue = `sum(quantityPack × sellPrice.pack + quantityCarton × sellPrice.carton)`

---

### GET `/api/v1/dashboard/daily-revenue`
ต้อง auth (all roles)

**Query**
```
days  number?   default 7 — ย้อนหลังกี่วัน
```

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": [
    { "date": "2026-04-30", "revenue": 45000, "cost": 32000 },
    { "date": "2026-04-29", "revenue": 38000, "cost": 27000 }
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
    { "id": "ORD-20260430-xxxx", "shopName": "SLJ Shopee", "platform": "Shopee", "totalPrice": 5400, "createdAt": "..." }
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

---

## Relationships (Quick Reference)

```
brand.id          → product.brandId
category.id       → product.categoryId
category.id       → category.parentId        (self-ref)
employee.id       → order.createdBy
shop.id           → order.shopId
order.id          → order_detail.orderId
product.barcode   → order_detail.productBarcode
product.barcode   → stock_entry.productBarcode
employee.id       → stock_entry.employeeId
```

---

## Axios Config (ตัวอย่าง)

```ts
const api = axios.create({
  baseURL: 'http://localhost:5050/api/v1',
  withCredentials: true,   // ส่ง cookie ทุก request
});

// Auto refresh เมื่อ 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      await api.post('/auth/refresh-token');
      return api(err.config);
    }
    return Promise.reject(err);
  },
);
```
