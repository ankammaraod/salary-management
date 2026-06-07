# Feature 7 — Bulk CSV Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Import CSV" button to the Employees page that opens a modal for uploading a CSV of new employees — validating client-side, showing a preview, and inserting all rows atomically on confirm.

**Architecture:** Client-side CSV parsing with PapaParse; validated rows POSTed as JSON to `POST /api/upload`; server re-validates schema + in-batch duplicates + DB email collisions and inserts all-or-nothing via Knex `insertMany`. New backend files follow the existing Route → Controller → Service pattern. New frontend files follow the existing api / hooks / component pattern. No new route in the browser — upload is a modal on `EmployeesPage`.

**Tech Stack:** Express + Knex + SQLite (backend), React + Ant Design v5 + PapaParse + React Query (frontend), Jest + Supertest (backend tests), Vitest + React Testing Library (frontend tests).

---

## File Map

**Create (server):**
- `server/src/types/upload.ts` — `RowError`, `IUploadRepository`, `BulkValidationError`
- `server/src/services/uploadService.ts` — `UploadService` class
- `server/src/controllers/uploadController.ts` — `UploadController` class
- `server/src/routes/upload.ts` — `createUploadRouter` function
- `server/tests/services/uploadService.test.ts`
- `server/tests/routes/upload.test.ts`

**Modify (server):**
- `server/src/repositories/employeeRepository.ts` — add `insertMany` and `findExistingEmails` to the class (not to `IEmployeeRepository`)
- `server/tests/repositories/employeeRepository.test.ts` — add tests for the two new methods
- `server/src/app.ts` — register `/api/upload` router

**Create (client):**
- `client/src/types/upload.ts` — `RowError`, `BulkApiError`
- `client/src/api/upload.ts` — `bulkUpload` fetch function
- `client/src/hooks/useUpload.ts` — `useUpload` mutation hook
- `client/src/utils/validateCsvRows.ts` — client-side row validation utility
- `client/src/components/ImportCsvModal.tsx` — modal with full upload state machine
- `client/src/utils/__tests__/validateCsvRows.test.ts`
- `client/src/components/__tests__/ImportCsvModal.test.tsx`

**Modify (client):**
- `client/src/pages/EmployeesPage.tsx` — add "Import CSV" button and wire modal
- `client/package.json` — add `papaparse` and `@types/papaparse`

---

### Task 1: Backend types

**Files:**
- Create: `server/src/types/upload.ts`

- [ ] **Step 1: Create the types file**

```typescript
// server/src/types/upload.ts
import type { CreateEmployeeDto } from './employee';

export interface RowError {
  index: number;
  field: string;
  message: string;
}

export interface IUploadRepository {
  insertMany(rows: CreateEmployeeDto[]): Promise<void>;
  findExistingEmails(emails: string[]): Promise<string[]>;
}

export class BulkValidationError extends Error {
  status = 400;
  details: { errors: RowError[] };

  constructor(errors: RowError[]) {
    super('validation failed');
    this.name = 'BulkValidationError';
    this.details = { errors };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd server && npm run build`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add server/src/types/upload.ts
git commit -m "feat: add RowError, IUploadRepository, and BulkValidationError types"
```

---

### Task 2: EmployeeRepository — insertMany + findExistingEmails

**Files:**
- Modify: `server/src/repositories/employeeRepository.ts`
- Modify: `server/tests/repositories/employeeRepository.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `server/tests/repositories/employeeRepository.test.ts`:

```typescript
describe('insertMany', () => {
  it('inserts all rows and they can be retrieved', async () => {
    const rows = [
      { ...VALID_DTO, email: 'bulk1@example.com' },
      { ...VALID_DTO, email: 'bulk2@example.com' },
    ];
    await repo.insertMany(rows);
    const result = await repo.findPage(1, 20);
    expect(result.total).toBe(2);
  });

  it('throws when a row has a duplicate email already in the DB', async () => {
    await repo.create(VALID_DTO);
    await expect(repo.insertMany([VALID_DTO])).rejects.toThrow();
  });
});

describe('findExistingEmails', () => {
  it('returns empty array when none of the emails exist', async () => {
    const result = await repo.findExistingEmails(['nobody@example.com']);
    expect(result).toEqual([]);
  });

  it('returns emails that already exist in the DB', async () => {
    await repo.create(VALID_DTO);
    const result = await repo.findExistingEmails([VALID_DTO.email, 'other@example.com']);
    expect(result).toEqual([VALID_DTO.email]);
  });

  it('returns empty array when given an empty list', async () => {
    const result = await repo.findExistingEmails([]);
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd server && npm test -- --testPathPattern=employeeRepository`
Expected: FAIL — `repo.insertMany is not a function`

