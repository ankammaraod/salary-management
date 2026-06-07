import request from 'supertest';
import express from 'express';
import { createEmployeeRouter } from '../../src/routes/employees';
import { errorHandler } from '../../src/middleware/errorHandler';
import { ValidationError, NotFoundError, ConflictError } from '../../src/middleware/errors';
import type { EmployeeService } from '../../src/services/employeeService';
import type { Employee } from '../../src/types/employee';

const ALICE: Employee = {
  id: 1, name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female',
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

const VALID_BODY = {
  name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female',
  role: 'Software Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

function makeService(overrides: Partial<EmployeeService> = {}): EmployeeService {
  return {
    listEmployees: jest.fn().mockResolvedValue({ employees: [ALICE], total: 1 }),
    getEmployee: jest.fn().mockResolvedValue(ALICE),
    createEmployee: jest.fn().mockResolvedValue(ALICE),
    updateEmployee: jest.fn().mockResolvedValue({ ...ALICE, salary: 95000 }),
    deleteEmployee: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as EmployeeService;
}

function makeApp(service: EmployeeService) {
  const app = express();
  app.use(express.json());
  app.use('/api/employees', createEmployeeRouter(service));
  app.use(errorHandler);
  return app;
}

describe('GET /api/employees', () => {
  it('returns 200 with paginated envelope', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=1&pageSize=20');
    expect(res.status).toBe(200);
    expect(res.body.employees).toHaveLength(1);
    expect(res.body.employees[0].name).toBe('Alice Johnson');
    expect(res.body.total).toBe(1);
  });

  it('defaults page to 1, pageSize to 20, search to empty string, and order to desc', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'desc');
  });

  it('passes search param to listEmployees', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?search=alice');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, 'alice', 'desc');
  });

  it('passes order=asc to listEmployees when ?order=asc', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?order=asc');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'asc');
  });

  it('defaults order to desc for unknown order values', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/employees?order=invalid');
    expect(service.listEmployees).toHaveBeenCalledWith(1, 20, '', 'desc');
  });

  it('returns 400 when page is not a number', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('page must be a positive integer');
  });

  it('returns 400 when page is 0', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('page must be a positive integer');
  });

  it('returns 400 when pageSize is not a number', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees?pageSize=abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pageSize must be a positive integer');
  });
});

describe('GET /api/employees/:id', () => {
  it('returns 200 with the employee', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Alice Johnson');
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ getEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).get('/api/employees/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('employee not found');
  });
});

describe('POST /api/employees', () => {
  it('returns 201 with the created employee', async () => {
    const res = await request(makeApp(makeService())).post('/api/employees').send(VALID_BODY);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });

  it('returns 400 on validation error', async () => {
    const app = makeApp(makeService({ createEmployee: jest.fn().mockRejectedValue(new ValidationError('name is required')) }));
    const res = await request(app).post('/api/employees').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('name is required');
  });

  it('returns 409 on duplicate email', async () => {
    const app = makeApp(makeService({ createEmployee: jest.fn().mockRejectedValue(new ConflictError('email already exists')) }));
    const res = await request(app).post('/api/employees').send(VALID_BODY);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('email already exists');
  });
});

describe('PUT /api/employees/:id', () => {
  it('returns 200 with updated employee', async () => {
    const res = await request(makeApp(makeService())).put('/api/employees/1').send(VALID_BODY);
    expect(res.status).toBe(200);
    expect(res.body.salary).toBe(95000);
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ updateEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).put('/api/employees/999').send(VALID_BODY);
    expect(res.status).toBe(404);
  });

  it('returns 409 on email conflict', async () => {
    const app = makeApp(makeService({ updateEmployee: jest.fn().mockRejectedValue(new ConflictError('email already exists')) }));
    const res = await request(app).put('/api/employees/1').send(VALID_BODY);
    expect(res.status).toBe(409);
  });
});

describe('non-numeric :id', () => {
  it('GET returns 400 for non-numeric id', async () => {
    const res = await request(makeApp(makeService())).get('/api/employees/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('id must be a number');
  });

  it('PUT returns 400 for non-numeric id', async () => {
    const res = await request(makeApp(makeService())).put('/api/employees/abc').send(VALID_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('id must be a number');
  });

  it('DELETE returns 400 for non-numeric id', async () => {
    const res = await request(makeApp(makeService())).delete('/api/employees/abc');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('id must be a number');
  });
});

describe('DELETE /api/employees/:id', () => {
  it('returns 204 on success', async () => {
    const res = await request(makeApp(makeService())).delete('/api/employees/1');
    expect(res.status).toBe(204);
  });

  it('returns 404 when not found', async () => {
    const app = makeApp(makeService({ deleteEmployee: jest.fn().mockRejectedValue(new NotFoundError('employee not found')) }));
    const res = await request(app).delete('/api/employees/999');
    expect(res.status).toBe(404);
  });
});
