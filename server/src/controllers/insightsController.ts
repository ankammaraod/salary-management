import { Request, Response, NextFunction } from 'express';
import type { InsightsService } from '../services/insightsService';
import { ValidationError } from '../middleware/errors';

export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  async listCountries(_req: Request, res: Response): Promise<void> {
    res.json(await this.service.listCountries());
  }

  async getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    const country = String(req.query.country ?? '').trim();

    if (!country) return next(new ValidationError('country is required'));

    res.json(await this.service.getInsights(country));
  }
}
