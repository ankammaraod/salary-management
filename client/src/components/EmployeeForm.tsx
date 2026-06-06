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
