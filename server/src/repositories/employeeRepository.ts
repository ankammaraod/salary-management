import type { Knex } from 'knex';
import type { Employee, CreateEmployeeDto } from '../types/employee';

export interface IEmployeeRepository {
  findPage(page: number, pageSize: number, search?: string, order?: 'asc' | 'desc'): Promise<{ employees: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(dto: CreateEmployeeDto): Promise<Employee>;
  update(id: number, dto: CreateEmployeeDto): Promise<Employee>;
  deleteById(id: number): Promise<void>;
}

const SEARCHABLE_COLUMNS = ['CAST(id AS TEXT)', 'name', 'email', 'role', 'department', 'country'];

function escapeLikeTerm(raw: string): string {
  return `%${raw.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
}

export class EmployeeRepository implements IEmployeeRepository {
  constructor(private readonly knex: Knex) {}

  async findPage(page: number, pageSize: number, search = '', order: 'asc' | 'desc' = 'desc'): Promise<{ employees: Employee[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const withSearch = (qb: Knex.QueryBuilder): Knex.QueryBuilder => {
      if (!search) return qb;
      const term = escapeLikeTerm(search);
      return qb.where(function () {
        SEARCHABLE_COLUMNS.forEach((col, i) => {
          const raw = `${col} LIKE ? ESCAPE '\\'`;
          if (i === 0) this.whereRaw(raw, [term]);
          else this.orWhereRaw(raw, [term]);
        });
      });
    };

    const [countRow, employees] = await Promise.all([
      withSearch(this.knex('employees')).count('* as count').first<{ count: number | string }>(),
      withSearch(this.knex('employees').select('*')).orderBy('id', order).limit(pageSize).offset(offset),
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

  async insertMany(rows: CreateEmployeeDto[]): Promise<void> {
    if (rows.length === 0) return;
    await this.knex('employees').insert(rows);
  }

  async findExistingEmails(emails: string[]): Promise<string[]> {
    if (emails.length === 0) return [];
    const rows = await this.knex('employees').whereIn('email', emails).select('email');
    return rows.map((r: { email: string }) => r.email);
  }
}
