# Feature 4 — Server-Side Pagination Design

**Date:** 2026-06-06
**Status:** Approved

---

## Goal

Replace the current all-at-once employee fetch with server-side pagination. The API returns one page of 20 employees at a time, plus a total count. The frontend tracks the current page in state and fetches a new page whenever it changes.

## Scope

- Server-side `GET /api/employees?page=&pageSize=` endpoint
- Add Email and Joining Date columns to the employee table (per PRD)
- Update `ux-design.md` table column spec to match

Not in scope: search (Feature 5), column sorting, column filters.

---

## API Contract

```
GET /api/employees?page=1&pageSize=20
→ 200 { "employees": [...20 Employee objects...], "total": 10000 }
```

**Query params:**
- `page` — positive integer, default `1`
- `pageSize` — positive integer, default `20`

**Validation errors (400):**
- `page must be a positive integer` if `page` is non-numeric or < 1
- `pageSize must be a positive integer` if `pageSize` is non-numeric or < 1

The previous flat-array response shape is replaced. The only consumer is this frontend.

---

## Backend

### Repository

Remove `findAll()`. Add `findPage(page, pageSize)`:

```typescript
interface IEmployeeRepository {
  findPage(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}
```

Implementation runs `COUNT(*)` and `SELECT * LIMIT/OFFSET` via `Promise.all` for a single round-trip:

```typescript
async findPage(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }> {
  const offset = (page - 1) * pageSize;
  const [{ count }, employees] = await Promise.all([
    this.knex('employees').count('* as count').first(),
    this.knex('employees').select('*').limit(pageSize).offset(offset),
  ]);
  return { employees, total: Number(count) };
}
```

### Service

`listEmployees(page: number, pageSize: number)` delegates directly to `repo.findPage(page, pageSize)`. No business logic.

### Route

```typescript
router.get('/', async (req, res, next) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
  if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
  try {
    res.json(await service.listEmployees(page, pageSize));
  } catch (err) { next(err); }
});
```

---

## Frontend

### `api/employees.ts`

```typescript
export async function fetchEmployees(page: number, pageSize = 20): Promise<{ employees: Employee[]; total: number }> {
  const res = await fetch(`${BASE}?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) await parseError(res);
  return res.json();
}
```

### `hooks/useEmployees.ts`

```typescript
export function useEmployees(page: number) {
  return useQuery({
    queryKey: ['employees', page],
    queryFn: () => fetchEmployees(page),
  });
}
```

React Query caches each page separately. Navigating back to a page already fetched renders instantly.

### `EmployeesPage.tsx`

- `const [page, setPage] = useState(1)` — current page
- `const { data, isLoading, isError } = useEmployees(page)`
- Table `dataSource={data?.employees ?? []}`, `loading={isLoading}`
- AntD Table `pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, onChange: setPage, showSizeChanger: false }}`

**Column order (per PRD):** ID, Name, Email, Role, Department, Country, Salary, Employment Type, Joining Date, Actions.

Email — plain text. Joining Date — plain text (`YYYY-MM-DD` as stored).

---

## Testing

### Backend

| Test | What it checks |
|---|---|
| `findPage` — page 1 of 3 rows with pageSize 2 | returns 2 employees and total=3 |
| `findPage` — page 2 of 3 rows with pageSize 2 | returns 1 employee and total=3 |
| `listEmployees` service unit test | delegates page+pageSize to repo |
| Route GET / with valid params | returns 200 `{ employees, total }` |
| Route GET / with no params | defaults to page=1, pageSize=20 |
| Route GET / with page=abc | returns 400 |
| Route GET / with page=0 | returns 400 |
| Route GET / with pageSize=abc | returns 400 |

### Frontend

- `useEmployees` mock returns `{ data: { employees: [...], total: N } }` shape
- `EmployeesPage` test updated to destructure `data.employees` from mock
- Tests for new Email and Joining Date columns rendering

---

## Docs Update

`docs/ux-design.md` §5.1 table column list updated:

| Column | Notes |
|---|---|
| ID | Plain number |
| Name | Plain text |
| Email | Plain text |
| Role | Plain text |
| Department | Plain text |
| Country | Plain text |
| Salary | Currency symbol + `toLocaleString()`, right-aligned |
| Employment Type | AntD `Tag` — green for Full-time, orange for Contractor |
| Joining Date | Plain text, `YYYY-MM-DD` |
| Actions | Single `⋮` icon button (AntD `Dropdown`) |

Remove: "Joining Date, Email, and Gender are not shown in the table — they are visible in the View modal."
(Gender remains modal-only; Email and Joining Date now appear in the table.)
