import { Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { ValidationError } from '../middleware/errors';

export function createEmployeeController(service: EmployeeService) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      const page = Number(req.query.page ?? 1);
      const pageSize = Number(req.query.pageSize ?? 20);
      const search = String(req.query.search ?? '');
      if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
      if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
      res.json(await service.listEmployees(page, pageSize, search));
    },

    get: async (req: Request, res: Response, next: NextFunction) => {
      const id = Number(req.params.id);
      if (isNaN(id)) return next(new ValidationError('id must be a number'));
      res.json(await service.getEmployee(id));
    },

    create: async (req: Request, res: Response) => {
      res.status(201).json(await service.createEmployee(req.body));
    },

    update: async (req: Request, res: Response, next: NextFunction) => {
      const id = Number(req.params.id);
      if (isNaN(id)) return next(new ValidationError('id must be a number'));
      res.json(await service.updateEmployee(id, req.body));
    },

    remove: async (req: Request, res: Response, next: NextFunction) => {
      const id = Number(req.params.id);
      if (isNaN(id)) return next(new ValidationError('id must be a number'));
      await service.deleteEmployee(id);
      res.status(204).send();
    },
  };
}
