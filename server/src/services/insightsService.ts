import type { IInsightsRepository } from '../repositories/insightsRepository';
import type { InsightsDto } from '../types/insights';
import { ValidationError } from '../middleware/errors';

export class InsightsService {
  constructor(private readonly repo: IInsightsRepository) {}

  listCountries(): Promise<string[]> {
    return this.repo.listCountries();
  }

  async getInsights(country: string): Promise<InsightsDto> {
    if (!country?.trim()) throw new ValidationError('country is required');
    return this.repo.getInsights(country);
  }
}
