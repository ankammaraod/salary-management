import request from 'supertest';
import express from 'express';
import { createInsightsRouter } from '../../src/routes/insights';
import { errorHandler } from '../../src/middleware/errorHandler';
import { ValidationError } from '../../src/middleware/errors';
import type { InsightsService } from '../../src/services/insightsService';
import type { InsightsDto } from '../../src/types/insights';

const MOCK_DTO: InsightsDto = {
  headcount: 3,
  genderBreakdown: { Male: 1, Female: 2, Other: 0 },
  employmentTypeBreakdown: { 'Full-time': 2, Contractor: 1 },
  avgSalary: 80000,
  minSalary: 70000,
  maxSalary: 90000,
  totalPayroll: 240000,
  departmentBreakdown: [{ department: 'Engineering', headcount: 2, avgSalary: 85000 }],
};

function makeService(overrides: Partial<InsightsService> = {}): InsightsService {
  return {
    listCountries: jest.fn().mockResolvedValue(['Germany', 'USA']),
    getInsights: jest.fn().mockResolvedValue(MOCK_DTO),
    ...overrides,
  } as unknown as InsightsService;
}

function makeApp(service: InsightsService) {
  const app = express();
  app.use(express.json());
  app.use('/api/insights', createInsightsRouter(service));
  app.use(errorHandler);
  return app;
}

describe('GET /api/insights/countries', () => {
  it('returns 200 with array of countries', async () => {
    const res = await request(makeApp(makeService())).get('/api/insights/countries');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['Germany', 'USA']);
  });
});

describe('GET /api/insights', () => {
  it('returns 200 with InsightsDto when country is provided', async () => {
    const res = await request(makeApp(makeService())).get('/api/insights?country=Germany');
    expect(res.status).toBe(200);
    expect(res.body.headcount).toBe(3);
    expect(res.body.genderBreakdown.Male).toBe(1);
    expect(res.body.departmentBreakdown).toHaveLength(1);
  });

  it('passes the country param to the service', async () => {
    const service = makeService();
    await request(makeApp(service)).get('/api/insights?country=Germany');
    expect(service.getInsights).toHaveBeenCalledWith('Germany');
  });

  it('returns 400 when country query param is missing', async () => {
    const res = await request(makeApp(makeService())).get('/api/insights');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('country is required');
  });

  it('returns 400 when service throws ValidationError', async () => {
    const app = makeApp(makeService({
      getInsights: jest.fn().mockRejectedValue(new ValidationError('country is required')),
    }));
    const res = await request(app).get('/api/insights?country=   ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('country is required');
  });
});
