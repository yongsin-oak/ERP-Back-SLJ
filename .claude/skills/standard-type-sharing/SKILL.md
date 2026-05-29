---
name: standard-type-sharing
description: Rules for declaring and sharing TypeScript types / DTOs / interfaces across the codebase — where to put them, when to extract vs. inline, and how to avoid duplicate declarations. TRIGGER whenever you are about to write a new DTO, interface, type alias, or value object, or when you see the same shape appearing in two or more places.
---

# Type Sharing — Declare Once, Import Everywhere

**Rule:** a type is declared exactly once. Every consumer imports it.
Duplicating a type — even slightly renamed — is a review-blocking mistake.

---

## Decision tree: where does a type live?

```
Is the type used by 2+ feature modules?
  YES → src/common/dto/<name>.dto.ts   (shared; import via @app/common/dto/…)
  NO  → Is it a value object embedded in an entity/column?
          YES → src/modules/<feature>/entities/<feature>.interface.ts
          NO  → src/modules/<feature>/dto/<name>.dto.ts
```

Never inline an object type that has a name or appears more than once — even
within the same file.

---

## Canonical shared DTOs already in `src/common/dto/`

| Class | File | Use for |
|---|---|---|
| `PaginatedGetAllDto` | `paginated.dto.ts` | all paginated list query DTOs |
| `DropdownQueryDto` | `dropdown-query.dto.ts` | all dropdown / infinite-scroll endpoints |
| `PaginationDto` | `paginated.dto.ts` | pagination metadata in responses |
| `PaginatedResponseDto<T>` | `paginated.dto.ts` | paginated response envelope |
| `ResponseMetaDto` | `paginated.dto.ts` | `meta` field in every success response |

**Before adding a new class to `src/common/dto/`, verify none of the above
already covers the need.**

---

## Required patterns

### 1 — Paginated list query DTO: always extend `PaginatedGetAllDto`

```ts
// WRONG — redefines page/limit manually
export class ProductGetDto {
  @Type(() => Number) @IsInt() @Min(1) page: number;
  @Type(() => Number) @IsInt() @Min(1) limit: number;
  search?: string;
}

// RIGHT
import { PaginatedGetAllDto } from '@app/common/dto/paginated.dto';
export class ProductGetDto extends PaginatedGetAllDto {
  @IsOptional() @IsString() search?: string;
}
```

### 2 — Dropdown / infinite-scroll query DTO: always extend `DropdownQueryDto`

```ts
// WRONG — hand-rolls optional page/limit
export class ProductDropdownSearchDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() search?: string;
}

// RIGHT
import { DropdownQueryDto } from '@app/common/dto/dropdown-query.dto';
export class ProductDropdownSearchDto extends DropdownQueryDto {}
// Add extra fields only if needed:
export class EmployeeDropdownSearchDto extends DropdownQueryDto {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
```

`DropdownQueryDto` gives you: `page?` (default 1), `limit?` (default 20,
max 50), `search?`. All optional, all correctly decorated.

### 3 — Value-object types: name and export from one place

```ts
// WRONG — inline in dto AND in entity AND in response
sellPrice: { pack: number; carton: number }   // in create-product.dto.ts
sellPrice: { pack: number; carton: number }   // in response.dto.ts
sellPrice: { pack: number; carton: number }   // in dropdown-search-product.dto.ts

// RIGHT — already exists, import it
import { ProductUnitPrice } from '../entities/product.interface';
sellPrice: ProductUnitPrice;
```

`ProductUnitPrice` (in
[src/modules/product/entities/product.interface.ts](../../../src/modules/product/entities/product.interface.ts))
is the canonical price type. It includes TypeORM column decorators and
class-validator decorators so it works for both entities and request DTOs.

### 4 — Enums: import, never redeclare

```ts
// WRONG — copy-pasting enum values
type Platform = 'Shopee' | 'Lazada' | 'TikTok';   // stale the moment the enum changes

// RIGHT
import { Platform } from '@app/modules/shop/entities/shop.entity';   // or wherever declared
```

One declaration. If an enum is used across 2+ modules, move it to
`src/common/constants/` and import from there (see [[standard-constants-no-hardcode]]).

### 5 — Response DTOs: don't restate the envelope

