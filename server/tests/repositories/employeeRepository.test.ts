import knex, { Knex } from 'knex';
import { EmployeeRepository } from '../../src/repositories/employeeRepository';
import type { CreateEmployeeDto } from '../../src/types/employee';

const TEST_CONFIG = {
  client: 'sqlite3',
  connection: { filename: ':memory:' },
  useNullAsDefault: true,
  migrations: { directory: './src/db/migrations' },
};

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Software Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

let db: Knex;
let repo: EmployeeRepository;

beforeEach(async () => {
  db = knex(TEST_CONFIG);
  await db.migrate.latest();
  repo = new EmployeeRepository(db);
});

afterEach(async () => {
  await db.destroy();
});

describe('findPage', () => {
  it('returns empty employees and total 0 when table is empty', async () => {
    const result = await repo.findPage(1, 20);
    expect(result.total).toBe(0);
    expect(result.employees).toHaveLength(0);
  });

  it('returns first page of employees and correct total', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    await repo.create({ ...VALID_DTO, email: 'carol@example.com', name: 'Carol' });
    const result = await repo.findPage(1, 2);
    expect(result.total).toBe(3);
    expect(result.employees).toHaveLength(2);
  });

  it('returns second page of employees', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob' });
    await repo.create({ ...VALID_DTO, email: 'carol@example.com', name: 'Carol' });
    const result = await repo.findPage(2, 2);
    expect(result.total).toBe(3);
    expect(result.employees).toHaveLength(1);
  });
});

describe('findById', () => {
  it('returns the employee when found', async () => {
    const created = await repo.create(VALID_DTO);
    expect((await repo.findById(created.id))?.name).toBe('Alice Johnson');
  });

  it('returns null when not found', async () => {
    expect(await repo.findById(999)).toBeNull();
  });
});

describe('findByEmail', () => {
  it('returns the employee when email matches', async () => {
    await repo.create(VALID_DTO);
    expect((await repo.findByEmail('alice@example.com'))?.name).toBe('Alice Johnson');
  });

  it('returns null when email not found', async () => {
    expect(await repo.findByEmail('nobody@example.com')).toBeNull();
  });
});

describe('create', () => {
  it('inserts and returns the new employee with an id', async () => {
    const created = await repo.create(VALID_DTO);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Alice Johnson');
  });

  it('throws if the row cannot be retrieved after insert', async () => {
    jest.spyOn(repo, 'findById').mockResolvedValueOnce(null);
    await expect(repo.create(VALID_DTO)).rejects.toThrow('failed to retrieve employee after insert');
  });
});

describe('update', () => {
  it('updates fields and returns the updated employee', async () => {
    const created = await repo.create(VALID_DTO);
    const updated = await repo.update(created.id, { ...VALID_DTO, salary: 95000 });
    expect(updated.salary).toBe(95000);
  });

  it('throws if the row cannot be retrieved after update', async () => {
    const created = await repo.create(VALID_DTO);
    jest.spyOn(repo, 'findById').mockResolvedValueOnce(null);
    await expect(repo.update(created.id, { ...VALID_DTO, salary: 99000 })).rejects.toThrow('failed to retrieve employee after update');
  });
});

describe('deleteById', () => {
  it('removes the employee from the database', async () => {
    const created = await repo.create(VALID_DTO);
    await repo.deleteById(created.id);
    expect(await repo.findById(created.id)).toBeNull();
  });
});

describe('findPage with search', () => {
  it('returns all employees when search is empty', async () => {
    await repo.create(VALID_DTO);
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob Smith' });
    const result = await repo.findPage(1, 20, '');
    expect(result.total).toBe(2);
    expect(result.employees).toHaveLength(2);
  });

  it('returns filtered employees and filtered total when search matches', async () => {
    await repo.create(VALID_DTO); // Alice Johnson
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob Smith' });
    const result = await repo.findPage(1, 20, 'Alice');
    expect(result.total).toBe(1);
    expect(result.employees[0].name).toBe('Alice Johnson');
  });

  it('returns empty employees and total 0 when search has no matches', async () => {
    await repo.create(VALID_DTO);
    const result = await repo.findPage(1, 20, 'zzznomatch');
    expect(result.total).toBe(0);
    expect(result.employees).toHaveLength(0);
  });

  it('returns filtered employees when search matches country', async () => {
    await repo.create(VALID_DTO); // country: 'Germany'
    await repo.create({ ...VALID_DTO, email: 'bob@example.com', name: 'Bob Smith', country: 'France' });
    const result = await repo.findPage(1, 20, 'Germany');
    expect(result.total).toBe(1);
    expect(result.employees[0].country).toBe('Germany');
  });
});
