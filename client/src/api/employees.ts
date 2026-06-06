import type { Employee, CreateEmployeeDto } from '../types/employee';

const BASE = '/api/employees';

async function parseError(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error((data as { error?: string }).error ?? `request failed with status ${res.status}`);
}

export async function fetchEmployees(): Promise<Employee[]> {
  const res = await fetch(BASE);
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