- [ ] **Step 3: Add methods to EmployeeRepository**

Add these two methods to the `EmployeeRepository` class in `server/src/repositories/employeeRepository.ts`, after `deleteById`:

```typescript
async insertMany(rows: CreateEmployeeDto[]): Promise<void> {
  if (rows.length === 0) return;
  await this.knex('employees').insert(rows);
}

async findExistingEmails(emails: string[]): Promise<string[]> {
  if (emails.length === 0) return [];
  const rows = await this.knex('employees').whereIn('email', emails).select('email');
  return rows.map((r: { email: string }) => r.email);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd server && npm test -- --testPathPattern=employeeRepository`
Expected: PASS — all repository tests green

- [ ] **Step 5: Commit**

```bash
git add server/src/repositories/employeeRepository.ts server/tests/repositories/employeeRepository.test.ts
git commit -m "feat: add insertMany and findExistingEmails to EmployeeRepository (TDD)"
```

---

### Task 3: UploadService

**Files:**
- Create: `server/src/services/uploadService.ts`
- Create: `server/tests/services/uploadService.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `server/tests/services/uploadService.test.ts`:

```typescript
import { UploadService } from '../../src/services/uploadService';
import type { IUploadRepository, RowError } from '../../src/types/upload';
import { BulkValidationError } from '../../src/types/upload';
import type { CreateEmployeeDto } from '../../src/types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

function makeRepo(overrides: Partial<IUploadRepository> = {}): IUploadRepository {
  return {
    insertMany: jest.fn().mockResolvedValue(undefined),
    findExistingEmails: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('UploadService.bulkUpload', () => {
  it('returns { inserted: N } and calls insertMany on valid rows', async () => {
    const repo = makeRepo();
    const service = new UploadService(repo);
    const result = await service.bulkUpload([VALID_DTO]);
    expect(result).toEqual({ inserted: 1 });
    expect(repo.insertMany).toHaveBeenCalledWith([VALID_DTO]);
  });

  it('throws BulkValidationError when rows exceed 500', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ ...VALID_DTO, email: `row${i}@example.com` }));
    const service = new UploadService(makeRepo());
    await expect(service.bulkUpload(rows)).rejects.toBeInstanceOf(BulkValidationError);
  });

  it('throws with field error when name is empty', async () => {
    const invalid = { ...VALID_DTO, name: '' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'name' });
  });

  it('throws with field error when email is invalid format', async () => {
    const invalid = { ...VALID_DTO, email: 'not-an-email' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'email' });
  });

  it('throws with field error when gender is invalid', async () => {
    const invalid = { ...VALID_DTO, gender: 'Unknown' as 'Male' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'gender' });
  });

  it('throws with field error when employment_type is invalid', async () => {
    const invalid = { ...VALID_DTO, employment_type: 'PartTime' as 'Full-time' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'employment_type' });
  });

  it('throws with field error when salary is zero', async () => {
    const invalid = { ...VALID_DTO, salary: 0 };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'salary' });
  });

  it('throws with field error when joining_date is wrong format', async () => {
    const invalid = { ...VALID_DTO, joining_date: '15/03/2019' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch(e => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'joining_date' });
  });

  it('flags all occurrences of a duplicate email in the batch', async () => {
    const rows = [VALID_DTO, { ...VALID_DTO }]; // same email
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload(rows).catch(e => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    const emailErrors = err.details.errors.filter(e => e.field === 'email');
    expect(emailErrors).toHaveLength(2);
    expect(emailErrors.map(e => e.index).sort()).toEqual([0, 1]);
  });

  it('throws with DB collision errors when email already exists', async () => {
    const repo = makeRepo({
      findExistingEmails: jest.fn().mockResolvedValue([VALID_DTO.email]),
    });
    const service = new UploadService(repo);
    const err = await service.bulkUpload([VALID_DTO]).catch(e => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'email', message: 'email already exists' });
  });

  it('does not call insertMany when there are validation errors', async () => {
    const repo = makeRepo();
    const service = new UploadService(repo);
    await service.bulkUpload([{ ...VALID_DTO, name: '' }]).catch(() => {});
    expect(repo.insertMany).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd server && npm test -- --testPathPattern=uploadService`
Expected: FAIL — `Cannot find module '../../src/services/uploadService'`

- [ ] **Step 3: Implement UploadService**

Create `server/src/services/uploadService.ts`:

```typescript
import type { CreateEmployeeDto } from '../types/employee';
import type { IUploadRepository, RowError } from '../types/upload';
import { BulkValidationError } from '../types/upload';
import { ValidationError } from '../middleware/errors';

const MAX_ROWS = 500;

function validateRow(dto: CreateEmployeeDto, index: number): RowError[] {
  const errors: RowError[] = [];
  if (!dto.name?.trim())                                  errors.push({ index, field: 'name',            message: 'name is required' });
  if (!dto.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))  errors.push({ index, field: 'email',           message: 'email is invalid' });
  if (!['Male', 'Female', 'Other'].includes(dto.gender)) errors.push({ index, field: 'gender',          message: 'invalid gender' });
  if (!dto.role?.trim())                                  errors.push({ index, field: 'role',            message: 'role is required' });
  if (!dto.department?.trim())                            errors.push({ index, field: 'department',      message: 'department is required' });
  if (!dto.country?.trim())                               errors.push({ index, field: 'country',         message: 'country is required' });
  if (!dto.salary || dto.salary <= 0)                     errors.push({ index, field: 'salary',          message: 'salary must be positive' });
  if (!['Full-time', 'Contractor'].includes(dto.employment_type)) errors.push({ index, field: 'employment_type', message: 'invalid employment type' });
  if (!dto.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/))  errors.push({ index, field: 'joining_date',    message: 'joining_date must be YYYY-MM-DD' });
  return errors;
}

