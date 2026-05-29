---
name: standard-shared-helpers
description: The central/shared functions, decorators, interceptors, and filters under src/common — what already exists so you reuse it instead of rewriting. TRIGGER when you need to return/throw an API response, paginate, look up an entity or check duplicates, generate an ID, set cache headers, encrypt data, or are about to write a utility that might already exist.
---

# Shared Helpers (`src/common`)

**Before writing any utility, check here first.** These are the canonical
building blocks. Reinventing them (manual response objects, inline
`findOne`+throw, ad-hoc id strings) is a review-blocking mistake.

## Response helpers — `@app/common/helpers/response`

[src/common/helpers/response.ts](../../../src/common/helpers/response.ts)

```ts
import { ok, paginatedResponse,
  badRequest, unauthorized, forbidden, notFound, conflict,
  unprocessable, internalError } from '@app/common/helpers/response';
```

- `ok(data)` — **pass-through** identity. The global
  `TransformResponseInterceptor` wraps it into
  `{ success, statusCode, message, data }`. Always `return ok(await service...)`
  from controllers. Do **not** build the envelope yourself.
- `paginatedResponse(data, page, limit, total)` → `{ data, pagination }`.
  The interceptor detects this shape and emits the paginated envelope. Use it
  from **services** for every list endpoint. (`formattedResponsePaginated` is a
  deprecated alias — don't use it.)
- Error helpers **return** an exception instance — you `throw` it:
  `throw notFound(\`Product ${barcode} not found\`)`. Covers 400/401/403/404/409/422/500.
  Prefer these over constructing `new XxxException` directly.

## Entity helpers — `@app/common/helpers/entity.helper`

[src/common/helpers/entity.helper.ts](../../../src/common/helpers/entity.helper.ts)

- `getEntityOrNotFound(repo, findOptions, entityName)` → entity or throws
  `NotFound`. Use for every "fetch by id or 404".
- `throwIfEntityExists(repo, findOptions, entityName)` → throws `Conflict` if a
  match exists. Use before create to enforce uniqueness with a clean message.

Typical service private wrappers (see [[route-product]]):
```ts
private getOrFail(id: string) {
  return getEntityOrNotFound(this.repo, { where: { id } }, `Entity ${id}`);
}
```

## ID generation — `@app/common/helpers/generateIdWithPrefix.helper`

[src/common/helpers/generateIdWithPrefix.helper.ts](../../../src/common/helpers/generateIdWithPrefix.helper.ts)

```ts
generateIdWithPrefix({ prefix?, withDateTime = true, length = 10 })
```
- `withDateTime: true` → `PREFIX-YYYYMMDD-RANDOM` (Asia/Bangkok date).
- `withDateTime: false` → `PREFIX-RANDOM` (e.g. `PSP-...`).
- Random part is uppercased `nanoid(length)`.
- Call inside an `@BeforeInsert()` entity hook. Keep prefixes unique per table
  and record them in [.claude/README.md](../../README.md) "ID Formats".

## Pagination DTOs — `@app/common/dto/paginated.dto`

[src/common/dto/paginated.dto.ts](../../../src/common/dto/paginated.dto.ts)

- `PaginatedGetAllDto` — `{ page, limit }` with `@Type(() => Number)` + `@Min(1)`.
  **Extend it** for list query DTOs and add filter fields, rather than redefining
  page/limit. Note: it has **no defaults** — page/limit are required by the
  validator; supply them from the client or add defaults in your DTO.
- `PaginationDto` / `PaginatedResponseDto<T>` — metadata + envelope shapes
  (Swagger). Pair with the `@ApiOkResponsePaginated(Dto)` decorator below.

## Decorators — `@app/common/decorator/*`

- `@ResponseMessage('custom text')`
  ([response-message.decorator.ts](../../../src/common/decorator/response-message.decorator.ts))
  — override the auto message on a handler. Default per method: GET `OK`,
  POST `Created`, PATCH/PUT `Updated`, DELETE `Deleted`.
- Cache-control ([cache-control.decorator.ts](../../../src/common/decorator/cache-control.decorator.ts)):
  `@NoCache()`, `@CacheForMinutes(n)`, `@CacheForHours(n)`, `@CacheForDays(n)`,
  `@PrivateCache(sec)`, `@PublicCache(sec)`, or raw `@CacheControl(value)`.
  Use `@NoCache()` on controllers serving dynamic/authorized data.
- `@ApiOkResponsePaginated(Dto)` ([paginated.decorator.ts](../../../src/common/decorator/paginated.decorator.ts))
  — Swagger schema for a paginated response. Use on every paginated GET.

## Interceptors & filter (global — do not re-apply)

- `TransformResponseInterceptor`
  ([transform-response.interceptor.ts](../../../src/common/interceptors/transform-response.interceptor.ts))
  — global via `APP_INTERCEPTOR`. Wraps responses, picks the message, detects
  paginated shape. Skips when headers already sent (raw `@Res()` endpoints).
- `CacheControlInterceptor` — applied by the cache-control decorators; sets the
  `Cache-Control` header.
- `AllExceptionsFilter`
  ([all-exceptions.filter.ts](../../../src/common/filters/all-exceptions.filter.ts))
  — global. Maps `HttpException`, and TypeORM `QueryFailedError`:
  PG `23505` → 409, `23503` → 400, else 500. Logs 5xx with stack. Error body:
  `{ success:false, statusCode, message, error, timestamp, path }`.

## Encryption — `@app/common/helpers/encryption.helper`

[src/common/helpers/encryption.helper.ts](../../../src/common/helpers/encryption.helper.ts)
`encryptData(text, keyBase64)` / `decryptData(enc, iv, keyBase64)` — AES-GCM via
WebCrypto. Key is base64. Use these for symmetric encryption; don't hand-roll crypto.

## Middleware

- `RequestIdMiddleware` — assigns `req.requestId` (uuid) and `X-Request-ID` header.
- `LoggingMiddleware` — request logging. Both run for all routes via AppModule.

## Conventions & gotchas

- Raw endpoints (`/auth/login`, `/auth/refresh-token`) use `@Res()` and bypass
  the transform interceptor — they must build their own JSON. Everything else
  must **not** build the envelope (the interceptor does it).
- A duplicate on a `@Unique`/`unique` column surfaces as 409 via the filter even
  if you didn't check — but prefer an explicit `throwIfEntityExists` for a clear
  message.

## Related

- [[standard-project-structure]] — where these are wired globally.
- [[standard-constants-no-hardcode]] · [[standard-performance]] · [[route-product]] (usage example).
