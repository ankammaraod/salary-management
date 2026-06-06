import express, { Express } from 'express';
import knex from 'knex';
import knexConfig from '../knexfile';
import healthRouter from './routes/health';
import { createEmployeeRouter } from './routes/employees';
import { EmployeeRepository } from './repositories/employeeRepository';
import { EmployeeService } from './services/employeeService';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  const env = process.env.NODE_ENV ?? 'development';
  const db = knex(knexConfig[env]);
  const employeeRepo = new EmployeeRepository(db);
  const employeeService = new EmployeeService(employeeRepo);

  app.use('/api/health', healthRouter);
  app.use('/api/employees', createEmployeeRouter(employeeService));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
