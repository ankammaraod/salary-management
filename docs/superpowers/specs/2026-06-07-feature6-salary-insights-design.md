# Feature 6 — Salary Insights Design Spec

**Date:** 2026-06-07
**Status:** Approved

---

## Goal

A dedicated Insights page that lets the HR Manager select a country and instantly see workforce composition and compensation data for that country.

---

## Layout

Page uses the standard 900px centered white card layout defined in `docs/ux-design.md`.

```
Country: [Select a country ▾]         ← AntD Select, 240px wide

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  HEADCOUNT   │ │  AVG SALARY  │ │ MIN SALARY   │ │ MAX SALARY   │ │TOTAL PAYROLL │
│    1,240     │ │   €72,400    │ │   €28,000    │ │  €180,000    │ │    €89.2M    │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

┌───────────────────────────────────┐  ┌───────────────────────────────────┐
│  GENDER BREAKDOWN                 │  │  EMPLOYMENT TYPE                  │
│  [recharts PieChart]              │  │  [recharts PieChart]              │
│  Male / Female / Other            │  │  Full-time / Contractor            │
└───────────────────────────────────┘  └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DEPARTMENT BREAKDOWN                                                   │
│  Department        Headcount   Avg Salary                               │
│  (sorted by headcount descending)                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

Before a country is selected: centered empty state text — "Select a country to view salary insights".

---

## API

### `GET /api/insights/countries`

Returns the list of distinct countries that have at least one employee, sorted alphabetically.

**Response:** `string[]`

```json
["Australia", "Brazil", "France", "Germany", "India", "Japan", "United Kingdom", "USA"]
```

### `GET /api/insights?country=Germany`

Returns all insights data for the given country.

**Query param:** `country` — required, non-empty string. Returns 400 if missing or empty.

**Response:** `InsightsDto`

```json
{
  "headcount": 1240,
  "genderBreakdown": { "Male": 620, "Female": 510, "Other": 110 },
  "employmentTypeBreakdown": { "Full-time": 980, "Contractor": 260 },
  "avgSalary": 72400,
  "minSalary": 28000,
  "maxSalary": 180000,
  "totalPayroll": 89776000,
  "departmentBreakdown": [
    { "department": "Engineering", "headcount": 312, "avgSalary": 84200 },
    { "department": "Sales", "headcount": 198, "avgSalary": 65100 }
  ]
}
```

---

## Backend Architecture

Follows the existing four-layer pattern: Route → Controller → Service → Repository → SQLite.

### New files

| File | Responsibility |
|---|---|
| `server/src/types/insights.ts` | `InsightsDto` interface and `DepartmentStat` interface |
| `server/src/repositories/insightsRepository.ts` | `InsightsRepository` class — all Knex queries |
| `server/src/services/insightsService.ts` | `InsightsService` class — validates input, delegates to repository |
| `server/src/controllers/insightsController.ts` | `InsightsController` class — parses request, calls service, responds |
| `server/src/routes/insights.ts` | `createInsightsRouter` — wires GET /countries and GET / |

### Modified files

| File | Change |
|---|---|
| `server/src/app.ts` | Register `/api/insights` router |

### `InsightsRepository` queries

**`listCountries()`** — `SELECT DISTINCT country FROM employees ORDER BY country ASC`

**`getInsights(country)`** — three queries run in parallel via `Promise.all`:
1. Workforce query: `SELECT gender, employment_type, COUNT(*) FROM employees WHERE country = ? GROUP BY gender, employment_type`
2. Compensation query: `SELECT AVG(salary), MIN(salary), MAX(salary), SUM(salary) FROM employees WHERE country = ?`
3. Department query: `SELECT department, COUNT(*) as headcount, AVG(salary) as avgSalary FROM employees WHERE country = ? GROUP BY department ORDER BY headcount DESC`

### `InsightsService`

- `listCountries()` — delegates to repository, no validation needed
- `getInsights(country)` — validates `country` is a non-empty string, throws `ValidationError` if not, then delegates to repository

### `InsightsController`

- `listCountries(req, res)` — calls service, responds with 200 + array
- `getInsights(req, res, next)` — reads `req.query.country`, validates it is present, calls service, responds with 200 + `InsightsDto`

---

## Types

```typescript
// server/src/types/insights.ts

