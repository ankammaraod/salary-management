# Feature 3 — Employee Management (CRUD) Design

**Date:** 2026-06-06
**Status:** Approved

---

## Goal

Let the HR Manager create, view, edit, and delete employee records — all from a single `/employees` page with an inline master-detail layout. No page navigation between operations.

---

## Architecture

### Single-page layout

One route: `/employees`. The page has two panes:

```
┌─────────────────────────────────────────────────────────────┐
│  Top Nav                                                    │
├──────────────────┬──────────────────────────────────────────┤
│  EmployeeList    │  EmployeePanel                           │
│  (35%)           │  (65%)                                   │
│                  │                                          │
│  + New Employee  │  mode: empty | create | view | edit      │
│  ─────────────   │                                          │
│  Alice Johnson   │  EmployeeForm (same component,           │
│  Bob Martinez    │  mode prop controls inputs vs text)      │
│  Chen Wei        │                                          │
│  ...             │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

`EmployeesPage` owns panel state:

```typescript
type PanelState =
  | { mode: 'empty' }
  | { mode: 'create' }
  | { mode: 'view'; employeeId: number }
  | { mode: 'edit'; employeeId: number }
```

### Three-layer backend (follows architecture.md)

```
Route → Service → Repository → SQLite
```

---

## API Contract

| Method | Path | Success | Errors |
|---|---|---|---|
| `GET` | `/api/employees` | 200 `{ employees: Employee[], total: number }` | — |
| `GET` | `/api/employees/:id` | 200 `Employee` | 404 |
| `POST` | `/api/employees` | 201 `Employee` | 400 validation, 409 duplicate email |
| `PUT` | `/api/employees/:id` | 200 `Employee` | 400 validation, 404, 409 duplicate email |
| `DELETE` | `/api/employees/:id` | 204 (no body) | 404 |

**`GET /api/employees`** — returns all employees in this feature (no pagination). Feature 4 adds `page` and `pageSize` query params.

---

## Data Types

```typescript
// client/src/types/employee.ts  (mirrored in server/src/types/employee.ts)

