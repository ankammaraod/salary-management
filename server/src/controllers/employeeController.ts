import { Request, Response, NextFunction } from 'express';
import type { EmployeeService } from '../services/employeeService';
import { ValidationError } from '../middleware/errors';

export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const search = String(req.query.search ?? '');
    if (!Number.isInteger(page) || page < 1) return next(new ValidationError('page must be a positive integer'));
    if (!Number.isInteger(pageSize) || pageSize < 1) return next(new ValidationError('pageSize must be a positive integer'));
    res.json(await this.service.listEmployees(page, pageSize, search));
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    res.json(await this.service.getEmployee(id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.service.createEmployee(req.body));
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    res.json(await this.service.updateEmployee(id, req.body));
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = Number(req.params.id);
    if (isNaN(id)) return next(new ValidationError('id must be a number'));
    await this.service.deleteEmployee(id);
    res.status(204).send();
  };
}
