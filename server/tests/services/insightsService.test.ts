import { InsightsService } from '../../src/services/insightsService';
import type { IInsightsRepository } from '../../src/repositories/insightsRepository';
import type { InsightsDto } from '../../src/types/insights';
import { ValidationError } from '../../src/middleware/errors';

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

function makeRepo(overrides: Partial<IInsightsRepository> = {}): IInsightsRepository {
  return {
    listCountries: jest.fn().mockResolvedValue(['Germany', 'USA']),
    getInsights: jest.fn().mockResolvedValue(MOCK_DTO),
    ...overrides,
  };
}

describe('listCountries', () => {
  it('delegates to the repository', async () => {
    const repo = makeRepo();
    const service = new InsightsService(repo);
    const result = await service.listCountries();
    expect(repo.listCountries).toHaveBeenCalled();
    expect(result).toEqual(['Germany', 'USA']);
  });
});

describe('getInsights', () => {
  it('throws ValidationError when country is empty string', async () => {
    const service = new InsightsService(makeRepo());
    await expect(service.getInsights('')).rejects.toThrow(ValidationError);
    await expect(service.getInsights('')).rejects.toThrow('country is required');
  });

  it('throws ValidationError when country is whitespace only', async () => {
    const service = new InsightsService(makeRepo());
    await expect(service.getInsights('   ')).rejects.toThrow(ValidationError);
  });

  it('delegates to the repository with the given country', async () => {
    const repo = makeRepo();
    const service = new InsightsService(repo);
    const result = await service.getInsights('Germany');
    expect(repo.getInsights).toHaveBeenCalledWith('Germany');
    expect(result).toEqual(MOCK_DTO);
  });
});
