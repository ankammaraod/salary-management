import request from 'supertest';
import express from 'express';
import { createUploadRouter } from '../../src/routes/upload';
import { errorHandler } from '../../src/middleware/errorHandler';
import { BulkValidationError } from '../../src/types/upload';
import type { UploadService } from '../../src/services/uploadService';

const VALID_DTO = {
  name: 'Alice Johnson', email: 'alice@example.com', gender: 'Female',
  role: 'Engineer', department: 'Engineering', country: 'Germany',
  salary: 87400, employment_type: 'Full-time', joining_date: '2019-03-15',
};

function makeService(overrides: Partial<UploadService> = {}): UploadService {
  return {
    bulkUpload: jest.fn().mockResolvedValue({ inserted: 1 }),
    ...overrides,
  } as unknown as UploadService;
}

function makeApp(service: UploadService) {
  const app = express();
  app.use(express.json());
  app.use('/api/upload', createUploadRouter(service));
  app.use(errorHandler);
  return app;
}

describe('POST /api/upload', () => {
  it('returns 201 with { inserted: N } on valid body', async () => {
    const res = await request(makeApp(makeService()))
      .post('/api/upload')
      .send({ employees: [VALID_DTO] });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ inserted: 1 });
  });

  it('returns 400 when employees array is missing', async () => {
    const res = await request(makeApp(makeService()))
      .post('/api/upload')
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 400 when employees is an empty array', async () => {
    const res = await request(makeApp(makeService()))
      .post('/api/upload')
      .send({ employees: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 with error details when service throws BulkValidationError', async () => {
    const errors = [{ index: 0, field: 'email', message: 'email is invalid' }];
    const service = makeService({
      bulkUpload: jest.fn().mockRejectedValue(new BulkValidationError(errors)),
    });
    const res = await request(makeApp(service))
      .post('/api/upload')
      .send({ employees: [VALID_DTO] });
    expect(res.status).toBe(400);
    expect(res.body.details.errors).toEqual(errors);
  });

  it('delegates to errorHandler for unexpected errors', async () => {
    const service = makeService({
      bulkUpload: jest.fn().mockRejectedValue(new Error('db down')),
    });
    const res = await request(makeApp(service))
      .post('/api/upload')
      .send({ employees: [VALID_DTO] });
    expect(res.status).toBe(500);
  });
});
