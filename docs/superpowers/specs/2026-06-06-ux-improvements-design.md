# UX Improvements — App Shell & Employee Table Design

**Date:** 2026-06-06
**Status:** Approved

---

## Goal

Replace the current split-pane master-detail layout with a full-width paginated table and a modal-based CRUD flow. Add the missing app shell (top nav bar + page background) that will frame all current and future features.

---

## What Changes

### 1. App Shell

Every page gets a consistent shell:

**Top navigation bar**
- Height: 56px
- Background: `#fff`, `border-bottom: 1px solid #e8e8e8`
- Left: product name "ACME Salary Management" (bold)
- Right: nav links — "Employees" now; "Insights" and "Upload" added when those features are built
- Active nav link: `colorPrimary` (`#1677ff`), underline indicator
- Implemented as `AppLayout` component wrapping all routes

**Page area**
- Background: `#f5f5f5`
- Padding: `24px` all sides
- No max-width constraint on the employees page — full viewport width
- Future content-light pages (Insights, Upload) may use a centered card at 900px

---

### 2. Employees Page — Full-Width Table

Replaces the 35/65 split-pane. The page renders a single white card containing the table.

**Page header row** (above the card)
- Left: "Employees" — 20px, weight 700
- Right: "New Employee" — AntD `Button` type `primary`
- `margin-bottom: 16px`

**Card**
- `background: #fff`, `border-radius: 10px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, `border: 1px solid #e8e8e8`
- Full width within page padding

**Table columns**

| # | Column | Notes |
|---|---|---|
| 1 | Name | Plain text |
| 2 | Role | Plain text |
| 3 | Department | Plain text |
| 4 | Country | Plain text |
| 5 | Salary | `toLocaleString()`, right-aligned |
| 6 | Employment Type | AntD `Tag` — green for Full-time, orange for Contractor |
| 7 | Actions | Single `⋮` icon button (AntD `Dropdown`) |

Joining Date and Email are intentionally excluded from the table — they are visible in the View modal. Gender and ID are not shown in the table.

**Actions dropdown**

Clicking `⋮` on a row opens an AntD `Dropdown` with:
- **View** — opens modal in view mode
- **Edit** — opens modal in edit mode
- **Delete** — triggers `Modal.confirm` (existing behaviour, no modal component)

No inline action buttons. The ellipsis is the sole action entry point per row.

**Pagination**
- AntD `Table` built-in pagination
- 20 rows per page
- Shown at the bottom right of the table

---

### 3. View / Edit / Create Modal

All CRUD operations (except delete confirmation) open the same AntD `Modal`. No navigation to separate routes.

**Modal properties**
- Width: `640px`
- Title: employee name in view/edit mode; "New Employee" in create mode
- `destroyOnClose: true` — resets form state on close

**Modal content — view mode**

Identity block at the top:
- Avatar circle: 40px, initials from first + last name, `linear-gradient(135deg, #1677ff, #722ed1)` background, white text
- Name: 18px, weight 700
- Email: 14px, `colorTextSecondary`
- Tags: Role (blue), Department (purple), Employment Type (green/orange)

Field sections (same structure as current EmployeeForm view mode):
- Personal: Gender, Joining Date
- Role & Employment: Country, Employment Type
- Compensation: Salary (18px bold) with "Local currency" hint

**Modal footer — view mode**
- Right: Edit button (outline) + Delete button (danger outline)
- Edit button switches modal to edit mode (no close/reopen)

**Modal footer — edit / create mode**
- Right: Cancel button (default) + Save Employee button (primary, shows loading during submit)
- Cancel closes the modal

**EmployeeForm reuse**
The existing `EmployeeForm` component is reused as modal body content. Remove the fixed-height and `overflowY: auto` styles that assumed the split-pane context — the modal handles its own scroll. Add the avatar circle to the identity block (view/edit modes).

---

### 4. Component Changes

| Component | Action | Notes |
|---|---|---|
| `AppLayout` | Create | Nav bar + page wrapper; wraps all routes in `App.tsx` |
| `EmployeesPage` | Rewrite | Table + modal open/close state; no more split-pane or PanelState union |
| `EmployeeList` | Delete | Absorbed into `EmployeesPage` table |
| `EmployeeForm` | Update | Remove split-pane layout styles; add avatar circle; accept `onEdit` callback to switch mode within modal |

`EmployeesPage` owns modal state:
```typescript
const [modalState, setModalState] = useState<
  | { open: false }
  | { open: true; mode: 'view' | 'edit' | 'create'; employeeId: number | null }
>({ open: false });
```

---

### 5. What Does NOT Change

- All React Query hooks (`useEmployees`, `useEmployee`, `useCreateEmployee`, `useUpdateEmployee`, `useDeleteEmployee`)
- All API functions (`client/src/api/employees.ts`)
- All backend code (routes, service, repository)
- Delete flow: still `Modal.confirm` → `useDeleteEmployee` → `message.success`
- Form validation: AntD `Form` inline validation rules
- Success behaviour: after create/save, close modal and invalidate `['employees']` query

---

### 6. Routing

No change. All employee operations remain on `/employees`. No sub-routes introduced.

```
/employees  →  EmployeesPage (table + modal)
/*          →  redirect to /employees
```
