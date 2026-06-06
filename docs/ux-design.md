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

Configure once in `client/src/main.tsx` via `<ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>`.

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

Every page uses the same shell:

```
┌─────────────────────────────────────────────┐
│  Top nav bar  (logo + nav links)            │
├─────────────────────────────────────────────┤
│  Page area  (background: #f5f5f5)           │
│  ┌─────────────────────────────────────┐    │
│  │  Content card  (max-width: 900px)   │    │
│  │  border-radius: 10px                │    │
│  │  box-shadow: 0 2px 8px rgba(0,0,0,.06)  │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

- Page background: `#f5f5f5`
- Content card: white, `border-radius: 10px`, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`, `border: 1px solid #e8e8e8`
- Max content width: **900px**, centered
- Page padding: `24px`

### Top navigation bar

- Background: `#fff`, `border-bottom: 1px solid #e8e8e8`
- Left: product logo/name "ACME Salary Management"
- Nav links: Employees, Insights (Feature 6), Upload (Feature 7)
- Height: 56px

### Breadcrumb

Every detail and form page shows a breadcrumb bar inside the content card:

```
← Employees / Alice Johnson
```

- Background: `#fafafa`, `border-bottom: 1px solid #e8e8e8`, padding `12px 20px`
- Back link in `colorPrimary`, chevron `/` separator in `#ccc`
- Action buttons (Save/Cancel or Edit/Delete) placed in the **right side of this bar**

---

## 5. Component Patterns

### 5.1 Employee Form Page (Create / View / Edit)

One React component (`EmployeeFormPage`) with a `mode` prop: `'create' | 'view' | 'edit'`.

**Identity block (view and edit modes only):**
- Avatar circle — initials from first + last name, gradient background (`linear-gradient(135deg, #1677ff, #722ed1)`)
- Name at 18px bold, email below in `colorTextSecondary`
- Badge chips: Role (blue), Department (indigo), Employment Type (green for Full-time, orange for Contractor)

**Field sections** — three sections separated by dividers:

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
- Salary: 18px bold with "local currency" hint below

**Edit/Create mode fields:**
- AntD `Form` + `Form.Item` for each field
- Text inputs: AntD `Input`
- Selects (Gender, Employment Type): AntD `Select`
- Date: AntD `DatePicker`, stored as `YYYY-MM-DD`
- Salary: AntD `InputNumber`
- Required indicator: red `*` next to label

**Breadcrumb bar actions:**

| Mode | Left | Right |
|---|---|---|
| View | `← Employees / {name}` | Edit button (outline primary) + Delete button (outline danger) |
| Edit | `← Employees / {name}` | Cancel button (default) + Save Employee button (primary) |
| Create | `← Employees / New Employee` | Cancel button (default) + Save Employee button (primary) |

**Delete confirmation:**
- AntD `Modal.confirm` (not a custom modal)
- Title: "Delete employee?"
- Content: "This will permanently delete **{name}**. This action cannot be undone."
- OK button: danger type, label "Delete"
- Cancel: default

### 5.2 Employee List (stub for Feature 3, full in Feature 4)

- AntD `Table` component
- Columns: ID, Name, Email, Role, Department, Country, Salary, Employment Type, Joining Date
- Each row is clickable — navigates to `/employees/:id`
- No pagination in the stub (Feature 4 adds pagination + search)

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

- Page-level loading: AntD `Spin` centered in the content card, size `large`
- Button loading: AntD `Button` with `loading` prop during form submit

### 5.5 Error States

- API errors on fetch: AntD `Result` component, status `500`, with a "Try again" button
- 404 (employee not found): AntD `Result`, status `404`, with a back link
- Form validation errors: AntD `Form` inline validation — errors appear below the relevant field, never as toasts

### 5.6 Success Feedback

- After create/edit: navigate back to `/employees/:id` (view mode) — no toast needed; the redirect is the confirmation
- After delete: navigate to `/employees`, show AntD `message.success('Employee deleted')` (auto-dismisses)

---

## 6. Routing

| Path | Component | Notes |
|---|---|---|
| `/employees` | `EmployeesPage` | All employee operations happen here |

The root `/` redirects to `/employees`.

All CRUD operations (create, view, edit, delete) are handled via panel state inside `EmployeesPage` — no sub-routes. The left pane shows the employee list; the right pane switches between `empty`, `view`, `edit`, and `create` modes based on user interaction.

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
- Do not place Save/Cancel at the bottom of the form — they live in the breadcrumb bar
- Do not use custom modal components — use `Modal.confirm` for confirmations and AntD `Modal` for any other dialogs
- Do not show toasts for navigating actions (create/edit redirect) — only for destructive completions (delete)
- Do not add responsive breakpoints — desktop only
- Do not put business logic in React components — keep it in the API/hooks layer
