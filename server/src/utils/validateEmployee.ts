import type { CreateEmployeeDto } from '../types/employee';
import type { RowError } from '../types/upload';

export function validateEmployeeFields(dto: CreateEmployeeDto, index: number): RowError[] {
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
