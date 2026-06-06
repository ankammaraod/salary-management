import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmployeeForm from '../EmployeeForm';

vi.mock('../../hooks/useEmployee');
vi.mock('../../hooks/useCreateEmployee');
vi.mock('../../hooks/useUpdateEmployee');
vi.mock('../../hooks/useDeleteEmployee');

import { useEmployee } from '../../hooks/useEmployee';
import { useCreateEmployee } from '../../hooks/useCreateEmployee';
import { useUpdateEmployee } from '../../hooks/useUpdateEmployee';
import { useDeleteEmployee } from '../../hooks/useDeleteEmployee';

const ALICE = {
  id: 1, name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female' as const,
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time' as const, joining_date: '2019-03-15',
};

const PROPS = {
  onCreated: vi.fn(), onSaved: vi.fn(), onDeleted: vi.fn(), onCancel: vi.fn(), onEdit: vi.fn(),
};

beforeEach(() => {
  vi.mocked(useEmployee).mockReturnValue({ data: ALICE, isLoading: false, isError: false } as any);
  vi.mocked(useCreateEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useUpdateEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
  vi.mocked(useDeleteEmployee).mockReturnValue({ mutateAsync: vi.fn(), isPending: false } as any);
});

describe('EmployeeForm — view mode', () => {
  it('shows avatar initials in view mode', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });

  it('shows employee name', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('shows role and department as badges', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('shows formatted salary', () => {
    render(<EmployeeForm mode="view" employeeId={1} {...PROPS} />);
    expect(screen.getByText('87,400')).toBeInTheDocument();
  });
});

describe('EmployeeForm — create mode', () => {
  it('shows New Employee header', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByText('New Employee')).toBeInTheDocument();
  });

  it('shows name input', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons', () => {
    render(<EmployeeForm mode="create" employeeId={null} {...PROPS} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('EmployeeForm — edit mode', () => {
  it('shows avatar initials in edit mode', () => {
    render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
    expect(screen.getByText('AJ')).toBeInTheDocument();
  });

  it('shows Editing label', () => {
    render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
    expect(screen.getByText(/editing/i)).toBeInTheDocument();
  });

  it('shows Save and Cancel buttons', () => {
    render(<EmployeeForm mode="edit" employeeId={1} {...PROPS} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
