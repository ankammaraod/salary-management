import knex, { Knex } from 'knex';
import { InsightsRepository } from '../../src/repositories/insightsRepository';
import type { CreateEmployeeDto } from '../../src/types/employee';

const TEST_CONFIG = {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
  migrations: { directory: './src/db/migrations' },
};

const ALICE: CreateEmployeeDto = {
  name: 'Alice', email: 'alice@example.com', gender: 'Female',
  role: 'Engineer', department: 'Engineering', country: 'Germany',
  salary: 90000, employment_type: 'Full-time', joining_date: '2020-01-01',
};

let db: Knex;
let repo: InsightsRepository;

beforeEach(async () => {
  db = knex(TEST_CONFIG);
  await db.migrate.latest();
  repo = new InsightsRepository(db);
});

afterEach(async () => {
  await db.destroy();
});

describe('listCountries', () => {
  it('returns empty array when no employees exist', async () => {
    const result = await repo.listCountries();
    expect(result).toEqual([]);
  });

  it('returns distinct countries sorted alphabetically', async () => {
    await db('employees').insert([
      { ...ALICE, email: 'a@x.com', country: 'Germany' },
      { ...ALICE, email: 'b@x.com', country: 'USA' },
      { ...ALICE, email: 'c@x.com', country: 'Germany' },
      { ...ALICE, email: 'd@x.com', country: 'India' },
    ]);
    const result = await repo.listCountries();
    expect(result).toEqual(['Germany', 'India', 'USA']);
  });
});

describe('getInsights', () => {
  beforeEach(async () => {
    await db('employees').insert([
      { ...ALICE, email: 'e1@x.com', gender: 'Male',   employment_type: 'Full-time',  department: 'Engineering', salary: 80000, country: 'Germany' },
      { ...ALICE, email: 'e2@x.com', gender: 'Female', employment_type: 'Full-time',  department: 'Engineering', salary: 90000, country: 'Germany' },
      { ...ALICE, email: 'e3@x.com', gender: 'Female', employment_type: 'Contractor', department: 'Sales',       salary: 70000, country: 'Germany' },
      { ...ALICE, email: 'e4@x.com', gender: 'Male',   employment_type: 'Full-time',  department: 'Engineering', salary: 100000, country: 'USA' },
    ]);
  });

  it('returns correct headcount for the country', async () => {
    const result = await repo.getInsights('Germany');
    expect(result.headcount).toBe(3);
  });

  it('returns correct gender breakdown', async () => {
    const result = await repo.getInsights('Germany');
    expect(result.genderBreakdown.Male).toBe(1);
    expect(result.genderBreakdown.Female).toBe(2);
    expect(result.genderBreakdown.Other).toBe(0);
  });

  it('returns correct employment type breakdown', async () => {
    const result = await repo.getInsights('Germany');
    expect(result.employmentTypeBreakdown['Full-time']).toBe(2);
    expect(result.employmentTypeBreakdown.Contractor).toBe(1);
  });

  it('returns correct salary stats', async () => {
    const result = await repo.getInsights('Germany');
    expect(result.minSalary).toBe(70000);
    expect(result.maxSalary).toBe(90000);
    expect(result.avgSalary).toBe(Math.round((80000 + 90000 + 70000) / 3));
    expect(result.totalPayroll).toBe(240000);
  });

  it('returns department breakdown sorted by headcount descending', async () => {
    const result = await repo.getInsights('Germany');
    expect(result.departmentBreakdown).toHaveLength(2);
    expect(result.departmentBreakdown[0].department).toBe('Engineering');
    expect(result.departmentBreakdown[0].headcount).toBe(2);
    expect(result.departmentBreakdown[0].avgSalary).toBe(Math.round((80000 + 90000) / 2));
    expect(result.departmentBreakdown[1].department).toBe('Sales');
    expect(result.departmentBreakdown[1].headcount).toBe(1);
  });
});
