import { errorHandler } from '../../src/middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

function makeRes(): Response {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn();
  return res as Response;
}

const req = {} as Request;
const next = jest.fn() as NextFunction;

afterEach(() => jest.restoreAllMocks());

describe('errorHandler', () => {
  it('returns the error status and message for known errors', () => {
    const err = Object.assign(new Error('not found'), { status: 404 });
    errorHandler(err, req, makeRes(), next);
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'not found' });
  });

  it('returns 500 with generic message for unknown errors', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = makeRes();
    errorHandler(new Error('oops'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'internal server error' });
  });

  it('logs the full error object for 500s', () => {
    const err = new Error('boom');
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, req, makeRes(), next);
    expect(spy).toHaveBeenCalledWith(err);
  });

  it('does not log for non-500 errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(Object.assign(new Error('x'), { status: 400 }), req, makeRes(), next);
    expect(spy).not.toHaveBeenCalled();
  });
});
