import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmployeeList from '../EmployeeList';

vi.mock('../../hooks/useEmployees');
import { useEmployees } from '../../hooks/useEmployees';

const EMPLOYEES = [
  { id: 1, name: 'Alice Johnson', role: 'Software Engineer', country: 'Germany',
    email: 'alice@example.com', gender: 'Female' as const, department: 'Engineering',
    salary: 87400, employment_type: 'Full-time' as const, joining_date: '2019-03-15' },
  { id: 2, name: 'Bob Martinez', role: 'Sales Manager', country: 'USA',
    email: 'bob@example.com', gender: 'Male' as const, department: 'Sales',
    salary: 90000, employment_type: 'Full-time' as const, joining_date: '2020-01-10' },
];

beforeEach(() => {
  vi.mocked(useEmployees).mockReturnValue({
    data: EMPLOYEES, isLoading: false, isError: false,
  } as any);
});

describe('EmployeeList', () => {
  it('renders employee names', () => {
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Martinez')).toBeInTheDocument();
  });

  it('shows employee count in header', () => {
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText(/employees \(2\)/i)).toBeInTheDocument();
  });

  it('calls onSelect with employee id when row clicked', () => {
    const onSelect = vi.fn();
    render(<EmployeeList selectedId={null} onSelect={onSelect} onNew={vi.fn()} />);
    fireEvent.click(screen.getByText('Alice Johnson'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onNew when New button is clicked', () => {
    const onNew = vi.fn();
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={onNew} />);
    fireEvent.click(screen.getByRole('button', { name: /new/i }));
    expect(onNew).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    vi.mocked(useEmployees).mockReturnValue({ isLoading: true, isError: false, data: undefined } as any);
    const { container } = render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    vi.mocked(useEmployees).mockReturnValue({ isLoading: false, isError: true, data: undefined } as any);
    render(<EmployeeList selectedId={null} onSelect={vi.fn()} onNew={vi.fn()} />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
