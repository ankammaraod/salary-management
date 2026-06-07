# HR UX Table Enhancements — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the employees table viewport-filling and scrollable, show newest employees first by default with an ID sort toggle, and replace AntD's built-in pagination with a custom bar that shows rows-per-page, range, and prev/next controls.

**Date:** 2026-06-07
**Status:** Approved

---

## 1. Scope

Three self-contained changes to `EmployeesPage` and the backend employee query:

1. **Scrollable table** — table body fills remaining viewport height; no full-page scrolling
2. **ID sort** — default descending (newest first); user can toggle asc/desc via the ID column header
3. **Custom pagination bar** — replaces AntD's built-in pagination with a compact "Rows per page / range / prev-next" strip

---

## 2. Table Layout

- AntD `Table` gets `size="small"` for compact rows.
- AntD `Table` gets `scroll={{ y: 'calc(100vh - 270px)' }}`.
  - This offset accounts for: navbar (56px) + page padding top/bottom (48px) + page header row + margin (56px) + card padding + table header (110px) = ~270px.
  - Fine-tuned to ensure no vertical overflow outside the card.
- The table header row is sticky automatically when `scroll.y` is set (AntD default behaviour).
- The wrapping `<div>` card retains its existing white background, border-radius, box-shadow, and border.
- No full-page scroll — the only scrollable region is the table tbody.

---

## 3. ID Sort

### Frontend

- ID column definition gains:
  - `sorter: true` — marks column as server-side sortable
  - `defaultSortOrder: 'descend'`
  - `sortDirections: ['ascend', 'descend']`
- AntD `Table` `onChange` callback receives `(pagination, filters, sorter)`. Extract `sorter.order` (`'ascend' | 'descend' | undefined`). Map to `order: 'asc' | 'desc'` (undefined → `'desc'`).
- `sortOrder` state (`useState<'asc' | 'desc'>('desc')`) stored in `EmployeesPage`.
- Passed to `useEmployees(page, pageSize, search, sortOrder)` → `fetchEmployees(page, pageSize, search, sortOrder)` → `GET /api/employees?order=desc`.
- No other column has a sorter.

### Backend

- `GET /api/employees` accepts an optional `order` query param: `'asc' | 'desc'`, default `'desc'`.
- Route parses: `const order = req.query.order === 'asc' ? 'asc' : 'desc';`
- Service `listEmployees` receives `order` and passes to repository.
- Repository `findPage` adds `ORDER BY e.id ${order === 'asc' ? 'ASC' : 'DESC'}` to the Knex query (replaces any existing `orderBy`).

---

## 4. Custom Pagination Bar

### Component: `PaginationBar`

New file: `client/src/components/PaginationBar.tsx`

**Props:**
```typescript
interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}
```

**Layout** — three zones, `display: flex; justify-content: space-between; align-items: center`:

| Zone | Content |
|---|---|
| Left | `"Rows per page:"` label (12px, `colorTextSecondary`) + AntD `Select` (options: 20, 50, 100; width 72px) |
| Center | Range text: `"1–20 of 10,247"` computed as `(page-1)*pageSize + 1` – `Math.min(page*pageSize, total)` of `total.toLocaleString()` |
| Right | AntD `Button` icon-only `LeftOutlined` (prev) + `Button` icon-only `RightOutlined` (next) |

**Disabled states:**
- Prev button: `disabled` when `page === 1`
- Next button: `disabled` when `page * pageSize >= total`

**Behaviour:**
- Changing rows-per-page calls `onPageSizeChange(newSize)` and resets page to 1 (caller's responsibility).
- Prev/Next call `onPageChange(page - 1)` / `onPageChange(page + 1)`.

**Styling:**
- Container: `padding: 12px 16px`, sits inside the existing table card, below the table.
- No border above it — AntD table's bottom border provides visual separation.
- Matches existing card background (`#fff`).

### Integration in `EmployeesPage`

- AntD `Table` gets `pagination={false}`.
- `<PaginationBar>` is rendered directly below the `<Table>` inside the card `<div>`.
- `EmployeesPage` owns `page`, `pageSize`, `total` state (already has `page` and `pageSize`; `total` comes from `data?.total`).
- `onPageSizeChange` sets `pageSize` and resets `page` to 1.

---

## 5. Files Changed

| File | Change |
|---|---|
| `server/src/repositories/employeeRepository.ts` | Add `order: 'asc' \| 'desc'` param to `findPage`; update `orderBy` |
| `server/src/services/employeeService.ts` | Pass `order` through `listEmployees` |
| `server/src/routes/employees.ts` | Parse `order` query param; pass to service |
| `server/tests/repositories/employeeRepository.test.ts` | Add tests for sort order |
| `server/tests/services/employeeService.test.ts` | Add tests for sort order pass-through |
| `server/tests/routes/employees.test.ts` | Add tests for `?order=asc` / default |
| `client/src/api/employees.ts` | Add `order` param to `fetchEmployees` |
| `client/src/hooks/useEmployees.ts` | Add `order` param |
| `client/src/components/PaginationBar.tsx` | New component |
| `client/src/components/__tests__/PaginationBar.test.tsx` | New tests |
| `client/src/pages/EmployeesPage.tsx` | `size="small"`, `scroll.y`, `pagination={false}`, ID sorter, `<PaginationBar>` |
| `client/src/pages/__tests__/EmployeesPage.test.tsx` | Update pagination-related tests |
| `docs/ux-design.md` | Update pagination and table sections |

---

## 6. Out of Scope

- Sorting by any column other than ID.
- Persisting sort preference across sessions.
- Mobile / responsive layout.
- Any changes to the Insights page, EmployeeForm, or ImportCsvModal.
