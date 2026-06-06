# UX Improvements — App Shell & Employee Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split-pane master-detail layout with a full-width paginated table + modal CRUD flow, and add the top navigation app shell.

**Architecture:** `AppLayout` wraps all routes with a 56px nav bar and `#f5f5f5` page background. `EmployeesPage` is rewritten to render a full-width AntD `Table` with a `⋮` ellipsis dropdown per row; all CRUD operations open a single AntD `Modal` containing the reused `EmployeeForm`. `EmployeeList` is deleted — the table replaces it entirely.

**Tech Stack:** React + TypeScript, Ant Design v5 (`Layout`, `Menu`, `Table`, `Dropdown`, `Modal`, `Tag`), React Query, Vitest + React Testing Library

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `client/src/components/AppLayout.tsx` | Create | 56px nav bar + `#f5f5f5` page background wrapper |
| `client/src/components/__tests__/AppLayout.test.tsx` | Create | Logo, nav link, children render |
| `client/src/App.tsx` | Modify | Wrap Routes with AppLayout |
| `client/src/components/EmployeeForm.tsx` | Modify | Add avatar initials; remove split-pane layout styles |
| `client/src/components/__tests__/EmployeeForm.test.tsx` | Modify | Add 2 avatar tests |
| `client/src/pages/EmployeesPage.tsx` | Rewrite | Full-width table + modal state + dropdown actions |
| `client/src/pages/__tests__/EmployeesPage.test.tsx` | Create | Table renders, modal opens, error/loading states |
| `client/src/components/EmployeeList.tsx` | Delete | Absorbed into EmployeesPage table |
| `client/src/components/__tests__/EmployeeList.test.tsx` | Delete | Component no longer exists |

---

### Task 1: AppLayout — nav bar + page wrapper

**Files:**
- Create: `client/src/components/AppLayout.tsx`
- Create: `client/src/components/__tests__/AppLayout.test.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Write the failing tests**

Create `client/src/components/__tests__/AppLayout.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../AppLayout';

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={['/employees']}>{ui}</MemoryRouter>);
}

