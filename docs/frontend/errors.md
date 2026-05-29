# Errors & Validation — Frontend Handling

> Last updated: 2026-05-29

How the backend reports failures and what the frontend should do.
See [/API.md](../../API.md) for the success envelope (including `meta`).

## Error envelope

Every error (except the raw auth endpoints) has this shape:

```jsonc
{
  "success": false,
  "statusCode": 409,
  "message": "SKU ABC already exists",   // string OR string[]
  "error": "Conflict",
  "timestamp": "2026-05-29T10:00:00.000Z",
  "path": "/api/v1/product"
}
```

- `statusCode` — HTTP status (also on the response).
- `message` — human-readable. **Validation errors return an array** of messages
  (one per failed rule). Everything else is a single string.
- `error` — short label (`Bad Request`, `Unauthorized`, `Forbidden`,
  `Not Found`, `Conflict`, `Internal Server Error`, ...).
- `timestamp`, `path` — for support/logging; safe to log on the client.

## Status codes & what they mean

| Status | error | Meaning | Frontend action |
|---|---|---|---|
| 400 | Bad Request | Validation failed, bad input, or unknown body field | Show field errors from `message[]`; fix the request |
| 401 | Unauthorized | Missing/expired session | **User:** call `POST /auth/refresh-token` then retry once. **Terminal:** re-login |
| 403 | Forbidden | Logged in but role not allowed (`@Roles` denied) | Show "no permission"; don't retry |
| 404 | Not Found | Resource id/value doesn't exist | Show not-found; message names the value |
| 409 | Conflict | Unique/duplicate violation | Show the conflict; message says which value exists |
| 422 | Unprocessable | Semantically invalid (rare) | Show message |
| 500 | Internal Server Error | Server bug | Generic message; details are server-logged, not exposed |

## Validation errors (400) — the `message` array

Body is validated with a strict whitelist. You get a 400 when:
- a required field is missing or the wrong type,
- a value breaks a rule (enum, min, email, ...),
- you send a field the DTO doesn't declare (**unknown fields are rejected**).

```jsonc
{
  "success": false, "statusCode": 400,
  "message": [
    "First name is required",
    "Department must be one of the allowed roles",
    "page must be an integer"
  ],
  "error": "Bad Request",
  "timestamp": "...", "path": "/api/v1/employee"
}
```

Render each entry against its field. Only send fields the API documents — extra
keys cause a 400 (e.g. `property xyz should not exist`).

## Reading the message

The backend aims to make `message` say **what** failed and **why** (it includes
the offending id/value, e.g. `Product 123 not found`, `Barcode 999 already
exists`). Display it directly when you don't have a more specific UI.

> Note: some database-level conflicts currently return a **generic** message
> (`Duplicate entry — record already exists` / `Referenced record does not
> exist`) without naming the exact field. Most endpoints check first and return
> a specific message; if you get a generic one, fall back to a general
> "duplicate/invalid reference" message. (Backend improvement is planned.)

## The 401 → refresh → retry pattern (user sessions)

```ts
async function apiFetch(input, init = {}) {
  const res = await fetch(input, { ...init, credentials: 'include' });
  if (res.status !== 401) return res;
  const r = await fetch('/api/v1/auth/refresh-token',
    { method: 'POST', credentials: 'include' });
  if (!r.ok) { /* redirect to login */ return res; }
  return fetch(input, { ...init, credentials: 'include' }); // retry once
}
```

Terminal sessions have no refresh token — on 401 send the user back to terminal
login. See [.claude/skills/api/auth.md](../../.claude/skills/api/auth.md).

## Raw auth endpoints

`POST /auth/login` and `POST /auth/refresh-token` return **raw JSON** (not the
envelope) and set cookies. On failure they still return a non-2xx status; read
the body as returned and key off the status code.
