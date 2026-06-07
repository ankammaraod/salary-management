import { Router, Request, Response, NextFunction } from 'express';
import type { UploadService } from '../services/uploadService';
import { UploadController } from '../controllers/uploadController';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

export function createUploadRouter(service: UploadService): Router {
  const router = Router();
  const ctrl = new UploadController(service);

  router.post('/', wrap((req, res, next) => ctrl.bulkUpload(req, res, next)));

  return router;
}
