import type { Employee, CreateEmployeeDto } from '../types/employee';

const BASE = '/api/employees';

async function parseError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? `request failed with status ${res.status}`);
}

export async function fetchEmployees(page: number, pageSize = 20, search = ''): Promise<{ employees: Employee[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.append('search', search);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function fetchEmployee(id: number): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function updateEmployee(id: number, dto: CreateEmployeeDto): Promise<Employee> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  if (!res.ok) await parseError(res);
  return res.json();
}

export async function deleteEmployee(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) await parseError(res);
}
