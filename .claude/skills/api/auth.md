# Auth  `/api/v1/auth`

### POST `/api/v1/auth/login`
ไม่ต้อง auth — **raw response (bypasses interceptor)**

ส่งได้สองแบบ: login ด้วย user หรือ terminal

**Body — User login**
```json
{ "username": "superadmin", "password": "superadmin1234" }
```

**Body — Terminal login**
```json
{ "terminalCode": "POS-01", "password": "terminal1234" }
```

**Response 200 — User** *(raw)*
```json
{
  "message": "Login successful",
  "user": { "username": "superadmin", "role": "SuperAdmin" }
}
```
> Set HTTP-only cookies: `token` (10h) + `refreshToken` (7d)

**Response 200 — Terminal** *(raw)*
```json
{
  "message": "Login successful",
  "terminal": { "terminalCode": "POS-01", "name": "POS หน้าร้าน 1", "role": "Operator" }
}
```
> Set HTTP-only cookie: `token` (10h) — **ไม่มี refreshToken**

**Error 401**
```json
{ "success": false, "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized", "timestamp": "...", "path": "/api/v1/auth/login" }
```

---

### POST `/api/v1/auth/refresh-token`
ไม่ต้อง auth — **raw response** — **user session เท่านั้น** (terminal ไม่มี refresh token)

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

### POST `/api/v1/auth/pin/verify`
ต้องมี **terminal JWT cookie** — ไม่ใช้ interceptor wrapper

ใช้เพื่อขอ `actorToken` ก่อนทำรายการที่ต้องระบุตัวตน employee

**Body**
```json
{ "employeeId": "EMP-ABCD123456", "pin": "1234" }
```
> PIN เป็น 4–6 หลักตัวเลข

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "Created",
  "data": {
    "actorToken": "eyJhbGci...",
    "expiresIn": 300,
    "employee": {
      "id": "EMP-ABCD123456",
      "name": "สมชาย ใจดี",
      "role": "Warehouse"
    }
  }
}
```
> นำ `actorToken` ใส่ใน header `X-Actor-Token` สำหรับ request ถัดไป

**Error 401 — ไม่ใช่ terminal session**
```json
{ "success": false, "statusCode": 401, "message": "Terminal authentication required for PIN verification", "error": "Unauthorized", "..." }
```

**Error 401 — PIN ผิด**
```json
{ "success": false, "statusCode": 401, "message": "Invalid PIN", "error": "Unauthorized", "..." }
```

---

### GET `/api/v1/auth/me`
ต้อง auth (all roles)

**Response 200**
```json
{
  "success": true, "statusCode": 200, "message": "OK",
  "data": {
    "sub": "abc123",
    "username": "superadmin",
    "role": "SuperAdmin",
    "type": "user"
  }
}
```
> Terminal session จะมี `terminalCode` แทน `username` และ `type: "terminal"`

---

### PATCH `/api/v1/auth/update-password`
ต้อง auth (user session เท่านั้น — terminal ไม่รองรับ)

**Body**
```json
{ "currentPassword": "oldpassword", "newPassword": "newpassword" }
```

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Updated", "data": { ... } }
```

---

### POST `/api/v1/auth/logout`
ต้อง auth (all roles)

**Response 200**
```json
{ "success": true, "statusCode": 200, "message": "Created", "data": { "message": "Logout successful" } }
```
> Clear cookies `token` + `refreshToken`