export interface DepartmentStat {
  department: string;
  headcount: number;
  avgSalary: number;
}

export interface InsightsDto {
  headcount: number;
  genderBreakdown: { Male: number; Female: number; Other: number };
  employmentTypeBreakdown: { 'Full-time': number; Contractor: number };
  avgSalary: number;
  minSalary: number;
  maxSalary: number;
  totalPayroll: number;
  departmentBreakdown: DepartmentStat[];
}
```

---

## Frontend Architecture

### New route

`/insights` → `InsightsPage`. Root `/` continues to redirect to `/employees`.

### Nav bar

Add "Insights" link to `AppLayout` alongside "Employees". Active state follows existing pattern.

### New files

| File | Responsibility |
|---|---|
| `client/src/types/insights.ts` | `InsightsDto` and `DepartmentStat` (mirrors server types) |
| `client/src/api/insights.ts` | `fetchCountries()` and `fetchInsights(country)` fetch functions |
| `client/src/hooks/useInsights.ts` | `useCountries()` and `useInsights(country)` React Query hooks |
| `client/src/pages/InsightsPage.tsx` | Full page component |

### Modified files

| File | Change |
|---|---|
| `client/src/App.tsx` | Add `/insights` route |
| `client/src/components/AppLayout.tsx` | Add "Insights" nav link |

### `InsightsPage` behaviour

- On mount: fetches country list via `useCountries()`, populates AntD `Select`
- Country selector: 240px wide, placeholder "Select a country"
- Before selection: empty state — centered text "Select a country to view salary insights" in `colorTextSecondary`
- After selection: fetches insights via `useInsights(selectedCountry)`, renders all sections
- Loading: AntD `Spin` centered while `useInsights` is fetching
- Error: AntD `Alert` type `error`, message "Failed to load insights"

### Stat cards (AntD `Statistic`)

Five cards in a horizontal row, each in its own AntD `Card` with label and value:

| Card | Value formatting |
|---|---|
| Headcount | `toLocaleString()` |
| Avg Salary | `getCurrencySymbol(country) + toLocaleString(Math.round(avgSalary))` |
| Min Salary | same as above |
| Max Salary | same as above |
| Total Payroll | same as above |

Currency symbol resolved via existing `getCurrencySymbol` from `client/src/utils/currency.ts`.

### Pie charts (recharts)

Two `PieChart` components side by side, each in an AntD `Card`:

**Gender Breakdown:**
- Slices: Male (blue `#1677ff`), Female (purple `#722ed1`), Other (grey `#888888`)
- Legend below chart showing label + count

**Employment Type:**
- Slices: Full-time (green `#52c41a`), Contractor (orange `#fa8c16`)
- Legend below chart showing label + count

### Department table (AntD `Table`)

Columns: Department (text), Headcount (number, `toLocaleString()`), Avg Salary (currency symbol + `toLocaleString(Math.round(avgSalary))`).

No pagination — all departments for the selected country rendered in one list (max realistic count is ~10 departments).

---

## Testing

| Layer | What is tested |
|---|---|
| `InsightsRepository` | Integration tests with in-memory SQLite: `listCountries` returns distinct sorted countries; `getInsights` returns correct headcount, gender counts, employment type counts, salary stats, department breakdown sorted by headcount desc |
| `InsightsService` | Unit tests: validates empty `country` throws `ValidationError`; delegates to repository |
| `InsightsController` (via routes) | Supertest: `GET /api/insights/countries` returns array; `GET /api/insights?country=X` returns dto; missing country returns 400 |
| `InsightsPage` | React Testing Library: renders empty state before selection; renders stat values after selection; shows error alert on fetch failure |
