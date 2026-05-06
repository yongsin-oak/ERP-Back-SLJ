# Overview

> Updated: 2026-05-06

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
- เมื่อ 401 ให้เรียก `POST /auth/refresh-token` แล้ว retry (user session เท่านั้น)

### Session Types
| Type | ใช้สำหรับ | Refresh Token | Actor Token |
|---|---|---|---|
| `user` | login ด้วย username | ✓ (7d) | ไม่จำเป็น |
| `terminal` | login ด้วย terminalCode | ✗ (re-login) | ต้องมี ก่อน action |

### Actor Token Flow (Terminal Mode)
เมื่อ terminal login แล้ว ต้องให้ employee ยืนยัน PIN ก่อนทำรายการ:
```
1. Terminal login  →  POST /auth/login (terminalCode + password)  →  cookie `token` (terminal JWT)
2. Employee PIN    →  POST /auth/pin/verify (pin + employeeId)   →  { actorToken, expiresIn: 300 }
3. Action          →  ใส่ header X-Actor-Token: <actorToken>     →  endpoint ที่ต้องใช้ actor
```
> `actorToken` มีอายุ 5 นาที (default) — ต้องขอใหม่ถ้าหมดอายุ

### Dev Bypass (`NODE_ENV=development` + `BYPASS_AUTH=true`)
ไม่ต้อง login — ทุก request ถูก inject user นี้อัตโนมัติ:
```json
{ "sub": "dev-bypass", "username": "dev", "role": "SuperAdmin", "type": "user" }
```
> `/auth/pin/verify` ใน bypass mode: ไม่ต้องมี terminal JWT และ `req.actor` จะเป็น dev actor อัตโนมัติ
