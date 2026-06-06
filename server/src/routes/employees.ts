import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.listEmployees());
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.getEmployee(Number(req.params.id)));
    } catch (err) { next(err); }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await service.createEmployee(req.body));
    } catch (err) { next(err); }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.updateEmployee(Number(req.params.id), req.body));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.deleteEmployee(Number(req.params.id));
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
