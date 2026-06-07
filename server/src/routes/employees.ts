import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { EmployeeController } from '../controllers/employeeController';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();
  const ctrl = new EmployeeController(service);

  router.get('/', wrap((req, res, next) => ctrl.list(req, res, next)));
  router.get('/:id', wrap((req, res, next) => ctrl.get(req, res, next)));
  router.post('/', wrap((req, res) => ctrl.create(req, res)));
  router.put('/:id', wrap((req, res, next) => ctrl.update(req, res, next)));
  router.delete('/:id', wrap((req, res, next) => ctrl.remove(req, res, next)));

  return router;
}
