/**
 * Errors the application raises on purpose. Each has a stable `code` that the
 * HTTP layer maps to a status, and that clients can branch on.
 */
export type AppErrorCode =
  'NOT_FOUND' | 'VALIDATION_FAILED' | 'UPSTREAM_UNAVAILABLE' | 'EMAIL_DELIVERY_FAILED';

export type FieldErrors = Record<string, string[] | undefined>;

export abstract class AppError extends Error {
  abstract readonly code: AppErrorCode;
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_FAILED';

  constructor(
    message: string,
    readonly fieldErrors: FieldErrors,
  ) {
    super(message);
  }
}

/** The product data source could not be reached or returned something unusable. */
export class UpstreamError extends AppError {
  readonly code = 'UPSTREAM_UNAVAILABLE';
}

export class EmailDeliveryError extends AppError {
  readonly code = 'EMAIL_DELIVERY_FAILED';
}
