export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class QuotaExceededError extends AppError {
  constructor() {
    super('Monthly query quota exceeded. Upgrade your plan to continue.', 429, 'QUOTA_EXCEEDED');
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Too many requests. Please slow down.', 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = 'Payment required to continue') {
    super(message, 402, 'PAYMENT_REQUIRED');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class BYOKRequiredError extends AppError {
  constructor() {
    super(
      'This organization has no active LLM credential configured. Add one in Settings to run queries.',
      409,
      'BYOK_REQUIRED'
    );
  }
}
