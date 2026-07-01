import {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  QuotaExceededError,
  PaymentRequiredError,
} from '../../utils/errors';

describe('Custom Error Classes', () => {
  it('AppError sets statusCode and code', () => {
    const err = new AppError('I am a teapot', 418, 'TEAPOT');
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('TEAPOT');
    expect(err.message).toBe('I am a teapot');
    expect(err instanceof Error).toBe(true);
  });

  it('NotFoundError returns 404', () => {
    const err = new NotFoundError('User');
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain('User');
  });

  it('ValidationError returns 400', () => {
    const err = new ValidationError('invalid input');
    expect(err.statusCode).toBe(400);
  });

  it('UnauthorizedError returns 401', () => {
    expect(new UnauthorizedError().statusCode).toBe(401);
  });

  it('ForbiddenError returns 403', () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it('ConflictError returns 409', () => {
    expect(new ConflictError('email exists').statusCode).toBe(409);
  });

  it('QuotaExceededError returns 429', () => {
    expect(new QuotaExceededError().statusCode).toBe(429);
    expect(new QuotaExceededError().code).toBe('QUOTA_EXCEEDED');
  });

  it('PaymentRequiredError returns 402', () => {
    expect(new PaymentRequiredError().statusCode).toBe(402);
  });
});