export class UploadService {
  constructor(private readonly repo: IUploadRepository) {}

  async bulkUpload(rows: CreateEmployeeDto[]): Promise<{ inserted: number }> {
    if (rows.length > MAX_ROWS) {
      throw new ValidationError(`exceeds maximum of ${MAX_ROWS} rows`);
    }

    const errors: RowError[] = [];

    for (let i = 0; i < rows.length; i++) {
      errors.push(...validateRow(rows[i], i));
    }

    const emailIndexMap = new Map<string, number[]>();
    for (let i = 0; i < rows.length; i++) {
      const email = (rows[i].email ?? '').toLowerCase();
      if (!emailIndexMap.has(email)) emailIndexMap.set(email, []);
      emailIndexMap.get(email)!.push(i);
    }
    for (const [, indices] of emailIndexMap) {
      if (indices.length > 1) {
        for (const idx of indices) {
          if (!errors.some(e => e.index === idx && e.field === 'email')) {
            errors.push({ index: idx, field: 'email', message: 'duplicate email in file' });
          }
        }
      }
    }

    if (errors.length > 0) throw new BulkValidationError(errors);

    const emails = rows.map(r => r.email);
    const existing = await this.repo.findExistingEmails(emails);
    if (existing.length > 0) {
      const dbErrors = rows
        .map((r, i) => existing.includes(r.email) ? { index: i, field: 'email', message: 'email already exists' } as RowError : null)
        .filter((e): e is RowError => e !== null);
      throw new BulkValidationError(dbErrors);
    }

    await this.repo.insertMany(rows);
    return { inserted: rows.length };
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd server && npm test -- --testPathPattern=uploadService`
Expected: PASS — all 10 service tests green

- [ ] **Step 5: Commit**

```bash
git add server/src/services/uploadService.ts server/tests/services/uploadService.test.ts
git commit -m "feat: add UploadService with schema validation, duplicate detection, and DB collision check (TDD)"
```

---

### Task 4: UploadController + Route + wire app.ts

**Files:**
- Create: `server/src/controllers/uploadController.ts`
- Create: `server/src/routes/upload.ts`
- Create: `server/tests/routes/upload.test.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Write the failing route tests**

Create `server/tests/routes/upload.test.ts`:

```typescript
import request from 'supertest';
import express from 'express';
import { createUploadRouter } from '../../src/routes/upload';
import { errorHandler } from '../../src/middleware/errorHandler';
import { BulkValidationError } from '../../src/types/upload';
import { ValidationError } from '../../src/middleware/errors';
import type { UploadService } from '../../src/services/uploadService';
import type { CreateEmployeeDto } from '../../src/types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

function makeService(overrides: Partial<UploadService> = {}): UploadService {
  return {
    bulkUpload: jest.fn().mockResolvedValue({ inserted: 1 }),
    ...overrides,
  } as unknown as UploadService;
}

function makeApp(service: UploadService) {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', createUploadRouter(service));
  app.use(errorHandler);
  return app;
}

describe('POST /api/upload', () => {
  it('returns 201 with inserted count on success', async () => {
    const res = await request(makeApp(makeService()))
      .post('/api/upload')
      .send({ employees: [VALID_DTO] });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
  });

  it('calls service.bulkUpload with the employees array', async () => {
    const service = makeService();
    await request(makeApp(service)).post('/api/upload').send({ employees: [VALID_DTO] });
    expect(service.bulkUpload).toHaveBeenCalledWith([VALID_DTO]);
  });

  it('returns 400 when employees field is missing', async () => {
    const res = await request(makeApp(makeService())).post('/api/upload').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when employees is an empty array', async () => {
    const res = await request(makeApp(makeService())).post('/api/upload').send({ employees: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 with details when service throws BulkValidationError', async () => {
    const errors = [{ index: 0, field: 'email', message: 'email already exists' }];
    const service = makeService({
      bulkUpload: jest.fn().mockRejectedValue(new BulkValidationError(errors)),
    });
    const res = await request(makeApp(service)).post('/api/upload').send({ employees: [VALID_DTO] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation failed');
    expect(res.body.details.errors).toHaveLength(1);
    expect(res.body.details.errors[0].field).toBe('email');
  });

  it('returns 400 when service throws ValidationError (e.g. >500 rows)', async () => {
    const service = makeService({
      bulkUpload: jest.fn().mockRejectedValue(new ValidationError('exceeds maximum of 500 rows')),
    });
    const res = await request(makeApp(service)).post('/api/upload').send({ employees: [VALID_DTO] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('exceeds maximum of 500 rows');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd server && npm test -- --testPathPattern=routes/upload`
Expected: FAIL — `Cannot find module '../../src/routes/upload'`

- [ ] **Step 3: Create UploadController**

Create `server/src/controllers/uploadController.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import type { UploadService } from '../services/uploadService';
import { BulkValidationError } from '../types/upload';
import { ValidationError } from '../middleware/errors';
import type { CreateEmployeeDto } from '../types/employee';

export class UploadController {
  constructor(private readonly service: UploadService) {}

  async bulkUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { employees } = req.body as { employees: unknown };

    if (!Array.isArray(employees) || employees.length === 0) {
      return next(new ValidationError('employees array is required'));
    }

    try {
      const result = await this.service.bulkUpload(employees as CreateEmployeeDto[]);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof BulkValidationError) {
        res.status(400).json({ error: err.message, details: err.details });
      } else {
        next(err);
      }
    }
  }
}
```

- [ ] **Step 4: Create upload route**

Create `server/src/routes/upload.ts`:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import type { UploadService } from '../services/uploadService';
import { UploadController } from '../controllers/uploadController';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

export function createUploadRouter(service: UploadService): Router {
  const router = Router();
  const ctrl = new UploadController(service);

  router.post('/', wrap((req, res, next) => ctrl.bulkUpload(req, res, next)));

  return router;
}
```

- [ ] **Step 5: Wire into app.ts**

In `server/src/app.ts`, add these imports after the insights imports:

```typescript
import { createUploadRouter } from './routes/upload';
import { UploadService } from './services/uploadService';
```

Add this line after the insights service wiring (before `app.use(notFound)`):

```typescript
const uploadService = new UploadService(employeeRepo);
app.use('/api/upload', createUploadRouter(uploadService));
```

- [ ] **Step 6: Run all server tests**

Run: `cd server && npm test`
Expected: PASS — all tests green including the new upload route tests

- [ ] **Step 7: Commit**

```bash
git add server/src/controllers/uploadController.ts server/src/routes/upload.ts server/tests/routes/upload.test.ts server/src/app.ts
git commit -m "feat: add UploadController, route, and wire app.ts (TDD)"
```

---

### Task 5: Frontend setup — types, API, hook, papaparse

**Files:**
- Modify: `client/package.json`
- Create: `client/src/types/upload.ts`
- Create: `client/src/api/upload.ts`
- Create: `client/src/hooks/useUpload.ts`

- [ ] **Step 1: Install papaparse**

Run: `cd client && npm install papaparse && npm install -D @types/papaparse`
Expected: papaparse and @types/papaparse added to package.json

- [ ] **Step 2: Create frontend types**

Create `client/src/types/upload.ts`:

```typescript
export interface RowError {
  index: number;
  field: string;
  message: string;
}

export interface BulkApiError {
  error: string;
  details?: { errors: RowError[] };
}
```

- [ ] **Step 3: Create API function**

Create `client/src/api/upload.ts`:

```typescript
import type { CreateEmployeeDto } from '../types/employee';
import type { BulkApiError } from '../types/upload';

export interface BulkUploadResult {
  inserted: number;
}

export async function bulkUpload(employees: CreateEmployeeDto[]): Promise<BulkUploadResult> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employees }),
  });
  if (!res.ok) {
    const data: BulkApiError = await res.json().catch(() => ({ error: `request failed with status ${res.status}` }));
    throw data;
  }
  return res.json();
}
```

- [ ] **Step 4: Create useUpload hook**

Create `client/src/hooks/useUpload.ts`:

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkUpload } from '../api/upload';
import type { BulkUploadResult } from '../api/upload';
import type { CreateEmployeeDto } from '../types/employee';
import type { BulkApiError } from '../types/upload';

export function useUpload() {
  const queryClient = useQueryClient();

  return useMutation<BulkUploadResult, BulkApiError, CreateEmployeeDto[]>({
    mutationFn: bulkUpload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd client && npm run build`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add client/package.json client/package-lock.json client/src/types/upload.ts client/src/api/upload.ts client/src/hooks/useUpload.ts
