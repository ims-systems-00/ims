import type { Response } from "express";

export type SuccessBody<T> = {
  success: true;
  data: T;
  correlationId?: string;
};

export type ErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
};

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  correlationId?: string
): void {
  const body: SuccessBody<T> = {
    success: true,
    data,
    ...(correlationId ? { correlationId } : {}),
  };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  options: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  }
): void {
  const body: ErrorBody = {
    success: false,
    error: {
      code: options.code,
      message: options.message,
      ...(options.details !== undefined ? { details: options.details } : {}),
    },
    ...(options.correlationId ? { correlationId: options.correlationId } : {}),
  };
  res.status(options.statusCode).json(body);
}
