import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal, message } from 'antd';
import EmployeesPage from '../EmployeesPage';

vi.mock('../../hooks/useEmployees');
vi.mock('../../hooks/useDeleteEmployee');
vi.mock('../../components/EmployeeForm', () => ({
  default: ({ mode }: { mode: string }) => <div data-testid="employee-form">mode:{mode}</div>,
}));
vi.mock('../../components/ImportCsvModal', () => ({
  default: () => <div data-testid="import-csv-modal" />,
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
  vi.mocked(useEmployees).mockReturnValue({ data: { employees: EMPLOYEES, total: 2 }, isLoading: false, isError: false } as any);
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

  it('renders salary with currency symbol based on country', () => {
    render(<EmployeesPage />);
    expect(screen.getByText('€87,400')).toBeInTheDocument(); // Germany
    expect(screen.getByText('$90,000')).toBeInTheDocument(); // USA
  });

  it('renders employee IDs in the table', () => {
    render(<EmployeesPage />);
    const cells = document.querySelectorAll('.ant-table-cell');
    const cellTexts = Array.from(cells).map(c => c.textContent);
    expect(cellTexts).toContain('1');
    expect(cellTexts).toContain('2');
  });

  it('shows error message when delete fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('server error'));
    vi.mocked(useDeleteEmployee).mockReturnValue({ mutateAsync, isPending: false } as any);

    const confirmSpy = vi.spyOn(Modal, 'confirm').mockImplementation((config: any) => {
      config.onOk?.();
      return {} as any;
    });
    const errorSpy = vi.spyOn(message, 'error').mockImplementation(() => Promise.resolve() as any);

    render(<EmployeesPage />);

    fireEvent.click(screen.getAllByRole('button', { name: /actions/i })[0]);
    const deleteItem = await screen.findAllByText('Delete');
    fireEvent.click(deleteItem[0]);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('server error');
    });

    confirmSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('shows error alert when fetch fails', () => {
    vi.mocked(useEmployees).mockReturnValue({ data: undefined, isLoading: false, isError: true } as any);
    render(<EmployeesPage />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('renders a search input with the correct placeholder', () => {
    render(<EmployeesPage />);
    expect(
      screen.getByPlaceholderText('Search by name, email, role, department, country, or ID')
    ).toBeInTheDocument();
  });

  it('calls useEmployees with submitted search term when Enter is pressed', async () => {
    render(<EmployeesPage />);
    const input = screen.getByPlaceholderText('Search by name, email, role, department, country, or ID');
    fireEvent.change(input, { target: { value: 'Alice' } });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 13 });
    await waitFor(() => {
      expect(vi.mocked(useEmployees)).toHaveBeenCalledWith(1, 20, 'Alice', 'desc');
    });
  });
});
