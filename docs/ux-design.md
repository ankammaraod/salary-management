# UX Design System — ACME Salary Management

**Date:** 2026-06-06
**Status:** Approved

This document is the single source of truth for frontend UX decisions. Every page, component, and interaction in the product must follow these guidelines. When in doubt, check here first.

---

## 1. Design Principles

- **Data first** — The HR Manager is processing information, not browsing. Prioritize readability and scannability over decoration.
- **Consistency over novelty** — Same layout patterns, same interaction patterns, same component choices everywhere. Predictability is a feature.
- **Desktop only** — No responsive design. Minimum viewport: 1280px. Design at 1440px.
- **Ant Design v5 first** — Use AntD components before writing custom ones. Override via `theme` tokens only, never via inline style overrides to AntD internals.

---

## 2. Color & Theme

All colors come from the Ant Design v5 theme token system. The primary brand color is `#1677ff` (Ant Design default blue).

| Token | Value | Usage |
|---|---|---|
| `colorPrimary` | `#1677ff` | Buttons, links, active states, section headers |
| `colorError` | `#ff4d4f` | Delete buttons, error messages, required markers |
| `colorSuccess` | `#52c41a` | Full-time badge |
| `colorBgContainer` | `#ffffff` | Card backgrounds |
| `colorBgLayout` | `#f5f5f5` | Page background |
| `colorBorder` | `#e8e8e8` | Card borders, dividers |
| `colorTextSecondary` | `#888888` | Labels, subtitles, hints |

Configure once in `client/src/App.tsx` via `<ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>`.

---

## 3. Typography

Use Ant Design's default font stack. Do not introduce custom fonts.

| Element | Style |
|---|---|
| Page title (H1) | 20px, weight 700 |
| Section heading | 12px, weight 700, uppercase, `colorPrimary`, letter-spacing 0.8px |
| Field label | 12px, weight 600, `colorTextSecondary`, uppercase, letter-spacing 0.5px |
| Field value (view) | 14px, weight 400, `#222` |
| Prominent value (salary) | 18px, weight 700, `#111` |
| Hint / secondary text | 11px, `colorTextSecondary` |
| Monospace (ID) | 14px, `font-family: monospace` |

---

## 4. Layout

### Page shell

`AppLayout` wraps all routes and provides the consistent shell:

```
┌──────────────────────────────────────────────────────────────┐
│  ACME Salary Management          Employees                   │  ← 56px nav bar
├──────────────────────────────────────────────────────────────┤
│  Page background: #f5f5f5, padding: 24px                    │
│                                                              │
│  [page content — full width for Employees; 900px card        │
│   for future content-light pages like Insights, Upload]      │
└──────────────────────────────────────────────────────────────┘
```

### Top navigation bar (`AppLayout`)

- Background: `#fff`, `border-bottom: 1px solid #e8e8e8`
- Left: product name "ACME Salary Management" (bold, 16px)
- Nav links: right-aligned horizontal AntD `Menu`
  - Currently: **Employees** (active — highlighted in `colorPrimary`)
  - Add **Insights** and **Upload** when those features are built
- Height: 56px

### Content area

- Background: `#f5f5f5`, padding `24px`
- **Employees page**: full viewport width — no max-width constraint
- **Future pages** (Insights, Upload): white content card, `max-width: 900px`, centered, `border-radius: 10px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, `border: 1px solid #e8e8e8`

---

## 5. Component Patterns

### 5.1 Employees Page — Full-Width Table

`EmployeesPage` renders a full-width AntD `Table`. All CRUD operations open a modal — no sub-routes.

**Page header row** (above the table card):
- Left: "Employees" — 20px, weight 700
- Right: "New Employee" — AntD `Button` type `primary`
- `margin-bottom: 16px`

**Table card**: white, `border-radius: 10px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, `border: 1px solid #e8e8e8`

**Table columns**:

| Column | Notes |
|---|---|
| ID | Plain number |
| Name | Plain text |
| Role | Plain text |
| Department | Plain text |
| Country | Plain text |
| Salary | Currency symbol (from country) + `toLocaleString()`, right-aligned |
| Employment Type | AntD `Tag` — green for Full-time, orange for Contractor |
| Actions | Single `⋮` icon button (AntD `Dropdown`) |

Joining Date, Email, and Gender are not shown in the table — they are visible in the View modal.

**Currency symbol map** (in `client/src/utils/currency.ts`):

| Country | Symbol |
|---|---|
| USA | $ |
| United Kingdom | £ |
| Germany | € |
| France | € |
| India | ₹ |
| Japan | ¥ |
| Brazil | R$ |
| Australia | A$ |

