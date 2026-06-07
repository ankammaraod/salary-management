# ACME Salary Management

Web tool for an HR Manager to manage employees and view salary insights for a 10,000-employee organisation. Salary is stored in the employee's local currency (derived from country) — no FX conversion.

**Live:** https://salary-management-kv45.onrender.com/

## Stack

- **Backend:** Node 20 + Express + TypeScript. SQLite via Knex.js (query builder + migrations). Jest + Supertest, in-memory SQLite per test.
- **Frontend:** Vite + React + TypeScript. Ant Design v5 components (table, modals, forms). React Query for server state. Vitest + React Testing Library.
- **Deploy:** Multi-stage `Dockerfile` on `node:20-alpine`. Express serves built React static files from a single container. Healthcheck on `GET /api/health`.

## Run

Fastest path is Docker:

```
docker compose up
# visit http://localhost:3000
```

The container seeds 10,000 employees on first boot.

For development with hot reload, run the workspaces natively:

```bash
# Terminal 1 — backend (port 3000)
cd server && npm install && npm run migrate && npm run seed && npm run dev

# Terminal 2 — frontend (port 5173, proxies /api to :3000)
cd client && npm install && npm run dev
```

Requires Node 20+.

## Tests

```bash
# Backend
cd server && npm test

# Frontend
cd client && npm test
```

## What's shipped

- **Employee CRUD** — create, view, edit, delete via modal (no sub-routes). Delete requires confirmation.
- **Employee list** — full-width AntD table, compact rows, viewport-height scroll. Columns: ID, Name, Country, Salary (local currency), Employment Type, Actions (⋮ dropdown).
- **ID sort** — defaults to newest-first (descending by ID); toggle to ascending. Server-side sort.
- **Custom pagination** — "Rows per page: 20/50/100 | 1–20 of N | ‹ ›". Prev/next grayed out at boundaries.
- **Global search** — matches name, email, role, department, country, or ID. Fires on Enter or search icon click; resets to page 1.
- **Salary Insights** — country selector → headcount, avg/min/max salary, total payroll, gender breakdown (pie chart), employment type breakdown (pie chart), department table sorted by headcount.
- **Bulk CSV upload** — client-side validation, pre-import summary, all-or-nothing import.

## Docs

- [`docs/salary-management-prd.md`](docs/salary-management-prd.md) — product scope and requirements.
- [`docs/architecture.md`](docs/architecture.md) — stack, folder structure, coding conventions.
- [`docs/ux-design.md`](docs/ux-design.md) — color system, layout, component patterns, routing rules.
- [`CLAUDE.md`](CLAUDE.md) — collaboration conventions for AI contributors.
