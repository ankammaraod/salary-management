import { Request, Response, NextFunction } from 'express';
import type { UploadService } from '../services/uploadService';
import { BulkValidationError } from '../types/upload';
import { ValidationError } from '../middleware/errors';

export class UploadController {
  constructor(private readonly service: UploadService) {}

  async bulkUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return next(new ValidationError('employees array is required'));
    }
    try {
      const result = await this.service.bulkUpload(employees);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof BulkValidationError) {
        res.status(400).json({ error: err.message, details: err.details });
      } else {
        next(err);
      }
    }
  }
}
