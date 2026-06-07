import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { Employee, CreateEmployeeDto } from '../types/employee';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errors';

function validate(dto: CreateEmployeeDto): string | null {
  if (!dto.name?.trim())                                return 'name is required';
  if (!dto.email?.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'email is invalid';
  if (!['Male', 'Female', 'Other'].includes(dto.gender)) return 'invalid gender';
  if (!dto.role?.trim())                                return 'role is required';
  if (!dto.department?.trim())                          return 'department is required';
  if (!dto.country?.trim())                             return 'country is required';
  if (!dto.salary || dto.salary <= 0)                   return 'salary must be positive';
  if (!['Full-time', 'Contractor'].includes(dto.employment_type)) return 'invalid employment type';
  if (!dto.joining_date?.match(/^\d{4}-\d{2}-\d{2}$/)) return 'joining_date must be YYYY-MM-DD';
  return null;
}

export class EmployeeService {
  constructor(private readonly repo: IEmployeeRepository) {}

  listEmployees(page: number, pageSize: number, search = ''): Promise<{ employees: Employee[]; total: number }> {
    return this.repo.findPage(page, pageSize, search);
  }

  async getEmployee(id: number): Promise<Employee> {
    const employee = await this.repo.findById(id);

    if (!employee) throw new NotFoundError('employee not found');

    return employee;
  }

  async createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
    const error = validate(dto);

    if (error) throw new ValidationError(error);

    const existing = await this.repo.findByEmail(dto.email);

    if (existing) throw new ConflictError('email already exists');

    return this.repo.create(dto);
  }

  async updateEmployee(id: number, dto: CreateEmployeeDto): Promise<Employee> {
    const error = validate(dto);

    if (error) throw new ValidationError(error);

    const employee = await this.repo.findById(id);

    if (!employee) throw new NotFoundError('employee not found');

    const conflict = await this.repo.findByEmail(dto.email);

    if (conflict && conflict.id !== id) throw new ConflictError('email already exists');

    return this.repo.update(id, dto);
  }

  async deleteEmployee(id: number): Promise<void> {
    const employee = await this.repo.findById(id);

    if (!employee) throw new NotFoundError('employee not found');

    return this.repo.deleteById(id);
  }
}
