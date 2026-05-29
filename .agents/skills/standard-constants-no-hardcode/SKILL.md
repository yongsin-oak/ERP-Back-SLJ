---
name: standard-constants-no-hardcode
description: Where constants, enums, and config belong — and the no-hardcode / no-magic-value rule for this repo. TRIGGER when you are about to type a literal string/number for a role, status, platform, action, prefix, page size, URL, secret, cache TTL, or any value that has meaning or repeats; when adding an enum; or when reading process.env.
---

# Constants & Magic Values

Rule: **no magic values.** A literal that carries domain meaning, repeats, or
configures the environment must live in an enum, a named constant, or env config
— never inline.

## Enums (domain value sets)

Enums are the single source of truth for fixed value sets. Existing ones (see
[.claude/README.md](../../README.md) "Enums" for the full list):

| Enum | Where | Values |
|---|---|---|
| `Role` | `src/auth/role/role.enum.ts` | Operator, SuperAdmin, Admin, Accountant, Warehouse, Sales, Marketing, HR |
| `Platform` | `src/modules/shop/entities/platform.enum.ts` | Shopee, Lazada, TikTok, LineOA, LineMan, Offline |
| `StockEntryType` | stock-entry entity | in, adjust, return |
| `OrderStatus` | order entity | completed, cancelled (default completed) |
| `AuditAction` / `AuditActorType` | audit-log | see [[route-audit-log]] |
| `ReportGroupBy` | report | day, week, month |

Rules:
- Reference the enum everywhere — `Role.SuperAdmin`, not `'SuperAdmin'`; the one
  sanctioned exception is the `@Roles('*')` wildcard literal (it is the framework
  convention for "any authenticated role").
- Persist enum columns with the TypeORM `enum` type and validate DTO fields with
  `@IsEnum(TheEnum)`. Don't accept free-form strings for a fixed set.
- Add a value by editing the enum (and any DB enum) — never by sprinkling a new
  literal in services/controllers.

## ID prefixes

ID formats are conventions, not ad-hoc strings. Generate with
`generateIdWithPrefix({ prefix: 'XXX' })` (see [[standard-shared-helpers]]) and register
the prefix in [.claude/README.md](../../README.md) "ID Formats"
(e.g. `BRD-`, `CAT-`, `ORD-`, `STK-`, `PSP-`). Don't string-concatenate IDs by hand.

## Environment config

Read configuration from `process.env` (via `@nestjs/config`, `isGlobal: true`),
never hardcode deploy-specific values. Keys in use include:

- `NODE_ENV`, `PORT`, `CORS_ORIGIN`
- `BYPASS_AUTH` (dev only — both `NODE_ENV=development` AND `BYPASS_AUTH=true`)
- JWT/cookie: `JWT_SECRET`, `JWT_EXPIRES_IN` (default `1h`),
  refresh expiry (default `7d`), `TERMINAL_TOKEN_EXPIRES_IN` (default `24h`),
  `ACTOR_TOKEN_EXPIRES_IN` (default `5m`) — see [[route-auth]]
- DB connection (used by `db/data-source.ts`)

Rules:
- New config → add to `.env.example` with a safe placeholder, document it, then
  read it via env. Never commit real secrets; never hardcode a secret/key/URL.
- Provide a sensible default with `process.env.X ?? 'default'` only for
  non-secret values; secrets must be required.

## Other values that must be named, not inline

- **Cookie options** → always `getCookieOptions()`
  ([src/auth/helpers/cookie-options.helper.ts](../../../src/auth/helpers/cookie-options.helper.ts)),
  never inline `{ httpOnly: ... }`.
- **Cache TTLs** → the `@CacheForMinutes/@CacheForHours/...` decorators
  (see [[standard-shared-helpers]]), not raw `Cache-Control` strings.
- **Response messages** → `@ResponseMessage('...')`; the default per-method
  messages live in the interceptor — don't duplicate them.
- **Timezone** → `Asia/Bangkok` is the project zone (used in id-gen, report week
  keys). If you need it again, reuse the same constant, don't retype the string
  in scattered places.
- **Repeated query limits / page sizes** (e.g. dropdown `limit(50)`) — if a
  number repeats or has meaning, hoist it to a named `const` at module top.

## Audit — current hardcoded/repeated values to extract

These literals are duplicated across the codebase today and should move to named
constants (counts as of this writing — re-grep before acting):

| Value | Where (examples) | Count | Extract to |
|---|---|---|---|
| `10` (bcrypt salt rounds) | every `bcrypt.hash(x, 10)` in auth/employee/terminal/user/seed | ~12 | `SALT_ROUNDS` |
| `'Asia/Bangkok'` | main, seed, generateIdWithPrefix, dashboard, report | ~10 | `APP_TIMEZONE` |
| `'token'` / `'refreshToken'` | auth.controller cookie set/clear | ~7 | `COOKIE.TOKEN` / `COOKIE.REFRESH` |
| `'http://localhost:5173'`, `'localhost'` | main CORS, seed DB host | 3 | env + `DEFAULTS` |
| `@Roles('*')` wildcard | every public-to-all-roles handler | ~40 | `ROLE_ANY` const |
| `"... not found"` / `"... already exists"` / `"... is required"` | services + DTO messages | 16 / 6 / 20 | `ERROR.*` builders |

## Proposed central layout — `src/common/constants/`

Create a small constants area (one concern per file) and import from it instead
of retyping literals:

```ts
// src/common/constants/app.constants.ts
export const APP_TIMEZONE = 'Asia/Bangkok';
export const SALT_ROUNDS = 10;
export const ROLE_ANY = '*';

// src/common/constants/cookie.constants.ts
export const COOKIE = { TOKEN: 'token', REFRESH: 'refreshToken' } as const;

// src/common/constants/error-messages.ts
export const ERROR = {
  DEFAULT: 'Something went wrong',
  NOT_FOUND: (what: string) => `${what} not found`,
  ALREADY_EXISTS: (what: string) => `${what} already exists`,
  REQUIRED: (field: string) => `${field} is required`,
  INVALID_ENUM: (field: string) => `${field} must be one of the allowed values`,
} as const;
```

Usage:
```ts
throw notFound(ERROR.NOT_FOUND(`Product ${barcode}`));   // service
@IsNotEmpty({ message: ERROR.REQUIRED('First name') })   // DTO
employee.pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
```

Rules:
- Message **builders** (functions) keep the dynamic part (the entity name) while
  centralizing the wording — don't fork the suffix string per module.
- Constants are `as const` and grouped by concern; one file per concern.
- This is a **documented standard**; the refactor itself is a separate, planned
  change (it touches many files). Apply incrementally per module, keeping the
  existing public messages identical so the API contract doesn't shift.
- See [[standard-api-responses]] for how these error messages reach the frontend.

## Conventions & gotchas

- The global `ValidationPipe` is `whitelist + forbidNonWhitelisted`: an undeclared
  body field is rejected — so every value the API accepts must be a typed DTO
  field with the right `@IsEnum`/validators, which doubles as documentation.
- When you introduce a constant used across modules, prefer a small dedicated
  file (enum/const) over re-declaring it; link it from the consumers.

## Related

- [[standard-shared-helpers]] — id-gen, cookie options, cache/message decorators.
- [[standard-project-structure]] · [[standard-performance]] · [[route-auth]] (env-driven token expiries).
