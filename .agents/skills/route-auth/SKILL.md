---
name: route-auth
description: Developer guide for the auth module — login (user/terminal), JWT cookies, refresh tokens, PIN→actor-token flow, guards and roles. Use when editing or extending anything under src/auth.
---

# Auth Module

Authentication and authorization. Issues JWT access tokens via **HTTP-only cookies**
(not `Authorization` headers). Supports two session types — **user** (web login,
has refresh token) and **terminal** (POS/kiosk login, no refresh token) — plus a
short-lived **actor token** issued after employee PIN verification.

## Files

```
src/auth/
├── auth.module.ts                       # registers User, Terminal, Employee repos + JwtModule/Passport; exports AuthService
├── auth.controller.ts                   # @Controller({ path: 'auth', version: '1' })
├── auth.service.ts                       # user/terminal validation, token signing, PIN verify
├── dto/auth.dto.ts                       # LoginDto, PinVerifyDto, UpdatePasswordDto, AuthResponseDto, GetMeDto, PinVerifyResponseDto
├── helpers/cookie-options.helper.ts      # getCookieOptions() — prod vs dev cookie config
├── jwt/
│   ├── jwt-auth.guard.ts                 # JwtAuthGuard (Passport 'jwt') + dev bypass
│   ├── jwt.strategy.ts                   # reads cookie `token`, maps payload → req.user (with type)
│   └── actor.guard.ts                    # ActorGuard — verifies X-Actor-Token header (manual HMAC, no DI)
├── role/
│   ├── role.enum.ts                      # Role enum (8 values)
│   ├── roles.decorator.ts                # @Roles(...Role | '*')
│   └── roles.guard.ts                    # RolesGuard
├── user/user.entity.ts                   # User entity (the web-login account) — see [[route-user]]
└── seed/seed-user.ts                     # seed script
```

> See [`.claude/README.md`](../../README.md) for shared conventions (response
> helpers, versioning, ID formats, the global `Role` enum, dev auth bypass).

## Entity: `User`

Lives at [`src/auth/user/user.entity.ts`](../../../src/auth/user/user.entity.ts).
This is the canonical web-login account. The [[route-user]] CRUD module imports this
**same** entity — there is no separate user table.

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `@PrimaryColumn`, generated in `@BeforeInsert` via `nanoid(12)` |
| `username` | string | `unique` |
| `password` | string | bcrypt hash (no `select:false` — stripped manually in service) |
| `role` | `Role` enum | `type: 'enum'` |
| `refreshTokenHash` | string? | nullable; bcrypt hash of current refresh token (rotation) |

## Endpoints (all under `/api/v1/auth`)

| Method | Path | Auth/Roles | Body → response |
|---|---|---|---|
| POST | `/login` | none | `LoginDto` (`username` OR `terminalCode` + `password`) → **raw** `{ message, user }` or `{ message, terminal }` |
| POST | `/refresh-token` | none (user only) | optional `{ refreshToken }` (or cookie) → **raw** `{ message }` |
| POST | `/pin/verify` | `JwtAuthGuard` (terminal session) | `PinVerifyDto` `{ employeeId, pin }` → `PinVerifyResponseDto` `{ actorToken, expiresIn, employee }` |
| PATCH | `/update-password` | `JwtAuthGuard,RolesGuard` `@Roles('*')` (user only) | `UpdatePasswordDto` `{ currentPassword, newPassword }` → saved user |
| GET | `/me` | `JwtAuthGuard,RolesGuard` `@Roles('*')` | → `req.user` (`GetMeDto`) |
| POST | `/logout` | `JwtAuthGuard,RolesGuard` `@Roles('*')` | → `{ message }`, clears cookies |

### Raw vs wrapped responses

- `/login` and `/refresh-token` use `@Res()` **directly** and call `res.send(...)`.
  They bypass `TransformResponseInterceptor`, so they return **raw JSON** (no
  `{ success, statusCode, data }` envelope). Do not wrap these in `ok()`.
- `/logout` uses `@Res({ passthrough: true })` (clears cookies) but **returns an
  object**, so it IS wrapped by the interceptor (`message: "Created"`, POST).
- `/pin/verify`, `/me`, `/update-password` return values normally → wrapped.

### Cookies set

- User login: `token` (maxAge `TOKEN_MAX_AGE` = 10h) **and** `refreshToken`
  (`REFRESH_TOKEN_MAX_AGE` = 7d).
- Terminal login: only `token` (10h). No refresh token for terminals.
- Cookie maxAge in the controller is fixed (10h/7d); the JWT `expiresIn` is
  separate and env-driven (see token expiries below). They are not kept in sync.

## Service logic & rules

`AuthService` injects `User`, `Terminal`, and `Employee` repositories + `JwtService`.

**User auth**
- `validateUser(username, password)` — finds by username, bcrypt-compares; throws
  `UnauthorizedException` on missing user or bad password. Strips `password` and
  `refreshTokenHash` from the returned object.
- `login(user)` — signs access + refresh tokens, stores bcrypt hash of the refresh
  token in `user.refreshTokenHash`, returns `{ token, refreshToken, role, username }`.
- `refresh(providedRefreshToken)` — verifies the refresh JWT with
  `JWT_REFRESH_SECRET ?? JWT_SECRET`; requires `decoded.type === 'refresh'`;
  loads user, bcrypt-compares against stored `refreshTokenHash`; on success
  **rotates** both tokens and re-stores the new hash. Any failure → `Unauthorized`.
- `revokeRefreshToken(userId)` — sets `refreshTokenHash = null` (helper; not wired
  into a logout route — logout only clears cookies).
