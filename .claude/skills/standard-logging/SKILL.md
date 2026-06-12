---
name: standard-logging
description: Structured logging with nestjs-pino — request logging, request id, log levels, redaction of secrets, and error logging — and how to add log lines. TRIGGER when adding a log, debugging via logs, changing log level/format, handling a sensitive field in logs, or touching AppModule's LoggerModule or AllExceptionsFilter.
---

# Logging (`nestjs-pino` + `pino-http`)

Logging is structured JSON in production and pretty-printed in dev (`pino-pretty`),
wired once in `AppModule` via `LoggerModule.forRoot`
([app.module.ts](../../../src/app.module.ts)). There is **no custom logging
middleware** — the old `RequestIdMiddleware` / `LoggingMiddleware` were removed in
the pino migration. `main.ts` sets `bufferLogs: true` and
`app.useLogger(app.get(Logger))` so bootstrap logs aren't lost.

## What every request logs

`pino-http` emits one line per request at completion. The level is chosen by
`customLogLevel`: `error` for 5xx/thrown errors, `warn` for 4xx, else `info`.
Each line carries method, url, query, request id, `userId` (`customProps` reads
`req.user?.id`), status code, and response time.

## Request id

`genReqId` mints a UUID per request, sets the **`X-Request-ID`** response header,
and binds it to a request-scoped child logger (`req.log`). Clients can read/echo
`X-Request-ID` to correlate a response with its server logs.

## Adding logs

- Inject `PinoLogger` (from `nestjs-pino`) into a service, **or** use the
  request-bound `req.log` for request-correlated lines (it already carries the
  request id, method, and url).
- Do **not** inject `PinoLogger` into a singleton `APP_FILTER` / `APP_GUARD` /
  `APP_INTERCEPTOR` — it is request-scoped and will fight the singleton scope. Use
  `(req as any).log` instead, as `AllExceptionsFilter` does.

## Log level

`LOG_LEVEL` env var controls verbosity (default `info` in production, `debug` in
dev). Set it in `.env` (see `.env.example` / [[standard-constants-no-hardcode]]).

## Redaction — never log secrets

`redact.paths` in the LoggerModule config masks sensitive fields with `[Redacted]`:
`req.headers.authorization`, `req.headers.cookie`, and the password fields
(`password`, `currentPassword`, `newPassword`, `currentPass`, `newPass`).

> **When you add an endpoint that accepts a new secret field, add its path to
> `redact.paths`** (and to `SENSITIVE_FIELDS` in `AllExceptionsFilter`, which masks
> the request body it logs on 5xx).

## Errors

`AllExceptionsFilter` logs 5xx through the request logger with the full stack, the
masked request body, and the error response body. 4xx are not error-logged. Never
echo a raw DB/stack string to the client — the client gets the generic envelope,
the detail goes to the log (see [[standard-api-responses]]).

## Related

- [[standard-project-structure]] (global wiring) · [[standard-shared-helpers]]
  (filter + interceptor) · [[standard-api-responses]] (error shape) ·
  [[standard-constants-no-hardcode]] (`LOG_LEVEL` env).
