# Employee & Terminal — Request / Response

> Last updated: 2026-05-29
> See [/API.md](../../API.md) for envelope and auth. All responses are wrapped.

---

## Employee

### Employee object shape

```jsonc
{
  "id": "EMP-xxxx",
  "firstName": "John",
  "lastName": "Doe",
  "nickname": "Johnny",
  "phoneNumber": "0812345678" | null,
  "startDate": "2024-01-15T00:00:00.000Z" | null,
  "department": "Operator",
  "isActive": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`pinHash` is never returned (excluded at DB query level).

### GET /employee — paginated

**Query:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | yes | |
| `limit` | int ≥ 1 | yes | |
| `search` | string | no | matches `firstName`, `lastName`, or `nickname` |
| `department` | Role | no | e.g. `Operator`, `SuperAdmin` |
| `isActive` | `true`/`false` | no | string query param |

**Response:** paginated list of Employee objects.

### GET /employee/:id

**Response `data`:** Employee object.

Errors: `404` employee not found

### POST /employee — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `firstName` | string | yes | |
| `lastName` | string | yes | |
| `nickname` | string | yes | |
| `phoneNumber` | string | no | |
| `startDate` | ISO8601 | no | |
| `department` | Role | yes | e.g. `"Operator"` |

**Response `data`:** created Employee object (201).

Errors: `409` firstName + lastName pair already exists

### PATCH /employee/:id — SuperAdmin

**Request body:** any subset of Employee create fields (all optional).

**Response `data`:** updated Employee object.

Errors: `404` employee not found

### PATCH /employee/:id/pin — SuperAdmin

Set or reset an employee's PIN (used for terminal PIN verify).

**Request body:**
```jsonc
{ "pin": "1234" }
```

`pin` must be 4–6 digits (numeric).

**Response `data`:** updated Employee object (pinHash never exposed).

Errors: `404` employee not found · `400` invalid PIN format

### DELETE /employee/bulk — SuperAdmin

**Request body:**
```jsonc
{ "ids": ["EMP-xxx", "EMP-yyy"] }
```

**Response `data`:** array of deleted Employee objects.

Errors: `404` any ID not found

### DELETE /employee/:id — SuperAdmin

**Response `data`:** deleted Employee object.

Errors: `404` employee not found

---

## Terminal

SuperAdmin only for all terminal CRUD.

### Terminal object shape

```jsonc
{
  "id": "TERM-xxxx",
  "terminalCode": "POS-01",
  "name": "POS หน้าร้าน 1",
  "role": "Operator",
  "isActive": true,
  "location": null,
  "lastSeenAt": "2026-05-29T09:00:00.000Z" | null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

`passwordHash` is never returned (excluded at DB query level).

### GET /terminal — paginated (SuperAdmin)

**Query:** `page`, `limit` (required).

**Response:** paginated list of Terminal objects.

### GET /terminal/:id — SuperAdmin

**Response `data`:** Terminal object.

Errors: `404` terminal not found

### POST /terminal — SuperAdmin

**Request body:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `terminalCode` | string | yes | must be unique |
| `name` | string | yes | |
| `role` | Role | yes | |
| `password` | string | yes | min 8 characters |

**Response `data`:** created Terminal object (201).

Errors: `409` `terminalCode` already exists

### PATCH /terminal/:id — SuperAdmin

**Request body:** any subset of Terminal create fields + optional `isActive: boolean`.

**Response `data`:** updated Terminal object.

Errors: `404` terminal not found

### DELETE /terminal/:id — SuperAdmin

**Response `data`:** deleted Terminal object.

Errors: `404` terminal not found
