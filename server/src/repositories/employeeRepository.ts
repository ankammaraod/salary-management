import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findPage(page: number, pageSize: number, search?: string): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  async findPage(page: number, pageSize: number, search = ''): Promise<{ employees: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const withSearch = (qb: Knex.QueryBuilder): Knex.QueryBuilder => {
      if (!search) return qb;
      const term = `%${search}%`;
      return qb.where(function () {
        this.whereRaw('CAST(id AS TEXT) LIKE ?', [term])
          .orWhere('name', 'like', term)
          .orWhere('email', 'like', term)
          .orWhere('role', 'like', term)
          .orWhere('department', 'like', term)
          .orWhere('country', 'like', term);
      });
    };

    const [countRow, employees] = await Promise.all([
      withSearch(this.knex('employees')).count('* as count').first<{ count: number | string }>(),
      withSearch(this.knex('employees').select('*')).limit(pageSize).offset(offset),
    ]);
    return { employees, total: Number(countRow?.count ?? 0) };
  }

  async findById(id: number): Promise<Employee | null> {
    return (await this.knex('employees').where({ id }).first()) ?? null;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return (await this.knex('employees').where({ email }).first()) ?? null;
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    const [id] = await this.knex('employees').insert(dto);
    const created = await this.findById(id);
    if (!created) throw new Error('failed to retrieve employee after insert');
    return created;
  }

  async update(id: number, dto: CreateEmployeeDto): Promise<Employee> {
    await this.knex('employees').where({ id }).update(dto);
    const updated = await this.findById(id);
    if (!updated) throw new Error('failed to retrieve employee after update');
    return updated;
  }

  async deleteById(id: number): Promise<void> {
    await this.knex('employees').where({ id }).delete();
  }
}
