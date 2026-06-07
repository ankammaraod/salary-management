# Feature 5 — Global Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global search box to the employee list that filters results server-side by name, email, role, department, country, or ID when the HR Manager presses Enter or clicks the search icon.

**Architecture:** An optional `?search` query param is added to `GET /api/employees`. The repository applies a SQLite `LIKE` WHERE clause to both the COUNT and SELECT queries when the search term is non-empty. The frontend adds two state vars (`searchInput` for the controlled input, `search` for the submitted term) and an AntD `Input.Search` component in the page header row.

**Tech Stack:** Node.js/Express/Knex/SQLite (backend), React/Ant Design v5/React Query (frontend), Jest/Supertest (backend tests), Vitest/React Testing Library (frontend tests)

---

## File Map

| File | Change |
|---|---|
| `server/tests/repositories/employeeRepository.test.ts` | Add 3 new search test cases under a `findPage with search` describe |
| `server/src/repositories/employeeRepository.ts` | Add `search?` to interface and implementation |
| `server/tests/services/employeeService.test.ts` | Add 1 new search delegation test; update existing assertion to include `''` |
| `server/src/services/employeeService.ts` | Add `search` param to `listEmployees` |
| `server/tests/routes/employees.test.ts` | Add 2 search route tests; update existing default assertion |
| `server/src/routes/employees.ts` | Parse `?search` and pass to service |
| `client/src/api/employees.ts` | Add `search` param to `fetchEmployees` |
| `client/src/hooks/useEmployees.ts` | Add `search` to hook signature and query key |
| `client/src/pages/__tests__/EmployeesPage.test.tsx` | Add 2 search UI tests |
| `client/src/pages/EmployeesPage.tsx` | Add `Input.Search`, two state vars, wire to `useEmployees` |
| `docs/ux-design.md` | Update section 5.1 header row to include search box |

---

### Task 1: Repository — add `search` to `findPage`

**Files:**
- Modify: `server/tests/repositories/employeeRepository.test.ts`
- Modify: `server/src/repositories/employeeRepository.ts`

- [ ] **Step 1: Write 3 failing search tests**

Add this describe block at the end of `server/tests/repositories/employeeRepository.test.ts`, after the existing `describe('deleteById', ...)` block:

```typescript
describe('findPage with search', () => {
  it('returns all employees when search is empty', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob Smith' });
    const result = await repo.findPage(1, 20, '');
    expect(result.total).toBe(2);
    expect(result.employees).toHaveLength(2);
  });

  it('returns filtered employees and filtered total when search matches', async () => {
    await repo.create(VALID_DTO); // Alice Johnson
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob Smith' });
    const result = await repo.findPage(1, 20, 'Alice');
    expect(result.total).toBe(1);
    expect(result.employees[0].name).toBe('Alice Johnson');
  });

  it('returns empty employees and total 0 when search has no matches', async () => {
    await repo.create(VALID_DTO);
    const result = await repo.findPage(1, 20, 'zzznomatch');
    expect(result.total).toBe(0);
    expect(result.employees).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx jest tests/repositories/employeeRepository.test.ts --no-coverage 2>&1 | tail -20
```

Expected: 3 failures — `findPage` doesn't accept a third argument yet. The first describe's tests should still pass.

- [ ] **Step 3: Update the interface and implementation**

Replace the entire `server/src/repositories/employeeRepository.ts` with:

```typescript
import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findPage(page: number, pageSize: number, search?: string): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  async findPage(page: number, pageSize: number, search = ''): Promise<{ employees: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const term = `%${search}%`;

    const withSearch = (qb: Knex.QueryBuilder): Knex.QueryBuilder => {
      if (!search) return qb;
      return qb.where(function () {
        this.whereRaw('CAST(id AS TEXT) LIKE ?', [term])
          .orWhere('name', 'like', term)
          .orWhere('email', 'like', term)
          .orWhere('role', 'like', term)
          .orWhere('department', 'like', term)
          .orWhere('country', 'like', term);
      });
    };

    const [countRow, employees] = await Promise.all([
      withSearch(this.knex('employees')).count('* as count').first<{ count: number | string }>(),
      withSearch(this.knex('employees').select('*')).limit(pageSize).offset(offset),
    ]);
    return { employees, total: Number(countRow?.count ?? 0) };
  }

  async findById(id: number): Promise<Employee | null> {
    return (await this.knex('employees').where({ id }).first()) ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return (await this.knex('employees').where({ email }).first()) ?? null;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const [id] = await this.knex('employees').insert(dto);
    const created = await this.findById(id);
    if (!created) throw new Error('failed to retrieve employee after insert');
    return created;
  }

  async update(id: number, dto: CreateEmployeeDto): Promise<Employee> {
    await this.knex('employees').where({ id }).update(dto);
    const updated = await this.findById(id);
    if (!updated) throw new Error('failed to retrieve employee after update');
    return updated;
  }

  async deleteById(id: number): Promise<void> {
    await this.knex('employees').where({ id }).delete();
  }
}
```

