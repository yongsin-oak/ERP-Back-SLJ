---
name: standard-list-query
description: The shared helpers for paginated list/search endpoints — paginateQuery, applyKeywordSearch (smart multi-token), applyDateRange — and the canonical findAll shape every module follows. TRIGGER when writing or editing a findAll/list/search/dropdown endpoint, adding a filter, building a paginated response, or implementing search.
---

# List query helpers (`src/common/helpers/query.helper.ts`)

Every list endpoint shares one shape: build a QueryBuilder, apply filters, return
the standard paginated envelope. The boilerplate lives in three composable helpers
([query.helper.ts](../../../src/common/helpers/query.helper.ts)) — use them instead
of hand-writing `skip/take/getManyAndCount` + `paginatedResponse` in every service.

## The helpers

### `paginateQuery(qb, page, limit, map?)`

Applies `skip`/`take`, runs `getManyAndCount`, and wraps the rows in the standard
paginated envelope (`{ data, pagination }` — see [[standard-shared-helpers]]). Pass
`map` to reshape each row into a response DTO (runs over the current page only).

```ts
return paginateQuery(qb, page, limit);
// with a mapper (flatten a relation into an id):
return paginateQuery(qb, page, limit, ({ parent, ...rest }) => ({ ...rest, parentId: parent?.id ?? null }));
```

Do **not** pre-apply `.skip()/.take()` on the builder — `paginateQuery` owns that.

### `applyKeywordSearch(qb, columns, term?)`

Smart multi-token search. Splits `term` on whitespace; **every token must match
(AND)**, each token matching **any column (OR)**. Case-insensitive (`ILIKE`).
No-ops when `term` is empty. `columns` are aliased refs.

```ts
applyKeywordSearch(qb, ['p.name', 'p.barcode'], search);
// "abc 123" → (name|barcode contains "abc") AND (name|barcode contains "123")
```

This is the standard for all search — don't hand-roll a single `ILIKE :q`. For a
relevance-ordered dropdown, add the `CASE WHEN ... ORDER BY` after it (see
`product.dropdownSearch`).

### `applyDateRange(qb, column, from?, to?)`

Inclusive `[from, to]` filter on a timestamp column. No-ops per absent bound.

```ts
applyDateRange(qb, 'o.startRecordAt', dateFrom, dateTo);
```

### `applySmartSearch(qb, columns, term, { fuzzy?, threshold? })`

Relevance-ranked search for **typeahead/search** endpoints (not grids). Sets both
the WHERE and the ORDER BY: multi-token substring match, ranked exact → prefix →
substring, then optionally **pg_trgm fuzzy** (typo tolerance) when `fuzzy: true`.
Rank-only, so it still composes with `paginateQuery`. Apply **only to join-free
builders** — `ORDER BY similarity()` + `getManyAndCount` clashes with the implicit
DISTINCT that to-many joins add. Used by `product.dropdownSearch`.

```ts
applySmartSearch(qb, ['p.barcode', 'p.name'], dto.search, { fuzzy: this.trigramEnabled });
```

`fuzzy` requires the `pg_trgm` extension — the caller passes a cached check
(see `ProductService.onModuleInit`); when it's absent the helper degrades to
substring matching (**never 500s**). It uses an explicit `similarity() >= threshold`
(deterministic) rather than the `%` operator (which depends on the session-global
threshold GUC). The `pg_trgm` extension ships in the DB image
(`Dockerfile.db` + `db/init-scripts/`), so prod already has it; the app also
auto-provisions the extension + the GIN trigram index in dev. The GIN index is an
optional prod perf step (see DEPLOY.md).

## Canonical findAll

```ts
async findAll(query: XxxGetDto): Promise<PaginatedResponseDto<Xxx>> {
  const { page, limit, search, status, dateFrom, dateTo } = query;
  const qb = this.repo.createQueryBuilder('x').orderBy('x.name', 'ASC');
  applyKeywordSearch(qb, ['x.name'], search);
  if (status) qb.andWhere('x.status = :status', { status });
  applyDateRange(qb, 'x.createdAt', dateFrom, dateTo);
  return paginateQuery(qb, page, limit);
}
```

`exportAll` shares the **same** filter block (no pagination, just `getMany()`) —
reuse the helpers there too, don't copy-paste a second filter chain.

## Query DTOs

- **Required page/limit** list → extend `PaginatedGetAllDto` ([[standard-shared-helpers]]).
- **Optional page/limit** (admin lists that fetch one big page) → extend
  `PaginatedListQueryDto` (page/limit optional, defaulted in the service, `limit` max 200,
  built-in `search`; e.g. `GetTerminalDto`, `GetUserDto`).
- **Lite dropdown** → extend `DropdownQueryDto` and `.select([...])` only the UI
  fields (see `product.dropdownSearch`).

## Rules

- **Never** return an unbounded `find()` — every list is paginated. [[standard-performance]]
- Index the columns you filter/sort/join on; the helper can't. [[standard-performance]]
- `ILIKE '%term%'` can't use a B-tree index — fine at current volume; revisit with
  `pg_trgm`/full-text at scale.
- Keep secret columns `select: false`; if you `map`, strip them defensively too.

## Related

- [[standard-shared-helpers]] · [[standard-performance]] · [[standard-project-structure]].
