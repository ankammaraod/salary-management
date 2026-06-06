# Feature 2 — Seed Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an idempotent Knex seed script that populates 10,000 realistic employees across 8 countries, 4 departments, and 8 roles with plausible local-currency salaries.

**Architecture:** A single Knex seed file at `server/src/db/seeds/seed_employees.ts` invoked via `npm run seed` (`knex seed:run`). On every run it truncates the `employees` table then batch-inserts 10,000 generated records. No routes, services, or repositories are involved — this is a pure data generation script. Seed scripts are excluded from the test suite per `docs/architecture.md`.

**Tech Stack:** Node.js + TypeScript, Knex.js (`batchInsert`), `@faker-js/faker`

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `server/package.json` | Add `@faker-js/faker` dev dep + `seed` npm script |
| Modify | `server/knexfile.ts` | Add `seeds` directory config to both environments |
| Create | `server/src/db/seeds/seed_employees.ts` | The Knex seed file |

---

### Task 1: Add faker dependency and seed script

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Add `@faker-js/faker` and the `seed` script to `server/package.json`**

Replace the contents of `server/package.json` with:

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
    "migrate": "knex migrate:latest",
    "seed": "knex seed:run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "knex": "^3.1.0",
    "sqlite3": "^5.1.7"
  },
  "devDependencies": {
    "@faker-js/faker": "^9.0.0",
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

- [ ] **Step 2: Install the new dependency**

Run from `server/`:
```bash
npm install
```

Expected: `added N packages` — no errors. `node_modules/@faker-js/faker` should exist.

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add @faker-js/faker dev dependency and seed npm script"
```

---

### Task 2: Add seeds directory to knexfile

**Files:**
- Modify: `server/knexfile.ts`

- [ ] **Step 1: Add `seeds` config to both environments**

Replace the contents of `server/knexfile.ts` with:

```typescript
import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: { filename: './salary_management.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
    seeds: { directory: './src/db/seeds' },
  },
};

export default config;
```

- [ ] **Step 2: Verify existing tests still pass**

Run from `server/`:
```bash
npm test
```

Expected: `1 passed` — the health check test still passes.

- [ ] **Step 3: Commit**

```bash
git add server/knexfile.ts
git commit -m "chore: add seeds directory config to knexfile"
```

---

### Task 3: Write the seed file

**Files:**
- Create: `server/src/db/seeds/seed_employees.ts`

- [ ] **Step 1: Create the seeds directory**

```bash
mkdir -p server/src/db/seeds
```

- [ ] **Step 2: Create the seed file**

Create `server/src/db/seeds/seed_employees.ts` with the following content:

```typescript
import type { Knex } from 'knex';
import { faker } from '@faker-js/faker';

const COUNTRIES = [
  { name: 'USA',            min: 60000,    max: 200000    },
  { name: 'United Kingdom', min: 30000,    max: 120000    },
  { name: 'Germany',        min: 35000,    max: 110000    },
  { name: 'France',         min: 30000,    max: 100000    },
  { name: 'India',          min: 500000,   max: 3000000   },
  { name: 'Japan',          min: 3000000,  max: 12000000  },
  { name: 'Brazil',         min: 50000,    max: 250000    },
  { name: 'Australia',      min: 55000,    max: 180000    },
];

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Finance'];

const ROLES = [
  'Software Engineer',
  'Engineering Manager',
  'Sales Representative',
  'Sales Manager',
  'Marketing Specialist',
  'Marketing Manager',
  'Financial Analyst',
  'Finance Manager',
];

const GENDERS: Array<'Male' | 'Female' | 'Other'> = ['Male', 'Female', 'Other'];
const GENDER_WEIGHTS = [45, 45, 10];

const EMPLOYMENT_TYPES: Array<'Full-time' | 'Contractor'> = ['Full-time', 'Contractor'];
const EMPLOYMENT_WEIGHTS = [80, 20];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

function roundToNearest100(n: number): number {
  return Math.round(n / 100) * 100;
}

export async function seed(knex: Knex): Promise<void> {
  await knex('employees').truncate();

  const employees = [];
  let globalIndex = 0;

  for (const country of COUNTRIES) {
    for (let j = 0; j < 1250; j++) {
      const i = globalIndex++;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const emailLocal = faker.internet.email({ firstName, lastName }).split('@')[0];
      const email = `${emailLocal}_${String(i).padStart(4, '0')}@example.com`;
      const salary = roundToNearest100(
        faker.number.int({ min: country.min, max: country.max })
      );
      const joiningDate = faker.date
        .between({ from: '2016-01-01', to: '2026-06-06' })
        .toISOString()
        .slice(0, 10);

      employees.push({
        name: `${firstName} ${lastName}`,
        email,
        gender: weightedPick(GENDERS, GENDER_WEIGHTS),
        role: pick(ROLES),
        department: pick(DEPARTMENTS),
        country: country.name,
        salary,
        employment_type: weightedPick(EMPLOYMENT_TYPES, EMPLOYMENT_WEIGHTS),
        joining_date: joiningDate,
      });
    }
  }

  await knex.batchInsert('employees', employees, 100);
}
```

- [ ] **Step 3: Run the migration (if not already run) then seed**

Run from `server/`:
```bash
npm run migrate && npm run seed
```

Expected output ends with something like:
```
Ran 1 seed files
```
No errors.

- [ ] **Step 4: Verify 10,000 rows were inserted**

Run from the repo root:
```bash
sqlite3 server/salary_management.db "SELECT COUNT(*) FROM employees;"
```

Expected: `10000`

- [ ] **Step 5: Verify idempotency — run seed a second time and recount**

```bash
cd server && npm run seed
```

Then:
```bash
sqlite3 server/salary_management.db "SELECT COUNT(*) FROM employees;"
```

Expected: still `10000` (not 20000 — confirms truncate works).

- [ ] **Step 6: Run the test suite to confirm nothing regressed**

Run from `server/`:
```bash
npm test
```

Expected: `1 passed`

- [ ] **Step 7: Commit**

```bash
git add server/src/db/seeds/seed_employees.ts
git commit -m "feat: add seed script generating 10,000 employees across 8 countries"
```
