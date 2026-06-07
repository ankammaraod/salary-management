import { describe, it, expect } from 'vitest';
import { validateCsvRows } from '../validateCsvRows';

const VALID_ROW = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: '87400',
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

describe('validateCsvRows', () => {
  it('returns valid rows and no errors when all fields are correct', () => {
    const result = validateCsvRows([VALID_ROW]);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].salary).toBe(87400);
  });

  it('returns error for empty name', () => {
    const result = validateCsvRows([{ ...VALID_ROW, name: '' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'name', message: expect.any(String) });
    expect(result.valid).toHaveLength(0);
  });

  it('returns error for invalid email', () => {
    const result = validateCsvRows([{ ...VALID_ROW, email: 'not-valid' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'email', message: expect.any(String) });
  });

  it('returns error for invalid gender', () => {
    const result = validateCsvRows([{ ...VALID_ROW, gender: 'Unknown' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'gender', message: expect.any(String) });
  });

  it('returns error for invalid employment_type', () => {
    const result = validateCsvRows([{ ...VALID_ROW, employment_type: 'PartTime' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'employment_type', message: expect.any(String) });
  });

  it('returns error when salary is zero or negative', () => {
    const result = validateCsvRows([{ ...VALID_ROW, salary: '0' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'salary', message: expect.any(String) });
  });

  it('returns error when salary is non-numeric', () => {
    const result = validateCsvRows([{ ...VALID_ROW, salary: 'abc' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'salary', message: expect.any(String) });
  });

  it('returns error for wrong joining_date format', () => {
    const result = validateCsvRows([{ ...VALID_ROW, joining_date: '15/03/2019' }]);
    expect(result.errors).toContainEqual({ index: 0, field: 'joining_date', message: expect.any(String) });
  });

  it('flags all occurrences of a duplicate email', () => {
    const rows = [VALID_ROW, { ...VALID_ROW, name: 'Bob' }];
    const result = validateCsvRows(rows);
    const emailErrors = result.errors.filter(e => e.field === 'email');
    expect(emailErrors).toHaveLength(2);
    expect(emailErrors.map(e => e.index).sort()).toEqual([0, 1]);
    expect(result.valid).toHaveLength(0);
  });

  it('collects errors from multiple rows', () => {
    const rows = [
      { ...VALID_ROW, name: '' },
      { ...VALID_ROW, email: 'bad-email', salary: '-1' },
    ];
    const result = validateCsvRows(rows);
    expect(result.errors.some(e => e.index === 0 && e.field === 'name')).toBe(true);
    expect(result.errors.some(e => e.index === 1 && e.field === 'email')).toBe(true);
    expect(result.errors.some(e => e.index === 1 && e.field === 'salary')).toBe(true);
  });

  it('returns valid empty when errors present', () => {
    const result = validateCsvRows([{ ...VALID_ROW, name: '' }]);
    expect(result.valid).toHaveLength(0);
  });
});
