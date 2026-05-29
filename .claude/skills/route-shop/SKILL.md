---
name: route-shop
description: Developer guide for the shop module — sales channels (Shopee/Lazada/TikTok/LineOA/LineMan/Offline) referenced by orders and shop-specific product pricing. Use when editing or extending anything under src/modules/shop.
---

# Shop Module

Sales channels / storefronts. A `Shop` carries a `platform` from the shared
`Platform` enum and is referenced by `order.shopId` and by `ProductShopPrice`
(shop-specific pricing). Uniqueness is per **(name, platform)** pair, so the same
name can exist on different platforms. Read access is open to all authenticated
roles; all writes are SuperAdmin-only.

## Files

```
src/modules/shop/
├── shop.module.ts                   # registers Shop repo; exports ShopService
├── shop.controller.ts               # @Controller({ path: 'shop', version: '1' })
├── shop.service.ts                  # all business logic
├── entities/
│   ├── shop.entity.ts               # Shop (PK id 'SHOP-...', @Unique(['name','platform']))
│   └── platform.enum.ts             # Platform enum
└── dto/
    ├── create-shop.dto.ts           # ShopCreateDto { name, description?, platform }
    ├── update-product.dto.ts        # ShopUpdateDto extends PartialType(ShopCreateDto) (file name is misleading)
    ├── get-shop.dto.ts              # ShopGetDto extends PaginatedGetAllDto { platform? }
    └── response.dto.ts              # ShopResponseDto
```

## Entity: `Shop`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK**, `SHOP-{random}` via `@BeforeInsert` `generateIdWithPrefix({ prefix: 'SHOP', withDateTime: false })` |
| `name` | string | part of the composite unique key |
| `description` | string | `nullable` |
| `platform` | `Platform` | `@Column()` (plain column, not a DB enum type); validated by DTO `@IsEnum(Platform)` |
| `createdAt` / `updatedAt` | Date | auto |

`@Unique(['name', 'platform'])` — duplicate pair → PG `23505` → `409`.

`Platform` (`entities/platform.enum.ts`, mirrors README): `Shopee | Lazada |
TikTok | LineOA | LineMan | Offline`.

## Endpoints (all under `/api/v1/shop`)

| Method | Path | Roles | Body / Query → response |
|---|---|---|---|
| POST | `/` | SuperAdmin | `ShopCreateDto` → created `Shop` (201) |
| GET | `/` | `*` | `ShopGetDto` (page, limit, `platform?`) → paginated `Shop[]` |
| GET | `/:id` | `*` | → single `Shop` |
| PATCH | `/:id` | SuperAdmin | `ShopCreateDto` body → updated `Shop` |
| DELETE | `/:id` | SuperAdmin | → the deleted `Shop` (pre-delete snapshot) |

Controller is `@NoCache()`, tagged `@ApiTags('Shops')`, guarded by
`JwtAuthGuard, RolesGuard`.

> PATCH binds `ShopCreateDto` (not `ShopUpdateDto`), so DTO-level required fields
> apply on update even though the service treats the body as partial.

## Service logic & rules

- `shopGetEntityOrFail(id)` / `shopThrowIfExists(name, platform)` wrap the shared
  `getEntityOrNotFound` / `throwIfEntityExists` helpers; the existence check keys
  on the **(name, platform)** pair.
- `findAll`: `findAndCount` with skip/take and an optional `platform` filter;
  wraps in `paginatedResponse`.
- `create`: `conflict` if the (name, platform) pair exists, then `create` + `save`.
- `update`: loads the existing shop; computes the resulting name/platform
  (falling back to existing values); only re-checks the unique pair when name or
  platform actually changes; `repo.update(id, data)` then re-`findOne`.
- `remove`: loads the entity, deletes by id, returns the loaded snapshot.

## Conventions & gotchas

- Uniqueness is the **pair**, not name alone — same name on two platforms is allowed.
- `platform` is stored as a plain column; the only validation is the DTO
  `@IsEnum(Platform)`. Adding a platform means editing `platform.enum.ts` (and
  the README/`api/shop.md` enum list).
- The update DTO lives in `dto/update-product.dto.ts` (copy-paste filename); the
  class is `ShopUpdateDto`. Rename with care — it is imported by the service.
- Entity changes alter the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/shop.md` when endpoints/shapes change.

## Related

- [[route-order]] — `order.shopId` → `shop.id` (sales channel of an order).
- [[route-product]] — `ProductShopPrice.shopId` → `shop.id` (shop-specific pricing).
- Shared `Platform` enum is also referenced from the README enum table.
- Shared patterns: `@app/common/helpers/entity.helper`,
  `@app/common/helpers/response`, `@app/common/helpers/generateIdWithPrefix.helper`.
- Conventions: [.claude/README.md](../../README.md) (response helpers, versioning, ID formats, roles, Platform enum).
