# Architecture Design — ACME Salary Management

**Date:** 2026-06-06
**Status:** Approved

---

## 1. System Overview

A monorepo containing a React frontend and a Node.js/Express backend. The frontend communicates with the backend exclusively via a REST API. Both live in a single Docker container for deployment — the React app is built as static files and served by Express.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   React App (Vite)                  │    │
│  │                                                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │  pages/  │  │components│  │    hooks/         │  │    │
│  │  │          │  │          │  │  (React Query)    │  │    │
│  │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │    │
│  │       └─────────────┴─────────────────┘             │    │
│  │                          │                          │    │
│  │                      api/ layer                     │    │
│  │                    (fetch calls)                    │    │
│  └──────────────────────────┬──────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP/REST JSON
┌─────────────────────────────┼───────────────────────────────┐
│                      DOCKER CONTAINER                       │
│                                                             │
│  ┌──────────────────────────▼──────────────────────────┐   │
│  │                  Express Server                     │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              routes/                        │   │   │
│  │  │   Map HTTP method + path → controller       │   │   │
│  │  └───────────────────┬─────────────────────────┘   │   │
│  │                      │                              │   │
│  │  ┌───────────────────▼─────────────────────────┐   │   │
│  │  │              controllers/                   │   │   │
│  │  │   Parse request → call service → respond    │   │   │
│  │  └───────────────────┬─────────────────────────┘   │   │
│  │                      │ DI: service injected          │   │
│  │  ┌───────────────────▼─────────────────────────┐   │   │
│  │  │              services/                      │   │   │
│  │  │   Business logic, validation, orchestration │   │   │
│  │  └───────────────────┬─────────────────────────┘   │   │
│  │                      │ DI: repository injected       │   │
│  │  ┌───────────────────▼─────────────────────────┐   │   │
│  │  │             repositories/                   │   │   │
│  │  │        Knex queries, nothing else           │   │   │
│  │  └───────────────────┬─────────────────────────┘   │   │
│  │                      │                              │   │
│  │  ┌───────────────────▼─────────────────────────┐   │   │
│  │  │              SQLite (file)                  │   │   │
│  │  │         salary_management.db                │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
salary-management/
├── client/                  # React frontend
├── server/                  # Node.js backend
├── docs/                    # PRD, architecture doc
├── Dockerfile               # Single-container production build
├── .dockerignore
├── requirement.md
├── CLAUDE.md
└── README.md
```

`client/` and `server/` are independent — each has its own `package.json`, `node_modules`, and test suite. They share nothing except the HTTP contract.

**Docker (production):** The Dockerfile builds the React app, copies the output into `server/public/`, and Express serves it as static files. One container, one port. Local development uses `npm run dev` in each directory independently — no docker-compose.

---

## 3. Backend Architecture

### Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Framework | Express.js | Minimal, explicit, no magic |
| Language | TypeScript | Type-safe layer contracts, compiler-enforced DI |
| Database | SQLite via Knex.js | File-based, zero infrastructure; Knex provides query builder and migrations |
| Test runner | Jest + ts-jest | Standard, fast, works with TypeScript |
| HTTP testing | Supertest | Real HTTP calls against Express app without starting a server |

### Folder structure

```
server/
├── src/
│   ├── routes/              # HTTP routing — map method + path to controller
│   ├── controllers/         # HTTP handlers — parse request, call service, send response
│   ├── services/            # Business logic — validation, rules, orchestration
│   ├── repositories/        # Data layer — all Knex queries, nothing else
│   ├── types/               # Shared TypeScript interfaces
│   ├── db/
│   │   ├── migrations/      # Schema versioning
│   │   └── seeds/           # 10,000 employee seed script
│   ├── middleware/          # Centralised error handling
│   └── app.ts               # Express app setup (no server.listen)
├── tests/
│   ├── routes/
│   ├── services/
│   └── repositories/
├── server.ts                # Entry point — calls listen()
├── tsconfig.json
└── package.json
```

### Error handling

| Concern | Behaviour |
|---|---|
| Known errors (400/404/409) | Routes call `next(err)`; `errorHandler` returns `{ error: message }` with the correct status |
| Unknown errors (500) | `errorHandler` returns `{ error: 'internal server error' }` and **logs the full `Error` object** (stack included) via `console.error(err)` |
| Non-numeric `:id` params | Controllers return 400 `{ error: 'id must be a number' }` before calling the service |
| Repository post-write safety | `create` and `update` throw `Error` if `findById` returns null after the write, rather than silently returning a typed null |

### Four-layer architecture with dependency injection

Each layer has one responsibility. Dependencies flow inward — routes depend on controllers, controllers depend on services, services depend on repositories. Nothing depends outward.

```
Route → Controller → Service → Repository → SQLite
```

Controllers, services, and repositories are all TypeScript classes. Dependency injection is manual — no framework. Each class receives its dependency via the constructor. In tests, a fake is injected at the seam being tested. TypeScript interfaces enforce that fakes cannot silently drift from the real implementation.

Controller methods are regular `async` methods. Routes call them explicitly as method invocations (`wrap((req, res, next) => ctrl.list(req, res, next))`), which preserves `this` without constructor binding or arrow function class fields.

**`app.ts` vs `server.ts` split** — `app.ts` exports the Express app without calling `listen()`. Tests import `app.ts` directly — no port conflicts, no real server needed.

### Global search behaviour

Search queries match against: `id`, `name`, `email`, `role`, `department`, `country`. Salary is explicitly excluded. The repository is the single place this logic lives.

### Insights API

Two endpoints served by the insights layer:

| Endpoint | Response |
|---|---|
| `GET /api/insights/countries` | `string[]` — distinct countries with employees, sorted A-Z |
| `GET /api/insights?country=X` | `InsightsDto` — full salary insights for that country |

`InsightsDto` shape:

```typescript
{
  headcount: number;
  genderBreakdown: { Male: number; Female: number; Other: number };
  employmentTypeBreakdown: { 'Full-time': number; Contractor: number };
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  totalPayroll: number;
  departmentBreakdown: { department: string; headcount: number; avgSalary: number }[];
}
```

`InsightsRepository` runs four queries in parallel via `Promise.all` — gender counts, employment type counts, salary aggregates (avg/min/max/sum), and department breakdown sorted by headcount descending. Salary values are `Math.round`-ed at the repository level. `InsightsService` validates that `country` is non-empty before delegating.

---

## 4. Frontend Architecture

> **UX Design System:** See [`docs/ux-design.md`](ux-design.md) for the complete frontend design system — color tokens, typography, layout shell, component patterns, routing, and interaction rules. All frontend work must follow that document.

### Tech choices

| Concern | Choice | Reason |
|---|---|---|
| Build tool | Vite | Fast dev server, minimal config |
| Language | TypeScript | Consistent with backend, catches API contract mismatches |
| UI library | Ant Design v5 | Built for data-heavy enterprise tools; Table, Form, DatePicker, Modal, Upload all built-in |
| Server state | React Query | Handles fetch, cache, loading and error states |
| Local state | useState | Sufficient for UI-only state |
| Routing | React Router v6 | Standard client-side routing |

### Folder structure

```
client/
├── src/
│   ├── pages/               # One file per screen
│   ├── components/          # Reusable pieces shared across pages
│   ├── api/                 # Plain async fetch functions — one file per resource
│   ├── hooks/               # React Query wrappers — one hook per operation
│   ├── types/               # TypeScript interfaces (mirrors server types)
│   ├── App.tsx              # Router setup
│   └── main.tsx             # Entry point
├── tsconfig.json
└── package.json
```

### State management rules

| State type | Tool |
|---|---|
| Server data (employees, insights) | React Query |
| Form state | Ant Design Form |
| Local UI state (modal open/closed, selected country) | useState |

Pages never call `fetch` directly. All API calls go through `api/` functions, wrapped in `hooks/` with React Query.

---

## 5. Testing Strategy

Each layer tests exactly one thing. When a test fails, you know which layer broke immediately.

| Layer | Test type | Tool | What is injected |
|---|---|---|---|
| Repository | Integration | Jest + in-memory SQLite | Real Knex with `:memory:` database |
| Service | Unit | Jest | Fake repository object |
| Route | Integration | Jest + Supertest | Fake service object |
| React components | Unit | React Testing Library | Props / mocked hooks |

**Repository tests** use a real SQLite in-memory database — no mocking. Each test gets a fresh migrated database, proving queries actually work.

**Service tests** inject a fake repository object. Tests focus purely on business logic with no database involved.

**Route tests** use Supertest to make real HTTP calls against the Express app with a fake service injected. Tests cover status codes, request parsing, and response shape.

**What is not tested:** seed scripts, entry point files (`main.tsx`, `server.ts`), Ant Design component internals.

---

## 6. Coding Conventions & Naming Guidelines

### File naming

| Layer | Pattern | Example |
|---|---|---|
| Routes | `<resource>.ts` | `employees.ts` |
| Controllers | `<resource>Controller.ts` | `employeeController.ts` |
| Services | `<resource>Service.ts` | `employeeService.ts` |
| Repositories | `<resource>Repository.ts` | `employeeRepository.ts` |
| Types | `<resource>.ts` inside `types/` | `types/employee.ts` |
| Tests | `<subject>.test.ts` | `employeeService.test.ts` |
| React pages | `PascalCase.tsx` | `EmployeeList.tsx` |
| React components | `PascalCase.tsx` | `ConfirmDeleteModal.tsx` |
| React hooks | `use<What>.ts` | `useEmployees.ts` |

### Class naming — PascalCase, one class per file

| Layer | Class name | Example |
|---|---|---|
| Controllers | `<Resource>Controller` | `EmployeeController` |
| Services | `<Resource>Service` | `EmployeeService` |
| Repositories | `<Resource>Repository` | `EmployeeRepository` |

### Method naming — verb-first, describes what it does

| Layer | Examples |
|---|---|
| Controller | `list`, `get`, `create`, `update`, `remove`, `listCountries`, `getInsights` |
| Repository | `findPage`, `findById`, `findByEmail`, `create`, `update`, `deleteById`, `listCountries`, `getInsights` |
| Service | `listEmployees`, `getEmployee`, `createEmployee`, `updateEmployee`, `deleteEmployee`, `listCountries`, `getInsights` |
| React hooks | `useEmployees`, `useEmployee`, `useCountries`, `useInsights`, `useCreateEmployee`, `useDeleteEmployee` |

### General rules

- **Variables** — full words, no abbreviations (`employeeList` not `empList`, `totalHeadcount` not `cnt`)
- **TypeScript interfaces** — domain models use plain names (`Employee`), DI contracts use `I`-prefix (`IEmployeeRepository`), data transfer shapes use `Dto` suffix (`CreateEmployeeDto`)
- **Constants** — `SCREAMING_SNAKE_CASE` (`DEFAULT_PAGE_SIZE`, `EMPLOYMENT_TYPES`, `GENDER_OPTIONS`)
- **Error messages** — lowercase, plain English, actionable (`'employee not found'`, `'email already exists'`)
- **Comments** — only when the *why* is non-obvious. Never describe what the code does.
- **Class methods** — use regular `async` methods, not arrow function class fields. Bind in the constructor when methods are passed as callbacks.
- **Line breaks** — one blank line between each method body in a class for readability.

### Linting

Both `server/` and `client/` are configured with ESLint (`eslint.config.mjs`). Run with `npm run lint` in either directory.

**Enforced rules:**

| Rule | Applies to | Why |
|---|---|---|
| `no-var` | all files | `const`/`let` only |
| `prefer-const` | all files | avoids accidental reassignment |
| `@typescript-eslint/no-explicit-any` | src files | forces proper typing |
| `@typescript-eslint/no-unused-vars` | all files | dead code surfaced immediately; prefix `_` to intentionally ignore |
| `react-hooks/rules-of-hooks` | client src | prevents hook misuse |
| `react-hooks/exhaustive-deps` | client src | prevents stale closure bugs |

`no-explicit-any` is relaxed in test files — mock objects routinely need `as any` to satisfy partial type casts against full library types (e.g., `UseQueryResult`).

---

## 7. Request Lifecycle Example

**HR Manager searches for "Alice":**

1. HR Manager types "Alice" in the search box
2. React Query fires `GET /api/employees?search=Alice&page=1&pageSize=20`
3. Express route delegates to the employee controller
4. Controller parses query params and calls the employee service with the search parameters
5. Service validates params and calls the repository
6. Repository queries SQLite matching `id`, `name`, `email`, `role`, `department`, `country` against "Alice"
7. Repository returns a typed employee list to the service
8. Service returns the list with total count to the controller
9. Controller responds with HTTP 200 and JSON payload
10. React Query updates its cache and the employee table re-renders with results
