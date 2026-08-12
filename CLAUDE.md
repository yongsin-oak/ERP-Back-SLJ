# CLAUDE.md

Operating rules for any AI agent working in this repository.
**Write all output (code, comments, docs, summaries) in English.**

---

## 1. Never guess, never fabricate

- Do **not** invent APIs, fields, file paths, env vars, routes, or behavior.
- If you are not sure how something works, **find out first**: read the source,
  grep the repo, check `.claude/README.md` and `.claude/skills/`, run the code.
- Only after researching and still being blocked, **ask the user a smart,
  specific question** — one that shows you already looked and names the exact
  ambiguity and the options. Never ask a question whose answer is in the code.
- If you state a fact, you must be able to point to where you read it.

## 2. Plan before you act

Before changing code, state a short plan that covers:

- **What** you intend to do and **why**.
- **Impact**: what behavior/contract changes, what could break, migrations,
  response-shape changes, auth/role changes, breaking changes for frontend.
- **Files to edit**: list the concrete files (and roughly which areas).

For anything non-trivial, get the plan acknowledged before editing. For small,
obvious changes, a one-line plan inline is enough — but still state impact.

## 3. Follow existing conventions

This is a NestJS + TypeORM + PostgreSQL backend (Bun runtime, JWT-in-cookie).
The source of truth for architecture is **`.claude/README.md`** — read it.
Skills live one level under `.claude/skills/` (nesting is not discovered):

- **`route-<module>`** — per-module/endpoint developer guides (e.g. `route-product`).
- **`standard-<topic>`** — cross-cutting standards (`standard-api-responses`,
  `standard-constants-no-hardcode`, `standard-database-transactions`,
  `standard-performance`, `standard-project-structure`, `standard-shared-helpers`,
  `standard-testing`, `standard-naming-conventions`).
The frontend API contract is exposed via **Swagger** at `/swagger` (auto-generated from controllers + DTOs).

Hard rules (see `.claude/README.md` for detail):

- Every controller uses `@Controller({ path, version: '1' })` → `/api/v1/...`.
- Wrap controller returns in `ok(...)`; lists use `paginatedResponse(...)`.
- **Dropdowns get their own route and their own pagination contract.** A picker
  never shares the table's list endpoint. Give it `@Get('dropdown-search')`
  — **declared above `@Get(':id')`**, or Nest routes it to the param handler —
  taking `DropdownQueryDto` (`cursor`/`limit`/`search`, max 50) and returning
  `DropdownResponseDto<T>` (`{ data, nextCursor }`) built by
  `cursorPaginateQuery`, projected down to what the option needs.
  Offset (`page`/`limit`/`total`) stays on table lists only: it skips and repeats
  rows when data shifts mid-scroll, and its `COUNT(*)` is work no dropdown reads.
  Keyset ordering must match the cursor key, so pair it with `applySmartMatch`,
  never `applySmartSearch` (that one sets a relevance ORDER BY). Every new
  dropdown needs its `(sortColumn, id)` index in `db/performance-indexes.sql`.
- **A new list envelope needs a branch in `TransformResponseInterceptor`.** It
  hoists `data` to the top level only for shapes it recognises (`pagination`,
  `nextCursor`); anything else is wrapped whole and arrives one level deeper.
  That mismatch type-checks on both sides and only fails at runtime, so add the
  branch *and* a case in `transform-response.interceptor.spec.ts`.
- Throw via the helpers in `@app/common/helpers/response`
  (`notFound`, `conflict`, `badRequest`, ...). Do not throw raw `HttpException`
  unless there is no helper for it.
- Use `getCookieOptions()` for cookies — never hardcode cookie options.
- Use `generateIdWithPrefix` for IDs; match the existing per-table ID format.
- Path aliases: `@app/*` → `src/*`, `@db/*` → `db/*`. No `baseUrl`.
- Comments explain **WHY**, never **WHAT**. Match surrounding code style.

## 4. Be careful with risky actions

- TypeORM runs with `synchronize: true` in dev — entity changes alter the DB
  schema automatically. Flag any entity change and its schema impact explicitly.
- Do not run destructive DB/seed commands without explicit user confirmation.
- Do not commit, push, or open PRs unless the user asks.
- Auth bypass (`NODE_ENV=development` + `BYPASS_AUTH=true`) is dev-only — never
  weaken auth to make something "work".

## 5. Summarize after every task (in English)

When work is done, report:

- **What changed** — concise list of the changes made.
- **Where** — each file with the **line numbers / ranges** touched.
- **Effect** — what this changes at runtime / in the API contract / for callers.
- **Next for the user** — what they must review, test, migrate, or decide.
- **Watch out** — risks, assumptions made, anything left incomplete or skipped.

Report outcomes faithfully: if tests fail, say so and show output; if a step was
skipped, say it. State "done and verified" only when you actually verified it.

---

## Quick reference

```bash
bun install
bun run start:dev      # API: http://localhost:5050/api/v1  | Swagger: /swagger
bun run build          # nest build
bun run lint           # eslint --fix
bun run test           # jest
```

- Architecture & domain model: `.claude/README.md`
- Module dev guides: `.claude/skills/route-<module>/SKILL.md`
- Engineering standards: `.claude/skills/standard-<topic>/SKILL.md`
- Frontend API contract: Swagger at `/swagger` (auto-generated)
- Deploy / Docker: `DEPLOY.md`, `.claude/skills/docker/SKILL.md`
