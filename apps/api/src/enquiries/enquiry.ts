import { z } from 'zod';

const singleLine = /^[^\r\n]*$/;

/** Turns "" into undefined so optional fields left blank are simply absent. */
const blankToUndefined = (value: string) => (value === '' ? undefined : value);

export const enquiryInputSchema = z.object({
  productId: z.string().trim().min(1).max(64),
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(100, 'Name must be 100 characters or fewer')
    .regex(singleLine, 'Name must be on a single line'),
  email: z
    .string()
    .trim()
    .max(254, 'Email address is too long')
    .pipe(z.email('Please enter a valid email address')),
  phone: z
    .string()
    .trim()
    .max(30, 'Phone number must be 30 characters or fewer')
    .regex(/^[0-9+().\s-]*$/, 'Please enter a valid phone number')
    .transform(blankToUndefined)
    .optional(),
  message: z
    .string()
    .trim()
    .max(2000, 'Message must be 2000 characters or fewer')
    .transform(blankToUndefined)
    .optional(),
});

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
