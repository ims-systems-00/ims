export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly isOperational: boolean;
  readonly details?: unknown;

  constructor(options: {
    message: string;
    statusCode?: number;
    code?: string;
    isOperational?: boolean;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_ERROR";
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super({ message, statusCode: 404, code: "NOT_FOUND" });
    this.name = "NotFoundError";
  }
}

export class ValidationAppError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super({
      message,
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
    this.name = "ValidationAppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super({ message, statusCode: 401, code: "UNAUTHORIZED" });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super({ message, statusCode: 403, code: "FORBIDDEN" });
    this.name = "ForbiddenError";
  }
}
