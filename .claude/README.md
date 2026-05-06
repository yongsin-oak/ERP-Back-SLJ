# SLJ Supply Center — ERP Backend

NestJS backend สำหรับระบบ ERP ของ SLJ Supply Center  
Runtime: **Bun** | DB: **PostgreSQL + TypeORM** | Auth: **JWT via HTTP-only cookie**

---

## RULE: อัปเดต API.md ทุกครั้ง

**เมื่อมีการเปลี่ยนแปลงใดๆ ต่อไปนี้ต้องอัปเดต `API.md` ทุกครั้ง:**
- เพิ่ม/ลบ/เปลี่ยน endpoint (path, method, query, body, response)
- เพิ่ม module ใหม่
- เปลี่ยน response shape (ทั้ง success และ error)
- เปลี่ยน auth/versioning logic
- เปลี่ยน enum values หรือ ID format

`API.md` อยู่ที่ root ของ repo และเป็น source of truth สำหรับ frontend agent

---

## Stack

- **Framework**: NestJS 11 + Express adapter
- **Language**: TypeScript 6.0.3
- **ORM**: TypeORM 0.3 (`synchronize: true` ใน dev)
- **Database**: PostgreSQL
- **Auth**: Passport JWT (cookie-based, ไม่ใช่ Authorization header)
- **Validation**: class-validator + class-transformer
- **ID generation**: nanoid / `generateIdWithPrefix` helper
- **Docs**: Swagger at `/swagger`

---

## Dev Setup

```bash
bun install
bun run start:dev
# API: http://localhost:5050/api/v1
# Swagger: http://localhost:5050/swagger
```

### Dev Auth Bypass

เมื่อ `.env` มี `NODE_ENV=development` **และ** `BYPASS_AUTH=true`  
ทุก request จะถูก inject user นี้อัตโนมัติ ไม่ต้อง login:

```json
{ "sub": "dev-bypass", "username": "dev", "role": "SuperAdmin" }
```

ปิด bypass: ตั้ง `BYPASS_AUTH=false` หรือลบออก  
ต้องมี **ทั้งสอง** condition ถึงจะ bypass — `NODE_ENV=development` อย่างเดียวไม่พอ

---

## API Versioning

- `setGlobalPrefix('api')` + `enableVersioning({ type: VersioningType.URI })`
- ทุก controller ต้องมี `version: '1'` → URL เป็น `/api/v1/...`
- เมื่อต้องการ break change ให้สร้าง controller ใหม่ที่ `version: '2'` ไม่กระทบ module อื่น
- ห้ามเปลี่ยน global prefix

---

## Standard Response Shapes

### Success — Single
```ts
{ success: true, statusCode: number, message: string, data: T }
```

### Success — Paginated
```ts
{
  success: true, statusCode: number, message: string,
  data: T[],
  pagination: { page, limit, total, totalPages, hasNextPage, hasPreviousPage }
}
```

### Error (จาก AllExceptionsFilter)
```ts
{ success: false, statusCode: number, message: string | string[], error: string, timestamp: string, path: string }
```

> `/auth/login` และ `/auth/refresh-token` ใช้ `@Res()` โดยตรง → bypass interceptor → return raw JSON

### Standard `message` ตาม HTTP Method
`TransformResponseInterceptor` กำหนด `message` อัตโนมัติจาก HTTP method:

| Method | message default |
|---|---|
| GET | `"OK"` |
| POST | `"Created"` |
| PATCH | `"Updated"` |
| PUT | `"Updated"` |
| DELETE | `"Deleted"` |

Override ด้วย `@ResponseMessage('custom text')` decorator บน handler:
```ts
@ResponseMessage('Employees fetched')
@Get()
async findAll() { ... }
```

### Response Helpers (controller layer)
```ts
// Controller — ใช้ ok() ห่อทุก return ค่าจาก service
return ok(await this.service.findOne(id));        // single
return ok(await this.service.findAll(query));     // paginated (ok is pass-through)

// Service — ใช้ paginatedResponse สำหรับ list
return paginatedResponse(items, page, limit, total);

// Error — throw จาก service หรือ controller
throw notFound(`Product ${barcode} not found`);
throw conflict(`Barcode ${barcode} already exists`);
throw badRequest('...');
throw forbidden();
throw unauthorized();
throw unprocessable('...');
throw internalError();
// ทั้งหมด import จาก @app/common/helpers/response
```

