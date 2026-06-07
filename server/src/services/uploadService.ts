import type { CreateEmployeeDto } from '../types/employee';
import type { IUploadRepository, RowError } from '../types/upload';
import { BulkValidationError } from '../types/upload';
import { validateEmployeeFields } from '../utils/validateEmployee';

const MAX_ROWS = 500;

export class UploadService {
  constructor(private readonly repo: IUploadRepository) {}

  async bulkUpload(rows: CreateEmployeeDto[]): Promise<{ inserted: number }> {
    this.assertRowLimit(rows);

    const normalized = rows.map(r => ({ ...r, email: r.email?.toLowerCase() ?? r.email }));

    const fieldErrors = this.collectFieldErrors(normalized);
    const duplicateErrors = this.findDuplicateEmailErrors(normalized, fieldErrors);
    const localErrors = [...fieldErrors, ...duplicateErrors];
    if (localErrors.length > 0) throw new BulkValidationError(localErrors);

    const dbErrors = await this.findDbConflictErrors(normalized);
    if (dbErrors.length > 0) throw new BulkValidationError(dbErrors);

    await this.repo.insertMany(normalized);
    return { inserted: normalized.length };
  }

  private assertRowLimit(rows: CreateEmployeeDto[]): void {
    if (rows.length > MAX_ROWS) {
      throw new BulkValidationError([{ index: -1, field: 'file', message: `exceeds maximum of ${MAX_ROWS} rows` }]);
    }
  }

  private collectFieldErrors(rows: CreateEmployeeDto[]): RowError[] {
    return rows.flatMap((row, i) => validateEmployeeFields(row, i));
  }

  private findDuplicateEmailErrors(rows: CreateEmployeeDto[], alreadyFlagged: RowError[]): RowError[] {
    const emailToIndices = new Map<string, number[]>();
    rows.forEach((row, i) => {
      const email = row.email ?? '';
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
    const existingSet = new Set(existing.map(e => e.toLowerCase()));
    return rows.flatMap((r, i) =>
      existingSet.has(r.email) ? [{ index: i, field: 'email', message: 'email already exists' }] : [],
    );
  }
}