git commit -m "feat: add frontend upload types, API, and useUpload hook; install papaparse"
```

---

### Task 6: validateCsvRows utility

**Files:**
- Create: `client/src/utils/validateCsvRows.ts`
- Create: `client/src/utils/__tests__/validateCsvRows.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `client/src/utils/__tests__/validateCsvRows.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateCsvRows } from '../validateCsvRows';

const VALID_ROW = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: '87400',
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

describe('validateCsvRows', () => {
  it('returns valid row as CreateEmployeeDto with salary coerced to number', () => {
    const { valid, errors } = validateCsvRows([VALID_ROW]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0].salary).toBe(87400);
    expect(typeof valid[0].salary).toBe('number');
  });

  it('returns error for missing name', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, name: '' }]);
    expect(errors).toContainEqual({ index: 0, field: 'name', message: 'name is required' });
  });

  it('returns error for invalid email format', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, email: 'not-an-email' }]);
    expect(errors).toContainEqual({ index: 0, field: 'email', message: 'email is invalid' });
  });

  it('returns error for invalid gender value', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, gender: 'Unknown' }]);
    expect(errors).toContainEqual({ index: 0, field: 'gender', message: 'invalid gender' });
  });

  it('returns error for invalid employment_type value', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, employment_type: 'PartTime' }]);
    expect(errors).toContainEqual({ index: 0, field: 'employment_type', message: 'invalid employment type' });
  });

  it('returns error for non-positive salary', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, salary: '0' }]);
    expect(errors).toContainEqual({ index: 0, field: 'salary', message: 'salary must be positive' });
  });

  it('returns error for joining_date not in YYYY-MM-DD format', () => {
    const { errors } = validateCsvRows([{ ...VALID_ROW, joining_date: '15/03/2019' }]);
    expect(errors).toContainEqual({ index: 0, field: 'joining_date', message: 'joining_date must be YYYY-MM-DD' });
  });

  it('collects errors from multiple rows', () => {
    const rows = [
      { ...VALID_ROW, name: '' },
      { ...VALID_ROW, email: 'not-an-email', gender: 'Unknown' },
    ];
    const { errors } = validateCsvRows(rows);
    expect(errors.filter(e => e.index === 0)).toHaveLength(1);
    expect(errors.filter(e => e.index === 1)).toHaveLength(2);
  });

  it('flags all occurrences of a duplicate email', () => {
    const rows = [VALID_ROW, { ...VALID_ROW }]; // same email
    const { errors } = validateCsvRows(rows);
    const emailErrors = errors.filter(e => e.field === 'email');
    expect(emailErrors).toHaveLength(2);
    expect(emailErrors.map(e => e.index).sort()).toEqual([0, 1]);
  });

  it('returns empty valid array when there are any errors', () => {
    const { valid, errors } = validateCsvRows([{ ...VALID_ROW, name: '' }]);
    expect(errors.length).toBeGreaterThan(0);
    expect(valid).toHaveLength(0);
  });

  it('returns all rows as valid when there are no errors', () => {
    const rows = [VALID_ROW, { ...VALID_ROW, email: 'bob@example.com' }];
    const { valid, errors } = validateCsvRows(rows);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd client && npm test -- validateCsvRows`
