import express, { Express } from 'express';
import knex from 'knex';
import knexConfig from '../knexfile';
import healthRouter from './routes/health';
import { createEmployeeRouter } from './routes/employees';
import { createInsightsRouter } from './routes/insights';
import { createUploadRouter } from './routes/upload';
import { EmployeeRepository } from './repositories/employeeRepository';
import { EmployeeService } from './services/employeeService';
import { InsightsRepository } from './repositories/insightsRepository';
import { InsightsService } from './services/insightsService';
import { UploadService } from './services/uploadService';

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const env = process.env.NODE_ENV ?? 'development';
  const db = knex(knexConfig[env]);
  const employeeRepo = new EmployeeRepository(db);
  const employeeService = new EmployeeService(employeeRepo);
  const insightsRepo = new InsightsRepository(db);
  const insightsService = new InsightsService(insightsRepo);
  const uploadService = new UploadService(employeeRepo);

  app.use('/api/health', healthRouter);
  app.use('/api/employees', createEmployeeRouter(employeeService));
  app.use('/api/insights', createInsightsRouter(insightsService));
  app.use('/api/upload', createUploadRouter(uploadService));

  return app;
}
