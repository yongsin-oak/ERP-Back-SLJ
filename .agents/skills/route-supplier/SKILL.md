---
name: route-supplier
description: Developer guide for the supplier module — vendor/ผู้จัดจำหน่าย records with contact info, taxId, and an isActive flag. Use when editing or extending anything under src/modules/supplier.
---

# Supplier Module

Vendors / ผู้จัดจำหน่าย. A self-contained CRUD module holding supplier contact
details (`contactName`, `phone`, `email`, `address`), a tax id (`taxId`), an
`isActive` flag, and a free-text `note`. No relations to other entities. Read
access is open to all authenticated roles; all writes are SuperAdmin-only.

## Files

```
src/modules/supplier/
├── supplier.module.ts               # registers Supplier repo; exports SupplierService
├── supplier.controller.ts           # @Controller({ path: 'supplier', version: '1' })
├── supplier.service.ts              # business logic + UpdateSupplierDto (defined here)
├── entities/
│   └── supplier.entity.ts           # Supplier (PK id 'SUP-...')
└── dto/
    └── create-supplier.dto.ts       # CreateSupplierDto
```

> There is **no separate update DTO file** — `UpdateSupplierDto extends
> PartialType(CreateSupplierDto)` is declared inline in `supplier.service.ts` and
> imported by the controller from there.

## Entity: `Supplier`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `SUP-{random}` via `@BeforeInsert` `generateIdWithPrefix({ prefix: 'SUP', withDateTime: false })` |
| `name` | string | `@Column({ unique: true })` — duplicate → PG `23505` → `409` |
| `contactName` | string | `nullable` |
| `phone` | string | `nullable` |
| `email` | string | `nullable`; DTO validates `@IsEmail()` on input |
| `address` | string | `nullable` |
| `taxId` | string | `nullable`; เลขประจำตัวผู้เสียภาษี |
| `isActive` | boolean | `@Column({ default: true })` |
| `note` | string | `nullable` |
| `createdAt` / `updatedAt` | Date | auto |

## Endpoints (all under `/api/v1/supplier`)

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| GET | `/` | `*` | `PaginatedGetAllDto` (page, limit) → paginated `Supplier[]`, ordered by `name ASC` |
| GET | `/:id` | `*` | → single `Supplier` |
| POST | `/` | SuperAdmin | `CreateSupplierDto` → created `Supplier` (201) |
| PATCH | `/:id` | SuperAdmin | `UpdateSupplierDto` (partial) → updated `Supplier` |
| DELETE | `/:id` | SuperAdmin | → the deleted `Supplier` (pre-delete snapshot) |

Controller is `@NoCache()` and guarded by `JwtAuthGuard, RolesGuard`.

## Service logic & rules

- Calls the shared `getEntityOrNotFound` / `throwIfEntityExists` helpers directly
  (no private wrapper methods).
- `findAll`: `findAndCount` with skip/take and `order: { name: 'ASC' }`; wraps in
  `paginatedResponse`.
- `findOne`: `getEntityOrNotFound` by id.
- `create`: `conflict` if `name` exists, then `create` + `save`.
- `update`: loads the entity; only re-checks name uniqueness when `dto.name` is
  provided **and** changed; then `Object.assign(supplier, dto)` + `save`
  (preserves untouched fields).
- `remove`: loads the entity, deletes by id, returns the loaded snapshot.

## Conventions & gotchas

- PK is `id` (`SUP-...`); `name` is the unique business key.
- `isActive` defaults to `true`; it is a filter/soft-state flag — deletes are
  **hard deletes**, not deactivation. Set `isActive: false` via PATCH to retire a
  supplier without removing the row.
- `email` is validated with `@IsEmail()` on create/update — invalid emails are
  rejected with `400` before reaching the service.
- The update DTO is co-located in the service file; importing it from elsewhere
  means importing from `supplier.service.ts`.
- Entity changes alter the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/supplier.md` when endpoints/shapes change.

## Related

- [[route-brand]] / [[route-shop]] — sibling SuperAdmin-write CRUD modules with the same response patterns.
- No FK relations from `supplier` in the current schema (see README Relationships table).
- Shared patterns: `@app/common/helpers/entity.helper`,
  `@app/common/helpers/response`, `@app/common/helpers/generateIdWithPrefix.helper`.
- Conventions: [.claude/README.md](../../README.md) (response helpers, versioning, ID formats, roles).
