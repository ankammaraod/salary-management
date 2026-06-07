# HR UX Table Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the employees table viewport-filling and scrollable, sort by ID descending by default with a toggle, and replace AntD's built-in pagination with a custom bar showing rows-per-page, range text, and prev/next controls.

**Architecture:** Add an `order: 'asc' | 'desc'` param through the backend stack (repository → service → controller), update the frontend API and hook to pass it, build a standalone `PaginationBar` component (TDD), then wire everything into `EmployeesPage` with controlled sort state and `pagination={false}` on the table.

**Tech Stack:** Node.js/Express/Knex (backend), React/TypeScript/Ant Design v5/React Query (frontend), Jest/Supertest (server tests), Vitest/React Testing Library (client tests)

---

## File Map

| File | Change |
|---|---|
| `server/src/repositories/employeeRepository.ts` | Add `order` param to `findPage` + `IEmployeeRepository` interface |
| `server/src/services/employeeService.ts` | Pass `order` through `listEmployees` |
| `server/src/controllers/employeeController.ts` | Parse `?order` query param, default `'desc'` |
| `server/tests/repositories/employeeRepository.test.ts` | Add 2 sort-order tests |
| `server/tests/services/employeeService.test.ts` | Update 2 existing tests + add 1 new |
| `server/tests/routes/employees.test.ts` | Update 2 existing tests + add 2 new |
| `client/src/api/employees.ts` | Add `order` param to `fetchEmployees` |
| `client/src/hooks/useEmployees.ts` | Add `order` param; add to `queryKey` |
| `client/src/components/PaginationBar.tsx` | New component |
| `client/src/components/__tests__/PaginationBar.test.tsx` | New test file (9 tests) |
| `client/src/pages/EmployeesPage.tsx` | Add `sortOrder` state, `scroll`, `size="small"`, `pagination={false}`, ID sorter, `<PaginationBar>` |
| `client/src/pages/__tests__/EmployeesPage.test.tsx` | Update 1 assertion for `order` param |
| `docs/ux-design.md` | Update table and pagination sections |

---

## Task 1: Backend — add `order` param through repository → service → controller

**Files:**
- Modify: `server/src/repositories/employeeRepository.ts`
- Modify: `server/src/services/employeeService.ts`
- Modify: `server/src/controllers/employeeController.ts`
- Modify: `server/tests/repositories/employeeRepository.test.ts`
- Modify: `server/tests/services/employeeService.test.ts`
- Modify: `server/tests/routes/employees.test.ts`

- [ ] **Step 1: Add sort-order tests to the repository test file**

Open `server/tests/repositories/employeeRepository.test.ts` and add this new `describe` block at the bottom (after the `findExistingEmails` block):

```typescript
describe('findPage sort order', () => {
  it('returns employees in descending id order by default', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    const result = await repo.findPage(1, 20);
    expect(result.employees[0].id).toBeGreaterThan(result.employees[1].id);
  });

  it('returns employees in ascending id order when order is asc', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    const result = await repo.findPage(1, 20, '', 'asc');
    expect(result.employees[0].id).toBeLessThan(result.employees[1].id);
  });
});
```

- [ ] **Step 2: Run repository tests — expect 2 failures**

```bash
cd /Users/ankammaraodevireddy/playground/salary-management
npx jest server/tests/repositories/employeeRepository.test.ts --no-coverage 2>&1 | tail -20
```

Expected: 2 new tests fail (sort tests currently return insertion order, not explicitly sorted).

- [ ] **Step 3: Update `IEmployeeRepository` interface and `findPage` implementation**

In `server/src/repositories/employeeRepository.ts`, replace the entire file:

