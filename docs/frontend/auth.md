# Auth — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for base URL, envelope, and auth flow.

`POST /auth/login` and `POST /auth/refresh-token` return **raw JSON** (no envelope).
All other endpoints return the standard `{ success, statusCode, message, data, meta }` wrapper.

---

## POST /auth/login — RAW

| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | one of | user login |
| `terminalCode` | string | one of | terminal login |
| `password` | string | yes | |

**User login response 200:**
```jsonc
{
  "message": "Login successful",
  "user": { "username": "admin", "role": "SuperAdmin" }
}
```
Sets `token` cookie (1 h) + `refreshToken` cookie (7 d).

**Terminal login response 200:**
```jsonc
{
  "message": "Login successful",
  "terminal": { "terminalCode": "POS-01", "name": "POS หน้าร้าน", "role": "Operator" }
}
```
Sets `token` cookie only (24 h). No `refreshToken`.

Errors: `400` missing fields · `401` invalid credentials / inactive terminal

---

## POST /auth/refresh-token — RAW

No body. Reads `refreshToken` cookie automatically.

**Response 200:** `{ "message": "Refresh successful" }` — replaces both cookies.

Errors: `401` missing or invalid refresh token

---

## POST /auth/pin/verify — wrapped

Auth: **terminal JWT cookie required** (not user session).

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `employeeId` | string | yes | e.g. `EMP-xxxx` |
| `pin` | string | yes | 4–6 digits |

**Response `data`:**
| Field | Type | Notes |
|---|---|---|
| `actorToken` | string | Short-lived JWT; send as `X-Actor-Token` header on subsequent action calls |
| `expiresIn` | number | Seconds (default 300 = 5 min) |
| `employee.id` | string | |
| `employee.name` | string | `"${firstName} ${lastName}"` |
| `employee.role` | Role | |

Errors: `401` — employee not found, PIN not set, invalid PIN, not a terminal session

---

## GET /auth/me — wrapped

Auth: any session.

**Response `data`** (JWT payload):
| Field | Type | Notes |
|---|---|---|
| `sub` | string | User ID or Terminal ID |
| `username` | string | User sessions only |
| `terminalCode` | string | Terminal sessions only |
| `role` | Role | |
| `type` | `"user"` \| `"terminal"` | |

---

## PATCH /auth/update-password — wrapped

Auth: **user session only** (terminal gets 401).

**Request body:**
| Field | Type | Required |
|---|---|---|
| `currentPassword` | string | yes |
| `newPassword` | string | yes |

**Response `data`:** User entity — `{ id, username, role }`.

Errors: `401` invalid current password, terminal session attempted

---

## POST /auth/logout — wrapped

Auth: any session. No body.

Clears `token` and `refreshToken` cookies.

**Response `data`:** `{ "message": "Logout successful" }`
