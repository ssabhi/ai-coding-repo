import type { Logger } from 'pino';
import type { AppDependencies } from './app.js';
import { CatalogueService } from './catalogue/CatalogueService.js';
import { FakeStoreProductRepository } from './catalogue/fakeStore/FakeStoreProductRepository.js';
import { loadSnapshotProducts } from './catalogue/fakeStore/snapshot.js';
import { InMemoryProductRepository } from './catalogue/InMemoryProductRepository.js';
import type { ProductRepository } from './catalogue/ProductRepository.js';
import type { AppConfig } from './config.js';
import { ConsoleEmailSender } from './email/ConsoleEmailSender.js';
import type { EmailSender } from './email/EmailSender.js';
import { SmtpEmailSender } from './email/SmtpEmailSender.js';
import { EnquiryService } from './enquiries/EnquiryService.js';

/**
 * The one place that decides which adapters are used. Changing data source or
 * email provider means adding an adapter and a case here; nothing else moves.
 */
export function createProductRepository(
  config: AppConfig['catalogue'],
  logger: Logger,
): ProductRepository {
  switch (config.source) {
    case 'fakestore':
      return new FakeStoreProductRepository({
        baseUrl: config.fakeStore.baseUrl,
        timeoutMs: config.fakeStore.timeoutMs,
        cacheTtlMs: config.cacheTtlMs,
        currency: config.currency,
        fallbackCatalogue:
          config.fakeStore.fallback === 'snapshot'
            ? loadSnapshotProducts(config.currency)
            : undefined,
        logger,
      });
    case 'fixture':
      return new InMemoryProductRepository(loadSnapshotProducts(config.currency));
  }
}

export function createEmailSender(config: AppConfig['email'], logger: Logger): EmailSender {
  switch (config.transport) {
    case 'smtp':
      return SmtpEmailSender.fromConfig(config.smtp);
    case 'console':
      return new ConsoleEmailSender(logger);
  }
}

export function composeDependencies(config: AppConfig, logger: Logger): AppDependencies {
  const products = createProductRepository(config.catalogue, logger);

  return {
    catalogue: new CatalogueService(products, {
      topRatedIds: config.catalogue.topRatedIds,
      categoryTopRatedLimit: config.catalogue.categoryTopRatedLimit,
    }),
    enquiries: new EnquiryService({
      products,
      email: createEmailSender(config.email, logger),
      salesInbox: config.enquiries.salesInbox,
      from: config.enquiries.from,
      publicWebUrl: config.enquiries.publicWebUrl,
    }),
    logger,
    trustProxyHops: config.trustProxyHops,
    enquiryRateLimit: config.enquiries.rateLimit,
  };
}
