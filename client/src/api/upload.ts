import type { CreateEmployeeDto } from '../types/employee';
import type { BulkApiError } from '../types/upload';

export async function bulkUpload(employees: CreateEmployeeDto[]): Promise<{ inserted: number }> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employees }),
  });
  if (!res.ok) {
    const data: BulkApiError = await res.json().catch(() => ({ error: `request failed with status ${res.status}` }));
    throw data;
  }
  return res.json();
}
