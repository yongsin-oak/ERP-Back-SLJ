---
name: route-terminal
description: Developer guide for the terminal module — POS/kiosk devices that log in with terminalCode + password; SuperAdmin-only CRUD. Use when editing or extending anything under src/modules/terminal.
---

# Terminal Module

A **Terminal** is a POS/kiosk device that authenticates with `terminalCode` +
`password` (instead of a username) and carries a preset `role`. Login itself lives
in [[route-auth]] (`/auth/login` with `terminalCode`); this module is SuperAdmin-only CRUD
over the terminal records and credentials.

## Files

```
src/modules/terminal/
├── terminal.module.ts        # TypeOrmModule.forFeature([Terminal]); exports TerminalService
├── terminal.controller.ts    # @Controller({ path: 'terminal', version: '1' }) — SuperAdmin
├── terminal.service.ts        # CRUD; bcrypt password hashing; strips passwordHash
└── dto/terminal.dto.ts        # CreateTerminalDto, UpdateTerminalDto
```

> See [`.claude/README.md`](../../README.md) for shared conventions (response
> helpers, versioning, ID formats, `Role` enum, dev auth bypass).

## Entity: `Terminal`

[`src/modules/terminal/terminal.entity.ts`](../../../src/modules/terminal/terminal.entity.ts)

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `@PrimaryColumn`, `@BeforeInsert` → `generateIdWithPrefix({ prefix: 'TERM', withDateTime: false })` → `TERM-{random}` |
| `terminalCode` | string | `unique` — the login identifier |
| `name` | string | display name |
| `role` | `Role` enum | `type: 'enum'`; preset role granted to the terminal session |
| `passwordHash` | string | **`select: false`** — bcrypt hash; never returned |
| `isActive` | boolean | default `true`; login requires `isActive: true` |
| `location` | string? | `nullable` — physical location |
| `lastSeenAt` | Date? | `timestamp`, `nullable` — last activity |
| `createdAt` / `updatedAt` | Date | `@CreateDateColumn` / `@UpdateDateColumn` |

## DTOs

- `CreateTerminalDto` — `{ terminalCode, name, role: Role, password (MinLength 8) }`.
  **Does not include `location`** (despite it being an entity column) — see gotchas.
- `UpdateTerminalDto extends PartialType(CreateTerminalDto)` plus optional
  `isActive?: boolean`. All fields optional; `password` is re-hashed only if present.
  **`location` is not an updatable field via the DTO** either.

## Endpoints (all under `/api/v1/terminal`)

Controller-level guards/decorators apply to **all** routes:
`@NoCache()`, `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles(Role.SuperAdmin)`.

| Method | Path | Roles | Body → response |
|---|---|---|---|
| GET | `/` | SuperAdmin | → terminals (no `passwordHash`), ordered `createdAt DESC` |
| GET | `/:id` | SuperAdmin | → terminal (no `passwordHash`) |
| POST | `/` | SuperAdmin | `CreateTerminalDto` → created terminal (201) |
| PATCH | `/:id` | SuperAdmin | `UpdateTerminalDto` → updated terminal |
| DELETE | `/:id` | SuperAdmin | → `ok(null)` |

All handlers wrap results in `ok(...)`. `POST /` uses `@HttpCode(HttpStatus.CREATED)`
(201, `message: "Created"`). `DELETE` returns `ok(null)` (`message: "Deleted"`).

## Service logic & rules

`TerminalService` injects the `Terminal` repository.

- `findAll()` — `find({ order: { createdAt: 'DESC' } })`; destructures
  `passwordHash` out of each row before returning. (Note: `passwordHash` is
  `select:false`, so it isn't loaded by default; the strip is belt-and-suspenders.)
- `findOne(id)` — `findOneBy({ id })`; throws `notFound` (404) if missing; strips
  `passwordHash`.
- `create(dto)` — conflict (409) if `terminalCode` already exists; bcrypt-hashes
  `dto.password` (`saltRounds 10`) into `passwordHash`, sets `isActive: true`,
  saves, strips `passwordHash`. **Does not set `location`/`lastSeenAt`.**
- `update(id, dto)` — 404 if missing. If `terminalCode` changes, re-checks
  uniqueness (409 on clash). Applies `name`, `role`, `isActive` when defined;
  re-hashes `password` only if provided. Saves, strips `passwordHash`.
  **Does not touch `location`/`lastSeenAt`.**
- `remove(id)` — 404 if missing, then `repo.remove`.

## Conventions & gotchas

- **`location` and `lastSeenAt` are entity columns but are NOT wired into the
  CRUD DTOs or service.** Create/update never set them; they stay `null` unless set
  elsewhere. The frontend contract doc shows `location` in create/patch bodies — the
  **code does not support it**. If `location`/`lastSeenAt` editing is required, add
  them to the DTOs and `update()` handling (and update the contract doc).
- Never expose `passwordHash` — it is `select:false` and stripped in the service;
  keep it that way in any new query (don't `addSelect('passwordHash')` for reads).
- Login validation (in [[route-auth]] `validateTerminal`) requires `isActive: true`;
  setting `isActive: false` via PATCH disables login for that terminal.
- Terminal sessions get no refresh token; the access token `expiresIn` is
  `TERMINAL_TOKEN_EXPIRES_IN ?? '24h'` (see [[route-auth]]).
- The terminal's `role` is granted to its JWT session, so it gates `@Roles(...)`
  checks across the app like any user role.
- Changing this entity changes the DB schema in dev (`synchronize: true`).
- Update [`.claude/skills/api/terminal.md`](../api/terminal.md) when endpoints/shapes
  change (and reconcile the stale `location` create/patch examples there).

## Related

- [[route-auth]] — terminal login (`/auth/login` with `terminalCode`), `validateTerminal`,
  `loginAsTerminal`, and the PIN/actor flow that terminals use.
- [[route-employee]] — actor identity verified via PIN at a terminal.
- [[route-order]] — orders reference `terminalId`.
- Shared: `@app/common/helpers/response` (`ok`, `conflict`, `notFound`),
  `@app/common/helpers/generateIdWithPrefix.helper`.
