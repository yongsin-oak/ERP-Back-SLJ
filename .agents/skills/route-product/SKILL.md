---
name: route-product
description: Developer guide for the product module (inventory items, keyed by barcode) — entity, DTOs, endpoints, service logic, and shop-specific pricing. Use when editing or extending anything under src/modules/product.
---

# Product Module

Inventory items. **Primary key is `barcode` (string), not an auto-generated id.**
Owns the related `ProductShopPrice` entity for shop-specific pricing.

## Files

```
src/modules/product/
├── product.module.ts                       # registers Product, Brand, Category, ProductShopPrice repos; exports ProductService
├── product.controller.ts                   # @Controller({ path: 'product', version: '1' })
├── product.service.ts                       # all business logic
├── entities/
│   ├── product.entity.ts                    # Product (PK barcode)
│   ├── product-shop-price.entity.ts         # ProductShopPrice (PK id 'PSP-...', unique [productBarcode, shopId])
│   └── product.interface.ts                 # Dimensions, ProductUnitPrice value objects
└── dto/
    ├── create-product.dto.ts                # ProductCreateDto
    ├── update-product.dto.ts                # ProductUpdateDto
    ├── get-product.dto.ts                   # ProductGetDto (pagination + filters)
    ├── dropdown-search-product.dto.ts       # ProductDropdownSearchDto, ProductDropdownItemDto
    ├── check-exist-product.dto.ts           # CheckExistProductDto { barcodes: string[] }
    ├── bulk-update-product.dto.ts           # BulkUpdateProductDto { products: {barcode, data}[] }
    ├── bulk-delete-product.dto.ts           # BulkDeleteProductDto { barcodes: string[] }
    ├── shop-price.dto.ts                     # CreateShopPriceDto, UpdateShopPriceDto
    └── response.dto.ts                       # ProductResponseDto
```

## Entity: `Product`

| Field | Type | Notes |
|---|---|---|
| `barcode` | string | **PK**, set by caller (no auto-gen) |
| `name` | string | |
| `brand` / `brandId` | Brand / string | `ManyToOne` → Brand, nullable |
| `category` / `categoryId` | Category / string | `ManyToOne` → Category, nullable |
| `orderDetails` | OrderDetail[] | `OneToMany`, cascade |
| `costPrice` | `ProductUnitPrice` jsonb | `{ pack, carton }` |
| `sellPrice` | `ProductUnitPrice` jsonb | `{ pack, carton }` |
| `remaining` | int | stock on hand, `@Min(0)` |
| `minStock` | int? | default `5` |
| `maxStock` | int? | nullable |
| `productDimensions` | `Dimensions` jsonb | `{ length, width, height, weight }` cm/kg |
| `cartonDimensions` | `Dimensions` jsonb | same shape |
| `piecesPerPack` | int? | |
| `packPerCarton` | int? | |
| `isActive` | boolean | default `true` |
| `imageUrl` | string? | |
| `sku` | string? | `unique` |
| `createdAt` / `updatedAt` | Date | auto |

Value objects (`entities/product.interface.ts`):
`ProductUnitPrice = { pack: number; carton: number }` (no "piece").
`Dimensions = { length; width; height; weight }`.

## Entity: `ProductShopPrice`

PK `id` = `PSP-{random}` (via `@BeforeInsert` `generateIdWithPrefix({ prefix: 'PSP', withDateTime: false })`).
`@Unique(['productBarcode', 'shopId'])`. `product` relation is `onDelete: 'CASCADE'`.
Fields: `productBarcode`, `shopId`, `sellPrice` (`ProductUnitPrice` jsonb), `effectiveFrom?`, `effectiveTo?`, timestamps.

## Endpoints (all under `/api/v1/product`)

| Method | Path | Roles | Body / Query |
|---|---|---|---|
| POST | `/` | SuperAdmin | `ProductCreateDto` |
| POST | `/bulk` | SuperAdmin | `ProductCreateDto[]` |
| GET | `/` | `*` | `ProductGetDto` (page, limit, search, brandId, categoryId, isActive) → paginated |
| GET | `/dropdown-search` | `*` | `ProductDropdownSearchDto` → `ProductDropdownItemDto[]` (max 50) |
| POST | `/check-exist` | `*` | `CheckExistProductDto` → `{ existing[], missing[] }` |
| PATCH | `/bulk` | SuperAdmin | `BulkUpdateProductDto` |
| DELETE | `/bulk` | SuperAdmin | `BulkDeleteProductDto` → `{ deleted[], errors[] }` |
| GET | `/:barcode` | `*` | loads `brand`, `category` relations |
| PATCH | `/:barcode` | SuperAdmin | `ProductUpdateDto` |
| DELETE | `/:barcode` | SuperAdmin | |
| GET | `/:barcode/shop-price` | `*` | all shop prices for product |
| POST | `/:barcode/shop-price` | SuperAdmin | `CreateShopPriceDto` |
| PATCH | `/:barcode/shop-price/:shopId` | SuperAdmin | `UpdateShopPriceDto` |
| DELETE | `/:barcode/shop-price/:shopId` | SuperAdmin | |

> **Route order matters:** literal/`bulk`/`dropdown-search`/`check-exist` routes are
> declared **before** `:barcode` so they aren't swallowed by the param route. Keep
> new literal routes above `:barcode`.

Controller is `@NoCache()` and guarded by `JwtAuthGuard, RolesGuard`.

## Service logic & rules

- `productGetEntityOrFail(barcode)` / `productThrowIfExists(barcode)` wrap the
  shared `getEntityOrNotFound` / `throwIfEntityExists` helpers.
- `create`: throws `conflict` if barcode exists, then `create` + `save`.
- `createMultiple`: validates each `brandId`/`categoryId` exists (`badRequest` if not).
- `findAll`: QueryBuilder with `leftJoinAndSelect` brand+category, `ILIKE` on
  name/barcode, optional brand/category/isActive filters, `paginatedResponse`.
- `update`: ensures existence, then `repo.update(barcode, dto)` (partial update).
- `bulkUpdate`: pre-validates **all** barcodes exist; throws `badRequest` listing
  missing ones before updating any (all-or-nothing on existence).
- `bulkDelete`: returns `{ deleted, errors }`; if any barcode is missing it
  aborts with `{ deleted: [], errors }` (no partial delete on missing). Per-item
  delete failures are collected into `errors`.
- `checkExist`: single `In(barcodes)` query, returns existing vs missing.
- Shop price create: `conflict` if `(barcode, shopId)` pair exists; date strings
  are converted to `Date`. Update/delete use `notFound` when the pair is missing.

## Conventions & gotchas

- PK is `barcode` everywhere — params are `:barcode`, not `:id`.
- `costPrice`/`sellPrice`/dimensions are **jsonb objects**, not flat columns.
- `sku` is `unique` — a duplicate triggers PG `23505` → `409` via the global filter.
- Changing the entity changes the DB schema in dev (`synchronize: true`).
- Update `.claude/skills/api/product.md` when endpoints/shapes change.

## Related

- [[route-brand]] / [[route-category]] — `brandId` / `categoryId` foreign keys.
- [[route-order-detail]] — references `productBarcode`.
- [[route-stock-entry]] — mutates `product.remaining`.
- [[route-shop]] — `shopId` used by `ProductShopPrice`.
- Shared patterns: `@app/common/helpers/entity.helper`, `.../response`.
