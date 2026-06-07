export interface RowError {
  index: number;
  field: string;
  message: string;
}

export interface BulkApiError {
  error: string;
  details?: { errors: RowError[] };
}