```typescript
import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findPage(page: number, pageSize: number, search?: string, order?: 'asc' | 'desc'): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  async findPage(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc'): Promise<{ employees: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const withSearch = (qb: Knex.QueryBuilder): Knex.QueryBuilder => {
      if (!search) return qb;

      const escaped = search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const term = `%${escaped}%`;

      return qb.where(function () {
        this.whereRaw("CAST(id AS TEXT) LIKE ? ESCAPE '\\'", [term])
          .orWhereRaw("name LIKE ? ESCAPE '\\'", [term])
          .orWhereRaw("email LIKE ? ESCAPE '\\'", [term])
          .orWhereRaw("role LIKE ? ESCAPE '\\'", [term])
          .orWhereRaw("department LIKE ? ESCAPE '\\'", [term])
          .orWhereRaw("country LIKE ? ESCAPE '\\'", [term]);
      });
    };

    const [countRow, employees] = await Promise.all([
      withSearch(this.knex('employees')).count('* as count').first<{ count: number | string }>(),
      withSearch(this.knex('employees').select('*')).orderBy('id', order).limit(pageSize).offset(offset),
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

  async insertMany(rows: CreateEmployeeDto[]): Promise<void> {
    if (rows.length === 0) return;
    await this.knex('employees').insert(rows);
  }

  async findExistingEmails(emails: string[]): Promise<string[]> {
    if (emails.length === 0) return [];
    const rows = await this.knex('employees').whereIn('email', emails).select('email');
    return rows.map((r: { email: string }) => r.email);
  }
}
```

- [ ] **Step 4: Run repository tests — expect all passing**

```bash
npx jest server/tests/repositories/employeeRepository.test.ts --no-coverage 2>&1 | tail -10
```

Expected: all tests pass, including the 2 new sort-order tests.

- [ ] **Step 5: Update service tests**

In `server/tests/services/employeeService.test.ts`, update the two existing `listEmployees` tests and add one new one. Replace the `listEmployees` describe block with:

```typescript
describe('listEmployees', () => {
  it('delegates page, pageSize, and empty search to repo.findPage with default order desc', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    const result = await service.listEmployees(1, 20);
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, '', 'desc');
    expect(result).toEqual(pageResult);
  });

  it('delegates search term to repo.findPage', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    await service.listEmployees(1, 20, 'alice');
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, 'alice', 'desc');
  });

  it('passes order=asc to repo.findPage', async () => {
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue({ employees: [], total: 0 }) });
    const service = new EmployeeService(repo);
    await service.listEmployees(1, 20, '', 'asc');
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, '', 'asc');
  });
});
```

- [ ] **Step 6: Run service tests — expect 1 failure (existing tests now expect order arg)**

```bash
npx jest server/tests/services/employeeService.test.ts --no-coverage 2>&1 | tail -20
```

Expected: 2 existing tests fail (called with `(1, 20, '')` but now need `(1, 20, '', 'desc')`), 1 new test fails.

- [ ] **Step 7: Update `listEmployees` in the service**

In `server/src/services/employeeService.ts`, replace the `listEmployees` method:

```typescript
listEmployees(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc'): Promise<{ employees: Employee[]; total: number }> {
  return this.repo.findPage(page, pageSize, search, order);
}
```

- [ ] **Step 8: Run service tests — expect all passing**