Expected: FAIL — `Cannot find module '../validateCsvRows'`

- [ ] **Step 3: Implement validateCsvRows**

Create `client/src/utils/validateCsvRows.ts`:

```typescript
import type { CreateEmployeeDto } from '../types/employee';
import type { RowError } from '../types/upload';

export function validateCsvRows(rows: Record<string, string>[]): {
  valid: CreateEmployeeDto[];
  errors: RowError[];
} {
  const errors: RowError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const salary = Number(row.salary);

    if (!row.name?.trim())                                  errors.push({ index: i, field: 'name',            message: 'name is required' });
    if (!row.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))  errors.push({ index: i, field: 'email',           message: 'email is invalid' });
    if (!['Male', 'Female', 'Other'].includes(row.gender)) errors.push({ index: i, field: 'gender',          message: 'invalid gender' });
    if (!row.role?.trim())                                  errors.push({ index: i, field: 'role',            message: 'role is required' });
    if (!row.department?.trim())                            errors.push({ index: i, field: 'department',      message: 'department is required' });
    if (!row.country?.trim())                               errors.push({ index: i, field: 'country',         message: 'country is required' });
    if (!salary || salary <= 0)                             errors.push({ index: i, field: 'salary',          message: 'salary must be positive' });
    if (!['Full-time', 'Contractor'].includes(row.employment_type)) errors.push({ index: i, field: 'employment_type', message: 'invalid employment type' });
    if (!row.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/))  errors.push({ index: i, field: 'joining_date',    message: 'joining_date must be YYYY-MM-DD' });
  }

  const emailIndexMap = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const email = (rows[i].email ?? '').toLowerCase();
    if (!emailIndexMap.has(email)) emailIndexMap.set(email, []);
    emailIndexMap.get(email)!.push(i);
  }
  for (const [, indices] of emailIndexMap) {
    if (indices.length > 1) {
      for (const idx of indices) {
        if (!errors.some(e => e.index === idx && e.field === 'email')) {
          errors.push({ index: idx, field: 'email', message: 'duplicate email in file' });
        }
      }
    }
  }

  if (errors.length > 0) return { valid: [], errors };

  const valid = rows.map(row => ({
    name: row.name.trim(),
    email: row.email.trim(),
    gender: row.gender as CreateEmployeeDto['gender'],
    role: row.role.trim(),
    department: row.department.trim(),
    country: row.country.trim(),
    salary: Number(row.salary),
    employment_type: row.employment_type as CreateEmployeeDto['employment_type'],
    joining_date: row.joining_date,
  }));

  return { valid, errors: [] };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd client && npm test -- validateCsvRows`
