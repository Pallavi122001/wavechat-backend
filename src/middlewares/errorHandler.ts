import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  // Handle Mongoose Duplicate Key Error (E11000)
  if (err?.code === 11000) {
    const keys = Object.keys(err.keyValue || {}).join(', ');
    res.status(409).json({
      success: false,
      message: keys ? `User with this ${keys} already exists` : 'Duplicate entry error',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
};
