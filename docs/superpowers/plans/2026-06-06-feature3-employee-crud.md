# Feature 3 — Employee Management (CRUD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Employee CRUD feature — REST API (create/read/update/delete) backed by SQLite, and a single `/employees` page with a master-detail layout where all operations happen without page navigation.

**Architecture:** Three-layer backend (route → service → repository) with manual validation in the service. Frontend is a single `EmployeesPage` at `/employees` with `EmployeeList` (left pane) and `EmployeeForm` (right pane, mode-driven). One shared `EmployeeForm` component handles view, edit, and create modes via a `mode` prop.

**Tech Stack:** Node.js + Express + TypeScript, Knex + SQLite, Jest + Supertest (backend), React + Vite + TypeScript, Ant Design v5, React Query v5, Vitest + React Testing Library (frontend).

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `server/src/types/employee.ts` | Employee and CreateEmployeeDto types |
| Create | `server/src/middleware/errors.ts` | ValidationError, NotFoundError, ConflictError |
| Modify | `server/src/middleware/errorHandler.ts` | Read `error.status` for correct HTTP code |
| Create | `server/src/repositories/employeeRepository.ts` | IEmployeeRepository + EmployeeRepository |
| Create | `server/src/services/employeeService.ts` | EmployeeService with validation |
| Create | `server/src/routes/employees.ts` | Express router factory |
| Modify | `server/src/app.ts` | Wire employee router + errorHandler + notFound |
| Create | `server/tests/repositories/employeeRepository.test.ts` | Repository integration tests |
| Create | `server/tests/services/employeeService.test.ts` | Service unit tests |
| Create | `server/tests/routes/employees.test.ts` | Route integration tests |
| Modify | `client/package.json` | Add vitest, RTL, dayjs, @ant-design/icons |
| Modify | `client/vite.config.ts` | Add vitest test config block |
| Create | `client/src/test-setup.ts` | @testing-library/jest-dom import |
| Create | `client/src/types/employee.ts` | Employee and CreateEmployeeDto types |
| Create | `client/src/api/employees.ts` | Fetch functions |
| Create | `client/src/hooks/useEmployees.ts` | React Query list hook |
| Create | `client/src/hooks/useEmployee.ts` | React Query single hook |
| Create | `client/src/hooks/useCreateEmployee.ts` | Create mutation |
| Create | `client/src/hooks/useUpdateEmployee.ts` | Update mutation |
| Create | `client/src/hooks/useDeleteEmployee.ts` | Delete mutation |
| Create | `client/src/components/EmployeeList.tsx` | Left pane |
| Create | `client/src/components/EmployeeForm.tsx` | Right pane — view/edit/create |
| Create | `client/src/components/__tests__/EmployeeList.test.tsx` | RTL tests |
| Create | `client/src/components/__tests__/EmployeeForm.test.tsx` | RTL tests |
| Create | `client/src/pages/EmployeesPage.tsx` | Page shell, owns panelState |
| Modify | `client/src/App.tsx` | Add /employees route, redirect / → /employees |

---

## Task 1: Shared types + error infrastructure

**Files:**
- Create: `server/src/types/employee.ts`
- Create: `server/src/middleware/errors.ts`
- Modify: `server/src/middleware/errorHandler.ts`

- [ ] **Step 1: Create server types**

Create `server/src/types/employee.ts`:

```typescript
export interface Employee {
  id: number;
  name: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  role: string;
  department: string;
  country: string;
  salary: number;
  employment_type: 'Full-time' | 'Contractor';
  joining_date: string; // YYYY-MM-DD
}

export type CreateEmployeeDto = Omit<Employee, 'id'>;
```

- [ ] **Step 2: Create error classes**

Create `server/src/middleware/errors.ts`:

```typescript
export class ValidationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
```

- [ ] **Step 3: Update errorHandler to use error.status**

Replace `server/src/middleware/errorHandler.ts`:

```typescript
import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = status === 500 ? 'internal server error' : err.message;
  if (status === 500) console.error(err.message);
  res.status(status).json({ error: message });
}
```

- [ ] **Step 4: Verify existing tests still pass**

Run from `server/`:
```bash
npm test
```

Expected: `1 passed` (health check).

- [ ] **Step 5: Commit**

