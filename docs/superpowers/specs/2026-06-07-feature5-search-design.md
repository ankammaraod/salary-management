# Feature 5 — Global Search Design

**Date:** 2026-06-07
**Status:** Approved

---

## Goal

Add a global search box to the employee list that lets the HR Manager find employees by typing a search term. Results update only when the user presses Enter or clicks the search icon.

## Scope

- Single search input on the Employees page header row
- Server-side filtering via an optional `search` query param on the existing `GET /api/employees` endpoint
- Matches against: ID, name, email, role, department, country
- Salary is explicitly excluded from search

Not in scope: column filters, sort controls, saved searches, advanced query syntax.

---

## API Contract

The existing endpoint gains one optional query param:

```
GET /api/employees?page=1&pageSize=20&search=alice
→ 200 { "employees": [...], "total": <filtered count> }
```

- `search` is optional. Omitting it or passing an empty string returns all employees — identical to current behavior.
- No validation on the search value; any string is accepted.
- `total` reflects the filtered count, not the full table count. Pagination operates on the filtered result set.
- Search is case-insensitive (SQLite `LIKE` is case-insensitive for ASCII by default).

---

## Backend

### Repository

`findPage(page, pageSize, search?)` gains an optional `search` parameter. When non-empty, a WHERE clause is added to both the COUNT query and the SELECT query:

```typescript
async findPage(
  page: number,
  pageSize: number,
  search = '',
): Promise<{ employees: Employee[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const term = `%${search}%`;

  const applySearch = (qb: Knex.QueryBuilder) => {
    if (!search) return qb;
    return qb.where(function () {
      this.whereRaw("CAST(id AS TEXT) LIKE ?", [term])
        .orWhere('name', 'like', term)
        .orWhere('email', 'like', term)
        .orWhere('role', 'like', term)
        .orWhere('department', 'like', term)
        .orWhere('country', 'like', term);
    });
  };

  const [countRow, employees] = await Promise.all([
    applySearch(this.knex('employees')).count('* as count').first<{ count: number | string }>(),
    applySearch(this.knex('employees').select('*')).limit(pageSize).offset(offset),
  ]);

  return { employees, total: Number(countRow?.count ?? 0) };
}
```

### Service

`listEmployees(page, pageSize, search?)` passes `search` through to `repo.findPage`. No business logic.

### Route

The GET `/` handler parses the optional `?search` query param and passes it to the service. No validation — any string is valid.

```typescript
const search = String(req.query.search ?? '');
res.json(await service.listEmployees(page, pageSize, search));
```

---

## Frontend

### Layout — Page Header Row

```
[Employees]          [Search input                    🔍] [New Employee]
```

- AntD `Input.Search` component — fires `onSearch` on Enter and on the search icon click
- Placeholder: `Search by name, email, role, department, country, or ID`
- Fixed width: 320px
- Positioned between the "Employees" title and the "New Employee" button

### State

Two separate state variables in `EmployeesPage`:

```typescript
const [searchInput, setSearchInput] = useState('');  // controlled input value
const [search, setSearch] = useState('');             // submitted search term
```

- `searchInput` updates on every keystroke via `onChange` — does NOT trigger a query
- On submit (Enter or icon click): `setSearch(searchInput); setPage(1)`
- Submitting an empty string resets to all employees

### Hook and API

`fetchEmployees(page, pageSize, search)` appends `&search=<term>` to the URL only when non-empty.

`useEmployees(page, pageSize, search)` adds `search` to the React Query key: `['employees', page, pageSize, search]`. Each unique `(page, pageSize, search)` combination is cached separately.

No new files — changes are additive to `EmployeesPage.tsx`, `useEmployees.ts`, and `api/employees.ts`.

---

## Testing

### Repository

| Case | What it checks |
|---|---|
| `findPage(1, 20, '')` | Returns all employees, correct total |
| `findPage(1, 20, 'alice')` | Returns only employees matching 'alice', filtered total |
| `findPage(1, 20, 'zzznomatch')` | Returns `{ employees: [], total: 0 }` |

### Service

| Case | What it checks |
|---|---|
| `listEmployees(1, 20, 'alice')` | Delegates `search` to `repo.findPage(1, 20, 'alice')` |

### Route

| Case | What it checks |
|---|---|
| `GET /?search=alice` | Passes `'alice'` to `service.listEmployees` |
| `GET /` (no search param) | Passes `''` to `service.listEmployees` |

### Frontend

| Case | What it checks |
|---|---|
| Search box renders | Placeholder text is present |
| Typing does not fire query | `useEmployees` not called with new search on keystroke |
| Enter fires query | `useEmployees` called with submitted term; page resets to 1 |
| Submitting empty string | `useEmployees` called with `''`; shows all employees |
