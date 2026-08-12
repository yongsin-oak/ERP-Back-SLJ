---
name: standard-response-contracts
description: Define minimal, explicit API response data shapes for this NestJS/TypeORM backend. TRIGGER when adding or changing an endpoint response, creating a response DTO, implementing a dropdown or infinite-scroll response, selecting columns or relations, mapping entities to API data, documenting a Swagger response, or reviewing payload size and accidental data exposure.
---

# Response Contracts

Return only the data the caller needs. Treat every response shape as a public
contract: explicit, typed, documented, and independent from the persistence
entity.

## Core rules

- Never return a TypeORM entity as the intended public contract.
- Define a named response DTO for each distinct use case: list item, detail,
  dropdown/reference, or command result.
- Do not repeat the global `{ success, statusCode, message, data, meta }`
  envelope. Define only the `data` shape; the interceptor owns the envelope.
- Select only required database columns. Prefer preventing over-fetching in SQL
  over loading a full entity and deleting fields afterward.
- Never expose secret or internal fields such as hashes, tokens, internal flags,
  raw audit payloads, or implementation-only foreign-key columns.
- Keep Swagger declarations and TypeScript return types aligned with runtime data.

## Shape responses by use case

Do not use one large response DTO for every endpoint.

```ts
export class ProductListItemDto {
  barcode: string;
  name: string;
  remaining: number;
}

export class ProductDetailDto extends ProductListItemDto {
  description: string | null;
  brand: ProductReferenceDto | null;
}

export class ProductReferenceDto {
  barcode: string;
  name: string;
}
```

Use a small reference shape for dropdowns and nested relations. Do not embed an
entire relation when the client needs only its identifier and display label.

## Dropdown and infinite-scroll responses

Every dropdown/typeahead endpoint is paginated. Accept `DropdownQueryDto`
(`page`, `limit`, `search`) and return the same paginated response contract used
by list endpoints; do not create a second cursor/envelope convention per module.

```ts
export class ProductSummaryDto {
  barcode: string;
  name: string;
}

async dropdown(
  query: ProductDropdownQueryDto,
): Promise<PaginatedResponseDto<ProductSummaryDto>> {
  const { page = 1, limit = 20, search } = query;
  const qb = this.productRepository
    .createQueryBuilder('product')
    .select(['product.barcode', 'product.name']);

  applySmartSearch(qb, ['product.barcode', 'product.name'], search);
  return paginateQuery(qb, page, limit);
}
```

The transformed HTTP response remains:

```ts
{
  success: true,
  statusCode: 200,
  message: 'OK',
  data: ProductSummaryDto[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean,
  },
  meta: {
    requestId: string,
    timestamp: string,
  },
}
```

Rules:

- Default to page `1`, limit `20`; `DropdownQueryDto` caps limit at `50`.
- The frontend loads another page only when `pagination.hasNextPage` is true.
- Preserve deterministic ordering across pages. Add a unique identifier as the
  final tie-breaker when the primary sort field is not unique.
- Reset to page `1` whenever the search term or another dropdown filter changes.
- Return a minimal summary/reference item. Include extra fields only when the
  option renderer, disabled-state logic, or selection identity requires them.
- Never return an unbounded option list, a bare array, or a separate `hasMore`
  field that duplicates `pagination.hasNextPage`.
- Do not include selected entities outside `data` to work around pagination;
  fetch a selected value through its normal ref/detail endpoint when necessary.
- Apply `applySmartSearch` only to a compatible join-free builder as required by
  [[standard-list-query]].
- Document with `@ApiOkResponsePaginated(ProductSummaryDto)` and keep the Swagger
  item schema identical to the selected fields.

## Query only required columns

Use `.select([...])`, `addSelect`, or repository `select` for read endpoints.
Join only relations represented in the response DTO.

```ts
const qb = this.productRepository
  .createQueryBuilder('product')
  .leftJoin('product.brand', 'brand')
  .select([
    'product.barcode',
    'product.name',
    'product.remaining',
    'brand.id',
    'brand.name',
  ]);
```

For raw projections or aggregates, alias every selected value and convert
database strings to the DTO's declared number/date type before returning.

Use `paginateQuery(qb, page, limit, map)` to map only the current page when an
entity projection still needs reshaping. Do not query an unbounded set and then
map it in memory.

## Contract semantics

- Use `null` when a field exists in the contract but has no value.
- Omit a field only when it is intentionally optional in that response variant.
- Return `[]`, not `null`, for an empty collection.
- Use stable field names based on the domain, not table aliases or ORM internals.
- Represent dates consistently with the project's existing ISO serialization.
- Avoid duplicated representations such as returning both `brandId` and a full
  `brand` object unless the consumer demonstrably needs both.
- Do not add fields "just in case." Add them when a consumer requirement exists.

## DTO placement and reuse

Follow [[standard-type-sharing]] and [[standard-naming-conventions]]:

- Keep feature-specific response DTOs under `src/modules/<feature>/dto/`.
- Share a DTO only when the exact same semantic contract is used across modules.
- Reuse a small named reference DTO when multiple responses need the same
  identifier/label pair.
- Do not reuse create/update request DTOs as response DTOs; their semantics differ.

## Compatibility

Removing, renaming, changing the type of, or changing the nullability of a
response field is a breaking contract change. Before doing so:

1. Search backend tests, Swagger decorators, and frontend consumers when present.
2. Prefer an additive migration when clients cannot change atomically.
3. Use a new API version when the change cannot remain backward compatible.
4. Update response tests to assert the exact public keys and absence of secrets.

## Review checklist

- [ ] Response uses a named DTO for its actual use case.
- [ ] Query selects only fields present in that DTO.
- [ ] Relations are projected to minimal reference shapes.
- [ ] Dropdown/infinite-scroll responses are bounded, paginated, deterministically
      ordered, and expose `hasNextPage`.
- [ ] No entity, hash, token, stack, raw DB detail, or internal field can leak.
- [ ] `null`, optional fields, arrays, dates, and numeric aggregates are consistent.
- [ ] Swagger, return type, tests, and runtime data describe the same shape.
- [ ] Contract-breaking changes are versioned or coordinated.

## Related

- [[standard-api-responses]] — global success/error envelope.
- [[standard-list-query]] — pagination and page-level mapping.
- [[standard-performance]] — selective loading and bounded queries.
- [[standard-type-sharing]] — DTO ownership and reuse.
- [[standard-api-debuggability]] — safe diagnostic fields and error correlation.
