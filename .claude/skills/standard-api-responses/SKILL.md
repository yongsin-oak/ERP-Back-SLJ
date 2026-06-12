---
name: standard-api-responses
description: The success/error response contract and how to make errors tell the frontend exactly what failed and why (validation, conflicts, not-found, FK). TRIGGER when adding/changing an endpoint, throwing an error, writing DTO validation messages, handling a DB constraint violation, or deciding what message/shape to return to the client.
---

# API Response & Error Standard

Every response goes through `TransformResponseInterceptor` (success) or
`AllExceptionsFilter` (error). Clients depend on these shapes — never hand-build
an envelope (except the raw `@Res()` auth endpoints). See [[standard-shared-helpers]].

## Success shapes

```ts
// single
{ success: true, statusCode, message, data }
// paginated  (service returns paginatedResponse(...))
{ success: true, statusCode, message, data: T[], pagination: {
    page, limit, total, totalPages, hasNextPage, hasPreviousPage } }
```
`message` defaults by method (GET `OK`, POST `Created`, PATCH/PUT `Updated`,
DELETE `Deleted`); override with `@ResponseMessage('...')`. Controllers
`return ok(...)`; services return `paginatedResponse(...)` for lists.

## Error shape (every failure)

```ts
{ success: false, statusCode, message: string | string[], error, timestamp, path }
```
- `message` — human-readable; **array** for validation (one entry per failed rule).
- `error` — short label (`Bad Request`, `Conflict`, `Not Found`, ...).
- `timestamp`, `path` — for logs/support.

## Core principle: the message must say WHAT failed and WHY

The frontend should be able to show the user a meaningful message without
guessing. Make every thrown error specific:

- **Name the subject:** `notFound(\`Product ${barcode} not found\`)`, not
  `notFound('Not found')`. Include the id/value that failed.
- **Name the cause on conflict:** `conflict(\`SKU ${sku} already exists\`)` —
  say which field collided, not just "duplicate".
- **Validation:** rely on `class-validator` messages. Add a custom `message` for
  anything non-obvious: `@IsEnum(Role, { message: 'Department must be one of the allowed roles' })`,
  `@IsNotEmpty({ message: 'First name is required' })`. These flow through as the
  `message` array verbatim. Centralize wording with `ERROR.*` builders
  (see [[standard-constants-no-hardcode]]).
- **Use the right helper** from `@app/common/helpers/response` so the status code
  matches the cause: `badRequest` 400 · `unauthorized` 401 · `forbidden` 403 ·
  `notFound` 404 · `conflict` 409 · `unprocessable` 422 · `internalError` 500.

## Validation pipeline (already global)

`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`:
- Unknown body fields → **400** with a message naming the forbidden property.
- Type/rule failures → **400** with the per-field messages array.
- So: every accepted field must be a decorated DTO property; every constraint
  that users can trip should carry a clear `message`.

## DB constraint mapping (AllExceptionsFilter)

TypeORM `QueryFailedError` is mapped centrally:
- PG `23505` (unique) → **409** `Duplicate entry — record already exists`.
- PG `23503` (FK) → **400** `Referenced record does not exist`.
- otherwise → **500** `Database error`.

> **Known gap (documented, not yet fixed):** these two messages are *generic* —
> they don't name the field/constraint, so the frontend can't tell *which* value
> duplicated or *which* reference was missing. Two-part standard:
> 1. **Preferred:** check explicitly in the service first
>    (`throwIfEntityExists`, FK existence checks) and throw a specific
>    `conflict`/`badRequest` message — the user sees the precise cause.
> 2. **Filter fallback:** the generic mapping should stay as a safety net; a
>    future improvement is to parse `err.detail`/`constraint` to name the field.
>    Track this as a planned change (touches the global filter — coordinate the
>    contract change with frontend).

## Status / actions the frontend must handle

- **401** on a user session → call `POST /auth/refresh-token`, then retry once
  (terminal sessions re-login instead). See [[route-auth]].
- **403** → role not permitted (`@Roles` denied) — show "no permission".
- **400** with `message: string[]` → render field errors from the array.
- **409** → surface the conflict message (which value already exists).

## Conventions & gotchas

- Don't leak internals: 5xx returns a generic message (full error is logged with
  the request stack); never echo a raw DB/stack string to the client.
- Raw endpoints (`/auth/login`, `/auth/refresh-token`) build their own JSON and
  bypass the interceptor — keep their shape consistent with the envelope.
- Keep `message` user-facing and English; put machine logic in `statusCode`/`error`.

## Related

- [[standard-shared-helpers]] (the helpers) · [[standard-constants-no-hardcode]]
  (`ERROR` builders) · [[route-auth]] (401/refresh) ·
  the live contract via Swagger at `/swagger` (auto-generated from controllers + DTOs).
