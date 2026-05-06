# Response Shapes, Errors & Enums

## Standard Response Shapes

### Success — Single object
```ts
{
  success:    true,
  statusCode: 200 | 201,
  message:    "OK" | "Created" | "Updated" | "Deleted",
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

### message ตาม HTTP Method
| Method | message |
|---|---|
| GET | `"OK"` |
| POST | `"Created"` |
| PATCH | `"Updated"` |
| DELETE | `"Deleted"` |

---

## Error Codes & Examples

| Status | error string | เมื่อเกิด |
|---|---|---|
| 400 | `"Bad Request"` | validation fail, FK ไม่มีอยู่ |
| 401 | `"Unauthorized"` | ไม่มี token / token หมดอายุ / credentials ผิด / actor token ผิด |
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
  "timestamp": "2026-05-06T10:00:00.000Z",
  "path": "/api/v1/employee"
}
```

**ตัวอย่าง 401 — Actor token:**
```json
{
  "success": false, "statusCode": 401,
  "message": "Invalid or expired actor token",
  "error": "Unauthorized",
  "timestamp": "2026-05-06T10:00:00.000Z",
  "path": "/api/v1/stock-entry"
}
```

**ตัวอย่าง 404:**
```json
{
  "success": false, "statusCode": 404,
  "message": "Product 8850999123456 not found",
  "error": "Not Found",
  "timestamp": "2026-05-06T10:00:00.000Z",
  "path": "/api/v1/product/8850999123456"
}
```

**ตัวอย่าง 409 — Duplicate:**
```json
{
  "success": false, "statusCode": 409,
  "message": "Duplicate entry — record already exists",
  "error": "Conflict",
  "timestamp": "2026-05-06T10:00:00.000Z",
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

> ใช้ `ActorGuard` จาก `@app/auth/jwt/actor.guard` เพื่อ validate `X-Actor-Token` header  
> `req.actor` จะมี `{ employeeId, name, role, terminalId }` หลัง guard ผ่าน

---

## Enums

```ts
Role           = 'Operator' | 'SuperAdmin' | 'Admin' | 'Accountant' | 'Warehouse' | 'Sales' | 'Marketing' | 'HR'
Platform       = 'Shopee' | 'Lazada' | 'TikTok'
StockEntryType = 'in' | 'adjust' | 'return'
OrderStatus    = 'pending' | 'completed' | 'cancelled'
AuditActorType = 'user' | 'terminal' | 'employee' | 'system'
AuditAction    = 'login' | 'logout' | 'create' | 'update' | 'delete'
               | 'stock_in' | 'stock_adjust' | 'stock_return'
               | 'order_complete' | 'order_cancel' | 'pin_verify'
```

---

## ID Formats

| Table | Format | ตัวอย่าง |
|---|---|---|
| user | nanoid(12) | `Uv3kLmNpQrSt` |
| terminal | `TERM-{random}` | `TERM-AB12CD34EF` |
| brand | `BRD-{random}` | `BRD-AB12CD34EF` |
| category | `CAT-{random}` | `CAT-XY98ZW76UV` |
| employee | `EMP-{random}` | `EMP-QR45ST67UV` |
| shop | `SHOP-{random}` | `SHOP-MN23OP45QR` |
| product | barcode (กำหนดเอง) | `8850999123456` |
| order | `ORD-{YYYYMMDD}-{random}` | `ORD-20260506-AB12CD34EF` |
| order_detail | `ORDDETAIL-{YYYYMMDD}-{random}` | `ORDDETAIL-20260506-XY98ZW76` |
| stock_entry | `STK-{YYYYMMDD}-{random}` | `STK-20260506-QR45ST67UV` |
| audit_log | `AUDIT-{YYYYMMDD}-{random}` | `AUDIT-20260506-MN23OP45QR` |
| supplier | `SUP-{random}` | `SUP-AB12CD34EF` |