- `updatePassword(username, currentPass, newPass)` — verifies current password,
  bcrypt-hashes and saves the new one.

**Terminal auth**
- `validateTerminal(terminalCode, password)` — finds terminal by `terminalCode`
  **and `isActive: true`**, bcrypt-compares `passwordHash`.
- `loginAsTerminal(terminal)` — signs a token with payload
  `{ sub, terminalCode, name, role, type: 'terminal' }`, `expiresIn` =
  `TERMINAL_TOKEN_EXPIRES_IN ?? '24h'`. No refresh token issued.

**PIN / actor token**
- `verifyPin(terminalId, pin, employeeId)` — loads the employee with
  `addSelect('e.pinHash')` (pinHash is `select:false`), bcrypt-compares the PIN.
  On success signs an **actor JWT** payload
  `{ sub, employeeId, name, role: employee.department, type: 'actor', terminalId }`,
  `expiresIn` = `ACTOR_TOKEN_EXPIRES_IN ?? '5m'`. Returns
  `{ actorToken, expiresIn (seconds), employee: { id, name, role } }`.
- `parseExpiry('5m'|'1h'|...)` converts to seconds (fallback 300).

**Token signing (private)**
- Access token payload: `{ sub, username, role, type: 'user' }`, secret `JWT_SECRET`,
  `expiresIn JWT_EXPIRES_IN ?? '1h'`.
- Refresh token payload: `{ sub, type: 'refresh' }`, secret
  `JWT_REFRESH_SECRET ?? JWT_SECRET`, `expiresIn JWT_REFRESH_EXPIRES_IN ?? '7d'`.

## Guards, strategy & roles

**`JwtStrategy`** ([`jwt.strategy.ts`](../../../src/auth/jwt/jwt.strategy.ts)) —
extracts the JWT from `req.cookies.token` (NOT the `Authorization` header).
`validate(payload)` returns `req.user`:
`{ sub, username, terminalCode, name, role, type: payload.type ?? 'user' }`.
So **`type` distinguishes user vs terminal sessions** downstream.

**`JwtAuthGuard`** ([`jwt-auth.guard.ts`](../../../src/auth/jwt/jwt-auth.guard.ts)) —
extends `AuthGuard('jwt')`. **Dev bypass:** when
`NODE_ENV === 'development' && BYPASS_AUTH === 'true'`, it injects
`req.user = { sub: 'dev-bypass', username: 'dev', role: 'SuperAdmin' }` and skips
auth entirely. Both env vars are required.

**`RolesGuard`** ([`roles.guard.ts`](../../../src/auth/role/roles.guard.ts)) —
reads `@Roles(...)` metadata. If none set → allow. If list includes `'*'` → allow
any authenticated user. Otherwise requires `user.role` to be in the list. Must run
**after** `JwtAuthGuard` (so `user` is populated): `@UseGuards(JwtAuthGuard, RolesGuard)`.

**`@Roles(...)`** ([`roles.decorator.ts`](../../../src/auth/role/roles.decorator.ts)) —
`Roles(...roles: (Role | '*')[])`, metadata key `'roles'`.

**`Role` enum** ([`role.enum.ts`](../../../src/auth/role/role.enum.ts)):
`Operator | SuperAdmin | Admin | Accountant | Warehouse | Sales | Marketing | HR`.

**`ActorGuard`** ([`actor.guard.ts`](../../../src/auth/jwt/actor.guard.ts)) — guards
routes that require an employee actor (used by other modules, e.g. order/stock).
Reads the **`X-Actor-Token`** header and verifies it **manually** with
`crypto.createHmac('sha256', JWT_SECRET)` (no `JwtService` DI). Requires
`payload.type === 'actor'`, checks `exp`, and sets
`req.actor = { employeeId, name, role, terminalId }`. Same dev bypass condition
injects a `dev-bypass` actor. The actor token is the output of `/auth/pin/verify`.

**`getCookieOptions()`** ([`cookie-options.helper.ts`](../../../src/auth/helpers/cookie-options.helper.ts)):
- production → `{ httpOnly: true, secure: true, sameSite: 'none', domain: '.sljsupply-center.com', path: '/' }`
- otherwise → `{ httpOnly: true, secure: false, sameSite: 'lax' }`

## Conventions & gotchas

- Auth is **cookie-based**, not bearer-header. Never read tokens from headers in
  new auth code (except the actor token, which IS a header: `X-Actor-Token`).
- Keep `/login` and `/refresh-token` raw (`@Res()` + `res.send`) — adding `ok()`
  or expecting the standard envelope on them will break the frontend contract.
- `type` on the JWT payload is the single source of truth for user vs terminal;
  `/pin/verify` and `/update-password` enforce session type via `user.type` /
  `user.username` (under dev bypass, `pin/verify` uses a `dev-terminal` id).
- Terminal login requires `isActive: true`; deactivating a terminal blocks login.
- Refresh tokens are single-use-ish: each refresh rotates and re-hashes; an old
  refresh token stops matching `refreshTokenHash`.
- Changing `User`/`Terminal`/`Employee` entities affects the DB schema in dev
  (`synchronize: true`).
- Update [`.claude/skills/api/auth.md`](../api/auth.md) when endpoints/shapes change.

## Related

- [[route-user]] — CRUD for the same `User` entity (SuperAdmin only).
- [[route-terminal]] — terminal entity + CRUD; source of terminal login credentials.
- [[route-employee]] — `pinHash` + `department` used by the PIN/actor flow.
- Shared: `@app/common/helpers/response`, `@app/common/decorator/cache-control.decorator` (`@NoCache`).