Expected: PASS — all utility tests green

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/validateCsvRows.ts client/src/utils/__tests__/validateCsvRows.test.ts
git commit -m "feat: add validateCsvRows client-side utility (TDD)"
```

---

### Task 7: ImportCsvModal component

**Files:**
- Create: `client/src/components/ImportCsvModal.tsx`
- Create: `client/src/components/__tests__/ImportCsvModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/__tests__/ImportCsvModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImportCsvModal from '../ImportCsvModal';
import { MemoryRouter } from 'react-router-dom';

vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}));
vi.mock('../../hooks/useUpload');
vi.mock('../../utils/validateCsvRows');

import Papa from 'papaparse';
import { useUpload } from '../../hooks/useUpload';
import { validateCsvRows } from '../../utils/validateCsvRows';
import type { CreateEmployeeDto } from '../../types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice', email: 'alice@example.com', gender: 'Female',
  role: 'Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

function mockMutation(overrides: Record<string, unknown> = {}) {
  vi.mocked(useUpload).mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  } as any);
}

function renderModal(open = true) {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <ImportCsvModal open={open} onClose={onClose} />
    </MemoryRouter>
  );
  return { onClose };
}

beforeEach(() => {
  mockMutation();
  vi.mocked(validateCsvRows).mockReturnValue({ valid: [VALID_DTO], errors: [] });
});

