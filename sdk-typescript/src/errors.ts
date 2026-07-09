export interface ApiErrorBody {
  error?: {
    message?: string;
    code?: string;
  };
}

/** Base error for any non-2xx response from the FUGU API. */
export class FuguApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'FuguApiError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a query is rejected because the organization has no active
 * LLM credential configured (BYOK). Distinct subclass so callers can branch
 * on `instanceof BYOKRequiredError` instead of string-matching `code`.
 */
export class BYOKRequiredError extends FuguApiError {
  constructor(message: string, status: number) {
    super(message, status, 'BYOK_REQUIRED');
    this.name = 'BYOKRequiredError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when the organization's monthly query quota has been exceeded. */
export class QuotaExceededError extends FuguApiError {
  constructor(message: string, status: number) {
    super(message, status, 'QUOTA_EXCEEDED');
    this.name = 'QuotaExceededError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Builds the right error subclass from a parsed error-response body. */
export function errorFromResponse(status: number, body: ApiErrorBody | null): FuguApiError {
  const message = body?.error?.message ?? `Request failed with status ${status}`;
  const code = body?.error?.code;

  if (code === 'BYOK_REQUIRED') return new BYOKRequiredError(message, status);
  if (code === 'QUOTA_EXCEEDED') return new QuotaExceededError(message, status);
  return new FuguApiError(message, status, code);
}
