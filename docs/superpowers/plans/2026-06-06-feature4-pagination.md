# Feature 4 — Server-Side Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace client-side pagination with server-side pagination so the browser fetches one page at a time, with a user-selectable page size (default 20, options 20/50/100).

**Architecture:** `GET /api/employees?page=1&pageSize=20` returns `{ employees: Employee[], total: number }`. The repository does a `COUNT(*)` and `LIMIT/OFFSET` in parallel. The frontend tracks `page` and `pageSize` in `useState`, passes both to `useEmployees(page, pageSize)`, and wires AntD Table's `pagination` prop with `showSizeChanger: true` and `pageSizeOptions: [20, 50, 100]`.

**Tech Stack:** Express + Knex (SQLite), React Query, AntD Table, Jest/Supertest (backend), Vitest + React Testing Library (frontend).

---

## File Map

| File | Change |
|---|---|
| `server/src/repositories/employeeRepository.ts` | Replace `findAll()` with `findPage(page, pageSize)` in interface and class |
| `server/src/services/employeeService.ts` | Change `listEmployees()` to `listEmployees(page, pageSize)`, call `findPage` |
| `server/src/routes/employees.ts` | Parse + validate `?page` / `?pageSize` query params, pass to service |
| `server/tests/repositories/employeeRepository.test.ts` | Replace `findAll` tests with `findPage` tests |
| `server/tests/services/employeeService.test.ts` | Update `makeRepo` factory, update `listEmployees` test |
| `server/tests/routes/employees.test.ts` | Update `makeService` mock shape, replace GET test, add param validation tests |
| `client/src/api/employees.ts` | `fetchEmployees(page, pageSize)` with query params, return `{ employees, total }` |
| `client/src/hooks/useEmployees.ts` | Accept `page` and `pageSize` params, include both in query key |
| `client/src/pages/EmployeesPage.tsx` | Add `page` + `pageSize` state, remove Role/Department columns, wire server pagination with size changer |
| `client/src/pages/__tests__/EmployeesPage.test.tsx` | Update mock data shape, update affected tests |

---

## Task 1: Repository — replace `findAll` with `findPage`