### Interceptor & Filter
- `TransformResponseInterceptor` — registered via `APP_INTERCEPTOR` ใน AppModule (ใช้ Reflector DI)
- `AllExceptionsFilter` — global via `useGlobalFilters`, catch HttpException / QueryFailedError (PG 23505→409, 23503→400) / generic Error→500

---

## Project Structure

```
src/
├── auth/
│   ├── helpers/cookie-options.helper.ts   # getCookieOptions()
│   ├── jwt/
│   │   ├── actor.guard.ts                 # ActorGuard — validates X-Actor-Token header (no DI)
│   │   ├── jwt-auth.guard.ts              # dev bypass อยู่ที่นี่
│   │   └── jwt.strategy.ts               # JWT payload → req.user (รวม type: 'user'|'terminal')
│   ├── role/
│   │   ├── role.enum.ts
│   │   ├── roles.decorator.ts             # @Roles(...)
│   │   └── roles.guard.ts
│   ├── user/user.entity.ts
│   └── dto/auth.dto.ts                    # LoginDto, PinVerifyDto, PinVerifyResponseDto, GetMeDto
├── common/
│   ├── decorator/
│   │   ├── cache-control.decorator.ts     # @NoCache(), @CacheForMinutes(n), @CacheForHours(n)
│   │   ├── paginated.decorator.ts         # @ApiOkResponsePaginated(type)
│   │   └── response-message.decorator.ts  # @ResponseMessage('custom text')
│   ├── dto/
│   │   ├── api-response.dto.ts            # ApiResponseDto, ApiPaginatedResponseDto, ApiErrorResponseDto
│   │   └── paginated.dto.ts               # PaginationDto, PaginatedResponseDto, PaginatedGetAllDto
│   ├── filters/all-exceptions.filter.ts   # AllExceptionsFilter
│   ├── helpers/
│   │   ├── entity.helper.ts               # getEntityOrNotFound, throwIfEntityExists
│   │   ├── generateIdWithPrefix.helper.ts
│   │   └── response.ts                    # ok(), paginatedResponse(), error helpers
│   ├── interceptors/transform-response.interceptor.ts
│   └── middleware/logging.middleware.ts
└── modules/
    ├── brand/
    ├── category/
    ├── dashboard/
    ├── employee/                          # employee.entity มี pinHash (select:false)
    ├── order/
    ├── order-detail/
    ├── product/
    ├── shop/
    ├── stock-entry/
    └── terminal/                          # Terminal CRUD (SuperAdmin only)
```

---

## Domain

| Module | ความหมาย | หมายเหตุ |
|---|---|---|
| `user` | ผู้เข้าใช้งานเว็บ | login ได้, มี role, แยกจาก employee |
| `brand` | ยี่ห้อสินค้า | ผูกกับ product |
| `category` | หมวดหมู่สินค้า | tree structure มี parent/child ได้ |
| `terminal` | เครื่อง POS/kiosk | login ได้ด้วย terminalCode+password, มี role, ไม่มี refresh token |
| `employee` | พนักงานบริษัท | ใช้เป็น "ผู้บันทึก" ใน order — ไม่ใช่ user ที่ login; มี PIN สำหรับ actor flow |
| `shop` | ร้านค้า/ช่องทางขาย | Shopee/Lazada/TikTok |
| `product` | สินค้าคงคลัง | PK คือ barcode, มีราคา pack/carton แยกกัน |
| `order` | คำสั่งซื้อ | employee ผู้บันทึก + shop + details |
| `order_detail` | รายการสินค้าในออเดอร์ | แต่ละ order มีหลาย order_detail |
| `stock_entry` | บันทึกการเปลี่ยนแปลง stock | audit trail — `in`/`return` → +=, `adjust` → = |
| `dashboard` | สถิติรวม | stats, daily revenue, recent orders, low stock |

---

## Relationships

