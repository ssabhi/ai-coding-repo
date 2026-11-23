import { z } from 'zod';
import { ValidationError } from '../errors.js';

/** Parses untrusted input, turning schema failures into a 400 with per-field messages. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { formErrors, fieldErrors } = z.flattenError(result.error);
    throw new ValidationError('The request is invalid', {
      ...(formErrors.length > 0 && { _form: formErrors }),
      ...fieldErrors,
    });
  }
  return result.data;
}