describe('ImportCsvModal', () => {
  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Import CSV')).toBeInTheDocument();
  });

  it('shows expected columns in idle state', () => {
    renderModal();
    expect(screen.getByText(/Expected columns/)).toBeInTheDocument();
    expect(screen.getByText(/name, email, gender/)).toBeInTheDocument();
  });

  it('does not render modal content when open is false', () => {
    renderModal(false);
    expect(screen.queryByText('Expected columns')).not.toBeInTheDocument();
  });

  it('shows file-error alert when file exceeds 2MB', () => {
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = new File(['x'.repeat(2 * 1024 * 1024 + 1)], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(bigFile, 'size', { value: 2 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(screen.getByText(/2MB/)).toBeInTheDocument();
  });

  it('shows row-errors when validateCsvRows returns errors', () => {
    const errors = [{ index: 0, field: 'email', message: 'email is invalid' }];
    vi.mocked(validateCsvRows).mockReturnValue({ valid: [], errors });
    vi.mocked(Papa.parse).mockImplementation((_file: any, opts: any) => {
      opts.complete({
        data: [{ name: 'Alice', email: 'bad', gender: 'Female', role: 'Eng', department: 'Eng', country: 'Germany', salary: '1000', employment_type: 'Full-time', joining_date: '2020-01-01' }],
        meta: { fields: ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'] },
        errors: [],
      });
    });
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([''], 'test.csv', { type: 'text/csv' })] } });
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('shows success alert with row count when all rows are valid', () => {
    vi.mocked(Papa.parse).mockImplementation((_file: any, opts: any) => {
      opts.complete({
        data: [{ name: 'Alice', email: 'alice@example.com', gender: 'Female', role: 'Eng', department: 'Eng', country: 'Germany', salary: '1000', employment_type: 'Full-time', joining_date: '2020-01-01' }],
        meta: { fields: ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'] },
        errors: [],
      });
    });
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([''], 'test.csv', { type: 'text/csv' })] } });
    expect(screen.getByText(/ready to import/i)).toBeInTheDocument();
  });

  it('shows file-error when CSV has missing columns', () => {
    vi.mocked(Papa.parse).mockImplementation((_file: any, opts: any) => {
      opts.complete({
        data: [],
        meta: { fields: ['name', 'email'] }, // missing columns
        errors: [],
      });
    });
    renderModal();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([''], 'test.csv', { type: 'text/csv' })] } });
    expect(screen.getByText(/Missing columns/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd client && npm test -- ImportCsvModal`
Expected: FAIL — `Cannot find module '../ImportCsvModal'`

- [ ] **Step 3: Implement ImportCsvModal**

Create `client/src/components/ImportCsvModal.tsx`:

```typescript
import { useState } from 'react';
import { Modal, Alert, Button, Table, Spin, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { useNavigate } from 'react-router-dom';
import { useUpload } from '../hooks/useUpload';
import { validateCsvRows } from '../utils/validateCsvRows';
import type { RowError, BulkApiError } from '../types/upload';
import type { CreateEmployeeDto } from '../types/employee';
import type { ColumnsType } from 'antd/es/table';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_ROWS = 500;
const EXPECTED_HEADERS = ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'];

type Phase =
  | { type: 'idle' }
  | { type: 'parsing' }
  | { type: 'file-error'; message: string }
  | { type: 'preview-errors'; errors: RowError[] }
  | { type: 'preview-valid'; rows: CreateEmployeeDto[] }
  | { type: 'uploading'; rows: CreateEmployeeDto[] }
  | { type: 'success'; inserted: number };

const errorColumns: ColumnsType<RowError> = [
  { title: 'Row',   key: 'row',     render: (_, r) => r.index + 2, width: 70 },
  { title: 'Field', dataIndex: 'field',   key: 'field' },
  { title: 'Error', dataIndex: 'message', key: 'message' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ImportCsvModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>({ type: 'idle' });
  const navigate = useNavigate();
  const mutation = useUpload();

  function reset() {
    setPhase({ type: 'idle' });
    mutation.reset();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setPhase({ type: 'file-error', message: 'File exceeds 2MB limit' });
      return false;
    }

    setPhase({ type: 'parsing' });

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const fields = results.meta.fields ?? [];
        const missing = EXPECTED_HEADERS.filter(h => !fields.includes(h));
        const extra = fields.filter(h => !EXPECTED_HEADERS.includes(h));

        if (missing.length > 0) {
          setPhase({ type: 'file-error', message: `Missing columns: ${missing.join(', ')}` });
          return;
        }
        if (extra.length > 0) {
          setPhase({ type: 'file-error', message: `Unexpected columns: ${extra.join(', ')}` });
          return;
        }

        const data = results.data;

        if (data.length === 0) {
          setPhase({ type: 'file-error', message: 'File has no data rows' });
          return;
        }
        if (data.length > MAX_ROWS) {
          setPhase({ type: 'file-error', message: `File exceeds ${MAX_ROWS} row limit` });
          return;
        }

        const { valid, errors } = validateCsvRows(data);

        if (errors.length > 0) {
          setPhase({ type: 'preview-errors', errors });
        } else {
          setPhase({ type: 'preview-valid', rows: valid });
        }
      },
      error: (err: { message: string }) => {
        setPhase({ type: 'file-error', message: err.message });
      },
    });

    return false;
  }

  function handleImport() {
    if (phase.type !== 'preview-valid') return;
    const rows = phase.rows;
    setPhase({ type: 'uploading', rows });

    mutation.mutate(rows, {
      onSuccess: (result) => {
        setPhase({ type: 'success', inserted: result.inserted });
      },
      onError: (err) => {
        const apiErr = err as BulkApiError;
        if (apiErr.details?.errors) {
          setPhase({ type: 'preview-errors', errors: apiErr.details.errors });
        } else {
          setPhase({ type: 'file-error', message: apiErr.error ?? 'Upload failed' });
        }
      },
    });
  }

  const rowCount = phase.type === 'preview-valid' || phase.type === 'uploading' ? phase.rows.length : 0;

  return (
    <Modal title="Import CSV" open={open} onCancel={handleClose} footer={null} destroyOnHidden width={640}>
      {phase.type === 'idle' && (
        <div>
          <Upload.Dragger accept=".csv,text/csv" showUploadList={false} beforeUpload={handleFile}>
            <p><UploadOutlined style={{ fontSize: 24 }} /></p>
            <p>Click or drag a CSV file here</p>
          </Upload.Dragger>
          <p style={{ marginTop: 12, color: '#888888', fontSize: 12 }}>
            Expected columns: name, email, gender, role, department, country, salary, employment_type, joining_date
          </p>
          <p style={{ color: '#888888', fontSize: 12 }}>Maximum {MAX_ROWS} rows · 2MB file size</p>
        </div>
      )}

      {phase.type === 'parsing' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      )}

      {phase.type === 'file-error' && (
        <div>
          <Alert type="error" message={phase.message} />
          <Button style={{ marginTop: 12 }} onClick={reset}>Choose a different file</Button>
        </div>
      )}

      {phase.type === 'preview-errors' && (
        <div>
          <Alert
            type="error"
            message={`${phase.errors.length} error(s) found — fix the file and re-upload`}
            style={{ marginBottom: 12 }}
          />
          <Table
            dataSource={phase.errors}
            columns={errorColumns}
            rowKey={(r, i) => `${r.index}-${r.field}-${i}`}
            pagination={false}
            size="small"
            scroll={{ y: 320 }}
          />
          <Button style={{ marginTop: 12 }} onClick={reset}>Choose a different file</Button>
        </div>
      )}

      {(phase.type === 'preview-valid' || phase.type === 'uploading') && (
        <div>
          <Alert
            type="success"
            message={`${rowCount} employees ready to import`}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={reset}>Choose a different file</Button>
            <Button
              type="primary"
              loading={phase.type === 'uploading'}
              onClick={handleImport}
            >
              Import {rowCount} employees
            </Button>
          </div>
        </div>
      )}

      {phase.type === 'success' && (
        <div>
          <Alert
            type="success"
            message={`${phase.inserted} employees imported successfully`}
            style={{ marginBottom: 12 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" onClick={() => { handleClose(); navigate('/employees'); }}>
              View Employees
            </Button>
            <Button onClick={reset}>Upload another file</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd client && npm test -- ImportCsvModal`
Expected: PASS — all modal tests green

- [ ] **Step 5: Run full client test suite**

Run: `cd client && npm test`
Expected: PASS — all tests green

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ImportCsvModal.tsx client/src/components/__tests__/ImportCsvModal.test.tsx
git commit -m "feat: add ImportCsvModal with upload state machine (TDD)"
```

---

### Task 8: Wire EmployeesPage + visual verify

**Files:**
- Modify: `client/src/pages/EmployeesPage.tsx`

- [ ] **Step 1: Add import CSV button and modal to EmployeesPage**

In `client/src/pages/EmployeesPage.tsx`:

1. Add import at the top (after existing imports):
```typescript
import ImportCsvModal from '../components/ImportCsvModal';
```

2. Add state inside the component (after the existing `useState` declarations):
```typescript
const [importOpen, setImportOpen] = useState(false);
```

3. Replace the header button area — find this block:
```typescript
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create', null)}>
            New Employee
          </Button>
```

Replace with:
```typescript
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create', null)}>
            New Employee
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
```

4. Add the modal just before the closing `</div>` of the returned JSX (after the existing `EmployeeForm` modal):
```typescript
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
```

- [ ] **Step 2: Run full test suite**

Run: `cd server && npm test && cd ../client && npm test`
Expected: PASS — all tests green on both sides

- [ ] **Step 3: Start dev servers and verify visually**

In one terminal: `cd server && npm run dev`
In another terminal: `cd client && npm run dev`

Open `http://localhost:5173/employees` and verify:
- "Import CSV" button appears to the right of "New Employee"
- Clicking "Import CSV" opens the modal
- Modal shows the upload dragger and expected columns text
- Close button dismisses the modal

Upload a valid CSV (create a small test file with the expected headers and 2-3 rows) and verify:
- Parsing spinner appears briefly
- Preview shows "N employees ready to import" in green
- "Import N employees" button is clickable
- On confirm, success state shows "N employees imported successfully"
- "View Employees" navigates to the employees list and the new employees appear

Upload a CSV with errors (missing a required column, or bad email format) and verify:
- Error state shows the error table with Row / Field / Error columns
- "Choose a different file" resets to idle

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx
git commit -m "feat: add Import CSV button and ImportCsvModal to EmployeesPage"
```
