# Feature 7 — Bulk CSV Upload Design Spec

**Date:** 2026-06-07
**Status:** Approved

---

## Goal

Allow the HR Manager to upload a CSV file of new employees. The system validates every row client-side, shows a preview summary, and on confirm POSTs all rows to the server for an all-or-nothing insert.

---

## Approach

**Client-side parsing and validation, JSON POST to server.**

PapaParse runs in the browser and parses the CSV into row objects. The client validates every row against the same rules used by `createEmployee`. If any row fails, the entire upload is rejected and the HR Manager must fix the file and re-upload. Once all rows pass, the client POSTs the array as JSON to `POST /api/upload`. The server re-validates (defense in depth), checks email uniqueness, and inserts all rows in a single statement.

No file upload to the server. No multer. No new route in the browser.

---

## CSV Format

Nine columns, all required, order-independent. The header row must match exactly (case-sensitive, whitespace-trimmed):

| Column | Type | Validation |
|---|---|---|
| `name` | string | required, non-empty |
| `email` | string | required, valid email format |
| `gender` | string | `Male`, `Female`, or `Other` |
| `role` | string | required, non-empty |
| `department` | string | required, non-empty |
| `country` | string | required, non-empty |
| `salary` | number string | coerced to number, must be > 0 |
| `employment_type` | string | `Full-time` or `Contractor` |
| `joining_date` | string | `YYYY-MM-DD` format |

---

## File-Level Limits (client-side, checked before row parsing)

| Limit | Value |
|---|---|
| Max file size | 2 MB |
| Max rows | 500 |
| Required headers | All 9 columns above — missing or extra columns rejected |
| File format | `.csv` only |
| Empty file | Rejected (0 data rows) |

---

## Backend

### New endpoint

`POST /api/upload`

**Request body:**
```json
{ "employees": [ ...CreateEmployeeDto[] ] }
```

**Success — HTTP 201:**
```json
{ "inserted": 50 }
```

**Validation failure — HTTP 400:**
```json
{
  "error": "validation failed",
  "details": {
    "errors": [
      { "index": 0, "field": "email", "message": "email already exists" }
    ]
  }
}
```

### Validation layers (server-side)

1. **Schema re-validation** — same rules as `createEmployee` applied to each row; any failure returns 400
2. **In-batch duplicate email detection** — any email appearing more than once in the submitted array; each duplicate row gets a `RowError`
3. **DB collision check** — `findExistingEmails(emails[])` queries existing employees; any match gets a `RowError`
4. **Insert** — single multi-row Knex insert; all-or-nothing

### `RowError` type

```typescript
interface RowError {
  index: number;   // 0-based row index in the submitted array
  field: string;   // column name, e.g. "email"
  message: string; // human-readable, e.g. "email already exists"
}
```

### New files

| File | Responsibility |
|---|---|
| `server/src/routes/upload.ts` | `POST /api/upload` route, wired in `app.ts` |
| `server/src/controllers/uploadController.ts` | `UploadController` — parses body, calls service, responds |
| `server/src/services/uploadService.ts` | Validation (schema + in-batch duplicates + DB collision) + insert orchestration |
| `server/src/types/upload.ts` | `RowError` interface |

### Modified files

| File | Change |
|---|---|
| `server/src/repositories/employeeRepository.ts` | Add `insertMany(rows: CreateEmployeeDto[])` and `findExistingEmails(emails: string[])` |
| `server/src/app.ts` | Wire upload router |

### New controller

`server/src/controllers/uploadController.ts` — `UploadController` class with a single `bulkUpload(req, res, next)` method. Parses the request body, calls `uploadService.bulkUpload(employees)`, responds with `{ inserted }`. Follows the same four-layer pattern as all existing features.

---

## Frontend

### Entry point

`EmployeesPage` header row:

```
Employees        [Search…]  [New Employee]  [Import CSV]
```

