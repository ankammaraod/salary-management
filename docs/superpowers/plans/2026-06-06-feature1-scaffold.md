# Feature 1 — Project Scaffold + DB Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the monorepo with a working Express + TypeScript backend, React + Vite frontend, SQLite employees migration, and a tested health check endpoint.

**Architecture:** Two independent packages (`server/` and `client/`) connected only via HTTP. The backend uses a three-layer pattern (routes → services → repositories) with Knex as the query builder. A multi-stage Dockerfile builds both packages into a single production container; local dev runs `npm run dev` in each directory independently.

**Tech Stack:** Node.js 20, Express 4, TypeScript 5, Knex 3, better-sqlite3, Jest 29 + ts-jest + Supertest (backend); React 18, Vite 5, Ant Design 5, TanStack Query v5, React Router v6 (frontend).

---

## File Map

**Root**
- `.gitignore` — excludes node_modules, dist, SQLite db files, OS cruft
- `.dockerignore` — excludes node_modules, dist, docs, *.db
- `Dockerfile` — multi-stage production build (client build → server build → runtime)

**server/**
- `package.json` — runtime deps + devDeps + scripts (dev, build, start, test, migrate)
- `tsconfig.json` — strict, CommonJS, outDir dist, rootDir .
- `jest.config.ts` — ts-jest preset, testEnvironment node, roots tests/
- `knexfile.ts` — development (file SQLite) and test (:memory:) configs
- `server.ts` — entry point: static file serving in production + app.listen(3000)
- `src/app.ts` — Express app: json middleware + routes + 404 + error handler
- `src/routes/health.ts` — GET / handler (mounted at /api/health in app.ts)
- `src/middleware/notFound.ts` — 404 catch-all middleware
- `src/middleware/errorHandler.ts` — 500 error handler middleware
- `src/db/migrations/20260606000001_create_employees.ts` — employees table schema
- `tests/routes/health.test.ts` — Supertest integration test for health check

**client/**
- `package.json` — runtime deps + devDeps + scripts (dev, build)
- `tsconfig.json` — strict, ESNext modules, JSX react-jsx, noEmit
- `vite.config.ts` — plugin-react + /api proxy to http://localhost:3000
- `index.html` — Vite HTML entry with root div
- `src/main.tsx` — ReactDOM.createRoot with QueryClientProvider
- `src/App.tsx` — BrowserRouter with single / route
- `src/pages/Home.tsx` — placeholder page component

---

## Task 1: Repository setup — .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```
# dependencies
node_modules/

# build output
dist/

# SQLite database files
*.db
*.db-journal
*.db-shm
*.db-wal

# environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# editor
.vscode/
.idea/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore"
```

---

## Task 2: Server — package.json, tsconfig.json, jest.config.ts

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/jest.config.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "salary-management-server",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec 'ts-node server.ts'",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "migrate": "knex migrate:latest"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.2",
    "knex": "^3.1.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.11.5",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "server.ts", "knexfile.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create server/jest.config.ts**

```ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
};

export default config;
```

- [ ] **Step 4: Install server dependencies**

```bash
cd server && npm install
```

Expected: `node_modules/` created, no errors. `better-sqlite3` compiles native bindings — this takes ~30 seconds and requires Python + build tools (pre-installed on most dev machines).

- [ ] **Step 5: Commit**

```bash
git add server/package.json server/package-lock.json server/tsconfig.json server/jest.config.ts
git commit -m "chore: add server package.json, tsconfig, and jest config"
```

---

## Task 3: Knex config + employees migration

**Files:**
- Create: `server/knexfile.ts`
- Create: `server/src/db/migrations/20260606000001_create_employees.ts`

- [ ] **Step 1: Create server/knexfile.ts**

```ts
import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: './salary_management.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
  },
  test: {
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
  },
};

export default config;
```

- [ ] **Step 2: Create migrations directory**

```bash
mkdir -p server/src/db/migrations
```

- [ ] **Step 3: Create server/src/db/migrations/20260606000001_create_employees.ts**

```ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employees', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.enu('gender', ['Male', 'Female', 'Other']).notNullable();
    table.string('role').notNullable();
    table.string('department').notNullable();
    table.string('country').notNullable();
    table.float('salary').notNullable();
    table.enu('employment_type', ['Full-time', 'Contractor']).notNullable();
    table.string('joining_date').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('employees');
}
```

- [ ] **Step 4: Run the migration to verify it executes without errors**

```bash
cd server && npx knex migrate:latest
```

Expected output:
```
Batch 1 run: 1 migrations
```

A file `salary_management.db` appears in `server/`. The `.gitignore` already excludes it.

- [ ] **Step 5: Commit**

```bash
git add server/knexfile.ts server/src/db/migrations/20260606000001_create_employees.ts
git commit -m "feat: add Knex config and employees table migration"
```

---

## Task 4: Express app skeleton — app.ts, server.ts, middleware

**Files:**
- Create: `server/src/app.ts`
- Create: `server/server.ts`
- Create: `server/src/middleware/notFound.ts`
- Create: `server/src/middleware/errorHandler.ts`

- [ ] **Step 1: Create server/src/middleware/notFound.ts**

```ts
import { Request, Response } from 'express';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not found' });
}
```

- [ ] **Step 2: Create server/src/middleware/errorHandler.ts**

```ts
import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.message);
  res.status(500).json({ error: 'internal server error' });
}
```

- [ ] **Step 3: Create server/src/app.ts**

`app.ts` exports a factory function, not a pre-built instance. This lets `server.ts` insert production middleware (static files, SPA fallback) before `notFound` — Express middleware order is fixed at registration time, so the factory pattern is required to get the order right.

```ts
import express, { Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  // Routes registered here in future features
  // e.g. app.use('/api/employees', employeeRouter);
  return app;
}
```

- [ ] **Step 4: Create server/server.ts**

```ts
import path from 'path';
import express from 'express';
import { createApp } from './src/app';
import { errorHandler } from './src/middleware/errorHandler';
import { notFound } from './src/middleware/notFound';

const app = createApp();

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors, no output.

- [ ] **Step 6: Commit**

```bash
git add server/src/app.ts server/server.ts server/src/middleware/notFound.ts server/src/middleware/errorHandler.ts
git commit -m "feat: add Express app skeleton with middleware"
```

---

## Task 5: Health check route (TDD)

**Files:**
- Create: `server/tests/routes/health.test.ts`
- Create: `server/src/routes/health.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Create the failing test**

Create `server/tests/routes/health.test.ts`:

```ts
import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run the test — confirm it fails**

```bash
cd server && npm test
```

Expected failure:
```
● GET /api/health › returns 200 with status ok

  expect(received).toBe(expected)
  Expected: 200
  Received: 404
```

The route doesn't exist yet — Express returns a default 404.

- [ ] **Step 3: Create server/src/routes/health.ts**

```ts
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
```

- [ ] **Step 4: Register the health route in server/src/app.ts**

Replace the full content of `app.ts`:

```ts
import express, { Express } from 'express';
import healthRouter from './routes/health';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/health', healthRouter);
  return app;
}
```

- [ ] **Step 5: Run the test — confirm it passes**

```bash
cd server && npm test
```

Expected:
```
PASS tests/routes/health.test.ts
  GET /api/health
    ✓ returns 200 with status ok
```

- [ ] **Step 6: Commit**

```bash
git add server/tests/routes/health.test.ts server/src/routes/health.ts server/src/app.ts
git commit -m "feat: add GET /api/health endpoint with test"
```

---

## Task 6: Client — package.json, tsconfig.json, npm install

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "salary-management-client",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.17.19",
    "antd": "^5.13.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

- [ ] **Step 2: Create client/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Install client dependencies**

```bash
cd client && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/package-lock.json client/tsconfig.json
git commit -m "chore: add client package.json and tsconfig"
```

---

## Task 7: Client — vite.config.ts + index.html

**Files:**
- Create: `client/vite.config.ts`
- Create: `client/index.html`

- [ ] **Step 1: Create client/vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 2: Create client/index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Salary Management</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add client/vite.config.ts client/index.html
git commit -m "chore: add Vite config with API proxy and index.html"
```

---

## Task 8: Client app shell — main.tsx, App.tsx, Home.tsx

**Files:**
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/pages/Home.tsx`

- [ ] **Step 1: Create client/src/pages/Home.tsx**

```tsx
export default function Home() {
  return <div>Salary Management</div>;
}
```

- [ ] **Step 2: Create client/src/App.tsx**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Create client/src/main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify the client builds without TypeScript errors**

```bash
cd client && npm run build
```

Expected: `dist/` directory created, no TypeScript errors, no output errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/main.tsx client/src/App.tsx client/src/pages/Home.tsx
git commit -m "feat: add client app shell with router and query provider"
```

---

## Task 9: Dockerfile + .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create .dockerignore**

```
node_modules
dist
*.db
*.db-journal
docs
.git
.gitignore
README.md
```

- [ ] **Step 2: Create Dockerfile**

```dockerfile
# Stage 1: Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=client-builder /app/client/dist ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**How the paths resolve in the container:**
- `dist/server.js` — compiled from `server/server.ts`
- `dist/src/` — compiled from `server/src/`
- `public/` — built React static files (from `client/dist/`)
- In `server.ts`, `path.join(__dirname, '../public')` resolves to `/app/public` ✓

- [ ] **Step 3: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "chore: add multi-stage Dockerfile for production build"
```

---

## Verification checklist

After all tasks complete, verify the full setup works:

**Backend:**
```bash
cd server && npm test
# Expected: 1 test suite, 1 test passing

cd server && npm run dev
# Expected: "Server running on port 3000"
# In another terminal: curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

**Frontend:**
```bash
cd client && npm run dev
# Expected: Vite dev server at http://localhost:5173
# Open browser → "Salary Management" text visible
```

**TypeScript:**
```bash
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit
# Both expected: no errors, no output
```
