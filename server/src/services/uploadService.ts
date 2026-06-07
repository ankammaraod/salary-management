import type { CreateEmployeeDto } from '../types/employee';
import type { IUploadRepository, RowError } from '../types/upload';
import { BulkValidationError } from '../types/upload';

const MAX_ROWS = 500;

function validateRow(dto: CreateEmployeeDto, index: number): RowError[] {
  const errors: RowError[] = [];
  if (!dto.name?.trim())
    errors.push({ index, field: 'name', message: 'name is required' });
  if (!dto.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    errors.push({ index, field: 'email', message: 'email is invalid' });
  if (!['Male', 'Female', 'Other'].includes(dto.gender))
    errors.push({ index, field: 'gender', message: 'invalid gender' });
  if (!dto.role?.trim())
    errors.push({ index, field: 'role', message: 'role is required' });
  if (!dto.department?.trim())
    errors.push({ index, field: 'department', message: 'department is required' });
  if (!dto.country?.trim())
    errors.push({ index, field: 'country', message: 'country is required' });
  if (!dto.salary || dto.salary <= 0)
    errors.push({ index, field: 'salary', message: 'salary must be positive' });
  if (!['Full-time', 'Contractor'].includes(dto.employment_type))
    errors.push({ index, field: 'employment_type', message: 'invalid employment type' });
  if (!dto.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/))
    errors.push({ index, field: 'joining_date', message: 'joining_date must be YYYY-MM-DD' });
  return errors;
}

export class UploadService {
  constructor(private readonly repo: IUploadRepository) {}

  async bulkUpload(rows: CreateEmployeeDto[]): Promise<{ inserted: number }> {
    if (rows.length > MAX_ROWS) {
      throw new BulkValidationError([{ index: -1, field: 'file', message: `exceeds maximum of ${MAX_ROWS} rows` }]);
    }

    const errors: RowError[] = [];
    for (let i = 0; i < rows.length; i++) {
      errors.push(...validateRow(rows[i], i));
    }

    const emailIndexMap = new Map<string, number[]>();
    for (let i = 0; i < rows.length; i++) {
      const email = (rows[i].email ?? '').toLowerCase();
      if (!emailIndexMap.has(email)) emailIndexMap.set(email, []);
      emailIndexMap.get(email)!.push(i);
    }
    for (const [, indices] of emailIndexMap) {
      if (indices.length > 1) {
        for (const idx of indices) {
          if (!errors.some(e => e.index === idx && e.field === 'email')) {
            errors.push({ index: idx, field: 'email', message: 'duplicate email in file' });
          }
        }
      }
    }

    if (errors.length > 0) throw new BulkValidationError(errors);

    const emails = rows.map(r => r.email);
    const existing = await this.repo.findExistingEmails(emails);
    if (existing.length > 0) {
      const dbErrors = rows
        .map((r, i) =>
          existing.includes(r.email)
            ? ({ index: i, field: 'email', message: 'email already exists' } as RowError)
            : null,
        )
        .filter((e): e is RowError => e !== null);
      throw new BulkValidationError(dbErrors);
    }

    await this.repo.insertMany(rows);
    return { inserted: rows.length };
  }
}
