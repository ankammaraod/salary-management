import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  findAll(): Promise<Employee[]> {
    return this.knex('employees').select('*');
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
