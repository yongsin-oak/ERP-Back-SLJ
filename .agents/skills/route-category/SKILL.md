---
name: route-category
description: Developer guide for the category module — self-referencing product category tree (parent/children). Use when editing or extending anything under src/modules/category.
---

# Category Module

Product categories arranged as a **self-referencing tree**: each `Category` has an
optional `parentId` (→ `category.id`) and a `children` collection. Referenced by
`Product.categoryId`. Read access is open to all authenticated roles; all writes
are SuperAdmin-only. A dedicated `/tree` endpoint returns roots with their
direct children.

## Files

```
src/modules/category/
├── category.module.ts                # registers Category repo; exports CategoryService
├── category.controller.ts            # @Controller({ path: 'category', version: '1' })
├── category.service.ts               # all business logic (incl. recursive delete)
├── entities/
│   └── category.entity.ts            # Category (PK id 'CAT-...', self ManyToOne parent)
└── dto/
    ├── create-category.dto.ts        # CategoryCreateDto { name, description?, parentId? }
    ├── update-category.dto.ts        # CategoryUpdateDto extends PartialType(CategoryCreateDto)
    ├── get-category.dto.ts           # CategoryGetDto extends PaginatedGetAllDto { parentId? }
    └── response-category.dto.ts      # CategoryResponseDto, ...WithChildrenDto, ...WithParentDto
```

## Entity: `Category`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `CAT-{random}` via `@BeforeInsert` `generateIdWithPrefix({ prefix: 'CAT', withDateTime: false })` |
| `name` | string | `@Column({ unique: true })` — duplicate → PG `23505` → `409` |
| `parent` / `parentId` | Category / string | self `ManyToOne` (`@JoinColumn({ name: 'parentId' })`), nullable |
| `children` | Category[] | self `OneToMany` (inverse of `parent`), nullable |
| `childrenId` | string[] | `@Column('text', { array: true, nullable: true })` — declared column, **not populated by the service** |
| `description` | string | `nullable` |
| `products` | Product[] | `OneToMany` → Product (inverse of `product.category`), nullable |
| `createdAt` / `updatedAt` | Date | auto |

> `childrenId` exists in the schema but the service never writes it; the tree is
> traversed via the `parent`/`children` relations, not this array.

## Endpoints (all under `/api/v1/category`)

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| POST | `/` | SuperAdmin | `CategoryCreateDto` → created `Category` (201) |
| GET | `/` | `*` | `CategoryGetDto` (page, limit, `parentId?`) → paginated; each item flattened to `{ ...rest, parentId }` |
| GET | `/tree` | `*` | → root categories (`parent: null`) each with direct `children[]` |
| GET | `/:id` | `*` | → single `Category` with `parent` + `children` relations |
| PATCH | `/:id` | SuperAdmin | `CategoryCreateDto` body → `CategoryResponseWithParentDto` |
| DELETE | `/:id` | SuperAdmin | `?deleteChild=true|1` → `CategoryResponseWithChildrenDto` |

Controller is `@NoCache()` and guarded by `JwtAuthGuard, RolesGuard`.

> **Route order matters:** `@Get('tree')` is declared **before** `@Get(':id')` so
> "tree" is not swallowed by the param route. Keep new literal GET routes above
> `:id`.
> PATCH binds `CategoryCreateDto` (not the Update DTO), so `name` is validated as
> required on update at the DTO level.

## Service logic & rules

- `categoryGetEntityOrFail(id)` / `categoryThrowIfExists(name)` wrap the shared
  `getEntityOrNotFound` / `throwIfEntityExists` helpers.
- `create`: `conflict` if `name` exists; if `parentId` given, the parent must
  exist (`notFound` otherwise); then `create` + `save`.
- `findAll`: loads `parent` relation, optional `parentId` filter
  (`where: { parent: { id: parentId } }`), maps each row to flatten
  `parent` → `parentId` (null when no parent).
- `findAllTree`: loads roots `where: { parent: null }` with `children`, returns
  each root with a trimmed `children[]` (`id, name, description, timestamps`
  only). One level of children — not deep-recursive.
- `update`: ensures existence, then `repo.update` spreading the dto and
  re-pointing `parent` — `parentId` truthy → `{ parent: { id } }`, falsy →
  `{ parent: null }` (clears the parent). Returns the entity with `parentId`
  stripped (parent object kept).
- `remove(id, delChild=false)`: loads with `children`; if it has children and
  `delChild` is false → `badRequest` telling the caller to pass
  `deleteChild=true`. With `delChild` true it **recursively** removes every
  child first, then deletes the node. Controller maps `?deleteChild` string
  (`'true'`/`'1'`) to the boolean.

## Conventions & gotchas

- Self-referencing FK: `category.parentId` → `category.id` (see README Relationships).
- Deleting a parent without `deleteChild=true` is blocked to avoid orphans.
- `update` with no `parentId` in the body **detaches** the category from its
  parent (sets `parent: null`) — it does not preserve the existing parent.
- `findAll` and `findOne` return different shapes (`findOne` keeps the relation
  objects, `findAll` flattens to `parentId`).
- Entity changes alter the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/category.md` when endpoints/shapes change.

## Related

- [[route-product]] — `product.categoryId` → `category.id`; products list lives on the category.
- [[route-brand]] — sibling lookup module with the same base CRUD shape.
- Shared patterns: `@app/common/helpers/entity.helper`,
  `@app/common/helpers/response`, `@app/common/helpers/generateIdWithPrefix.helper`.
- Conventions: [.claude/README.md](../../README.md) (response helpers, versioning, ID formats, roles).
