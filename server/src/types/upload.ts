import type { CreateEmployeeDto } from './employee';

export interface RowError {
  index: number;
  field: string;
  message: string;
}

export interface IUploadRepository {
  insertMany(rows: CreateEmployeeDto[]): Promise<void>;
  findExistingEmails(emails: string[]): Promise<string[]>;
}

export class BulkValidationError extends Error {
  status = 400;
  details: { errors: RowError[] };

  constructor(errors: RowError[]) {
    super('validation failed');
    this.name = 'BulkValidationError';
    this.details = { errors };
  }
}
