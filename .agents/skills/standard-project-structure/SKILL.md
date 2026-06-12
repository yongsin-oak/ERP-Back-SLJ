---
name: standard-project-structure
description: Folder structure and the standard NestJS feature-module layout for this repo, plus the exact recipe for adding a new module. TRIGGER when creating a new module/feature, adding a controller/service/entity/DTO, deciding where a file belongs, wiring something into AppModule, or asking "where does X go?".
---

# Project Structure

NestJS 11 + TypeORM + PostgreSQL, Bun runtime. Source of truth for architecture
is [.claude/README.md](../../README.md). This skill is about **where code lives
and how to add a feature module** consistently.

## Top-level layout

```
src/
├── main.ts                 # bootstrap: global prefix 'api', URI versioning, ValidationPipe, cookieParser, CORS, Swagger, pino logger (bufferLogs)
├── app.module.ts           # feature modules + APP_INTERCEPTOR (TransformResponseInterceptor) + APP_FILTER (AllExceptionsFilter) + LoggerModule (nestjs-pino)
├── app.controller.ts / app.service.ts
├── auth/                   # authentication (not under modules/) — see [[route-auth]]
├── common/                 # cross-cutting building blocks (see [[standard-shared-helpers]])
│   ├── decorator/          # @ResponseMessage, @NoCache/@CacheFor*, @ApiOkResponsePaginated
│   ├── dto/                # api-response.dto.ts, paginated.dto.ts
│   ├── filters/            # all-exceptions.filter.ts (global)
│   ├── helpers/            # response.ts, entity.helper.ts, generateIdWithPrefix.helper.ts, encryption.helper.ts
│   └── interceptors/       # transform-response, cache-control
│                           # (no middleware/ — request id + logging come from nestjs-pino in AppModule)
├── modules/<feature>/      # one folder per domain feature
└── seed/                   # seed scripts
db/                         # data-source.ts and DB config (alias @db/*)
```

Path aliases: `@app/*` → `src/*`, `@db/*` → `db/*`. **No `baseUrl`** (TS 6.0) —
use explicit paths in `tsconfig.json`. Aliases resolve at runtime via
`module-alias` (`_moduleAliases` in `package.json`, registered in `main.ts`).

## Standard feature-module layout

Every module under `src/modules/<feature>/` follows this shape (see [[route-product]]
for a full worked example):

```
modules/<feature>/
├── <feature>.module.ts        # @Module — TypeOrmModule.forFeature([...]), controller, service, exports
├── <feature>.controller.ts    # @Controller({ path: '<feature>', version: '1' })
├── <feature>.service.ts        # @Injectable — all business logic + DB access
├── entities/
│   └── <feature>.entity.ts    # @Entity — columns, relations, ID via @BeforeInsert
└── dto/
    ├── create-<feature>.dto.ts
    ├── update-<feature>.dto.ts
    ├── get-<feature>.dto.ts    # extends pagination + filters
    └── response.dto.ts         # Swagger response shape
```

Keep one entity per file under `entities/`. Value objects / interfaces used by an
entity live alongside it (e.g. `product.interface.ts`).

## Layering rules

- **Controller**: routing, guards, roles, Swagger decorators, DTO binding. Thin —
  delegate to the service and wrap the result in `ok(...)`. No DB access here.
- **Service**: all business logic and repository calls. Throws via the
  `@app/common/helpers/response` helpers. Returns plain entities/DTOs.
- **Entity**: schema + relations only. ID generation via `@BeforeInsert` +
  `generateIdWithPrefix`. No business logic.
- **DTO**: validation (`class-validator`) + transform (`class-transformer`) +
  Swagger (`@ApiProperty`). The global `ValidationPipe` runs with
  `whitelist: true, forbidNonWhitelisted: true` — **unknown body fields are
  rejected**, so every accepted field must be a decorated DTO property.

## Recipe: add a new feature module

1. `src/modules/<feature>/` with the layout above.
2. Entity: `@Entity()`, columns with `@ApiProperty`, relations, and an
   `@BeforeInsert` ID hook using `generateIdWithPrefix({ prefix: '<XXX>' })`
   (pick a new unique prefix; record it in [.claude/README.md](../../README.md)
   "ID Formats"). See [[standard-constants-no-hardcode]] for enum columns.
3. DTOs: create/update/get(+pagination). Reuse `PaginatedGetAllDto` from
   `@app/common/dto/paginated.dto` for list endpoints.
4. Service: inject the repo with `@InjectRepository`. Use
   `getEntityOrNotFound` / `throwIfEntityExists` and `paginatedResponse` from
   [[standard-shared-helpers]]. Never reinvent these.
5. Controller: `@Controller({ path: '<feature>', version: '1' })`,
   `@UseGuards(JwtAuthGuard, RolesGuard)`, `@NoCache()` for dynamic data,
   `@Roles('*')` on reads / `@Roles(Role.SuperAdmin)` on writes (match the
   module's policy), `@ApiTags`, `@ApiBearerAuth`. Wrap returns in `ok(...)`.
   Declare literal routes (`bulk`, `tree`, ...) **before** `:param` routes.
6. Module: `TypeOrmModule.forFeature([<entities>])`, declare controller +
   service, `exports: [<Service>]` if another module needs it.
7. Register the module in `imports` of [src/app.module.ts](../../../src/app.module.ts).
8. Update the contract doc `.claude/skills/api/<feature>.md` and the route
   summary in [.claude/README.md](../../README.md).

## Global wiring (already done — don't duplicate)

- `setGlobalPrefix('api')` + URI versioning → every route is `/api/v1/...`.
- `TransformResponseInterceptor` is registered globally via `APP_INTERCEPTOR`;
  it wraps every non-raw response. Do **not** wrap responses manually.
- `AllExceptionsFilter` is the global filter, registered via `APP_FILTER`
  (HttpException + PG error mapping; logs 5xx with stack via the request logger).
- Request logging + request id come from **`nestjs-pino`** (`LoggerModule.forRoot`
  in AppModule); `genReqId` sets the `X-Request-ID` header. No custom logging
  middleware exists. See [[standard-logging]].
- `ValidationPipe` is global with whitelist — DTOs are mandatory.

## Conventions & gotchas

- Comments explain **WHY**, not WHAT. Match surrounding style.
- A module that emits audit events imports `AuditLogModule` and injects
  `AuditLogService` (see [[route-audit-log]]).
- Adding/altering an entity changes the dev DB schema (`synchronize: true`).
  Flag schema impact; don't rely on it for production migrations.

## Related

- [[standard-shared-helpers]] — the central functions to reuse, not rewrite.
- [[standard-constants-no-hardcode]] — enums, env, no magic values.
- [[standard-performance]] — query/pagination patterns.
- [[route-product]] — reference module implementation.
