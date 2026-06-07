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
    this.assertRowLimit(rows);

    const fieldErrors = this.collectFieldErrors(rows);
    const duplicateErrors = this.findDuplicateEmailErrors(rows, fieldErrors);
    const localErrors = [...fieldErrors, ...duplicateErrors];
    if (localErrors.length > 0) throw new BulkValidationError(localErrors);

    const dbErrors = await this.findDbConflictErrors(rows);
    if (dbErrors.length > 0) throw new BulkValidationError(dbErrors);

    await this.repo.insertMany(rows);
    return { inserted: rows.length };
  }

  private assertRowLimit(rows: CreateEmployeeDto[]): void {
    if (rows.length > MAX_ROWS) {
      throw new BulkValidationError([{ index: -1, field: 'file', message: `exceeds maximum of ${MAX_ROWS} rows` }]);
    }
  }

  private collectFieldErrors(rows: CreateEmployeeDto[]): RowError[] {
    return rows.flatMap((row, i) => validateRow(row, i));
  }

  private findDuplicateEmailErrors(rows: CreateEmployeeDto[], alreadyFlagged: RowError[]): RowError[] {
    const emailToIndices = new Map<string, number[]>();
    rows.forEach((row, i) => {
      const email = (row.email ?? '').toLowerCase();
      const indices = emailToIndices.get(email) ?? [];
      indices.push(i);
      emailToIndices.set(email, indices);
    });

    const flaggedEmailRows = new Set(alreadyFlagged.filter(e => e.field === 'email').map(e => e.index));

    return [...emailToIndices.values()]
      .filter(indices => indices.length > 1)
      .flatMap(indices =>
        indices
          .filter(i => !flaggedEmailRows.has(i))
          .map(i => ({ index: i, field: 'email', message: 'duplicate email in file' })),
      );
  }

  private async findDbConflictErrors(rows: CreateEmployeeDto[]): Promise<RowError[]> {
    const existing = await this.repo.findExistingEmails(rows.map(r => r.email));
    if (existing.length === 0) return [];
    const existingSet = new Set(existing);
    return rows.flatMap((r, i) =>
      existingSet.has(r.email) ? [{ index: i, field: 'email', message: 'email already exists' }] : [],
    );
  }
}
