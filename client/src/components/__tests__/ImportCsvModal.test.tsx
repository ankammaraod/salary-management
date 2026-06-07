import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ImportCsvModal from '../ImportCsvModal';

vi.mock('papaparse', () => ({
  default: { parse: vi.fn() },
}));
vi.mock('../../hooks/useUpload');
vi.mock('../../utils/validateCsvRows');

import Papa from 'papaparse';
import { useUpload } from '../../hooks/useUpload';
import { validateCsvRows } from '../../utils/validateCsvRows';
import type { CreateEmployeeDto } from '../../types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice', email: 'alice@example.com', gender: 'Female',
  role: 'Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

const ALL_FIELDS = ['name', 'email', 'gender', 'role', 'department', 'country', 'salary', 'employment_type', 'joining_date'];

const VALID_PARSE_RESULT = {
  data: [{ name: 'Alice', email: 'alice@example.com', gender: 'Female', role: 'Eng', department: 'Eng', country: 'Germany', salary: '1000', employment_type: 'Full-time', joining_date: '2020-01-01' }],
  meta: { fields: ALL_FIELDS },
  errors: [],
};

function mockMutation(overrides: Record<string, unknown> = {}) {
  vi.mocked(useUpload).mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    ...overrides,
  } as any);
}

function renderModal(open = true) {
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <ImportCsvModal open={open} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onClose };
}

function dropFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  mockMutation();
  vi.mocked(validateCsvRows).mockReturnValue({ valid: [VALID_DTO], errors: [] });
});

describe('ImportCsvModal', () => {
  it('renders the modal title', () => {
    renderModal();
    expect(screen.getByText('Import CSV')).toBeInTheDocument();
  });

  it('shows expected columns in idle state', () => {
    renderModal();
    expect(screen.getByText(/Expected columns/)).toBeInTheDocument();
    expect(screen.getByText(/name, email, gender/)).toBeInTheDocument();
  });

  it('does not render modal content when open is false', () => {
    renderModal(false);
    expect(screen.queryByText('Expected columns')).not.toBeInTheDocument();
  });

  it('shows file-error alert when file exceeds 2MB', () => {
    renderModal();
    const bigFile = new File(['x'], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(bigFile, 'size', { value: 2 * 1024 * 1024 + 1 });
    dropFile(bigFile);
    expect(screen.getByText(/2MB/)).toBeInTheDocument();
  });

  it('shows row-error alert when validateCsvRows returns errors', () => {
    const errors = [{ index: 0, field: 'email', message: 'email is invalid' }];
    vi.mocked(validateCsvRows).mockReturnValue({ valid: [], errors });
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, opts: any) => {
      opts.complete(VALID_PARSE_RESULT);
    });
    renderModal();
    dropFile(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(screen.getByText(/error\(s\) found/i)).toBeInTheDocument();
  });

  it('shows success alert with row count when all rows are valid', () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, opts: any) => {
      opts.complete(VALID_PARSE_RESULT);
    });
    renderModal();
    dropFile(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(screen.getByText(/ready to import/i)).toBeInTheDocument();
  });

  it('shows file-error when CSV has missing columns', () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, opts: any) => {
      opts.complete({ data: [], meta: { fields: ['name', 'email'] }, errors: [] });
    });
    renderModal();
    dropFile(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(screen.getByText(/Missing columns/i)).toBeInTheDocument();
  });

  it('shows file-error when CSV has no data rows', () => {
    vi.mocked(Papa.parse).mockImplementation((_file: unknown, opts: any) => {
      opts.complete({ data: [], meta: { fields: ALL_FIELDS }, errors: [] });
    });
    renderModal();
    dropFile(new File([''], 'test.csv', { type: 'text/csv' }));
    expect(screen.getByText(/no data rows/i)).toBeInTheDocument();
  });
});