- [ ] **Step 4: Run all repository tests**

```bash
cd server && npx jest tests/repositories/employeeRepository.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests pass (existing + 3 new search tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/employeeRepository.ts server/tests/repositories/employeeRepository.test.ts
git commit -m "feat: add search param to findPage in employee repository"
```

---

### Task 2: Service — add `search` to `listEmployees`

**Files:**
- Modify: `server/tests/services/employeeService.test.ts`
- Modify: `server/src/services/employeeService.ts`

**Note:** After this task the service calls `repo.findPage(page, pageSize, search)`. The existing service test asserts `toHaveBeenCalledWith(1, 20)` (two args), which will fail once the service passes the third arg. The plan handles this in Step 1 — update the existing assertion first, then write the new test, then implement.

- [ ] **Step 1: Update the existing test assertion and add a new search test**

In `server/tests/services/employeeService.test.ts`, replace the `describe('listEmployees', ...)` block with:

```typescript
describe('listEmployees', () => {
  it('delegates page, pageSize, and empty search to repo.findPage', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    const result = await service.listEmployees(1, 20);
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, '');
    expect(result).toEqual(pageResult);
  });

  it('delegates search term to repo.findPage', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    await service.listEmployees(1, 20, 'alice');
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, 'alice');
  });
});
```

- [ ] **Step 2: Run tests to verify the new test fails**

```bash
cd server && npx jest tests/services/employeeService.test.ts --no-coverage 2>&1 | tail -20
```

Expected: The updated first test fails (`toHaveBeenCalledWith(1, 20, '')` does not match the actual call `(1, 20)`). The new second test also fails.

- [ ] **Step 3: Update the service**

In `server/src/services/employeeService.ts`, replace the `listEmployees` method (line 21–23) with:

```typescript
listEmployees(page: number, pageSize: number, search = ''): Promise<{ employees: Employee[]; total: number }> {
  return this.repo.findPage(page, pageSize, search);
}
```

- [ ] **Step 4: Run all service tests**

```bash
cd server && npx jest tests/services/employeeService.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/employeeService.ts server/tests/services/employeeService.test.ts
git commit -m "feat: add search param to listEmployees in employee service"
```

---

### Task 3: Route — parse `?search` and pass to service

**Files:**
- Modify: `server/tests/routes/employees.test.ts`
- Modify: `server/src/routes/employees.ts`

