import { pino } from 'pino';
import { createApp } from './app.js';
import { composeDependencies } from './composition.js';
import { loadConfig } from './config.js';

const config = loadConfig();

const logger = pino({
  level: config.logLevel,
  redact: ['req.headers.cookie', 'req.headers.authorization'],
  ...(config.env === 'development' && { transport: { target: 'pino-pretty' } }),
});

const deps = composeDependencies(config, logger);
const app = createApp(deps);

const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      productSource: config.catalogue.source,
      emailTransport: config.email.transport,
    },
    'API listening',
  );
});

// Warm the catalogue cache and surface data-source problems at startup, not on
// the first customer request.
deps.catalogue.listCategories().catch((error: unknown) => {
  logger.warn(
    { err: error },
    'Could not load the catalogue. If Fake Store is blocking requests, set PRODUCT_SOURCE=fixture.',
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
