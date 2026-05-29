---
name: route-audit-log
description: Developer guide for the audit-log module — SuperAdmin read-only activity viewer plus the AuditLogService.log() that other modules inject to emit audit events. Use when editing or extending anything under src/modules/audit-log.
---

# Audit Log Module

System activity trail. Two roles:
1. **Read-only viewer** — `GET /` and `GET /:id`, **SuperAdmin only**.
2. **Writer for other modules** — the module `exports` `AuditLogService`, whose
   `log()` method other modules inject and call to record an event. There is no
   write endpoint; logs are created only via `log()` from server code.

## Files

```
src/modules/audit-log/
├── audit-log.module.ts          # registers AuditLog repo; exports AuditLogService
├── audit-log.controller.ts      # @Controller({ path: 'audit-log', version: '1' }), @NoCache(), @Roles(SuperAdmin)
├── audit-log.service.ts         # log(), findAll(), findOne(); exports CreateAuditLogDto interface
└── entities/
    └── audit-log.entity.ts      # AuditLog + AuditAction + AuditActorType enums
```

## Entity: `AuditLog`

PK `id` = `AUDIT-{YYYYMMDD}-{random}` via `@BeforeInsert generateId()`
(`generateIdWithPrefix({ prefix: 'AUDIT', withDateTime: true })`).

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, auto-generated `AUDIT-...` |
| `actorType` | `AuditActorType` enum | who acted (user/terminal/employee/system) |
| `actorId` | string | id of the actor |
| `action` | `AuditAction` enum | what happened |
| `resourceType` | string | free-text resource name (e.g. `'order'`, `'product'`) |
| `resourceId` | string? | nullable — affected resource id |
| `beforeData` | jsonb? | nullable — snapshot before change |
| `afterData` | jsonb? | nullable — snapshot after change |
| `ipAddress` | string? | nullable |
| `createdAt` | Date | `@CreateDateColumn`, auto |

No `updatedAt`, no relations — append-only by convention.

Enums (also in `.claude/README.md`):
- `AuditActorType = 'user' | 'terminal' | 'employee' | 'system'`
- `AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' |
  'stock_in' | 'stock_adjust' | 'stock_return' | 'order_complete' |
  'order_cancel' | 'pin_verify'`

## Endpoints (all under `/api/v1/audit-log`)

Controller-level `@Roles(Role.SuperAdmin)` + `@NoCache()`, guarded by
`JwtAuthGuard, RolesGuard`. **Read-only — no POST/PATCH/DELETE.**

| Method | Path | Roles | Query → response shape |
|---|---|---|---|
| GET | `/` | SuperAdmin | `PaginatedGetAllDto` (`page`, `limit`) → paginated `AuditLog[]` |
| GET | `/:id` | SuperAdmin | id → single `AuditLog` (404 if missing) |

`GET /` returns the standard paginated envelope (`paginatedResponse`), ordered
`createdAt DESC` (newest first). `GET /:id` returns the single envelope via
`getEntityOrNotFound` (throws `notFound('AuditLog {id}')` if absent).

## Service logic & rules

### `log()` — how other modules emit an audit event

```ts
async log(dto: CreateAuditLogDto): Promise<AuditLog>
```

`CreateAuditLogDto` (exported from `audit-log.service.ts`):

```ts
interface CreateAuditLogDto {
  actorType: AuditActorType;          // required
  actorId: string;                    // required
  action: AuditAction;                // required
  resourceType: string;               // required
  resourceId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  ipAddress?: string;
}
```

Implementation is a single `repo.save(repo.create(dto))` — the `id` and
`createdAt` are filled automatically. Usage from another module:

```ts
// 1. import AuditLogModule into your module's imports[]
// 2. inject the service
constructor(private readonly auditLogService: AuditLogService) {}

// 3. emit
await this.auditLogService.log({
  actorType: AuditActorType.User,
  actorId: req.user.sub,
  action: AuditAction.Create,
  resourceType: 'order',
  resourceId: order.id,
  afterData: { status: order.status },
  ipAddress: req.ip,
});
```

Import paths:
`AuditLogService`, `CreateAuditLogDto` from `audit-log.service`;
`AuditActorType`, `AuditAction` from `entities/audit-log.entity`.

### Reads

- `findAll({ page, limit })` — `findAndCount` with `skip/take`, `createdAt DESC`.
- `findOne(id)` — `getEntityOrNotFound`.

## Conventions & gotchas

- **Append-only**: no update/delete path exists; don't add one without reason.
- `log()` is **not** transactional with the caller's work and doesn't swallow
  errors — a failed save rejects the promise. Wrap in try/catch if an audit
  failure must not break the main operation.
- `resourceType` is free-text (not an enum) — keep values consistent
  (`'order'`, `'product'`, `'user'`, ...).
- Module must be imported by any module that injects `AuditLogService`
  (it's exported, not global).
- Changing the entity changes the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/audit-log.md` when enums/shapes change.

## Related

- Emitters: [[route-order]], [[route-stock-entry]], [[route-auth]] and others call `log()`.
- Shared helpers: `@app/common/helpers/entity.helper` (`getEntityOrNotFound`),
  `@app/common/helpers/response` (`ok`, `paginatedResponse`),
  `@app/common/helpers/generateIdWithPrefix.helper`.
- `PaginatedGetAllDto` from `@app/common/dto/paginated.dto`.