```bash
npx jest server/tests/services/employeeService.test.ts --no-coverage 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 9: Update route/controller tests**

In `server/tests/routes/employees.test.ts`, update the two existing `GET /api/employees` tests that check `listEmployees` call args, and add two new tests. Replace the `GET /api/employees` describe block with:

```typescript
describe('GET /api/employees', () => {
  it('returns 200 with paginated envelope', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=1&pageSize=20');
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].name).toBe('Alice Johnson');
    expect(res.body.total).toBe(1);
  });

  it('defaults page to 1, pageSize to 20, search to empty string, and order to desc', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'desc');
  });

  it('passes search param to listEmployees', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?search=alice');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, 'alice', 'desc');
  });

  it('passes order=asc to listEmployees when ?order=asc', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?order=asc');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'asc');
  });

  it('defaults order to desc for unknown order values', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?order=invalid');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'desc');
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

- [ ] **Step 10: Run route tests — expect failures on the updated/new tests**

```bash
npx jest server/tests/routes/employees.test.ts --no-coverage 2>&1 | tail -20
```

Expected: 2 updated tests + 2 new tests fail (controller still calls `listEmployees` without `order`).

- [ ] **Step 11: Update `list` in the controller**

In `server/src/controllers/employeeController.ts`, replace the `list` method:

```typescript
async list(req: Request, res: Response, next: NextFunction): Promise<void> {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const search = String(req.query.search ?? '');
  const order: 'asc' | 'desc' = req.query.order === 'asc' ? 'asc' : 'desc';

  if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
  if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));

  res.json(await this.service.listEmployees(page, pageSize, search, order));
}
```

- [ ] **Step 12: Run all server tests — expect all passing**

```bash
npx jest --testPathPattern=server --no-coverage 2>&1 | tail -15
```

Expected: all server tests pass.

- [ ] **Step 13: Commit**

```bash
git add server/src/repositories/employeeRepository.ts \
        server/src/services/employeeService.ts \
        server/src/controllers/employeeController.ts \
        server/tests/repositories/employeeRepository.test.ts \
        server/tests/services/employeeService.test.ts \
        server/tests/routes/employees.test.ts
git commit -m "feat: add order param to employee list endpoint — defaults to id desc (TDD)"
```

---

## Task 2: Frontend — add `order` param to API function and hook

**Files:**
- Modify: `client/src/api/employees.ts`
- Modify: `client/src/hooks/useEmployees.ts`
- Modify: `client/src/pages/__tests__/EmployeesPage.test.tsx`

- [ ] **Step 1: Update the existing EmployeesPage test that checks useEmployees call args**

In `client/src/pages/__tests__/EmployeesPage.test.tsx`, find the test `'calls useEmployees with submitted search term when Enter is pressed'` and update its assertion:

```typescript
// Before:
expect(vi.mocked(useEmployees)).toHaveBeenCalledWith(1, 20, 'Alice');

// After:
expect(vi.mocked(useEmployees)).toHaveBeenCalledWith(1, 20, 'Alice', 'desc');
```

- [ ] **Step 2: Run EmployeesPage tests — expect 1 failure**

```bash
cd /Users/ankammaraodevireddy/playground/salary-management
npx vitest run client/src/pages/__tests__/EmployeesPage.test.tsx 2>&1 | tail -20
```

Expected: the `calls useEmployees with submitted search term` test fails (hook called without `'desc'`).

- [ ] **Step 3: Update `fetchEmployees` in the API layer**

In `client/src/api/employees.ts`, replace `fetchEmployees`:

```typescript
export async function fetchEmployees(page: number, pageSize = 20, search = '', order: 'asc' | 'desc' = 'desc'): Promise<{ employees: Employee[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), order });
  if (search) params.append('search', search);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) await parseError(res);
  return res.json();
}
```

- [ ] **Step 4: Update `useEmployees` hook**

Replace `client/src/hooks/useEmployees.ts` entirely:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc') {
  return useQuery({
    queryKey: ['employees', page, pageSize, search, order],
    queryFn: () => fetchEmployees(page, pageSize, search, order),
  });
}
```

- [ ] **Step 5: Run EmployeesPage tests — expect all passing**

```bash
npx vitest run client/src/pages/__tests__/EmployeesPage.test.tsx 2>&1 | tail -10
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add client/src/api/employees.ts \
        client/src/hooks/useEmployees.ts \
        client/src/pages/__tests__/EmployeesPage.test.tsx
git commit -m "feat: add order param to fetchEmployees and useEmployees hook"
```

---

## Task 3: PaginationBar component (TDD)

**Files:**
- Create: `client/src/components/PaginationBar.tsx`
- Create: `client/src/components/__tests__/PaginationBar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/__tests__/PaginationBar.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaginationBar from '../PaginationBar';

function renderBar(overrides: {
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
} = {}) {
  const onPageChange = overrides.onPageChange ?? vi.fn();
  const onPageSizeChange = overrides.onPageSizeChange ?? vi.fn();
  render(
    <PaginationBar
      page={overrides.page ?? 1}
      pageSize={overrides.pageSize ?? 20}
      total={overrides.total ?? 500}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />,
  );
  return { onPageChange, onPageSizeChange };
}