**Actions dropdown** (per row):
- Clicking `⋮` opens an AntD `Dropdown` with: **View**, **Edit**, **Delete** (danger color)
- No inline action buttons on rows

**Pagination**: AntD `Table` built-in, 20 rows per page, `showSizeChanger: false`

### 5.2 Employee Form Modal (Create / View / Edit)

One React component (`EmployeeForm`) with a `mode` prop: `'create' | 'view' | 'edit'`. Used as the body of an AntD `Modal` (width 640px, `destroyOnHidden`, `footer={null}`).

**View mode identity block:**
- Avatar circle — 40px, initials from first + last name, `linear-gradient(135deg, #1677ff, #722ed1)` background, white text
- Name at 18px bold, email below in `colorTextSecondary`
- Badge chips: Role (blue), Department (purple), Employment Type (green/orange)
- Actions (Edit + Delete) at bottom-right of the identity block

**Edit mode identity block:**
- Avatar circle — 32px (same gradient)
- "Editing: {name}" label at 15px bold
- Actions (Cancel + Save) at right

**Create mode header:**
- "New Employee" label — no avatar
- Actions (Cancel + Save) at right

**Field sections** — three sections separated by section headers:

| Section | Fields |
|---|---|
| Personal | Name, Email, Gender, Joining Date |
| Role & Employment | Role, Department, Country, Employment Type |
| Compensation | Salary |

Section header style: 12px, bold, `colorPrimary`, uppercase, 0.8px letter-spacing, `border-bottom: 2px solid #e6f4ff`.

**Field layout:**
- Personal and Role & Employment: **2-column grid**, `gap: 12px`
- Compensation: single field, max-width 280px

**View mode fields:**
- Label: uppercase, `colorTextSecondary`, 11px
- Value: plain text, 14px
- Salary: 18px bold with "Local currency" hint below

**Edit/Create mode fields:**
- AntD `Form` + `Form.Item` for each field
- Text inputs: AntD `Input`
- Selects (Gender, Employment Type): AntD `Select`
- Date: AntD `DatePicker`, stored as `YYYY-MM-DD`
- Salary: AntD `InputNumber`

**Delete confirmation:**
- AntD `Modal.confirm` (not a custom modal)
- Title: "Delete employee?"
- Content: "This will permanently delete **{name}**. This action cannot be undone."
- OK button: danger type, label "Delete"

### 5.3 Status Badges

Use AntD `Tag` component for inline status chips:

| Value | AntD Tag color |
|---|---|
| Full-time | `green` |
| Contractor | `orange` |
| Male | `blue` |
| Female | `purple` |
| Other | `default` |

### 5.4 Loading States

- Table loading: AntD `Table` with `loading={true}` prop — shows spinner overlay
- Modal content loading: AntD `Spin` centered, size `large`
- Button loading: AntD `Button` with `loading` prop during form submit

### 5.5 Error States

- API errors on table fetch: AntD `Alert` type `error`, message "Failed to load employees"
- API errors on single employee fetch: AntD `Alert` type `error`, message "Failed to load employee"
- Form validation errors: AntD `Form` inline validation — errors appear below the relevant field, never as toasts

### 5.6 Success Feedback

- After create/edit: close modal — `useEmployees` cache is invalidated, table refreshes automatically
- After delete: close modal (or confirm dialog), show AntD `message.success('Employee deleted')` (auto-dismisses)

---

## 6. Routing

| Path | Component | Notes |
|---|---|---|
| `/employees` | `EmployeesPage` | Table + modal for all CRUD operations |

The root `/` redirects to `/employees`.

All CRUD operations (create, view, edit, delete) are handled via modal state inside `EmployeesPage` — no sub-routes. Modal state shape:

```typescript
type ModalState =
  | { open: false }
  | { open: true; mode: 'view' | 'edit' | 'create'; employeeId: number | null };
```

---

## 7. API & State Rules

- All API calls go through `client/src/api/employees.ts` — plain async fetch functions
- All server state is managed by React Query hooks in `client/src/hooks/`
- Pages never call `fetch` directly
- Form state: AntD `Form` (controlled via `form.setFieldsValue` on load for edit mode)
- Local UI state (modal open/closed): `useState`

---

## 8. Do Nots

- Do not use inline `style` to override Ant Design component internals — use `theme` tokens or `className`
- Do not place Save/Cancel at the bottom of the form — they live in the identity block header area
- Do not use custom modal components — use `Modal.confirm` for confirmations, AntD `Modal` for CRUD
- Do not show toasts for navigating actions (create/edit close modal) — only for destructive completions (delete)
- Do not add responsive breakpoints — desktop only
- Do not put business logic in React components — keep it in the API/hooks layer
- Do not navigate to sub-routes for employee detail/edit — use the modal
