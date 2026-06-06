import express, { Express } from 'express';

export function createApp(): Express {
  const app = express();
  app.use(express.json());
  // Routes registered here in future features
  // e.g. app.use('/api/employees', employeeRouter);
  return app;
}