**Note:** The existing route test `expect(service.listEmployees).toHaveBeenCalledWith(1, 20)` will break after the route change (it'll be called with `(1, 20, '')`). Step 1 updates this before implementing.

- [ ] **Step 1: Update existing default test and add 2 new search tests**

In `server/tests/routes/employees.test.ts`, replace the `describe('GET /api/employees', ...)` block with:

```typescript
describe('GET /api/employees', () => {
  it('returns 200 with paginated envelope', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=1&pageSize=20');
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].name).toBe('Alice Johnson');
    expect(res.body.total).toBe(1);
  });

  it('defaults page to 1, pageSize to 20, and search to empty string when params are absent', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '');
  });

  it('passes search param to listEmployees', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?search=alice');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, 'alice');
  });

  it('returns 400 when page is not a number', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('page must be a positive integer');
  });

  it('returns 400 when page is 0', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('page must be a positive integer');
  });

  it('returns 400 when pageSize is not a number', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?pageSize=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pageSize must be a positive integer');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx jest tests/routes/employees.test.ts --no-coverage 2>&1 | tail -20
```

Expected: The default test fails (`toHaveBeenCalledWith(1, 20, '')` vs `(1, 20)`) and the new search test fails.

- [ ] **Step 3: Update the route**

In `server/src/routes/employees.ts`, replace the `router.get('/', ...)` handler (lines 8–16) with:

```typescript
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const search = String(req.query.search ?? '');
  if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
  if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
  try {
    res.json(await service.listEmployees(page, pageSize, search));
  } catch (err) { next(err); }
});
```

- [ ] **Step 4: Run all route tests**

```bash
cd server && npx jest tests/routes/employees.test.ts --no-coverage 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 5: Run full backend test suite**

```bash
cd server && npx jest --no-coverage 2>&1 | tail -10
```

Expected: All backend tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/employees.ts server/tests/routes/employees.test.ts
git commit -m "feat: parse and forward search param in GET /api/employees route"
```

---

### Task 4: Frontend — update API function and hook

**Files:**
- Modify: `client/src/api/employees.ts`
- Modify: `client/src/hooks/useEmployees.ts`

These changes have no independent test file — they are verified through the EmployeesPage tests in Task 5. The changes here are purely additive and do not break any existing tests.

- [ ] **Step 1: Update `fetchEmployees` in `client/src/api/employees.ts`**

Replace the `fetchEmployees` function (lines 10–14) with:

```typescript
export async function fetchEmployees(page: number, pageSize = 20, search = ''): Promise<{ employees: Employee[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.append('search', search);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) await parseError(res);
  return res.json();
}
```

- [ ] **Step 2: Update `useEmployees` in `client/src/hooks/useEmployees.ts`**

Replace the entire file with:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number, search = '') {
  return useQuery({
    queryKey: ['employees', page, pageSize, search],
    queryFn: () => fetchEmployees(page, pageSize, search),
  });
}
```

- [ ] **Step 3: Run frontend tests to verify nothing broke**

```bash
cd client && npx vitest run 2>&1 | tail -15
```

Expected: All existing tests pass. (The `useEmployees` mock in EmployeesPage tests doesn't care about argument count.)

- [ ] **Step 4: Commit**

```bash
git add client/src/api/employees.ts client/src/hooks/useEmployees.ts
git commit -m "feat: add search param to fetchEmployees and useEmployees"
```

---

### Task 5: EmployeesPage — search UI, docs update, visual verification

**Files:**
- Modify: `client/src/pages/__tests__/EmployeesPage.test.tsx`
- Modify: `client/src/pages/EmployeesPage.tsx`
- Modify: `docs/ux-design.md`

- [ ] **Step 1: Write 2 failing search UI tests**

Add these two tests inside the `describe('EmployeesPage', ...)` block in `client/src/pages/__tests__/EmployeesPage.test.tsx`, after the last existing test:

```typescript
  it('renders a search input with the correct placeholder', () => {
    render(<EmployeesPage />);
    expect(
      screen.getByPlaceholderText('Search by name, email, role, department, country, or ID')
    ).toBeInTheDocument();
  });

  it('calls useEmployees with submitted search term when Enter is pressed', async () => {
    render(<EmployeesPage />);
    const input = screen.getByPlaceholderText('Search by name, email, role, department, country, or ID');
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    await waitFor(() => {
      expect(vi.mocked(useEmployees)).toHaveBeenCalledWith(1, 20, 'Alice');
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd client && npx vitest run src/pages/__tests__/EmployeesPage.test.tsx 2>&1 | tail -20
```

Expected: 2 failures — the search input does not exist yet.

- [ ] **Step 3: Update `EmployeesPage.tsx`**

Replace the entire `client/src/pages/EmployeesPage.tsx` with:

```typescript
import { useState } from 'react';
import { Table, Button, Dropdown, Tag, Modal, message, Alert, Input } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useEmployees } from '../hooks/useEmployees';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import EmployeeForm from '../components/EmployeeForm';
import type { Employee } from '../types/employee';
import { getCurrencySymbol } from '../utils/currency';

type ModalState =
  | { open: false }
  | { open: true; mode: 'view' | 'edit' | 'create'; employeeId: number | null };

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const { data, isLoading, isError } = useEmployees(page, pageSize, search);
  const deleteMutation = useDeleteEmployee();

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function openModal(mode: 'view' | 'edit' | 'create', employeeId: number | null) {
    setModalState({ open: true, mode, employeeId });
  }

  function closeModal() {
    setModalState({ open: false });
  }

  function handleDelete(employee: Employee) {
    Modal.confirm({
      title: 'Delete employee?',
      content: `This will permanently delete ${employee.name}. This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(employee.id);
          message.success('Employee deleted');
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete employee');
        }
      },
    });
  }

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Country', dataIndex: 'country', key: 'country' },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      align: 'right' as const,
      render: (salary: number, record: Employee) =>
        `${getCurrencySymbol(record.country)}${salary.toLocaleString()}`,
    },
    {
      title: 'Employment Type',
      dataIndex: 'employment_type',
      key: 'employment_type',
      render: (type: string) => (
        <Tag color={type === 'Full-time' ? 'green' : 'orange'}>{type}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_: unknown, record: Employee) => {
        const items: MenuProps['items'] = [
          { key: 'view', label: 'View', onClick: () => openModal('view', record.id) },
          { key: 'edit', label: 'Edit', onClick: () => openModal('edit', record.id) },
          {
            key: 'delete',
            label: <span style={{ color: '#ff4d4f' }}>Delete</span>,
            onClick: () => handleDelete(record),
          },
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} aria-label="actions" />
          </Dropdown>
        );
      },
    },
  ];

  const employees = data?.employees ?? [];
  const total = data?.total ?? 0;

  const modalTitle = modalState.open
    ? modalState.mode === 'create'
      ? 'New Employee'
      : employees.find(e => e.id === modalState.employeeId)?.name ?? ''
    : '';

  if (isError) return <Alert type="error" message="Failed to load employees" style={{ margin: 24 }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 20, fontWeight: 700 }}>Employees</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input.Search
            placeholder="Search by name, email, role, department, country, or ID"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create', null)}>
            New Employee
          </Button>
        </div>
      </div>
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #e8e8e8',
        }}
      >
        <Table
          dataSource={employees}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (newPage, newPageSize) => {
              setPage(newPage);
              setPageSize(newPageSize);
            },
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
          }}
        />
      </div>
      <Modal
        open={modalState.open}
        title={modalTitle}
        onCancel={closeModal}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {modalState.open && (
          <EmployeeForm
            mode={modalState.mode}
            employeeId={modalState.employeeId}
            onCreated={() => closeModal()}
            onSaved={() => closeModal()}
            onDeleted={closeModal}
            onCancel={closeModal}
            onEdit={(id) => setModalState({ open: true, mode: 'edit', employeeId: id })}
          />
        )}
      </Modal>
    </div>
  );
}
```

- [ ] **Step 4: Run all frontend tests**

```bash
cd client && npx vitest run 2>&1 | tail -15
```

Expected: All tests pass (10 tests across EmployeesPage + other suites).

- [ ] **Step 5: Update `docs/ux-design.md` — section 5.1 page header row**

In `docs/ux-design.md`, replace the `**Page header row**` block in section 5.1 with:

```markdown
**Page header row** (above the table card):
- Left: "Employees" — 20px, weight 700
- Right (left to right): AntD `Input.Search` (width 320px, placeholder: `Search by name, email, role, department, country, or ID`) then "New Employee" AntD `Button` type `primary`
- `margin-bottom: 16px`
- Search fires on Enter or search icon click; resets pagination to page 1
```

- [ ] **Step 6: Run full test suite**

```bash
cd server && npx jest --no-coverage 2>&1 | tail -5
cd client && npx vitest run 2>&1 | tail -5
```

Expected: All backend and frontend tests pass.

- [ ] **Step 7: Start dev server and verify visually with Playwright**

Start the backend and frontend dev servers (in separate terminals or background):

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Use the Playwright plugin to open `http://localhost:5173` and verify:
1. Search box appears to the left of "New Employee" button with correct placeholder text
2. Typing "Alice" and pressing Enter filters the table to show only Alice-matching rows
3. Clearing the search box and pressing Enter restores all employees
4. Searching by partial ID (e.g. "100") returns matching rows
5. Pagination resets to page 1 after a search

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx client/src/pages/__tests__/EmployeesPage.test.tsx docs/ux-design.md
git commit -m "feat: add global search UI to EmployeesPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Single global search box on the employee list — Task 5
- ✅ Matches against ID, name, email, role, department, country — Task 1 (repository WHERE clause)
- ✅ Salary excluded from search — WHERE clause does not include salary
- ✅ `?search` optional param on `GET /api/employees` — Task 3
- ✅ `total` reflects filtered count — Task 1 (COUNT gets same WHERE clause)
- ✅ Empty/omitted search returns all employees — Task 1 (WHERE clause skipped when search is empty)
- ✅ Search resets to page 1 — Task 5 (`handleSearch` calls `setPage(1)`)
- ✅ Triggers on Enter or search icon click — AntD `Input.Search` `onSearch` handles both
- ✅ Placeholder text lists all searchable fields — Task 5
- ✅ Docs updated — Task 5 updates `ux-design.md`

**Type consistency:**
- `findPage(page, pageSize, search?)` — same signature used in Tasks 1, 2, 3
- `listEmployees(page, pageSize, search)` — same signature used in Tasks 2, 3
- `fetchEmployees(page, pageSize, search)` — same signature used in Tasks 4, 5
- `useEmployees(page, pageSize, search)` — same signature used in Tasks 4, 5
