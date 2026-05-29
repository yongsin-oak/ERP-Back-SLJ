---
name: route-employee
description: Developer guide for the employee module — company staff used as order recordBy, with a PIN (pinHash, select:false) for the terminal actor flow and an isActive flag. Use when editing or extending anything under src/modules/employee.
---

# Employee Module

Company staff records. Used as `recordBy` on orders and as the **actor** in the
terminal PIN flow (see [[route-auth]]). PIN is stored hashed and never selected
by default.

## Files

```
src/modules/employee/
├── employee.module.ts
├── employee.controller.ts          # @Controller({ path: 'employee', version: '1' })
├── employee.service.ts
├── entities/employee.entity.ts
└── dto/
    ├── create-employee.dto.ts       # EmployeeCreateDto
    ├── update-emplote.dto.ts        # EmployeeUpdateDto  ⚠ filename typo: "emplote" (see [[standard-naming-conventions]])
    ├── get-employee.dto.ts          # EmployeeGetDto (page, limit, search, department, isActive)
    ├── response-employee.dto.ts     # EmployeeResponseDto
    ├── set-pin.dto.ts               # SetPinDto { pin }
    └── bulk-delete-employee.dto.ts  # BulkDeleteEmployeeDto { ids: string[] }
```

## Entity: `Employee`

| Field | Type | Notes |
|---|---|---|
| `id` | string | **PK** `EMP-{random}` (`@BeforeInsert`, `withDateTime:false`) |
| `firstName` / `lastName` / `nickname` | string | required |
| `phoneNumber` | string? | nullable |
| `startDate` | Date? | nullable |
| `department` | `Role` | reuses the `Role` enum (see [[standard-constants-no-hardcode]]) |
| `pinHash` | string? | **`select: false`** — bcrypt hash of the PIN; never returned |
| `isActive` | boolean | default `true` |
| `createdAt` / `updatedAt` | Date | auto |

> `department` is typed as `Role` — an employee's "department" is one of the
> shared role values. The DTO validates it with `@IsEnum(Role)`.

## Endpoints (all under `/api/v1/employee`)

| Method | Path | Roles | Body / Query |
|---|---|---|---|
| POST | `/` | SuperAdmin | `EmployeeCreateDto` |
| GET | `/` | `*` | `EmployeeGetDto` → paginated |
| GET | `/:id` | `*` | |
| PATCH | `/:id` | SuperAdmin | `EmployeeUpdateDto` |
| PATCH | `/:id/pin` | SuperAdmin | `SetPinDto` → returns `null` (`ok(null)`) |
| DELETE | `/bulk` | SuperAdmin | `BulkDeleteEmployeeDto` → `{ deleted: string[], errors: string[] }` |
| DELETE | `/:id` | SuperAdmin | |

> **Route order:** `DELETE /bulk` is declared **before** `DELETE /:id` so `bulk`
> isn't captured as an `:id`. Keep new literal routes above `:id`.

Controller is `@NoCache()`, guarded by `JwtAuthGuard, RolesGuard`.

## Service logic & rules

- `findAll`: QueryBuilder, `ILIKE` over firstName/lastName/nickname, optional
  `department`/`isActive` filters, `paginatedResponse`.
- `create`: duplicate guard via `throwIfEntityExists` on the
  **(firstName, lastName)** pair (not a unique DB column) → `Conflict` if a
  matching name already exists.
- `update`: ensure exists, `repo.update(id, data)`, return fresh `findOne`.
- `remove` / `bulkDelete`: hard delete. `bulkDelete` collects per-id
  `not found` errors and returns `{ deleted, errors }`.
- `setPin`: `bcrypt.hash(pin, 10)` → saves `pinHash`. (Salt rounds `10` is a
  repeated magic number across the repo — see [[standard-constants-no-hardcode]].)

## Conventions & gotchas

- `pinHash` is `select:false`; to verify a PIN you must explicitly select it
  (the actor flow does this in auth — see [[route-auth]]).
- Duplicate detection is by name pair, so two people with the same first+last
  name are rejected — intentional today; revisit if that's too strict.
- The service field is named `employerService` (typo for `employeeService`) and
  the update DTO file is `update-emplote.dto.ts` — documented in
  [[standard-naming-conventions]]; don't copy the typos into new code.

## Related

- [[route-auth]] (PIN→actor flow) · [[route-order]] (recordBy) ·
  [[standard-constants-no-hardcode]] · [[standard-shared-helpers]] ·
  [[standard-project-structure]].
