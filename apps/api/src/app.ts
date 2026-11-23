import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { CatalogueService } from './catalogue/CatalogueService.js';
import type { EnquiryService } from './enquiries/EnquiryService.js';
import { NotFoundError } from './errors.js';
import { catalogueRoutes } from './http/catalogueRoutes.js';
import { enquiryRoutes, type RateLimitOptions } from './http/enquiryRoutes.js';
import { errorHandler } from './http/errorHandler.js';

export interface AppDependencies {
  catalogue: CatalogueService;
  enquiries: EnquiryService;
  logger: Logger;
  trustProxyHops: number;
  enquiryRateLimit: RateLimitOptions;
}

/** Builds the HTTP app from already-constructed services, so tests can pass fakes. */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  // Needed so rate limiting sees the real client IP behind nginx, not nginx's.
  app.set('trust proxy', deps.trustProxyHops);

  app.use(helmet());
  app.use(
    pinoHttp({
      logger: deps.logger,
      // Container health checks hit this every few seconds; don't drown real traffic.
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api', catalogueRoutes(deps.catalogue));
  app.use('/api/enquiries', enquiryRoutes(deps.enquiries, deps.enquiryRateLimit));
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route not found'));
  });

  app.use(errorHandler(deps.logger));
  return app;
}
