---
name: route-user
description: Developer guide for the user module — SuperAdmin CRUD over web-login accounts (the auth User entity). Use when editing or extending anything under src/modules/user.
---

# User Module

SuperAdmin-only management of **web-login accounts**: list/get/create users, change
a user's role, and delete users. This module does **not** define its own entity — it
reuses the [`User`](../../../src/auth/user/user.entity.ts) entity from the auth
module (`@app/auth/user/user.entity`). There is exactly one users table, shared with
[[route-auth]] (login) and seeding.

## Files

```
src/modules/user/
├── user.module.ts        # TypeOrmModule.forFeature([User]) — User imported from @app/auth
├── user.controller.ts    # @Controller({ path: 'user', version: '1' }) — guarded, SuperAdmin
├── user.service.ts        # CRUD + role listing; maps entity → UserResponseDto (no password)
└── dto/user.dto.ts        # CreateUserDto, UpdateUserRoleDto, UserResponseDto
```

> See [`.claude/README.md`](../../README.md) for shared conventions (response
> helpers, versioning, ID formats, `Role` enum, dev auth bypass).

## Entity: `User`

Defined in [[route-auth]] at [`src/auth/user/user.entity.ts`](../../../src/auth/user/user.entity.ts)
— see that skill for the full table. Relevant fields here: `id` (nanoid(12) PK),
`username` (unique), `password` (bcrypt hash), `role` (`Role` enum),
`refreshTokenHash?`. This module never exposes `password`/`refreshTokenHash` — the
service maps to `UserResponseDto = { id, username, role }`.

## DTOs

- `CreateUserDto` — `{ username: string, password: string (MinLength 8), role: Role }`.
- `UpdateUserRoleDto` — `{ role: Role }`.
- `UserResponseDto` — `{ id, username, role }` (the only shape returned to clients).

## Endpoints (all under `/api/v1/user`)

Controller-level: `@NoCache()`, `@UseGuards(JwtAuthGuard, RolesGuard)`. **Every**
handler is `@Roles(Role.SuperAdmin)`.

| Method | Path | Roles | Body → response |
|---|---|---|---|
| GET | `/roles` | SuperAdmin | → `Role[]` (all enum values) |
| GET | `/` | SuperAdmin | → `UserResponseDto[]` (sorted by username ASC) |
| GET | `/:id` | SuperAdmin | → `UserResponseDto` |
| POST | `/` | SuperAdmin | `CreateUserDto` → `UserResponseDto` (201) |
| PATCH | `/:id/role` | SuperAdmin | `UpdateUserRoleDto` → `UserResponseDto` |
| DELETE | `/:id` | SuperAdmin | → `UserResponseDto` (the removed user) |

> **Route order:** `/roles` is declared before `/:id`, so it is not swallowed by
> the param route. Keep new literal routes above `:id`.

All handlers wrap the service result in `ok(...)`. `POST /` uses
`@HttpCode(HttpStatus.CREATED)` so the status is 201 (`message: "Created"`).

## Service logic & rules

`UserService` injects the `User` repository.

- `getRoles()` — `Object.values(Role)`.
- `findAll()` — `find({ order: { username: 'ASC' } })`, mapped via `toResponse`.
- `findOne(id)` — `getEntityOrNotFound(...)` (404 if missing), mapped.
- `create(dto)` — checks `findOneBy({ username })`; throws `conflict` (409) if the
  username exists. Otherwise bcrypt-hashes the password (`saltRounds 10`), creates
  and saves, returns `UserResponseDto`.
- `updateRole(id, role)` — `getEntityOrNotFound`, sets `role`, saves, returns DTO.
- `remove(id)` — `getEntityOrNotFound`, `repo.remove(user)`, returns the removed
  user's `{ id, username, role }`.
- `toResponse(user)` — private; the only place that shapes outbound users (strips
  `password`/`refreshTokenHash`).

## Conventions & gotchas

- This module shares the auth `User` entity — schema changes belong in
  [`src/auth/user/user.entity.ts`](../../../src/auth/user/user.entity.ts), not here.
  Changing roles/passwords here affects login behavior in [[route-auth]] immediately.
- Never return the raw entity; always go through `toResponse`/`UserResponseDto` so
  `password`/`refreshTokenHash` never leak.
- `password` MinLength is 8 (DTO-enforced); hashing is done in the service, never
  store plaintext.
- `username` is `unique` at the DB level too — a race past the conflict check still
  surfaces as PG `23505` → 409 via the global filter.
- This module does not handle login, password change by the user, or refresh tokens
  — those live in [[route-auth]].
- Update [`.claude/skills/api/user.md`](../api/user.md) when endpoints/shapes change.

## Related

- [[route-auth]] — owns the `User` entity, login, `update-password`, refresh tokens.
- [[route-terminal]] — the other login-capable account type (separate entity/table).
- Shared: `@app/common/helpers/entity.helper` (`getEntityOrNotFound`),
  `@app/common/helpers/response` (`ok`, `conflict`).
