---
name: standard-testing
description: How to write Jest unit/e2e tests for this NestJS repo — mocking TypeORM repositories, testing services and controllers, and the current state of the test suite. TRIGGER when adding or fixing a *.spec.ts, writing tests for a service/controller, mocking a repository, or setting up an e2e test.
---

# Testing Standard

Stack: **Jest** + `@nestjs/testing`. Unit specs live next to the code
(`*.spec.ts`); e2e specs live in `test/` (`*.e2e-spec.ts`, `test/jest-e2e.json`).

```bash
bun run test         # all unit specs
bun run test:watch
bun run test:cov     # coverage
bun run test:e2e
```

## Current state (important)

The existing `*.spec.ts` files (brand, shop, order, category, employee,
order-detail, auth) are **scaffold stubs** — most do
`Test.createTestingModule({ providers: [SomeService] })` with **no repository
mock**, so they only assert `toBeDefined()` and would fail (or are meaningless)
for a service that injects a repo. Treat them as TODO placeholders: when you
touch a module, upgrade its spec to the real pattern below rather than copying
the stub.

## Service unit test — mock the repository

A service injects repos via `@InjectRepository(Entity)`. Provide a mock under the
token `getRepositoryToken(Entity)`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductService } from './product.service';

const repoMock = () => ({
  find: jest.fn(), findOne: jest.fn(), create: jest.fn(),
  save: jest.fn(), update: jest.fn(), remove: jest.fn(), delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ProductService', () => {
  let service: ProductService;
  let repo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useFactory: repoMock },
        // add a mock for EVERY repo the service injects (Brand, Category, ...)
      ],
    }).compile();
    service = module.get(ProductService);
    repo = module.get(getRepositoryToken(Product));
  });

  it('throws 404 when missing', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('x')).rejects.toThrow('not found');
  });
});
```

- Mock **all** injected repos (product injects Product + Brand + Category +
  ProductShopPrice — see [[route-product]]).
- For QueryBuilder paths, return a chainable stub:
  `{ leftJoinAndSelect: () => qb, andWhere: () => qb, skip: () => qb,
  take: () => qb, getManyAndCount: async () => [[], 0] }`.
- Assert behavior, not implementation: thrown helper (status), returned shape,
  and that the right repo calls happened.

## What to cover per service

- Happy path returns the expected entity/shape.
- `notFound` / `conflict` branches (the `getEntityOrNotFound` /
  `throwIfEntityExists` paths) — see [[standard-shared-helpers]].
- Pagination returns `paginatedResponse` shape.
- Bulk ops: partial-failure `{ deleted, errors }` behavior.
- Transactional services: assert rollback on a mid-operation throw
  (see [[standard-database-transactions]]).

## Controller test

Provide a mock service (`{ provide: XService, useValue: { method: jest.fn() } }`)
and assert the controller delegates and wraps with `ok(...)`. Guards are usually
not exercised in unit tests; cover auth in e2e.

## E2e test

Boot the app from `AppModule`, apply the same global pipes/filters as `main.ts`
(`ValidationPipe` whitelist, `AllExceptionsFilter`, global prefix + versioning)
so responses match production, and hit `/api/v1/...`. Use a disposable DB/schema.

## Conventions & gotchas

- Name specs `<thing>.spec.ts` beside the code; e2e in `test/`.
- Don't hit the real DB in unit tests — mock repos.
- Keep fixtures consistent with real enums/ID formats
  (see [[standard-constants-no-hardcode]]).
- New behavior → add/adjust a spec in the same change.

## Related

- [[standard-project-structure]] · [[standard-shared-helpers]] ·
  [[standard-api-responses]] · [[standard-database-transactions]].
