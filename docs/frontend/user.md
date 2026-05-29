# User Management — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

All endpoints are **SuperAdmin only**. Users are system login accounts (not employees).

---

## User object shape

```jsonc
{ "id": "nanoid12chars", "username": "john_doe", "role": "Operator" }
```

`id` is nanoid(12). No `createdAt`/`updatedAt` on the User entity.
Password and refresh token hash are never returned.

---

## GET /user/roles

Returns the list of all valid Role enum values.

**Response `data`:** `["Operator", "SuperAdmin", "Admin", "Accountant", "Warehouse", "Sales", "Marketing", "HR"]`

---

## GET /user

**Response `data`:** array of User objects (no pagination).

---

## GET /user/:id

**Response `data`:** User object.

Errors: `404` user not found

---

## POST /user

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `username` | string | yes | must be unique |
| `password` | string | yes | min 8 characters |
| `role` | Role | yes | |

**Response `data`:** created User object (201).

Errors: `409` username already exists

---

## PATCH /user/:id/role

Change a user's role (only role can be patched via this endpoint).

**Request body:**
```jsonc
{ "role": "Admin" }
```

**Response `data`:** updated User object.

Errors: `404` user not found · `400` invalid role value

---

## DELETE /user/:id

**Response `data`:** deleted User object.

Errors: `404` user not found