describe('PaginationBar', () => {
  it('shows range "1–20 of 500" on page 1 with pageSize 20', () => {
    renderBar();
    expect(screen.getByText('1–20 of 500')).toBeInTheDocument();
  });

  it('shows range "21–40 of 500" on page 2', () => {
    renderBar({ page: 2 });
    expect(screen.getByText('21–40 of 500')).toBeInTheDocument();
  });

  it('caps end at total on last page "481–500 of 500"', () => {
    renderBar({ page: 25, pageSize: 20, total: 500 });
    expect(screen.getByText('481–500 of 500')).toBeInTheDocument();
  });

  it('disables prev button on page 1', () => {
    renderBar({ page: 1 });
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    renderBar({ page: 25, pageSize: 20, total: 500 });
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('enables prev button on page 2', () => {
    renderBar({ page: 2 });
    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
  });

  it('enables next button when more pages remain', () => {
    renderBar({ page: 1, pageSize: 20, total: 500 });
    expect(screen.getByRole('button', { name: /next page/i })).not.toBeDisabled();
  });

  it('calls onPageChange(page - 1) when prev is clicked', () => {
    const { onPageChange } = renderBar({ page: 3 });
    fireEvent.click(screen.getByRole('button', { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange(page + 1) when next is clicked', () => {
    const { onPageChange } = renderBar({ page: 3 });
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
```

- [ ] **Step 2: Run tests — expect all 9 to fail**

```bash
npx vitest run client/src/components/__tests__/PaginationBar.test.tsx 2>&1 | tail -20
```

Expected: all 9 tests fail with `Cannot find module '../PaginationBar'`.

- [ ] **Step 3: Implement PaginationBar**

Create `client/src/components/PaginationBar.tsx`:

```typescript
import { Select, Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function PaginationBar({ page, pageSize, total, onPageChange, onPageSizeChange }: PaginationBarProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#888888' }}>Rows per page:</span>
        <Select
          value={pageSize}
          onChange={onPageSizeChange}
          options={[
            { value: 20, label: '20' },
            { value: 50, label: '50' },
            { value: 100, label: '100' },
          ]}
          style={{ width: 72 }}
          size="small"
        />
      </div>
      <span style={{ fontSize: 13 }}>
        {total === 0 ? '0 of 0' : `${start}–${end} of ${total.toLocaleString()}`}
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button
          icon={<LeftOutlined />}
          size="small"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        />
        <Button
          icon={<RightOutlined />}
          size="small"
          disabled={page * pageSize >= total}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect all 9 passing**

```bash
npx vitest run client/src/components/__tests__/PaginationBar.test.tsx 2>&1 | tail -10
```

Expected: 9/9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/PaginationBar.tsx \
        client/src/components/__tests__/PaginationBar.test.tsx
git commit -m "feat: add PaginationBar component with range display and prev/next controls (TDD)"
```

---

## Task 4: Wire EmployeesPage — scroll, sort, PaginationBar + visual verify + update docs

**Files:**
- Modify: `client/src/pages/EmployeesPage.tsx`
- Modify: `docs/ux-design.md`

Context: `EmployeesPage` already has `page`, `pageSize`, `search`, `searchInput`, and `modalState` state. `data?.total` is the total count. The Table currently has `pagination={{ current, pageSize, total, onChange, showSizeChanger, pageSizeOptions }}` — we're removing all of that.

- [ ] **Step 1: Run the full client test suite — confirm it's green before touching EmployeesPage**

```bash
cd /Users/ankammaraodevireddy/playground/salary-management
npx vitest run 2>&1 | tail -10
```

Expected: all client tests pass (green baseline).

- [ ] **Step 2: Replace EmployeesPage with the updated version**

Replace `client/src/pages/EmployeesPage.tsx` entirely:

```typescript
import { useState } from 'react';
import { Table, Button, Dropdown, Tag, Modal, message, Alert, Input } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { useEmployees } from '../hooks/useEmployees';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import EmployeeForm from '../components/EmployeeForm';
import ImportCsvModal from '../components/ImportCsvModal';
import PaginationBar from '../components/PaginationBar';
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading, isError } = useEmployees(page, pageSize, search, sortOrder);
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

  function handleTableChange(
    _: unknown,
    __: unknown,
    sorter: SorterResult<Employee> | SorterResult<Employee>[],
  ) {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
    setPage(1);
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: true,
      sortOrder: (sortOrder === 'asc' ? 'ascend' : 'descend') as 'ascend' | 'descend',
      sortDirections: ['ascend' as const, 'descend' as const],
    },
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
          <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
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
          size="small"
          loading={isLoading}
          pagination={false}
          scroll={{ y: 'calc(100vh - 270px)' }}
          onChange={handleTableChange as any}
        />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
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

- [ ] **Step 3: Run client tests — expect all passing**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all client tests pass. The `EmployeesPage` test for search now passes because `useEmployees` is called with `(1, 20, 'Alice', 'desc')`.

- [ ] **Step 4: Start the dev server and open the browser**

```bash
# In one terminal:
cd /Users/ankammaraodevireddy/playground/salary-management
npm run dev
```

Use the Playwright plugin to navigate to `http://localhost:5173/employees`.

- [ ] **Step 5: Visual verification checklist**

Using the Playwright plugin, verify each of the following:

1. Table renders with compact rows (less vertical padding than before)
2. Table body is scrollable — scroll down inside the table to verify rows scroll while the header stays fixed
3. The page itself does NOT scroll — only the table tbody scrolls
4. ID column header has a sort arrow pointing down (descending, newest first)
5. Click the ID column header — arrow flips to ascending, employees reorder with lowest IDs first
6. Click again — arrow flips back to descending
7. The PaginationBar is visible below the table with: "Rows per page:" dropdown, range text (e.g. "1–20 of 10,000"), prev (‹) and next (›) buttons
8. Prev button (‹) is grayed out / disabled on page 1
9. Click Next (›) — range text updates to "21–40 of 10,000", Prev becomes active
10. Click Prev (‹) — returns to page 1, Prev is grayed out again
11. Change "Rows per page" to 50 — range text updates to "1–50 of 10,000", page resets to 1
12. Navigate to the last page — Next button (›) is grayed out

- [ ] **Step 6: Update docs/ux-design.md — table and pagination sections**

In `docs/ux-design.md`, find section `### 5.1 Employees Page — Full-Width Table` and replace the **Pagination** line and the **Table card** block to reflect the new design:

Replace this paragraph:
```
**Pagination**: AntD `Table` built-in, default 20 rows per page, `showSizeChanger: true`, options: 20, 50, 100
```

With:
```
**Table props**: `size="small"` for compact rows. `scroll={{ y: 'calc(100vh - 270px)' }}` so the table body fills the remaining viewport height — no full-page scroll. Table header stays sticky. `pagination={false}` — pagination is handled by `<PaginationBar>`.

**PaginationBar** (`client/src/components/PaginationBar.tsx`): rendered inside the table card below the table. Three zones (flex, space-between):
- Left: "Rows per page:" label + AntD `Select` (options 20, 50, 100; width 72px; size small)
- Center: range text — e.g. `1–20 of 10,247`
- Right: prev (`LeftOutlined`) and next (`RightOutlined`) AntD icon buttons (size small); prev disabled when `page === 1`, next disabled when `page * pageSize >= total`

Changing rows-per-page resets page to 1.

**ID sort**: ID column has `sorter: true`, controlled `sortOrder` state (default `'desc'` = newest first), `sortDirections: ['ascend', 'descend']`. Sort is server-side — changing sort triggers a new `GET /api/employees?order=asc|desc` request. No other column is sortable.
```

- [ ] **Step 7: Run the full test suite one final time**

```bash
npx jest --testPathPattern=server --no-coverage 2>&1 | tail -5 && \
npx vitest run 2>&1 | tail -5
```

Expected: all server and client tests pass.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx docs/ux-design.md
git commit -m "feat: scrollable table, ID sort toggle, and custom PaginationBar in EmployeesPage"
```

---

## Self-Review

**Spec coverage:**
- ✅ Table viewport-fill scroll: Task 4 (`scroll={{ y: 'calc(100vh - 270px)' }}`)
- ✅ `size="small"` compact rows: Task 4
- ✅ ID sort default desc: Task 1 (backend default) + Task 4 (frontend default state + controlled sortOrder)
- ✅ ID sort toggle asc/desc only: Task 4 (`sortDirections: ['ascend', 'descend']`)
- ✅ `order` flows backend: Task 1 (repo → service → controller)
- ✅ `order` flows frontend: Task 2 (api → hook)
- ✅ PaginationBar range text: Task 3
- ✅ PaginationBar prev/next disabled at boundaries: Task 3
- ✅ PaginationBar rows-per-page dropdown (20/50/100): Task 3
- ✅ `pagination={false}` on Table: Task 4
- ✅ Visual verification: Task 4 Step 5
- ✅ Docs updated: Task 4 Step 6

**Type consistency:** `order: 'asc' | 'desc'` used consistently in all layers. `SorterResult<Employee>` imported from `antd/es/table/interface`. `PaginationBarProps` matches usage in `EmployeesPage`.

**No placeholders:** All steps have concrete code.
