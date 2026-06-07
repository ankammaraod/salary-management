import { Router, Request, Response, NextFunction } from 'express';
import type { InsightsService } from '../services/insightsService';
import { InsightsController } from '../controllers/insightsController';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

export function createInsightsRouter(service: InsightsService): Router {
  const router = Router();
  const ctrl = new InsightsController(service);

  router.get('/countries', wrap((req, res, next) => ctrl.listCountries(req, res)));
  router.get('/', wrap((req, res, next) => ctrl.getInsights(req, res, next)));

  return router;
}
