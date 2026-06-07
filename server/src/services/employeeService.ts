import type { IEmployeeRepository } from '../repositories/employeeRepository';
import type { Employee, CreateEmployeeDto } from '../types/employee';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errors';
import { validateEmployeeFields } from '../utils/validateEmployee';

function validate(dto: CreateEmployeeDto): string | null {
  return validateEmployeeFields(dto, 0)[0]?.message ?? null;
}

export class EmployeeService {
  constructor(private readonly repo: IEmployeeRepository) {}

  listEmployees(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc'): Promise<{ employees: Employee[]; total: number }> {
    return this.repo.findPage(page, pageSize, search, order);
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