| FK | อ้างถึง |
|---|---|
| `product.brandId` | `brand.id` |
| `product.categoryId` | `category.id` |
| `category.parentId` | `category.id` (self) |
| `order.createdBy` | `employee.id` |
| `order.shopId` | `shop.id` |
| `order_detail.orderId` | `order.id` |
| `order_detail.productBarcode` | `product.barcode` |
| `stock_entry.productBarcode` | `product.barcode` |
| `stock_entry.employeeId` | `employee.id` |

---

## ID Formats

| Table | Format |
|---|---|
| user | nanoid(12) |
| terminal | `TERM-{random}` |
| brand | `BRD-{random}` |
| category | `CAT-{random}` |
| employee | `EMP-{random}` |
| shop | `SHOP-{random}` |
| product | barcode (กำหนดเอง) |
| order | `ORD-{YYYYMMDD}-{random}` — auto-generated |
| order_detail | `ORDDETAIL-{YYYYMMDD}-{random}` |
| stock_entry | `STK-{YYYYMMDD}-{random}` |

---

## Enums

```ts
Role           = 'Operator' | 'SuperAdmin' | 'Admin' | 'Accountant' | 'Warehouse' | 'Sales' | 'Marketing' | 'HR'
Platform       = 'Shopee' | 'Lazada' | 'TikTok'
StockEntryType = 'in' | 'adjust' | 'return'
```

---

## Roles & Access

```
SuperAdmin — full access
@Roles('*') — ทุก role ผ่านได้ (แค่ต้อง login)
@Roles(Role.SuperAdmin) — SuperAdmin เท่านั้น
```

---

## Conventions

- **Cookie**: ใช้ `getCookieOptions()` จาก `src/auth/helpers/cookie-options.helper.ts` เสมอ — ห้าม hardcode cookie options
- **Paginated response**: ใช้ `paginatedResponse()` จาก `@app/common/helpers/response` เสมอ
- **Version**: ทุก controller ต้องมี `version: '1'` ใน `@Controller({ path, version })`
- **No comments**: ห้ามเขียน comment อธิบาย WHAT — comment ใช้เฉพาะ WHY ที่ไม่ชัดเจน
- **Path aliases**: `@app/*` → `./src/*`, `@db/*` → `./db/*`
- **No `baseUrl`**: TypeScript 6.0 — ไม่ใช้ `baseUrl` ใน tsconfig แล้ว, ใช้ explicit paths แทน
- **API.md**: ต้องอัปเดตทุกครั้งที่มีการเปลี่ยนแปลง endpoint หรือ response shape

---

## Route Summary

```
POST   /api/v1/auth/login             (no auth — raw response; accepts username OR terminalCode)
POST   /api/v1/auth/refresh-token     (no auth — raw response; user sessions only)
POST   /api/v1/auth/pin/verify        (terminal JWT required — returns actor_token)
GET    /api/v1/auth/me                (all roles)
PATCH  /api/v1/auth/update-password   (user sessions only)
POST   /api/v1/auth/logout            (all roles)

GET/POST/PATCH/DELETE /api/v1/terminal/:id?   (SuperAdmin only)

GET/POST/PATCH/DELETE /api/v1/employee/:id?     (GET=all, write=SuperAdmin)
GET/POST/PATCH/DELETE /api/v1/brand/:id?        (GET=all, write=SuperAdmin)
POST                  /api/v1/brand/bulk        (SuperAdmin)
GET/POST/PATCH/DELETE /api/v1/category/:id?     (GET=all, write=SuperAdmin)
GET                   /api/v1/category/tree     (all roles)
GET/POST/PATCH/DELETE /api/v1/shop/:id?         (GET=all, write=SuperAdmin)
GET/POST/PATCH/DELETE /api/v1/product/:barcode? (GET=all, write=SuperAdmin)
POST/PATCH/DELETE     /api/v1/product/bulk      (SuperAdmin)
GET/POST/PATCH/DELETE /api/v1/order/:id?        (all roles)
GET                   /api/v1/order-detail      (all roles)
GET                   /api/v1/order-detail/:orderId (all roles)
GET/POST              /api/v1/stock-entry       (all roles)
GET                   /api/v1/dashboard/stats           (all roles)
GET                   /api/v1/dashboard/daily-revenue   (all roles)
GET                   /api/v1/dashboard/recent-orders   (all roles)
GET                   /api/v1/dashboard/low-stock       (all roles)
```