**Files:**
- Modify: `server/src/repositories/employeeRepository.ts`
- Modify: `server/tests/repositories/employeeRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the entire `describe('findAll', ...)` block in `server/tests/repositories/employeeRepository.test.ts` with:

```typescript
describe('findPage', () => {
  it('returns empty employees and total 0 when table is empty', async () => {
    const result = await repo.findPage(1, 20);
    expect(result.total).toBe(0);
    expect(result.employees).toHaveLength(0);
  });

  it('returns first page of employees and correct total', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    await repo.create({ ...VALID_DTO, email: 'carol@example.com', name: 'Carol' });
    const result = await repo.findPage(1, 2);
    expect(result.total).toBe(3);
    expect(result.employees).toHaveLength(2);
  });

  it('returns second page of employees', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    await repo.create({ ...VALID_DTO, email: 'carol@example.com', name: 'Carol' });
    const result = await repo.findPage(2, 2);
    expect(result.total).toBe(3);
    expect(result.employees).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npx jest tests/repositories/employeeRepository.test.ts --no-coverage
```

Expected: FAIL — `repo.findPage is not a function`

- [ ] **Step 3: Update the interface and implement `findPage`**

Replace the full contents of `server/src/repositories/employeeRepository.ts`:

```typescript
import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findPage(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  async findPage(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [countRow, employees] = await Promise.all([
      this.knex('employees').count('* as count').first<{ count: number | string }>(),
      this.knex('employees').select('*').limit(pageSize).offset(offset),
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

- [ ] **Step 4: Run all backend tests**

```bash
cd server && npx jest --no-coverage
```

Expected: all tests pass. TypeScript will also error if `findAll` is still referenced anywhere — check the compile output.

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/employeeRepository.ts server/tests/repositories/employeeRepository.test.ts
git commit -m "feat: replace findAll with findPage in employee repository"
```

---

## Task 2: Service — update `listEmployees` to accept pagination params

**Files:**
- Modify: `server/src/services/employeeService.ts`
- Modify: `server/tests/services/employeeService.test.ts`

- [ ] **Step 1: Write the failing test**

In `server/tests/services/employeeService.test.ts`, replace the `makeRepo` factory and the `listEmployees` describe block:

```typescript
// Replace makeRepo with:
function makeRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findPage: jest.fn().mockResolvedValue({ employees: [], total: 0 }),
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(ALICE),
    update: jest.fn().mockResolvedValue(ALICE),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// Replace the listEmployees describe block with:
describe('listEmployees', () => {
  it('delegates page and pageSize to repo.findPage and returns the result', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    const result = await service.listEmployees(1, 20);
    expect(repo.findPage).toHaveBeenCalledWith(1, 20);
    expect(result).toEqual(pageResult);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd server && npx jest tests/services/employeeService.test.ts --no-coverage
```

Expected: FAIL — TypeScript error or `repo.findPage is not a function` (because the old service still calls `findAll`).

- [ ] **Step 3: Update the service**

In `server/src/services/employeeService.ts`, replace the `listEmployees` method:

```typescript
listEmployees(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }> {
  return this.repo.findPage(page, pageSize);
}
```

The full updated file:

```typescript
import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { Employee, CreateEmployeeDto } from '../types/employee';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errors';

function validate(dto: CreateEmployeeDto): string | null {
  if (!dto.name?.trim())                                return 'name is required';
  if (!dto.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'email is invalid';
  if (!['Male', 'Female', 'Other'].includes(dto.gender)) return 'invalid gender';
  if (!dto.role?.trim())                                return 'role is required';
  if (!dto.department?.trim())                          return 'department is required';
  if (!dto.country?.trim())                             return 'country is required';
  if (!dto.salary || dto.salary <= 0)                   return 'salary must be positive';
  if (!['Full-time', 'Contractor'].includes(dto.employment_type)) return 'invalid employment type';
  if (!dto.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/)) return 'joining_date must be YYYY-MM-DD';
  return null;
}

export class EmployeeService {
  constructor(private readonly repo: IEmployeeRepository) {}

  listEmployees(page: number, pageSize: number): Promise<{ employees: Employee[]; total: number }> {
    return this.repo.findPage(page, pageSize);
  }

  async getEmployee(id: number): Promise<Employee> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('employee not found');
    return employee;
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    const error = validate(dto);
    if (error) throw new ValidationError(error);
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictError('email already exists');
    return this.repo.create(dto);
  }

  async updateEmployee(id: number, dto: CreateEmployeeDto): Promise<Employee> {
    const error = validate(dto);
    if (error) throw new ValidationError(error);
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('employee not found');
    const conflict = await this.repo.findByEmail(dto.email);
    if (conflict && conflict.id !== id) throw new ConflictError('email already exists');
    return this.repo.update(id, dto);
  }

  async deleteEmployee(id: number): Promise<void> {
    const employee = await this.repo.findById(id);
    if (!employee) throw new NotFoundError('employee not found');
    return this.repo.deleteById(id);
  }
}
```

- [ ] **Step 4: Run all backend tests**

```bash
cd server && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/employeeService.ts server/tests/services/employeeService.test.ts
git commit -m "feat: update listEmployees to accept page and pageSize params"
```

---

## Task 3: Route — parse and validate query params

**Files:**
- Modify: `server/src/routes/employees.ts`
- Modify: `server/tests/routes/employees.test.ts`

- [ ] **Step 1: Write the failing tests**

In `server/tests/routes/employees.test.ts`, make two changes:

**Change 1** — update `makeService` to return the new shape from `listEmployees`:

```typescript
function makeService(overrides: Partial<EmployeeService> = {}): EmployeeService {
  return {
    listEmployees: jest.fn().mockResolvedValue({ employees: [ALICE], total: 1 }),
    getEmployee: jest.fn().mockResolvedValue(ALICE),
    createEmployee: jest.fn().mockResolvedValue(ALICE),
    updateEmployee: jest.fn().mockResolvedValue({ ...ALICE, salary: 95000 }),
    deleteEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EmployeeService;
}
```

**Change 2** — replace the `describe('GET /api/employees', ...)` block entirely:

```typescript
describe('GET /api/employees', () => {
  it('returns 200 with paginated envelope', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=1&pageSize=20');
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].name).toBe('Alice Johnson');
    expect(res.body.total).toBe(1);
  });

  it('defaults page to 1 and pageSize to 20 when params are absent', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20);
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

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd server && npx jest tests/routes/employees.test.ts --no-coverage
```

Expected: FAIL — the GET test checks `res.body.employees` but the route still returns a flat array.

- [ ] **Step 3: Update the route**

Replace the full contents of `server/src/routes/employees.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { ValidationError } from '../middleware/errors';

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
    if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
    try {
      res.json(await service.listEmployees(page, pageSize));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      res.json(await service.getEmployee(id));
    } catch (err) { next(err); }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await service.createEmployee(req.body));
    } catch (err) { next(err); }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      res.json(await service.updateEmployee(id, req.body));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      await service.deleteEmployee(id);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 4: Run all backend tests**

```bash
cd server && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/employees.ts server/tests/routes/employees.test.ts
git commit -m "feat: add server-side pagination to GET /api/employees"
```

---

## Task 4: Frontend — update API function and hook

**Files:**
- Modify: `client/src/api/employees.ts`
- Modify: `client/src/hooks/useEmployees.ts`

No new test files — the hook is mocked in `EmployeesPage.test.tsx`; the API function is an integration-level concern covered by the backend route tests.

- [ ] **Step 1: Update the API function**

Replace `fetchEmployees` in `client/src/api/employees.ts`:

```typescript
import type { Employee, CreateEmployeeDto } from '../types/employee';

const BASE = '/api/employees';

async function parseError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? `request failed with status ${res.status}`);
}

export async function fetchEmployees(page: number, pageSize = 20): Promise<{ employees: Employee[]; total: number }> {
  const res = await fetch(`${BASE}?page=${page}&pageSize=${pageSize}`);
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchEmployee(id: number): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function updateEmployee(id: number, dto: CreateEmployeeDto): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) await parseError(res);
}
```

- [ ] **Step 2: Update the hook**

Replace the full contents of `client/src/hooks/useEmployees.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['employees', page, pageSize],
    queryFn: () => fetchEmployees(page, pageSize),
  });
}
```

React Query caches each `(page, pageSize)` combination independently.

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors. If `EmployeesPage.tsx` still calls `useEmployees()` without args, TypeScript will flag it here — that's expected and will be fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/employees.ts client/src/hooks/useEmployees.ts
git commit -m "feat: update fetchEmployees and useEmployees for server-side pagination"
```

---

## Task 5: EmployeesPage — wire server-side pagination, remove Role/Department columns

**Files:**
- Modify: `client/src/pages/EmployeesPage.tsx`
- Modify: `client/src/pages/__tests__/EmployeesPage.test.tsx`

- [ ] **Step 1: Update the tests first**

Replace the full contents of `client/src/pages/__tests__/EmployeesPage.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal, message } from 'antd';
import EmployeesPage from '../EmployeesPage';

vi.mock('../../hooks/useEmployees');
vi.mock('../../hooks/useDeleteEmployee');
vi.mock('../../components/EmployeeForm', () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="employee-form">mode:{mode}</div>,
}));

import { useEmployees } from '../../hooks/useEmployees';
import { useDeleteEmployee } from '../../hooks/useDeleteEmployee';

const EMPLOYEES = [
  {
    id: 1, name: 'Alice Johnson', role: 'Software Engineer', department: 'Engineering',
    country: 'Germany', salary: 87400, employment_type: 'Full-time' as const,
    email: 'alice@example.com', gender: 'Female' as const, joining_date: '2019-03-15',
  },
  {
    id: 2, name: 'Bob Martinez', role: 'Sales Manager', department: 'Sales',
    country: 'USA', salary: 90000, employment_type: 'Contractor' as const,
    email: 'bob@example.com', gender: 'Male' as const, joining_date: '2020-01-10',
  },
];

beforeEach(() => {
  vi.mocked(useEmployees).mockReturnValue({ data: { employees: EMPLOYEES, total: 2 }, isLoading: false, isError: false } as any);
  vi.mocked(useDeleteEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
});

describe('EmployeesPage', () => {
  it('renders employee names in the table', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
  });

  it('shows the New Employee button', () => {
    render(<EmployeesPage />);
    expect(screen.getByRole('button', { name: /new employee/i })).toBeInTheDocument();
  });

  it('opens modal in create mode when New Employee is clicked', () => {
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole('button', { name: /new employee/i }));
    expect(screen.getByTestId('employee-form')).toBeInTheDocument();
    expect(screen.getByTestId('employee-form')).toHaveTextContent('mode:create');
  });

  it('shows loading spinner when data is loading', () => {
    vi.mocked(useEmployees).mockReturnValue({ data: undefined, isLoading: true, isError: false } as any);
    const { container } = render(<EmployeesPage />);
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('renders salary with currency symbol based on country', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('€87,400')).toBeInTheDocument(); // Germany
    expect(screen.getByText('$90,000')).toBeInTheDocument(); // USA
  });

  it('renders employee IDs in the table', () => {
    render(<EmployeesPage />);
    const cells = document.querySelectorAll('.ant-table-cell');
    const cellTexts = Array.from(cells).map(c => c.textContent);
    expect(cellTexts).toContain('1');
    expect(cellTexts).toContain('2');
  });

  it('shows error message when delete fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('server error'));
    vi.mocked(useDeleteEmployee).mockReturnValue({ mutateAsync, isPending: false } as any);

    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
      config.onOk?.();
      return {} as any;
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => Promise.resolve() as any);

    render(<EmployeesPage />);

    fireEvent.click(screen.getAllByRole('button', { name: /actions/i })[0]);
    const deleteItem = await screen.findAllByText('Delete');
    fireEvent.click(deleteItem[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('server error');
    });

    confirmSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('shows error alert when fetch fails', () => {
    vi.mocked(useEmployees).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    render(<EmployeesPage />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd client && npx vitest run src/pages/__tests__/EmployeesPage.test.tsx
```

Expected: FAIL — `EmployeesPage` still calls `useEmployees()` with no args and uses `data` as an array.

- [ ] **Step 3: Update `EmployeesPage.tsx`**

Replace the full contents of `client/src/pages/EmployeesPage.tsx`:

```typescript
import { useState } from 'react';
import { Table, Button, Dropdown, Tag, Modal, message, Alert } from 'antd';
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
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const { data, isLoading, isError } = useEmployees(page, pageSize);
  const deleteMutation = useDeleteEmployee();

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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create', null)}>
          New Employee
        </Button>
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

- [ ] **Step 4: Run frontend tests**

```bash
cd client && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Check TypeScript**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx client/src/pages/__tests__/EmployeesPage.test.tsx
git commit -m "feat: wire server-side pagination in EmployeesPage, remove Role/Department columns"
```

---

## Task 6: Run full test suite and push

- [ ] **Step 1: Run all backend tests**

```bash
cd server && npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 2: Run all frontend tests**

```bash
cd client && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Push to origin**

```bash
git push origin main
```
