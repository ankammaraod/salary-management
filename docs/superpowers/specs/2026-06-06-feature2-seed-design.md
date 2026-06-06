# Feature 2 — Seed Script Design

**Date:** 2026-06-06
**Status:** Approved

---

## Goal

Populate the `employees` table with 10,000 realistic employees spread across 8 countries, 8 departments, and 20 roles, with plausible salary ranges in each country's local currency. The script is idempotent — truncates and re-seeds on every run.

---

## Architecture

A single Knex seed file. No routes, services, or repositories are involved — this is a pure data generation script.

**New file:**
- `server/src/db/seeds/seed_employees.ts` — Knex seed file

**Modified files:**
- `server/package.json` — add `@faker-js/faker` as dev dependency; add `"seed": "knex seed:run"` script
- `server/knexfile.ts` — add `seeds: { directory: './src/db/seeds' }` to both `development` and `test` environments

**Invocation:**
```bash
cd server && npm run seed
```

**Implementation steps:**
1. Truncate `employees` table
2. Generate 10,000 employee records in memory
3. Batch-insert via `knex.batchInsert` in chunks of 100 (avoids SQLite per-statement row limits)

**No tests** — seed scripts are explicitly excluded from the test suite per the architecture doc.

---

## Data Model

### Countries and salary ranges

| Country | Currency | Min salary | Max salary |
|---|---|---|---|
| USA | USD | 60,000 | 200,000 |
| United Kingdom | GBP | 30,000 | 120,000 |
| Germany | EUR | 35,000 | 110,000 |
| France | EUR | 30,000 | 100,000 |
| India | INR | 500,000 | 3,000,000 |
| Japan | JPY | 3,000,000 | 12,000,000 |
| Brazil | BRL | 50,000 | 250,000 |
| Australia | AUD | 55,000 | 180,000 |

Salary is in the country's local currency, rounded to the nearest 100. The country-to-currency mapping is defined as a constant inside the seed file; it will be extracted to a shared constants file when Feature 6 (Salary Insights) needs it.

### Distribution

- **Per country:** 1,250 employees (10,000 ÷ 8, evenly spread)
- **Gender:** weighted random — ~45% Male, ~45% Female, ~10% Other
- **Employment type:** weighted random — ~80% Full-time, ~20% Contractor
- **Department:** random pick from the 8 departments below
- **Role:** random pick from the 20 roles below
- **Joining date:** random date between 2016-01-01 and 2026-06-06

### Departments (8)

Engineering, Product, Sales, Marketing, Finance, HR, Operations, Legal

### Roles (20)

Software Engineer, Senior Engineer, Engineering Manager, Product Manager, Senior Product Manager, Sales Representative, Account Executive, Sales Manager, Marketing Specialist, Marketing Manager, Financial Analyst, Finance Manager, HR Specialist, HR Manager, Operations Analyst, Operations Manager, Legal Counsel, Legal Manager, Director, VP

### Data generation

- **Names:** `faker.person.firstName()` + `faker.person.lastName()`
- **Email:** `faker.internet.email({ firstName, lastName })` with a short UUID fragment appended to guarantee uniqueness (e.g. `alice.smith_a3f1@example.com`)
- **Salary:** `faker.number.int({ min, max })` rounded to nearest 100
- **Joining date:** `faker.date.between({ from: '2016-01-01', to: '2026-06-06' })` formatted as `YYYY-MM-DD`

---

## npm Scripts

After this feature, `server/package.json` scripts include:

```json
{
  "dev": "nodemon --exec ts-node server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "test": "jest",
  "migrate": "knex migrate:latest",
  "seed": "knex seed:run"
}
```

---

## Out of Scope

- Currency symbols in the UI — not needed until Feature 4/6
- Extracting the country-currency map to a shared file — deferred to Feature 6
- Seeding any table other than `employees`
