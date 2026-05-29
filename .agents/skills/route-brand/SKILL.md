---
name: route-brand
description: Developer guide for the brand module — product brands (yี่ห้อ) referenced by products. Use when editing or extending anything under src/modules/brand.
---

# Brand Module

Product brands. A `Brand` is referenced by `Product.brandId` (`OneToMany products`).
Simple CRUD plus a SuperAdmin-only `/bulk` create. Read access is open to all
authenticated roles; all writes are SuperAdmin-only.

## Files

```
src/modules/brand/
├── brand.module.ts                  # registers Brand repo; exports BrandService
├── brand.controller.ts              # @Controller({ path: 'brand', version: '1' })
├── brand.service.ts                 # all business logic
├── entities/
│   └── brand.entity.ts              # Brand (PK id 'BRD-...')
└── dto/
    ├── create-brand.dto.ts          # BrandCreateDto { name, description? }
    └── update-brand.dto.ts          # BrandUpdateDto extends PartialType(BrandCreateDto)
```

## Entity: `Brand`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `BRD-{random}` via `@BeforeInsert` `generateIdWithPrefix({ prefix: 'BRD', withDateTime: false })` |
| `name` | string | `@Column({ unique: true })` — duplicate → PG `23505` → `409` |
| `description` | string | `nullable` |
| `products` | Product[] | `OneToMany` → Product (inverse of `product.brand`), nullable |
| `createdAt` / `updatedAt` | Date | auto (`CreateDateColumn` / `UpdateDateColumn`) |

## Endpoints (all under `/api/v1/brand`)

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| GET | `/` | `*` | `PaginatedGetAllDto` (page, limit) → paginated `Brand[]` |
| GET | `/:id` | `*` | → single `Brand` (no relations loaded) |
| POST | `/` | SuperAdmin | `BrandCreateDto` → created `Brand` (201) |
| POST | `/bulk` | SuperAdmin | `BrandCreateDto[]` → created `Brand[]` (201) |
| PATCH | `/:id` | SuperAdmin | `BrandUpdateDto` → updated `Brand` |
| DELETE | `/:id` | SuperAdmin | → the deleted `Brand` (pre-delete snapshot) |

Controller is `@NoCache()` and guarded by `JwtAuthGuard, RolesGuard`.

> Controller passes scalars, not the DTO, to the service:
> `create(body.name, body.description)` and `update(id, body.name, body.description)`.

## Service logic & rules

- `brandGetEntityOrFail(id)` / `brandThrowIfExists(name)` wrap the shared
  `getEntityOrNotFound` / `throwIfEntityExists` helpers.
- `findAll`: plain `findAndCount` with skip/take, no relations, no filters; wraps
  in `paginatedResponse`.
- `create`: `conflict` if `name` exists, then `create` + `save`.
- `createMultiple`: loops the array, runs `brandThrowIfExists` per item (one DB
  check each), then a single `save(brands[])`. No transaction — an early
  conflict throws before any insert, but it is not all-or-nothing if a DB-level
  unique violation slips through on `save`.
- `update`: ensures the brand exists; only re-checks name uniqueness when the
  name actually changes; `repo.update(id, {...})` then re-`findOne`.
- `remove`: loads the entity first, deletes by id, returns the loaded snapshot.

## Conventions & gotchas

- PK is `id` (`BRD-...`); params are `:id`. `name` is the unique business key.
- `/bulk` must stay declared after the literal/param routes is not an issue here —
  `bulk` is a `@Post('bulk')` and there is no `POST /:id`, so no collision.
- `description` is optional on create and update.
- Entity changes alter the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/brand.md` when endpoints/shapes change.

## Related

- [[route-product]] — `product.brandId` → `brand.id`; products list lives on the brand.
- [[route-category]] — sibling lookup module with the same CRUD shape (plus tree).
- Shared patterns: `@app/common/helpers/entity.helper`,
  `@app/common/helpers/response`, `@app/common/helpers/generateIdWithPrefix.helper`.
- Conventions: [.claude/README.md](../../README.md) (response helpers, versioning, ID formats, roles).
