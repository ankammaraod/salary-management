import type { CreateEmployeeDto } from '../types/employee';
import type { RowError } from '../types/upload';

type RawRow = Record<string, string>;

function validateRow(raw: RawRow, index: number): { dto: CreateEmployeeDto | null; errors: RowError[] } {
  const errors: RowError[] = [];

  const name = raw.name?.trim() ?? '';
  if (!name) errors.push({ index, field: 'name', message: 'name is required' });

  const email = raw.email?.trim() ?? '';
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    errors.push({ index, field: 'email', message: 'email is invalid' });

  const gender = raw.gender?.trim() ?? '';
  if (!['Male', 'Female', 'Other'].includes(gender))
    errors.push({ index, field: 'gender', message: 'invalid gender' });

  const role = raw.role?.trim() ?? '';
  if (!role) errors.push({ index, field: 'role', message: 'role is required' });

  const department = raw.department?.trim() ?? '';
  if (!department) errors.push({ index, field: 'department', message: 'department is required' });

  const country = raw.country?.trim() ?? '';
  if (!country) errors.push({ index, field: 'country', message: 'country is required' });

  const salaryNum = Number(raw.salary);
  if (isNaN(salaryNum) || salaryNum <= 0)
    errors.push({ index, field: 'salary', message: 'salary must be a positive number' });

  const employment_type = raw.employment_type?.trim() ?? '';
  if (!['Full-time', 'Contractor'].includes(employment_type))
    errors.push({ index, field: 'employment_type', message: 'invalid employment type' });

  const joining_date = raw.joining_date?.trim() ?? '';
  if (!joining_date.match(/^\d{4}-\d{2}-\d{2}$/))
    errors.push({ index, field: 'joining_date', message: 'joining_date must be YYYY-MM-DD' });

  if (errors.length > 0) return { dto: null, errors };

  return {
    dto: { name, email, gender: gender as CreateEmployeeDto['gender'], role, department, country, salary: salaryNum, employment_type: employment_type as CreateEmployeeDto['employment_type'], joining_date },
    errors: [],
  };
}

export function validateCsvRows(rows: RawRow[]): { valid: CreateEmployeeDto[]; errors: RowError[] } {
  const allErrors: RowError[] = [];
  const candidates: CreateEmployeeDto[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { dto, errors } = validateRow(rows[i], i);
    allErrors.push(...errors);
    if (dto) candidates.push(dto);
  }

  const emailIndexMap = new Map<string, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const email = (rows[i].email ?? '').trim().toLowerCase();
    if (!emailIndexMap.has(email)) emailIndexMap.set(email, []);
    emailIndexMap.get(email)!.push(i);
  }
  for (const [, indices] of emailIndexMap) {
    if (indices.length > 1) {
      for (const idx of indices) {
        if (!allErrors.some(e => e.index === idx && e.field === 'email')) {
          allErrors.push({ index: idx, field: 'email', message: 'duplicate email in file' });
        }
      }
    }
  }

  if (allErrors.length > 0) return { valid: [], errors: allErrors };
  return { valid: candidates, errors: [] };
}
