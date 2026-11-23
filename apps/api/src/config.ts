import { z } from 'zod';
import type { SmtpConfig } from './email/SmtpEmailSender.js';

const baseUrl = z.url().transform((url) => url.replace(/\/+$/, ''));

const commaSeparatedIds = z.string().transform((value) =>
  value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Number of reverse proxies in front of the API (1 behind nginx). */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  PUBLIC_WEB_URL: baseUrl.default('http://localhost:5173'),

  PRODUCT_SOURCE: z.enum(['fakestore', 'fixture']).default('fakestore'),
  FAKESTORE_BASE_URL: baseUrl.default('https://fakestoreapi.com'),
  FAKESTORE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  CATALOGUE_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  CATALOGUE_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, 'must be an ISO 4217 code such as GBP')
    .default('GBP'),
  TOP_RATED_PRODUCT_IDS: commaSeparatedIds.default(['1', '5', '11', '17', '19']),
  CATEGORY_TOP_RATED_LIMIT: z.coerce.number().int().min(1).max(12).default(3),

  EMAIL_TRANSPORT: z.enum(['smtp', 'console']).default('console'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  ENQUIRY_TO_EMAIL: z.email().default('sales@example.com'),
  ENQUIRY_FROM_EMAIL: z.email().default('catalogue@example.com'),
  ENQUIRY_RATE_LIMIT_PER_15_MIN: z.coerce.number().int().positive().default(10),
});

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  port: number;
  logLevel: string;
  trustProxyHops: number;
  catalogue: {
    source: 'fakestore' | 'fixture';
    fakeStore: { baseUrl: string; timeoutMs: number };
    cacheTtlMs: number;
    currency: string;
    topRatedIds: string[];
    categoryTopRatedLimit: number;
  };
  email: {
    transport: 'smtp' | 'console';
    smtp: SmtpConfig;
  };
  enquiries: {
    salesInbox: string;
    from: string;
    publicWebUrl: string;
    rateLimit: { windowMs: number; limit: number };
  };
}

/** Reads and validates configuration. Fails fast with every problem listed. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Treat `FOO=` the same as FOO being unset, so blank lines in .env fall back to defaults.
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ''));
  const parsed = envSchema.safeParse(present);
  if (!parsed.success) {
    throw new Error(`Invalid configuration:\n${z.prettifyError(parsed.error)}`);
  }
  const e = parsed.data;

  return {
    env: e.NODE_ENV,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    trustProxyHops: e.TRUST_PROXY_HOPS,
    catalogue: {
      source: e.PRODUCT_SOURCE,
      fakeStore: { baseUrl: e.FAKESTORE_BASE_URL, timeoutMs: e.FAKESTORE_TIMEOUT_MS },
      cacheTtlMs: e.CATALOGUE_CACHE_TTL_SECONDS * 1000,
      currency: e.CATALOGUE_CURRENCY,
      topRatedIds: e.TOP_RATED_PRODUCT_IDS,
      categoryTopRatedLimit: e.CATEGORY_TOP_RATED_LIMIT,
    },
    email: {
      transport: e.EMAIL_TRANSPORT,
      smtp: {
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        user: e.SMTP_USER,
        pass: e.SMTP_PASS,
      },
    },
    enquiries: {
      salesInbox: e.ENQUIRY_TO_EMAIL,
      from: e.ENQUIRY_FROM_EMAIL,
      publicWebUrl: e.PUBLIC_WEB_URL,
      rateLimit: { windowMs: 15 * 60 * 1000, limit: e.ENQUIRY_RATE_LIMIT_PER_15_MIN },
    },
  };
}
