import { Router, Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { ValidationError } from '../middleware/errors';

export function createEmployeeRouter(service: EmployeeService): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
    if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
    try {
      res.json(await service.listEmployees(page, pageSize));
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      res.json(await service.getEmployee(id));
    } catch (err) { next(err); }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await service.createEmployee(req.body));
    } catch (err) { next(err); }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      res.json(await service.updateEmployee(id, req.body));
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    try {
      await service.deleteEmployee(id);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