describe('AppLayout', () => {
  it('renders the product name', () => {
    renderWithRouter(<AppLayout><div>content</div></AppLayout>);
    expect(screen.getByText('ACME Salary Management')).toBeInTheDocument();
  });

  it('renders the Employees nav link', () => {
    renderWithRouter(<AppLayout><div>content</div></AppLayout>);
    expect(screen.getByText('Employees')).toBeInTheDocument();
  });

  it('renders children in the page area', () => {
    renderWithRouter(<AppLayout><div>page content</div></AppLayout>);
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests — expect FAIL**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -A5 "AppLayout"
```

Expected: FAIL — `Cannot find module '../AppLayout'`

- [ ] **Step 3: Create AppLayout.tsx**

Create `client/src/components/AppLayout.tsx`:

```tsx
import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const { Header, Content } = Layout;

const NAV_ITEMS = [{ key: '/employees', label: 'Employees' }];

export default function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          height: 56,
          lineHeight: '56px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: '#222', marginRight: 40 }}>
          ACME Salary Management
        </span>
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', flex: 1 }}
        />
      </Header>
      <Content style={{ background: '#f5f5f5', padding: 24 }}>
        {children}
      </Content>
    </Layout>
  );
}
```

- [ ] **Step 4: Update App.tsx to wrap Routes with AppLayout**

Replace `client/src/App.tsx` entirely:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import AppLayout from './components/AppLayout';
import EmployeesPage from './pages/EmployeesPage';

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1677ff' } }}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="*" element={<Navigate to="/employees" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}
```

- [ ] **Step 5: Run the tests — expect 3 PASS**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -A5 "AppLayout"
```

Expected: 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/components/AppLayout.tsx client/src/components/__tests__/AppLayout.test.tsx client/src/App.tsx
git commit -m "feat: add AppLayout nav bar with page shell"
```

---

### Task 2: EmployeeForm — avatar initials + remove split-pane layout styles

**Files:**
- Modify: `client/src/components/EmployeeForm.tsx`
- Modify: `client/src/components/__tests__/EmployeeForm.test.tsx`

**Context:** `ALICE` fixture in the test is `{ name: 'Alice Johnson', ... }` — initials are `'AJ'`.

- [ ] **Step 1: Add two failing avatar tests**

In `client/src/components/__tests__/EmployeeForm.test.tsx`, add inside the existing `describe('EmployeeForm — view mode', ...)` block:

```tsx
it('shows avatar initials in view mode', () => {
  render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
  expect(screen.getByText('AJ')).toBeInTheDocument();
});
```

And inside the existing `describe('EmployeeForm — edit mode', ...)` block:

```tsx
it('shows avatar initials in edit mode', () => {
  render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
  expect(screen.getByText('AJ')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests — expect 2 FAIL, 9 PASS**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|✓|✗|AJ)"
```

Expected: 9 existing tests PASS, 2 avatar tests FAIL

- [ ] **Step 3: Replace EmployeeForm.tsx**

Replace `client/src/components/EmployeeForm.tsx` entirely:

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

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1677ff, #722ed1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: Math.round(size * 0.35), flexShrink: 0,
      }}
    >
      {getInitials(name)}
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

  if (mode === 'view' && employee) {
    return (
      <div>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8e8e8', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Avatar name={employee.name} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{employee.name}</div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 2 }}>{employee.email}</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                <Tag color="blue">{employee.role}</Tag>
                <Tag color="purple">{employee.department}</Tag>
                <Tag color={employee.employment_type === 'Full-time' ? 'green' : 'orange'}>{employee.employment_type}</Tag>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <Button onClick={() => onEdit(employeeId!)}>Edit</Button>
            <Button danger onClick={handleDelete}>Delete</Button>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={sectionHeader}>Personal</div>
          <div style={fieldGrid}>
            <FieldValue label="Gender" value={employee.gender} />
            <FieldValue label="Joining Date" value={employee.joining_date} />
          </div>
          <div style={sectionHeader}>Role & Employment</div>
          <div style={fieldGrid}>
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
    <div>
      <div
        style={{
          padding: '12px 20px', borderBottom: '1px solid #e8e8e8', background: '#fafafa',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {mode === 'edit' && employee && <Avatar name={employee.name} size={32} />}
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            {mode === 'create' ? 'New Employee' : `Editing: ${employee?.name ?? ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="primary" loading={isSubmitting} onClick={() => form.submit()}>Save</Button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
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

- [ ] **Step 4: Run the tests — expect 11 PASS**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -E "(PASS|FAIL|EmployeeForm)"
```

Expected: 11 tests PASS (9 existing + 2 avatar tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/components/EmployeeForm.tsx client/src/components/__tests__/EmployeeForm.test.tsx
git commit -m "feat: add avatar initials to EmployeeForm and remove split-pane layout styles"
```

---

### Task 3: EmployeesPage — full table + modal, delete EmployeeList

**Files:**
- Create: `client/src/pages/__tests__/EmployeesPage.test.tsx`
- Rewrite: `client/src/pages/EmployeesPage.tsx`
- Delete: `client/src/components/EmployeeList.tsx`
- Delete: `client/src/components/__tests__/EmployeeList.test.tsx`

- [ ] **Step 1: Write the failing EmployeesPage tests**

Create `client/src/pages/__tests__/EmployeesPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
  vi.mocked(useEmployees).mockReturnValue({ data: EMPLOYEES, isLoading: false, isError: false } as any);
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

  it('shows error alert when fetch fails', () => {
    vi.mocked(useEmployees).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    render(<EmployeesPage />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests — expect 5 FAIL**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -A10 "EmployeesPage"
```

Expected: 5 FAIL (old split-pane EmployeesPage doesn't match new expectations)

- [ ] **Step 3: Rewrite EmployeesPage.tsx**

Replace `client/src/pages/EmployeesPage.tsx` entirely:

```tsx
import { useState } from 'react';
import { Table, Button, Dropdown, Tag, Modal, message, Alert } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useEmployees } from '../hooks/useEmployees';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import EmployeeForm from '../components/EmployeeForm';
import type { Employee } from '../types/employee';

type ModalState =
  | { open: false }
  | { open: true; mode: 'view' | 'edit' | 'create'; employeeId: number | null };

export default function EmployeesPage() {
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const { data: employees = [], isLoading, isError } = useEmployees();
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
        await deleteMutation.mutateAsync(employee.id);
        message.success('Employee deleted');
      },
    });
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Role', dataIndex: 'role', key: 'role' },
    { title: 'Department', dataIndex: 'department', key: 'department' },
    { title: 'Country', dataIndex: 'country', key: 'country' },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      align: 'right' as const,
      render: (salary: number) => salary.toLocaleString(),
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
          pagination={{ pageSize: 20, showSizeChanger: false }}
        />
      </div>
      <Modal
        open={modalState.open}
        title={modalTitle}
        onCancel={closeModal}
        footer={null}
        width={640}
        destroyOnClose
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

- [ ] **Step 4: Run EmployeesPage tests — expect 5 PASS**

```bash
cd client && npm test -- --reporter=verbose 2>&1 | grep -A10 "EmployeesPage"
```

Expected: 5 tests PASS

- [ ] **Step 5: Delete EmployeeList and its tests**

```bash
rm client/src/components/EmployeeList.tsx
rm client/src/components/__tests__/EmployeeList.test.tsx
```

- [ ] **Step 6: Run the full test suite — all tests must pass**

```bash
cd client && npm test -- --reporter=verbose
```

Expected: 19 tests PASS across 3 suites (AppLayout: 3, EmployeeForm: 11, EmployeesPage: 5)

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/EmployeesPage.tsx client/src/pages/__tests__/EmployeesPage.test.tsx
git rm client/src/components/EmployeeList.tsx client/src/components/__tests__/EmployeeList.test.tsx
git commit -m "feat: rewrite EmployeesPage as full-width table with modal CRUD, delete EmployeeList"
```
