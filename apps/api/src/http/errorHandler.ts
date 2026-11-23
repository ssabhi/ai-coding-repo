import type { ErrorRequestHandler } from 'express';
import type { Logger } from 'pino';
import { AppError, type AppErrorCode, ValidationError } from '../errors.js';

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  UPSTREAM_UNAVAILABLE: 502,
  EMAIL_DELIVERY_FAILED: 502,
};

/** body-parser and friends attach a 4xx `status` to errors caused by the request. */
function clientErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const { status } = error;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
}

/**
 * The single place errors become HTTP responses. Clients always get
 * `{ error: { code, message, details? } }`; internals (stack traces, upstream
 * messages) are logged, never returned.
 */
export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next) => {
    if (error instanceof AppError) {
      const status = STATUS_BY_CODE[error.code];
      if (status >= 500) logger.error({ err: error }, error.message);
      res.status(status).json({
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof ValidationError && { details: error.fieldErrors }),
        },
      });
      return;
    }

    const status = clientErrorStatus(error);
    if (status !== undefined) {
      res.status(status).json({
        error: {
          code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST',
          message: 'The request could not be processed',
        },
      });
      return;
    }

    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  };
}
