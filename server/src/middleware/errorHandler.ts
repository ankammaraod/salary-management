import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: Error & { status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = status === 500 ? 'internal server error' : err.message;
  if (status === 500) console.error(err.message);
  res.status(status).json({ error: message });
}