```bash
git add server/src/types/employee.ts server/src/middleware/errors.ts server/src/middleware/errorHandler.ts
git commit -m "feat: add employee types and error classes"
```

---

## Task 2: Employee Repository (TDD)

**Files:**
- Create: `server/tests/repositories/employeeRepository.test.ts`
- Create: `server/src/repositories/employeeRepository.ts`

- [ ] **Step 1: Write failing repository tests**

Create `server/tests/repositories/employeeRepository.test.ts`:

```typescript
import knex, { Knex } from 'knex';
import { EmployeeRepository } from '../../src/repositories/employeeRepository';
import type { CreateEmployeeDto } from '../../src/types/employee';

const TEST_CONFIG = {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
  migrations: { directory: './src/db/migrations' },
};

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Software Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

let db: Knex;
let repo: EmployeeRepository;

beforeEach(async () => {
  db = knex(TEST_CONFIG);
  await db.migrate.latest();
  repo = new EmployeeRepository(db);
});

afterEach(async () => {
  await db.destroy();
});

describe('findAll', () => {
  it('returns empty array when no employees', async () => {
    expect(await repo.findAll()).toEqual([]);
  });

  it('returns all inserted employees', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    expect(await repo.findAll()).toHaveLength(2);
  });
});

describe('findById', () => {
  it('returns the employee when found', async () => {
    const created = await repo.create(VALID_DTO);
    expect((await repo.findById(created.id))?.name).toBe('Alice Johnson');
  });

  it('returns null when not found', async () => {
    expect(await repo.findById(999)).toBeNull();
  });
});

describe('findByEmail', () => {
  it('returns the employee when email matches', async () => {
    await repo.create(VALID_DTO);
    expect((await repo.findByEmail('alice@example.com'))?.name).toBe('Alice Johnson');
  });

  it('returns null when email not found', async () => {
    expect(await repo.findByEmail('nobody@example.com')).toBeNull();
  });
});

describe('create', () => {
  it('inserts and returns the new employee with an id', async () => {
    const created = await repo.create(VALID_DTO);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Alice Johnson');
  });
});

describe('update', () => {
  it('updates fields and returns the updated employee', async () => {
    const created = await repo.create(VALID_DTO);
    const updated = await repo.update(created.id, { ...VALID_DTO, salary: 95000 });
    expect(updated.salary).toBe(95000);
  });
});

describe('deleteById', () => {
  it('removes the employee from the database', async () => {
    const created = await repo.create(VALID_DTO);
    await repo.deleteById(created.id);
    expect(await repo.findById(created.id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=employeeRepository
```

Expected: FAIL — `Cannot find module '../../src/repositories/employeeRepository'`.

- [ ] **Step 3: Implement the repository**

Create `server/src/repositories/employeeRepository.ts`:

```typescript
import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  findAll(): Promise<Employee[]> {
    return this.knex('employees').select('*');
  }

  async findById(id: number): Promise<Employee | null> {
    return (await this.knex('employees').where({ id }).first()) ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return (await this.knex('employees').where({ email }).first()) ?? null;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const [id] = await this.knex('employees').insert(dto);
    return this.findById(id) as Promise<Employee>;
  }

  async update(id: number, dto: CreateEmployeeDto): Promise<Employee> {
    await this.knex('employees').where({ id }).update(dto);
    return this.findById(id) as Promise<Employee>;
  }

  async deleteById(id: number): Promise<void> {
    await this.knex('employees').where({ id }).delete();
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=employeeRepository
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/employeeRepository.ts server/tests/repositories/employeeRepository.test.ts
git commit -m "feat: add employee repository with integration tests"
```

---

## Task 3: Employee Service (TDD)

**Files:**
- Create: `server/tests/services/employeeService.test.ts`
- Create: `server/src/services/employeeService.ts`

- [ ] **Step 1: Write failing service tests**

Create `server/tests/services/employeeService.test.ts`:

