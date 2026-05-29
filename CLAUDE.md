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
The frontend API contract is in **`/API.md`** + **`docs/frontend/`**.

Hard rules (see `.claude/README.md` for detail):

- Every controller uses `@Controller({ path, version: '1' })` → `/api/v1/...`.
- Wrap controller returns in `ok(...)`; lists use `paginatedResponse(...)`.
- Throw via the helpers in `@app/common/helpers/response`
  (`notFound`, `conflict`, `badRequest`, ...). Do not throw raw `HttpException`
  unless there is no helper for it.
- Use `getCookieOptions()` for cookies — never hardcode cookie options.
- Use `generateIdWithPrefix` for IDs; match the existing per-table ID format.
- Path aliases: `@app/*` → `src/*`, `@db/*` → `db/*`. No `baseUrl`.
- Comments explain **WHY**, never **WHAT**. Match surrounding code style.
- Keep `API.md` / the relevant `.claude/skills/api/*.md` in sync when you change
  any endpoint, response shape, enum, or ID format.

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
- Frontend API contract: `/API.md`, `docs/frontend/*.md`, `.claude/skills/api/*.md`
- Deploy / Docker: `DEPLOY.md`, `.claude/skills/docker/SKILL.md`
