import { EmployeeService } from '../../src/services/employeeService';
import type { IEmployeeRepository } from '../../src/repositories/employeeRepository';
import type { Employee, CreateEmployeeDto } from '../../src/types/employee';

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

const ALICE: Employee = { id: 1, ...VALID_DTO };

function makeRepo(overrides: Partial<IEmployeeRepository> = {}): IEmployeeRepository {
  return {
    findPage: jest.fn().mockResolvedValue({ employees: [], total: 0 }),
    findById: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(ALICE),
    update: jest.fn().mockResolvedValue(ALICE),
    deleteById: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('listEmployees', () => {
  it('delegates page, pageSize, and empty search to repo.findPage', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    const result = await service.listEmployees(1, 20);
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, '');
    expect(result).toEqual(pageResult);
  });

  it('delegates search term to repo.findPage', async () => {
    const pageResult = { employees: [ALICE], total: 1 };
    const repo = makeRepo({ findPage: jest.fn().mockResolvedValue(pageResult) });
    const service = new EmployeeService(repo);
    await service.listEmployees(1, 20, 'alice');
    expect(repo.findPage).toHaveBeenCalledWith(1, 20, 'alice');
  });
});

describe('getEmployee', () => {
  it('returns the employee when found', async () => {
    const service = new EmployeeService(makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) }));
    expect((await service.getEmployee(1)).name).toBe('Alice Johnson');
  });

  it('throws 404 when not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.getEmployee(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('createEmployee — validation', () => {
  it.each([
    ['name is required',                { name: '' }],
    ['email is invalid',                { email: 'not-an-email' }],
    ['invalid gender',                  { gender: 'Unknown' as any }],
    ['role is required',                { role: '' }],
    ['department is required',          { department: '' }],
    ['country is required',             { country: '' }],
    ['salary must be positive',         { salary: -1 }],
    ['invalid employment type',         { employment_type: 'Part-time' as any }],
    ['joining_date must be YYYY-MM-DD', { joining_date: '15-03-2019' }],
  ])('throws 400 when %s', async (_msg, override) => {
    const service = new EmployeeService(makeRepo());
    await expect(service.createEmployee({ ...VALID_DTO, ...override })).rejects.toMatchObject({ status: 400 });
  });

  it('throws 409 when email already exists', async () => {
    const service = new EmployeeService(makeRepo({ findByEmail: jest.fn().mockResolvedValue(ALICE) }));
    await expect(service.createEmployee(VALID_DTO)).rejects.toMatchObject({ status: 409 });
  });

  it('creates and returns the employee on valid input', async () => {
    const repo = makeRepo();
    const service = new EmployeeService(repo);
    const result = await service.createEmployee(VALID_DTO);
    expect(repo.create).toHaveBeenCalledWith(VALID_DTO);
    expect(result.id).toBe(1);
  });
});

describe('updateEmployee', () => {
  it('throws 400 on invalid input', async () => {
    const service = new EmployeeService(makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) }));
    await expect(service.updateEmployee(1, { ...VALID_DTO, name: '' })).rejects.toMatchObject({ status: 400 });
  });

  it('throws 404 when employee not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.updateEmployee(999, VALID_DTO)).rejects.toMatchObject({ status: 404 });
  });

  it('throws 409 when email belongs to a different employee', async () => {
    const OTHER: Employee = { id: 2, ...VALID_DTO, email: 'other@example.com' };
    const service = new EmployeeService(makeRepo({
      findById: jest.fn().mockResolvedValue(OTHER),
      findByEmail: jest.fn().mockResolvedValue(ALICE),
    }));
    await expect(service.updateEmployee(2, VALID_DTO)).rejects.toMatchObject({ status: 409 });
  });

  it('allows updating when email belongs to the same employee', async () => {
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(ALICE),
      findByEmail: jest.fn().mockResolvedValue(ALICE),
    });
    const service = new EmployeeService(repo);
    await service.updateEmployee(1, VALID_DTO);
    expect(repo.update).toHaveBeenCalledWith(1, VALID_DTO);
  });
});

describe('deleteEmployee', () => {
  it('throws 404 when not found', async () => {
    const service = new EmployeeService(makeRepo());
    await expect(service.deleteEmployee(999)).rejects.toMatchObject({ status: 404 });
  });

  it('calls deleteById when found', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(ALICE) });
    const service = new EmployeeService(repo);
    await service.deleteEmployee(1);
    expect(repo.deleteById).toHaveBeenCalledWith(1);
  });
});
