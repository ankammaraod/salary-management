# Feature 1 Design — Project Scaffold + DB Schema

**Date:** 2026-06-06  
**Status:** Approved  

---

## Scope

Bootstrap the full monorepo so every subsequent feature has a working foundation to build on:

- `server/` — Express + TypeScript backend with three-layer structure wired up
- `client/` — React + Vite + TypeScript frontend with routing and Ant Design installed
- Knex migration creating the `employees` table
- `GET /api/health` health check endpoint (with integration test)
- `Dockerfile` for single-container production build

Local dev: `npm run dev` in each directory independently. No docker-compose.

---

## Monorepo Structure

```
salary-management/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── types/
│   │   ├── db/
│   │   │   └── migrations/
│   │   ├── middleware/
│   │   └── app.ts
│   ├── tests/
│   │   └── routes/
│   ├── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── knexfile.ts
├── docs/
├── Dockerfile
├── .dockerignore
├── CLAUDE.md
└── README.md
```

No root `package.json`. `client/` and `server/` are fully independent — no shared tooling, no workspaces.

---

## Backend

### Packages

| Package | Purpose |
|---|---|
| `express` | HTTP framework |
| `knex` | Query builder + migrations |
| `better-sqlite3` | SQLite driver |
| `typescript` | Language |
| `ts-node` | Run TypeScript directly in dev |
| `nodemon` | Watch + restart on file changes |
| `jest` + `ts-jest` | Test runner |
| `supertest` | HTTP integration testing |
| `@types/express`, `@types/better-sqlite3`, `@types/jest`, `@types/supertest`, `@types/node` | Type definitions |

### TypeScript config

`strict: true`, target `ES2020`, module `CommonJS`, `outDir: dist`, `rootDir: .` (covers both `src/` and `server.ts`).

### Knex config (`knexfile.ts`)

Two environments:

```ts
development: {
  client: 'better-sqlite3',
  connection: { filename: './salary_management.db' },
  useNullAsDefault: true,
  migrations: { directory: './src/db/migrations' }
}

test: {
  client: 'better-sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
  migrations: { directory: './src/db/migrations' }
}
```

### app.ts vs server.ts split

`app.ts` creates and exports the Express app without calling `listen()`. Tests import `app.ts` directly — no port conflicts.  
`server.ts` imports `app` and calls `app.listen(3000)`.

### Health check

Route file: `src/routes/health.ts`  
`GET /api/health` → `200 { status: 'ok' }`  
No service or repository — direct response, no business logic.

Registered in `app.ts`: `app.use('/api/health', healthRouter)`

---

## DB Migration

File: `src/db/migrations/001_create_employees.ts`

```sql
CREATE TABLE employees (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT    NOT NULL,
  email            TEXT    NOT NULL UNIQUE,
  gender           TEXT    NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
  role             TEXT    NOT NULL,
  department       TEXT    NOT NULL,
  country          TEXT    NOT NULL,
  salary           REAL    NOT NULL,
  employment_type  TEXT    NOT NULL CHECK (employment_type IN ('Full-time', 'Contractor')),
  joining_date     TEXT    NOT NULL
)
```

`joining_date` stored as ISO 8601 text (`YYYY-MM-DD`) — SQLite has no native DATE type.  
`salary` stored as REAL in the employee's local currency. Currency is derived from country — not stored separately.

---

## Frontend

### Packages

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `react-router-dom` v6 | Client-side routing |
| `@tanstack/react-query` | Server state management |
| `antd` | UI component library |
| `vite` + `@vitejs/plugin-react` | Build tool + dev server |
| `typescript` | Language |

### Vite dev proxy

In `vite.config.ts`, all `/api/*` requests are proxied to `http://localhost:3000`. Client dev server runs on port 5173, server on 3000. No CORS configuration needed in dev.

```ts
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### Initial app shell

`App.tsx` sets up React Router with a single placeholder route (`/` → placeholder page). `main.tsx` wraps the app in `QueryClientProvider`. This gives every subsequent feature a working entry point to add routes into.

---

## Dockerfile (Production)

Multi-stage build:

**Stage 1 — build client**  
`node:20-alpine`, install client deps, run `vite build`, output to `client/dist/`.

**Stage 2 — build server**  
Install server deps, compile TypeScript to `server/dist/`.

**Stage 3 — runtime**  
Copy compiled server + `node_modules`. Copy `client/dist/` into `server/public/`. Express serves `server/public/` as static files. `CMD ["node", "dist/server.js"]`. Exposes port 3000.

---

## Testing

### Health check route test

File: `tests/routes/health.test.ts`

| Test | Assertion |
|---|---|
| `GET /api/health` returns 200 | `expect(res.status).toBe(200)` |
| Response body is `{ status: 'ok' }` | `expect(res.body).toEqual({ status: 'ok' })` |

Uses Supertest against the exported `app`. No fake service needed — the route has no dependencies.

### Migration correctness

Not tested directly in this feature. Migration correctness is verified implicitly by repository integration tests in Feature 3 — each test runs `knex.migrate.latest()` on a fresh `:memory:` DB and queries the `employees` table.

---

## Dev workflow

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev          # nodemon + ts-node, port 3000

# Terminal 2 — frontend
cd client
npm install
npm run dev          # Vite dev server, port 5173

# Run backend tests
cd server
npm test
```

---

## Out of scope for this feature

- Seed data (Feature 2)
- Any employee routes, services, or repositories (Feature 3+)
- Frontend pages beyond the app shell placeholder
