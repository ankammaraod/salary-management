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
