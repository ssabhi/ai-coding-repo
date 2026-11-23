import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { enquiryInputSchema } from '../enquiries/enquiry.js';
import type { EnquiryService } from '../enquiries/EnquiryService.js';
import { parseOrThrow } from './validation.js';

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
}

export function enquiryRoutes(
  enquiries: EnquiryService,
  rateLimitOptions: RateLimitOptions,
): Router {
  const router = Router();

  // Each enquiry sends an email, so cap them per client to blunt spam and abuse.
  const limiter = rateLimit({
    windowMs: rateLimitOptions.windowMs,
    limit: rateLimitOptions.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many enquiries. Please try again later.' },
    },
  });

  router.post('/', limiter, async (req, res) => {
    const enquiry = parseOrThrow(enquiryInputSchema, req.body);
    const receipt = await enquiries.submit(enquiry);
    res.status(201).json(receipt);
  });

  return router;
}