interface Employee {
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

type CreateEmployeeDto = Omit<Employee, 'id'>;
type UpdateEmployeeDto = Omit<Employee, 'id'>;
```

---

## Backend — File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `server/src/types/employee.ts` | Shared type definitions |
| Create | `server/src/repositories/employeeRepository.ts` | Knex queries |
| Create | `server/src/services/employeeService.ts` | Validation + business logic |
| Create | `server/src/routes/employees.ts` | HTTP layer |
| Modify | `server/src/app.ts` | Register employee router |
| Create | `server/src/middleware/errors.ts` | Custom error classes (ValidationError, NotFoundError, ConflictError) |
| Modify | `server/src/middleware/errorHandler.ts` | Read `error.status` to return correct HTTP code |
| Create | `tests/repositories/employeeRepository.test.ts` | Repository integration tests |
| Create | `tests/services/employeeService.test.ts` | Service unit tests |
| Create | `tests/routes/employees.test.ts` | Route integration tests |

---

## Backend — Validation (Service Layer)

Manual validation, no external library. A private `validate` function in the service returns the first error string or `null`:

```typescript
function validate(dto: CreateEmployeeDto): string | null {
  if (!dto.name?.trim())                               return 'name is required';
  if (!dto.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'email is invalid';
  if (!['Male','Female','Other'].includes(dto.gender)) return 'invalid gender';
  if (!dto.role?.trim())                               return 'role is required';
  if (!dto.department?.trim())                         return 'department is required';
  if (!dto.country?.trim())                            return 'country is required';
  if (!dto.salary || dto.salary <= 0)                  return 'salary must be positive';
  if (!['Full-time','Contractor'].includes(dto.employment_type)) return 'invalid employment type';
  if (!dto.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/)) return 'joining_date must be YYYY-MM-DD';
  return null;
}
```

**Error classes** (in `server/src/middleware/errors.ts`):

```typescript
class ValidationError extends Error { status = 400; }
class NotFoundError extends Error   { status = 404; }
class ConflictError extends Error   { status = 409; }
```

Global error handler in `server/src/middleware/errorHandler.ts` reads `error.status` and responds with `{ error: error.message }`.

---

## Backend — Repository Interface

```typescript
interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: UpdateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}
```

---

## Backend — Service Interface

```typescript
interface IEmployeeService {
  listEmployees(): Promise<{ employees: Employee[]; total: number }>;
  getEmployee(id: number): Promise<Employee>;
  createEmployee(dto: CreateEmployeeDto): Promise<Employee>;
  updateEmployee(id: number, dto: UpdateEmployeeDto): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
}
```

---

## Frontend — File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `client/src/types/employee.ts` | Employee, CreateEmployeeDto types |
| Create | `client/src/api/employees.ts` | Fetch functions |
| Create | `client/src/hooks/useEmployees.ts` | React Query list |
| Create | `client/src/hooks/useEmployee.ts` | React Query single |
| Create | `client/src/hooks/useCreateEmployee.ts` | Mutation: POST |
| Create | `client/src/hooks/useUpdateEmployee.ts` | Mutation: PUT |
| Create | `client/src/hooks/useDeleteEmployee.ts` | Mutation: DELETE |
| Create | `client/src/components/EmployeeList.tsx` | Left pane |
| Create | `client/src/components/EmployeeForm.tsx` | Shared form (view/edit/create) |
| Create | `client/src/pages/EmployeesPage.tsx` | Page shell, owns panelState |
| Modify | `client/src/App.tsx` | Add `/employees` route, redirect `/` → `/employees` |

---

## Frontend — Component Behaviour

### EmployeesPage

- Owns `panelState` (`useState`)
- Passes callbacks to children: `onSelectEmployee(id)`, `onNewEmployee()`, `onEdit(id)`, `onDelete()`, `onCancel()`
- `onSelectEmployee` → sets `{ mode: 'view', employeeId: id }`
- `onNewEmployee` → sets `{ mode: 'create' }`
- `onEdit` → sets `{ mode: 'edit', employeeId: id }`
- After successful delete → sets `{ mode: 'empty' }`, shows `message.success('Employee deleted')`
- After successful create → sets `{ mode: 'view', employeeId: newId }`
- After successful update → sets `{ mode: 'view', employeeId: id }`
- Cancel on create/edit → reverts to previous state (`empty` if was creating, `view` if was editing)

### EmployeeList

- Uses `useEmployees` hook
- Renders each employee as a clickable row (name, role, department)
- Highlights the currently selected employee
- "+ New Employee" button at the top
- Loading: AntD `Spin`. Error: AntD `Alert`.

### EmployeeForm

Single component, `mode: 'view' | 'edit' | 'create'` prop.

**Header bar** (inside the panel, not the page nav):

| Mode | Left | Right |
|---|---|---|
| `view` | Name as title | Edit + Delete buttons |
| `edit` | "Editing: {name}" | Cancel + Save buttons |
| `create` | "New Employee" | Cancel + Save buttons |

**Form sections** (matches `docs/ux-design.md`):

| Section | Fields |
|---|---|
| Personal | Name, Email, Gender, Joining Date |
| Role & Employment | Role, Department, Country, Employment Type |
| Compensation | Salary |

- `view` mode: AntD `Descriptions` component — labels + plain text values
- `edit`/`create` mode: AntD `Form` with `Input`, `Select`, `DatePicker`, `InputNumber`
- Required fields marked with red `*`
- Validation errors appear inline under each field (AntD Form rules)
- Delete triggers `Modal.confirm` — "Delete {name}? This cannot be undone."

---

## Testing Strategy

### Repository (`tests/repositories/employeeRepository.test.ts`)
Real in-memory SQLite, migrated fresh per test. Covers: `findAll`, `findById`, `findByEmail`, `create`, `update`, `deleteById`.

### Service (`tests/services/employeeService.test.ts`)
Fake repository object injected. Covers: each invalid field returns correct error, duplicate email rejected, 404 on get/update/delete of missing employee, happy paths delegate to repo.

### Routes (`tests/routes/employees.test.ts`)
Supertest + fake service. Covers: status codes (201, 200, 204, 400, 404, 409) and response shape for all 5 endpoints.

---

## Out of Scope

- Pagination and search — Feature 4 and 5 respectively
- Currency display — salary stored as a number, displayed as-is; Feature 6 adds currency context
- Bulk operations — Feature 7
