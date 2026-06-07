import { useState } from 'react';
import { Table, Button, Dropdown, Tag, Modal, message, Alert, Input } from 'antd';
import { MoreOutlined, PlusOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { useEmployees } from '../hooks/useEmployees';
import { useDeleteEmployee } from '../hooks/useDeleteEmployee';
import EmployeeForm from '../components/EmployeeForm';
import ImportCsvModal from '../components/ImportCsvModal';
import PaginationBar from '../components/PaginationBar';
import type { Employee } from '../types/employee';
import { getCurrencySymbol } from '../utils/currency';

// Height accounts for nav bar + search row + pagination bar
const TABLE_SCROLL_Y = 'calc(100vh - 270px)';

type ModalState =
  | { open: false }
  | { open: true; mode: 'view' | 'edit' | 'create'; employeeId: number | null };

export default function EmployeesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading, isError } = useEmployees(page, pageSize, search, sortOrder);
  const deleteMutation = useDeleteEmployee();

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

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
        try {
          await deleteMutation.mutateAsync(employee.id);
          message.success('Employee deleted');
        } catch (err) {
          message.error(err instanceof Error ? err.message : 'Failed to delete employee');
        }
      },
    });
  }

  function handleTableChange(
    _: unknown,
    __: unknown,
    sorter: SorterResult<Employee> | SorterResult<Employee>[],
  ) {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    setSortOrder(s.order === 'ascend' ? 'asc' : 'desc');
    setPage(1);
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      sorter: true,
      sortOrder: (sortOrder === 'asc' ? 'ascend' : 'descend') as 'ascend' | 'descend',
      sortDirections: ['descend' as const, 'ascend' as const],
    },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Country', dataIndex: 'country', key: 'country' },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      align: 'right' as const,
      render: (salary: number, record: Employee) =>
        `${getCurrencySymbol(record.country)}${salary.toLocaleString()}`,
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
      width: 52,
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

  const employees = data?.employees ?? [];
  const total = data?.total ?? 0;

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Input.Search
            placeholder="Search by name, email, role, department, country, or ID"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 320 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create', null)}>
            New Employee
          </Button>
          <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
        </div>
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
          size="small"
          loading={isLoading}
          pagination={false}
          scroll={{ y: TABLE_SCROLL_Y }}
          onChange={handleTableChange as any}
        />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>
      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />
      <Modal
        open={modalState.open}
        title={modalTitle}
        onCancel={closeModal}
        footer={null}
        width={640}
        destroyOnHidden
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