"Import CSV" is a default (non-primary) AntD `Button` immediately to the right of "New Employee". Clicking opens `ImportCsvModal`.

### `ImportCsvModal`

AntD `Modal`, width 640px, `destroyOnHidden`, `footer={null}`.

**State machine:**

```
idle → parsing → preview-valid → uploading → success
              → preview-errors
              → file-error
```

| State | UI |
|---|---|
| `idle` | AntD `Upload.Dragger` (accept `.csv`, `beforeUpload` intercepts, no auto-upload). Below: "Expected columns: name, email, gender, role, department, country, salary, employment_type, joining_date" |
| `parsing` | AntD `Spin` size `large`, centered |
| `file-error` | AntD `Alert` type `error` with the file-level error message. "Choose a different file" link resets to `idle` |
| `preview-errors` | AntD `Alert` type `error` ("X rows have errors — fix the file and re-upload"). Scrollable AntD `Table` (max-height 320px, `size="small"`, `pagination={false}`) with columns: **Row** (`index + 2`), **Field**, **Error**. "Choose a different file" button resets to `idle` |
| `preview-valid` | AntD `Alert` type `success` ("N employees ready to import"). "Import N employees" primary button in footer area |
| `uploading` | "Import N employees" button shows `loading` state |
| `success` | AntD `Alert` type `success` ("N employees imported successfully"). AntD `Button` link "View Employees" (navigates to `/employees`, closes modal). "Upload another file" button resets to `idle`. Invalidates the `['employees']` React Query cache on entry to this state |

### Client-side validation rules (mirrors server)

Applied row-by-row after PapaParse succeeds:

- `name` — non-empty string
- `email` — matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `gender` — one of `Male`, `Female`, `Other`
- `role` — non-empty string
- `department` — non-empty string
- `country` — non-empty string
- `salary` — coerce to number, must be > 0
- `employment_type` — one of `Full-time`, `Contractor`
- `joining_date` — matches `/^\d{4}-\d{2}-\d{2}$/`
- Within-file duplicate emails — all occurrences of a repeated email are flagged

All errors across all rows are collected into a `RowError[]` before showing the preview. Display row number as `index + 2` (1-based + header row).

### New files

| File | Responsibility |
|---|---|
| `client/src/components/ImportCsvModal.tsx` | Modal component with state machine and all upload UI |
| `client/src/api/upload.ts` | `bulkUpload(employees: CreateEmployeeDto[]): Promise<{ inserted: number }>` |
| `client/src/hooks/useUpload.ts` | React Query `useMutation` wrapping `bulkUpload` |
| `client/src/types/upload.ts` | `RowError` interface (mirrors server shape) |
| `client/src/components/__tests__/ImportCsvModal.test.tsx` | Unit tests (mock `useUpload`, mock PapaParse) |

### Modified files

| File | Change |
|---|---|
| `client/src/pages/EmployeesPage.tsx` | Add "Import CSV" button, wire modal open/close state |
| `client/package.json` | Add `papaparse` and `@types/papaparse` |

### PapaParse config

```typescript
Papa.parse(file, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (h) => h.trim(),
  complete: (results) => { /* handle results */ },
  error: (err) => { /* handle error */ },
});
```

---

## Testing

| Layer | What is tested |
|---|---|
| `uploadService` unit tests | Schema validation errors, in-batch duplicate detection, DB collision errors, successful insert delegation |
| `POST /api/upload` route tests | 201 on valid body, 400 on schema failure, 400 on in-batch duplicate, 409 on DB collision |
| `employeeRepository` integration tests | `insertMany` inserts all rows, `findExistingEmails` returns correct matches |
| `ImportCsvModal` unit tests | idle state renders, file-error state, preview-errors state, preview-valid state, success state after mutation resolves |

---

## What is not built

- Template CSV download (columns are listed inline in the UI)
- Partial success (all-or-nothing only)
- Error report CSV download
- Upload progress bar
- Drag-and-drop outside the AntD `Upload.Dragger` component