```typescript
import { EmployeeService } from '../../src/services/employeeService';
import type { IEmployeeRepository } from '../../src/repositories/employeeRepository';
import type { Employee, CreateEmployeeDto } from '../../src/types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Software Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

const ALICE: Employee = { id: 1, ...VALID_DTO };

function makeRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(ALICE),
    update: jest.fn().mockResolvedValue(ALICE),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('listEmployees', () => {
  it('returns all employees', async () => {
    const service = new EmployeeService(makeRepo({ findAll: jest.fn().mockResolvedValue([ALICE]) }));
    const result = await service.listEmployees();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice Johnson');
  });
});

describe('getEmployee', () => {
  it('returns the employee when found', async () => {
    const service = new EmployeeService(makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) }));
    expect((await service.getEmployee(1)).name).toBe('Alice Johnson');
  });

  it('throws 404 when not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.getEmployee(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createEmployee — validation', () => {
  it.each([
    ['name is required',                { name: '' }],
    ['email is invalid',                { email: 'not-an-email' }],
    ['invalid gender',                  { gender: 'Unknown' as any }],
    ['role is required',                { role: '' }],
    ['department is required',          { department: '' }],
    ['country is required',             { country: '' }],
    ['salary must be positive',         { salary: -1 }],
    ['invalid employment type',         { employment_type: 'Part-time' as any }],
    ['joining_date must be YYYY-MM-DD', { joining_date: '15-03-2019' }],
  ])('throws 400 when %s', async (_msg, override) => {
    const service = new EmployeeService(makeRepo());
    await expect(service.createEmployee({ ...VALID_DTO, ...override })).rejects.toMatchObject({ status: 400 });
  });

  it('throws 409 when email already exists', async () => {
    const service = new EmployeeService(makeRepo({ findByEmail: jest.fn().mockResolvedValue(ALICE) }));
    await expect(service.createEmployee(VALID_DTO)).rejects.toMatchObject({ status: 409 });
  });

  it('creates and returns the employee on valid input', async () => {
    const repo = makeRepo();
    const service = new EmployeeService(repo);
    const result = await service.createEmployee(VALID_DTO);
    expect(repo.create).toHaveBeenCalledWith(VALID_DTO);
    expect(result.id).toBe(1);
  });
});

describe('updateEmployee', () => {
  it('throws 400 on invalid input', async () => {
    const service = new EmployeeService(makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) }));
    await expect(service.updateEmployee(1, { ...VALID_DTO, name: '' })).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when employee not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.updateEmployee(999, VALID_DTO)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 409 when email belongs to a different employee', async () => {
    const OTHER: Employee = { id: 2, ...VALID_DTO, email: 'other@example.com' };
    const service = new EmployeeService(makeRepo({
      findById: jest.fn().mockResolvedValue(OTHER),
      findByEmail: jest.fn().mockResolvedValue(ALICE),
    }));
    await expect(service.updateEmployee(2, VALID_DTO)).rejects.toMatchObject({ status: 409 });
  });

  it('allows updating when email belongs to the same employee', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(ALICE),
      findByEmail: jest.fn().mockResolvedValue(ALICE),
    });
    const service = new EmployeeService(repo);
    await service.updateEmployee(1, VALID_DTO);
    expect(repo.update).toHaveBeenCalledWith(1, VALID_DTO);
  });
});

describe('deleteEmployee', () => {
  it('throws 404 when not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.deleteEmployee(999)).rejects.toMatchObject({ status: 404 });
  });

  it('calls deleteById when found', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) });
    const service = new EmployeeService(repo);
    await service.deleteEmployee(1);
    expect(repo.deleteById).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=employeeService
```

Expected: FAIL — `Cannot find module '../../src/services/employeeService'`.

- [ ] **Step 3: Implement the service**