The global interceptor builds `{ success, statusCode, message, data, meta }`.
You only define the `data` shape.

```ts
// WRONG — manually repeats the envelope
export class ProductListResponse {
  success: boolean;
  statusCode: number;
  data: Product[];
  pagination: { page: number; limit: number; total: number; ... };
}

// RIGHT — only the data item shape
export class ProductResponseDto { ... }
// Swagger: @ApiOkResponsePaginated(ProductResponseDto)
// Runtime: return ok(paginatedResponse(data, page, limit, total))
```

---

## Generic types — use only when the generality pays off

A generic type is justified **only** when the same structure genuinely wraps
different data types across many callers. If you'd only ever write it with
1–2 concrete types, write those types directly — generics add cognitive overhead
that must be earned.

### When generics are appropriate (already in this repo)

```ts
// PaginatedResponseDto<T> — wraps every list; T varies per endpoint (Product, Order, Employee, …)
PaginatedResponseDto<ProductResponseDto>
PaginatedResponseDto<OrderResponseDto>

// ApiResponseDto<T> — single-item envelope; T varies
ApiResponseDto<ProductResponseDto>
```

These earn their generality: the same container is reused across every module.
The generic parameter is always a **concrete, named DTO** — never `any`, never `object`.

### When NOT to use a generic

```ts
// WRONG — generic adds complexity with no reuse benefit
export class EntityWithId<T> { id: string; data: T; }

// RIGHT — just write the concrete type
export class ProductWithId { id: string; data: ProductResponseDto; }

// WRONG — generic "base" that only one class ever extends
export class BaseCreateDto<T extends { name: string }> { name: string; }

// RIGHT — just declare the field
export class CreateBrandDto { @IsString() name: string; }
```

**Rules:**
- Generic parameter must be **used by 3+ concrete types**. Fewer → write it concrete.
- Never use `T = any` or `T = unknown` — defeats type safety without adding clarity.
- Never make a generic just to share a single `id: string` field — extend a class or repeat the field.
- Prefer class inheritance (`extends`) over generics for structural sharing across
  related DTOs (e.g. all "create" DTOs share optional `description` → extract a
  `BaseDescribableDto` class, not a generic).

### Naming convention for generics

```ts
// Single type parameter: T
class ApiResponseDto<T> { data: T; }

// When semantics matter, use a descriptive name
class KeyValuePair<TKey, TValue> { key: TKey; value: TValue; }
```

Keep it short. `T`, `TItem`, `TData` are fine. `TResponseBodyGenericDataShape` is not.

---

## Cross-module type examples in this repo

| Type | Lives in | Used by |
|---|---|---|
| `ProductUnitPrice` | `product/entities/product.interface.ts` | `Product` entity, `CreateProductDto`, `ProductResponseDto`, `ProductDropdownItemDto`, `ProductShopPrice` |
| `Dimensions` | `product/entities/product.interface.ts` | `Product` entity, create/update DTOs |
| `PaginatedGetAllDto` | `common/dto/paginated.dto.ts` | every paginated list DTO in every module |
| `DropdownQueryDto` | `common/dto/dropdown-query.dto.ts` | every dropdown endpoint DTO |
| `Role` (enum) | `auth/role/role.enum.ts` | `User` entity, `Employee.department`, `EmployeeGetDto`, auth guards |

When a type leaves its origin module (appears in a second module's import),
move it to `src/common/` — unless it's a domain concept that genuinely belongs
to the origin module (then the second module imports from the origin).

---

## Checklist before writing a new type

1. **Search first:** `grep -r "ClassName\|{ field1.*field2" src/` — does it exist?
2. **Is it a query DTO with `page`/`limit`?** → extend `PaginatedGetAllDto` or `DropdownQueryDto`.
3. **Is it an inline object type used more than once?** → extract to a named class/interface.
4. **Is it used by 2+ modules?** → put in `src/common/dto/` or `src/common/constants/`.
5. **Is it an enum value?** → import from the single source; never redeclare.
6. **Is it a response envelope?** → don't write it; the interceptor builds it.

---

## Related

- [[standard-shared-helpers]] — shared runtime helpers (response, entity, id generation).
- [[standard-project-structure]] — where all files live.
- [[standard-constants-no-hardcode]] — enum/constant placement.
- [[standard-api-responses]] — response envelope contract.
