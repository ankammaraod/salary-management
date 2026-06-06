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
