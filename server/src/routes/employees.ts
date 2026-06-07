import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { EmployeeController } from '../controllers/employeeController';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const wrap = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res, next).catch(next);

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();
  const ctrl = new EmployeeController(service);

  router.get('/', wrap(ctrl.list));
  router.get('/:id', wrap(ctrl.get));
  router.post('/', wrap(ctrl.create));
  router.put('/:id', wrap(ctrl.update));
  router.delete('/:id', wrap(ctrl.remove));

  return router;
}