Create `server/src/services/employeeService.ts`:

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

  listEmployees(): Promise<Employee[]> {
    return this.repo.findAll();
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=employeeService
```

Expected: `14 passed`.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/employeeService.ts server/tests/services/employeeService.test.ts
git commit -m "feat: add employee service with validation and unit tests"
```

---

## Task 4: Employee Routes + wire app.ts (TDD)

**Files:**
- Create: `server/tests/routes/employees.test.ts`
- Create: `server/src/routes/employees.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Write failing route tests**

Create `server/tests/routes/employees.test.ts`:

```typescript
import request from 'supertest';
import express from 'express';
import { createEmployeeRouter } from '../../src/routes/employees';
import { errorHandler } from '../../src/middleware/errorHandler';
import { ValidationError, NotFoundError, ConflictError } from '../../src/middleware/errors';
import type { EmployeeService } from '../../src/services/employeeService';
import type { Employee } from '../../src/types/employee';

const ALICE: Employee = {
  id: 1, name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female',
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

const VALID_BODY = {
  name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female',
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

function makeService(overrides: Partial<EmployeeService> = {}): EmployeeService {
  return {
    listEmployees: jest.fn().mockResolvedValue([ALICE]),
    getEmployee: jest.fn().mockResolvedValue(ALICE),
    createEmployee: jest.fn().mockResolvedValue(ALICE),
    updateEmployee: jest.fn().mockResolvedValue({ ...ALICE, salary: 95000 }),
    deleteEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EmployeeService;
}

function makeApp(service: EmployeeService) {
  const app = express();
  app.use(express.json());
  app.use('/api/employees', createEmployeeRouter(service));
  app.use(errorHandler);
  return app;
}

describe('GET /api/employees', () => {
  it('returns 200 with employee array', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Alice Johnson');
  });
});

describe('GET /api/employees/:id', () => {
  it('returns 200 with the employee', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice Johnson');
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ getEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).get('/api/employees/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('employee not found');
  });
});

describe('POST /api/employees', () => {
  it('returns 201 with the created employee', async () => {
    const res = await request(makeApp(makeService())).post('/api/employees').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });

  it('returns 400 on validation error', async () => {
    const app = makeApp(makeService({ createEmployee: jest.fn().mockRejectedValue(new ValidationError('name is required')) }));
    const res = await request(app).post('/api/employees').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  it('returns 409 on duplicate email', async () => {
    const app = makeApp(makeService({ createEmployee: jest.fn().mockRejectedValue(new ConflictError('email already exists')) }));
    const res = await request(app).post('/api/employees').send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email already exists');
  });
});

describe('PUT /api/employees/:id', () => {
  it('returns 200 with updated employee', async () => {
    const res = await request(makeApp(makeService())).put('/api/employees/1').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.salary).toBe(95000);
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ updateEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).put('/api/employees/999').send(VALID_BODY);
    expect(res.status).toBe(404);
  });

  it('returns 409 on email conflict', async () => {
    const app = makeApp(makeService({ updateEmployee: jest.fn().mockRejectedValue(new ConflictError('email already exists')) }));
    const res = await request(app).put('/api/employees/1').send(VALID_BODY);
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/employees/:id', () => {
  it('returns 204 on success', async () => {
    const res = await request(makeApp(makeService())).delete('/api/employees/1');
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ deleteEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).delete('/api/employees/999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=routes/employees
```

Expected: FAIL — `Cannot find module '../../src/routes/employees'`.

- [ ] **Step 3: Implement the employee router**

Create `server/src/routes/employees.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.listEmployees());
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.getEmployee(Number(req.params.id)));
    } catch (err) { next(err); }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await service.createEmployee(req.body));
    } catch (err) { next(err); }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.updateEmployee(Number(req.params.id), req.body));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.deleteEmployee(Number(req.params.id));
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
```

- [ ] **Step 4: Run route tests to confirm they pass**

```bash
npm test -- --testPathPattern=routes/employees
```

Expected: `8 passed`.

- [ ] **Step 5: Wire routes into app.ts**

Replace `server/src/app.ts`:

```typescript
import express, { Express } from 'express';
import knex from 'knex';
import knexConfig from '../knexfile';
import healthRouter from './routes/health';
import { createEmployeeRouter } from './routes/employees';
import { EmployeeRepository } from './repositories/employeeRepository';
import { EmployeeService } from './services/employeeService';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const env = process.env.NODE_ENV ?? 'development';
  const db = knex(knexConfig[env]);
  const employeeRepo = new EmployeeRepository(db);
  const employeeService = new EmployeeService(employeeRepo);

  app.use('/api/health', healthRouter);
  app.use('/api/employees', createEmployeeRouter(employeeService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 6: Run full test suite**

```bash
npm test
```

Expected: all backend tests pass.

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/employees.ts server/src/app.ts server/tests/routes/employees.test.ts
git commit -m "feat: add employee routes and wire app with error handling"
```

---

## Task 5: Frontend test setup + types + API layer

**Files:**
- Modify: `client/package.json`
- Modify: `client/vite.config.ts`
- Create: `client/src/test-setup.ts`
- Create: `client/src/types/employee.ts`
- Create: `client/src/api/employees.ts`

- [ ] **Step 1: Install frontend test dependencies and dayjs**

Run from `client/`:
```bash
npm install dayjs @ant-design/icons
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Add test script to client/package.json**

Add `"test": "vitest run"` to the scripts section in `client/package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "vitest run"
}
```

- [ ] **Step 3: Add vitest config to vite.config.ts**

Replace `client/vite.config.ts`:

```typescript
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
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Create test setup file**

Create `client/src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 5: Create client types**

Create `client/src/types/employee.ts`:

```typescript
export interface Employee {
  id: number;
  name: string;
  email: string;
  gender: 'Male' | 'Female' | 'Other';
  role: string;
  department: string;
  country: string;
  salary: number;
  employment_type: 'Full-time' | 'Contractor';
  joining_date: string; // YYYY-MM-DD
}

export type CreateEmployeeDto = Omit<Employee, 'id'>;
```

- [ ] **Step 6: Create API functions**

Create `client/src/api/employees.ts`:

```typescript
import type { Employee, CreateEmployeeDto } from '../types/employee';

const BASE = '/api/employees';

async function parseError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? `request failed with status ${res.status}`);
}

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(BASE);
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

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/package-lock.json client/vite.config.ts client/src/test-setup.ts client/src/types/employee.ts client/src/api/employees.ts
git commit -m "feat: add frontend test setup, employee types, and API layer"
```

---

## Task 6: React Query hooks

**Files:**
- Create: `client/src/hooks/useEmployees.ts`
- Create: `client/src/hooks/useEmployee.ts`
- Create: `client/src/hooks/useCreateEmployee.ts`
- Create: `client/src/hooks/useUpdateEmployee.ts`
- Create: `client/src/hooks/useDeleteEmployee.ts`

- [ ] **Step 1: Create useEmployees**

Create `client/src/hooks/useEmployees.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from '../api/employees';

export function useEmployees() {
  return useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });
}
```

- [ ] **Step 2: Create useEmployee**

Create `client/src/hooks/useEmployee.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchEmployee } from '../api/employees';

export function useEmployee(id: number | null) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id!),
    enabled: id !== null,
  });
}
```

- [ ] **Step 3: Create useCreateEmployee**

Create `client/src/hooks/useCreateEmployee.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee } from '../api/employees';

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}
```

- [ ] **Step 4: Create useUpdateEmployee**

Create `client/src/hooks/useUpdateEmployee.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateEmployee } from '../api/employees';
import type { CreateEmployeeDto } from '../types/employee';

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CreateEmployeeDto }) => updateEmployee(id, dto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
  });
}
```

- [ ] **Step 5: Create useDeleteEmployee**

Create `client/src/hooks/useDeleteEmployee.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteEmployee } from '../api/employees';

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/
git commit -m "feat: add React Query hooks for employee CRUD"
```

---

## Task 7: EmployeeList component (TDD)

**Files:**
- Create: `client/src/components/EmployeeList.tsx`
- Create: `client/src/components/__tests__/EmployeeList.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/__tests__/EmployeeList.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmployeeList from '../EmployeeList';

vi.mock('../../hooks/useEmployees');
import { useEmployees } from '../../hooks/useEmployees';

const EMPLOYEES = [
  { id: 1, name: 'Alice Johnson', role: 'Software Engineer', country: 'Germany',
    email: 'alice@example.com', gender: 'Female' as const, department: 'Engineering',
    salary: 87400, employment_type: 'Full-time' as const, joining_date: '2019-03-15' },
  { id: 2, name: 'Bob Martinez', role: 'Sales Manager', country: 'USA',
    email: 'bob@example.com', gender: 'Male' as const, department: 'Sales',
    salary: 90000, employment_type: 'Full-time' as const, joining_date: '2020-01-10' },
];

beforeEach(() => {
  vi.mocked(useEmployees).mockReturnValue({
    data: EMPLOYEES, isLoading: false, isError: false,
  } as any);
});

describe('EmployeeList', () => {
  it('renders employee names', () => {
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
  });

  it('shows employee count in header', () => {
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText(/employees \(2\)/i)).toBeInTheDocument();
  });

  it('calls onSelect with employee id when row clicked', () => {
    const onSelect = vi.fn();
    render(<EmployeeList selectedId={null} onSelect={onSelect} onNew={vi.fn()} />);
    fireEvent.click(screen.getByText('Alice Johnson'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onNew when New button is clicked', () => {
    const onNew = vi.fn();
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={onNew} />);
    fireEvent.click(screen.getByRole('button', { name: /new/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    vi.mocked(useEmployees).mockReturnValue({ isLoading: true, isError: false, data: undefined } as any);
    const { container } = render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useEmployees).mockReturnValue({ isLoading: false, isError: true, data: undefined } as any);
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run from `client/`:
```bash
npm test
```

Expected: FAIL — `Cannot find module '../EmployeeList'`.

- [ ] **Step 3: Implement EmployeeList**

Create `client/src/components/EmployeeList.tsx`:

```tsx
import { Spin, Alert, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useEmployees } from '../hooks/useEmployees';
import type { Employee } from '../types/employee';

interface Props {
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
}

export default function EmployeeList({ selectedId, onSelect, onNew }: Props) {
  const { data, isLoading, isError } = useEmployees();

  if (isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 40 }} />;
  if (isError) return <Alert type="error" message="Failed to load employees" style={{ margin: 16 }} />;

  const employees: Employee[] = data ?? [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e8e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Employees ({employees.length})</span>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={onNew}>New</Button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {employees.map((emp) => (
          <div
            key={emp.id}
            onClick={() => onSelect(emp.id)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              borderBottom: '1px solid #f0f0f0',
              borderLeft: emp.id === selectedId ? '3px solid #1677ff' : '3px solid transparent',
              background: emp.id === selectedId ? '#e6f4ff' : 'transparent',
            }}
          >
            <div style={{ fontWeight: emp.id === selectedId ? 600 : 400, fontSize: 13 }}>{emp.name}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{emp.role} · {emp.country}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/EmployeeList.tsx client/src/components/__tests__/EmployeeList.test.tsx
git commit -m "feat: add EmployeeList component with tests"
```

---

## Task 8: EmployeeForm component (TDD)

**Files:**
- Create: `client/src/components/EmployeeForm.tsx`
- Create: `client/src/components/__tests__/EmployeeForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/components/__tests__/EmployeeForm.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmployeeForm from '../EmployeeForm';

vi.mock('../../hooks/useEmployee');
vi.mock('../../hooks/useCreateEmployee');
vi.mock('../../hooks/useUpdateEmployee');
vi.mock('../../hooks/useDeleteEmployee');

import { useEmployee } from '../../hooks/useEmployee';
import { useCreateEmployee } from '../../hooks/useCreateEmployee';
import { useUpdateEmployee } from '../../hooks/useUpdateEmployee';
import { useDeleteEmployee } from '../../hooks/useDeleteEmployee';

const ALICE = {
  id: 1, name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female' as const,
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time' as const, joining_date: '2019-03-15',
};

const PROPS = {
  onCreated: vi.fn(), onSaved: vi.fn(), onDeleted: vi.fn(), onCancel: vi.fn(), onEdit: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useEmployee).mockReturnValue({ data: ALICE, isLoading: false, isError: false } as any);
  vi.mocked(useCreateEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useUpdateEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useDeleteEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
});

describe('EmployeeForm — view mode', () => {
  it('shows employee name', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('shows role and department as badges', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('shows formatted salary', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('87,400')).toBeInTheDocument();
  });
});

describe('EmployeeForm — create mode', () => {
  it('shows New Employee header', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByText('New Employee')).toBeInTheDocument();
  });

  it('shows name input', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('EmployeeForm — edit mode', () => {
  it('shows Editing label', () => {
    render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
    expect(screen.getByText(/editing/i)).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons', () => {
    render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../EmployeeForm'`.

- [ ] **Step 3: Implement EmployeeForm**

Create `client/src/components/EmployeeForm.tsx`:

```tsx
import { useEffect } from 'react';
import { Form, Input, Select, InputNumber, DatePicker, Button, Tag, Modal, message, Spin, Alert } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEmployee } from '../hooks/useEmployee';
import { useCreateEmployee } from '../hooks/useCreateEmployee';
import { useUpdateEmployee } from '../hooks/useUpdateEmployee';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import type { CreateEmployeeDto } from '../types/employee';

type Mode = 'view' | 'edit' | 'create';

interface Props {
  mode: Mode;
  employeeId: number | null;
  onCreated: (id: number) => void;
  onSaved: (id: number) => void;
  onDeleted: () => void;
  onCancel: () => void;
  onEdit: (id: number) => void;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other'].map(g => ({ label: g, value: g }));
const EMPLOYMENT_OPTIONS = ['Full-time', 'Contractor'].map(t => ({ label: t, value: t }));

const sectionHeader: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, color: '#1677ff', textTransform: 'uppercase',
  letterSpacing: '0.8px', borderBottom: '2px solid #e6f4ff', paddingBottom: 6, marginBottom: 12,
};

const fieldGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
};

function FieldValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 14, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export default function EmployeeForm({ mode, employeeId, onCreated, onSaved, onDeleted, onCancel, onEdit }: Props) {
  const [form] = Form.useForm();

  const { data: employee, isLoading, isError } = useEmployee(mode !== 'create' ? employeeId : null);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  useEffect(() => {
    if (employee && mode === 'edit') {
      form.setFieldsValue({ ...employee, joining_date: dayjs(employee.joining_date) });
    }
    if (mode === 'create') form.resetFields();
  }, [employee, mode, form]);

  if (mode !== 'create' && isLoading) return <Spin size="large" style={{ display: 'block', marginTop: 40 }} />;
  if (mode !== 'create' && isError) return <Alert type="error" message="Failed to load employee" style={{ margin: 16 }} />;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(values: Record<string, unknown>) {
    const dto: CreateEmployeeDto = {
      ...(values as CreateEmployeeDto),
      joining_date: (values.joining_date as Dayjs).format('YYYY-MM-DD'),
    };
    try {
      if (mode === 'create') {
        const created = await createMutation.mutateAsync(dto);
        onCreated(created.id);
      } else {
        const updated = await updateMutation.mutateAsync({ id: employeeId!, dto });
        onSaved(updated.id);
      }
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  function handleDelete() {
    Modal.confirm({
      title: 'Delete employee?',
      content: `This will permanently delete ${employee?.name}. This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        await deleteMutation.mutateAsync(employeeId!);
        message.success('Employee deleted');
        onDeleted();
      },
    });
  }

  const actions = mode === 'view' ? (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button onClick={() => onEdit(employeeId!)}>Edit</Button>
      <Button danger onClick={handleDelete}>Delete</Button>
    </div>
  ) : (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="primary" loading={isSubmitting} onClick={() => form.submit()}>Save</Button>
    </div>
  );

  if (mode === 'view' && employee) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8e8', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{employee.name}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{employee.email}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
              <Tag color="blue">{employee.role}</Tag>
              <Tag color="purple">{employee.department}</Tag>
              <Tag color={employee.employment_type === 'Full-time' ? 'green' : 'orange'}>{employee.employment_type}</Tag>
            </div>
          </div>
          {actions}
        </div>
        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          <div style={sectionHeader}>Personal</div>
          <div style={fieldGrid}>
            <FieldValue label="Gender" value={employee.gender} />
            <FieldValue label="Joining Date" value={employee.joining_date} />
          </div>
          <div style={sectionHeader}>Role & Employment</div>
          <div style={fieldGrid}>
            <FieldValue label="Role" value={employee.role} />
            <FieldValue label="Department" value={employee.department} />
            <FieldValue label="Country" value={employee.country} />
            <FieldValue label="Employment Type" value={employee.employment_type} />
          </div>
          <div style={sectionHeader}>Compensation</div>
          <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Salary</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{employee.salary.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Local currency</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e8e8e8', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          {mode === 'create' ? 'New Employee' : `Editing: ${employee?.name ?? ''}`}
        </div>
        {actions}
      </div>
      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div style={sectionHeader}>Personal</div>
          <div style={fieldGrid}>
            <Form.Item name="name" label="Name" rules={[{ required: true, message: 'name is required' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="Full name" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'email is required' }, { type: 'email', message: 'email is invalid' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="email@example.com" />
            </Form.Item>
            <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'gender is required' }]} style={{ marginBottom: 0 }}>
              <Select options={GENDER_OPTIONS} placeholder="Select gender" />
            </Form.Item>
            <Form.Item name="joining_date" label="Joining Date" rules={[{ required: true, message: 'joining date is required' }]} style={{ marginBottom: 0 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <div style={sectionHeader}>Role & Employment</div>
          <div style={fieldGrid}>
            <Form.Item name="role" label="Role" rules={[{ required: true, message: 'role is required' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="Job title" />
            </Form.Item>
            <Form.Item name="department" label="Department" rules={[{ required: true, message: 'department is required' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="Business unit" />
            </Form.Item>
            <Form.Item name="country" label="Country" rules={[{ required: true, message: 'country is required' }]} style={{ marginBottom: 0 }}>
              <Input placeholder="Country" />
            </Form.Item>
            <Form.Item name="employment_type" label="Employment Type" rules={[{ required: true, message: 'employment type is required' }]} style={{ marginBottom: 0 }}>
              <Select options={EMPLOYMENT_OPTIONS} placeholder="Select type" />
            </Form.Item>
          </div>

          <div style={sectionHeader}>Compensation</div>
          <div style={{ maxWidth: 280 }}>
            <Form.Item name="salary" label="Salary" rules={[{ required: true, message: 'salary is required' }]} style={{ marginBottom: 0 }}>
              <InputNumber min={1} style={{ width: '100%' }} placeholder="0" />
            </Form.Item>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>In the employee's local currency</div>
          </div>
        </Form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: all frontend tests pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/EmployeeForm.tsx client/src/components/__tests__/EmployeeForm.test.tsx
git commit -m "feat: add EmployeeForm component with view/edit/create modes and tests"
```

---

## Task 9: EmployeesPage + App routing + visual verification

**Files:**
- Create: `client/src/pages/EmployeesPage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create EmployeesPage**

Create `client/src/pages/EmployeesPage.tsx`:

```tsx
import { useState } from 'react';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';

type PanelState =
  | { mode: 'empty' }
  | { mode: 'create' }
  | { mode: 'view'; employeeId: number }
  | { mode: 'edit'; employeeId: number };

export default function EmployeesPage() {
  const [panelState, setPanelState] = useState<PanelState>({ mode: 'empty' });
  const [prevState, setPrevState] = useState<PanelState>({ mode: 'empty' });

  function handleSelect(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleNew() {
    setPrevState(panelState);
    setPanelState({ mode: 'create' });
  }

  function handleEdit(id: number) {
    setPrevState(panelState);
    setPanelState({ mode: 'edit', employeeId: id });
  }

  function handleCreated(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleSaved(id: number) {
    setPanelState({ mode: 'view', employeeId: id });
  }

  function handleDeleted() {
    setPanelState({ mode: 'empty' });
  }

  function handleCancel() {
    setPanelState(prevState);
  }

  const selectedId =
    panelState.mode === 'view' || panelState.mode === 'edit'
      ? panelState.employeeId
      : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f5f5f5' }}>
      <div style={{ width: '35%', background: '#fff', borderRight: '1px solid #e8e8e8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmployeeList selectedId={selectedId} onSelect={handleSelect} onNew={handleNew} />
      </div>
      <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {panelState.mode === 'empty' ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 14 }}>
            Select an employee or click New to create one
          </div>
        ) : (
          <EmployeeForm
            mode={panelState.mode}
            employeeId={'employeeId' in panelState ? panelState.employeeId : null}
            onCreated={handleCreated}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onCancel={handleCancel}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx**

Replace `client/src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import EmployeesPage from './pages/EmployeesPage';

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <Routes>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

- [ ] **Step 3: Start both dev servers**

In one terminal, from `server/`:
```bash
npm run dev
```

In another terminal, from `client/`:
```bash
npm run dev
```

Expected: server on port 3000, client on port 5173.

- [ ] **Step 4: Verify with Playwright**

Use the Playwright Claude plugin to open `http://localhost:5173` and verify:

1. Employee list loads in the left pane with employee names and roles
2. Clicking a row opens that employee's detail in the right pane (view mode)
3. Edit button → form switches to edit mode with fields pre-filled; change a value → Save → returns to view mode with updated value
4. New button → blank create form appears; fill all fields → Save → new employee appears selected in the list
5. Delete button on a viewed employee → confirmation modal → confirm → panel resets to empty, employee removed from list
6. Cancel on edit → returns to view mode for the same employee
7. Cancel on create → returns to previous panel state

- [ ] **Step 5: Run all tests**

From `server/`:
```bash
npm test
```

From `client/`:
```bash
npm test
```

Expected: all tests pass on both sides.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx client/src/App.tsx
git commit -m "feat: add EmployeesPage with master-detail layout completing Feature 3 CRUD"
```
