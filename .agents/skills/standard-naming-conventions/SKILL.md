---
name: standard-naming-conventions
description: File, class, DTO, and identifier naming conventions for this NestJS repo, plus the known existing typos to avoid copying. TRIGGER when creating/renaming a file, class, DTO, variable, or property; before duplicating an existing file as a template; or when a name reads inconsistently.
---

# Naming Conventions

Consistent names make the codebase searchable and the contract predictable.
Match these patterns; do not propagate the known typos below.

## Files (kebab-case, role suffix)

```
<feature>.module.ts | <feature>.controller.ts | <feature>.service.ts
entities/<entity>.entity.ts        (+ <entity>.interface.ts for value objects)
dto/create-<feature>.dto.ts
dto/update-<feature>.dto.ts
dto/get-<feature>.dto.ts
dto/response.dto.ts  (or response-<feature>.dto.ts)
<thing>.spec.ts  beside the code; *.e2e-spec.ts in test/
```
- kebab-case for files and folders; one entity per file.
- Enum files: `<name>.enum.ts` (e.g. `role.enum.ts`, `platform.enum.ts`).

## Classes & types (PascalCase)

- Entity: `Product`, `OrderDetail`, `ProductShopPrice`.
- DTOs: `<Feature><Verb>Dto` or `<Verb><Feature>Dto` — pick one per module and be
  consistent. Existing styles in the repo: `ProductCreateDto` and
  `EmployeeCreateDto` (Feature+Verb) vs `BulkDeleteEmployeeDto` (Verb+Feature).
  **Prefer `<Feature><Verb>Dto`** for new DTOs to match the dominant style.
- Enums: PascalCase name, PascalCase members (`Role.SuperAdmin`, `Platform.Shopee`).
- Service/Controller/Module: `XService`, `XController`, `XModule`.

## Identifiers

- Properties/variables: camelCase. Booleans read as predicates (`isActive`).
- Foreign keys: `<relation>Id` / `<relation>Barcode` (`brandId`, `productBarcode`,
  `recordByEmployeeId`).
- Injected service field = the service it holds: `productService`, not a typo'd
  alias.
- ID prefixes: see [[standard-constants-no-hardcode]] and the README ID table.

## Known existing inconsistencies — do NOT copy

These exist today; leave them unless you're deliberately fixing them (a rename is
a small, reviewable change — see impact note):

- `src/modules/employee/dto/update-emplote.dto.ts` — **typo** ("emplote").
  Should be `update-employee.dto.ts`. Class inside is `EmployeeUpdateDto` (fine).
- `src/modules/employee/employee.controller.ts` — constructor field
  `employerService` (should be `employeeService`).
- `src/modules/shop/dto/update-product.dto.ts` — **misnamed**: it's the shop
  update DTO living under a product-named file. Should be `update-shop.dto.ts`.
- `supplier` `UpdateSupplierDto` is declared **inline** in `supplier.service.ts`
  rather than in its own `dto/update-supplier.dto.ts`.

> **Impact of fixing these:** renaming a file/identifier changes imports across
> the module (and the symbol name). It's low-risk but touches several lines and
> should be done as its own commit, with a build + test run afterward. Flag it;
> don't bundle silently into an unrelated change.

## Conventions & gotchas

- When you copy an existing file as a template, **rename every identifier** to the
  new feature — don't leave the source feature's names behind.
- New code must be typo-free even when adjacent legacy code isn't; consistency
  with the *intended* convention beats consistency with a local mistake.
- Keep DTO class names aligned with their file (`update-shop.dto.ts` →
  `ShopUpdateDto`).

## Related

- [[standard-project-structure]] (layout) · [[standard-constants-no-hardcode]]
  (enum/ID naming) · [[standard-api-responses]] (DTO message wording).
