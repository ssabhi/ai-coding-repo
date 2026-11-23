import type { Logger } from 'pino';
import { UpstreamError } from '../../errors.js';
import { InMemoryProductRepository } from '../InMemoryProductRepository.js';
import type { Category, Product } from '../product.js';
import type { ProductQuery, ProductRepository } from '../ProductRepository.js';
import { fakeStoreCatalogueSchema, toProduct } from './fakeStoreMapping.js';
import { httpGetJson, type HttpGetJson } from './httpGetJson.js';

const USER_AGENT = 'product-catalogue-api/0.1';

export interface FakeStoreOptions {
  /** No trailing slash, e.g. https://fakestoreapi.com */
  baseUrl: string;
  timeoutMs: number;
  cacheTtlMs: number;
  currency: string;
  /** After a failed fetch, wait this long before trying Fake Store again. */
  retryAfterFailureMs?: number;
  /**
   * Served when Fake Store has never been reachable, e.g. the bundled
   * snapshot. Off by default so an outage is an error, not silently old data.
   */
  fallbackCatalogue?: readonly Product[];
  logger?: Pick<Logger, 'warn'>;
  /** Injectable for tests. */
  httpGet?: HttpGetJson;
  now?: () => number;
}

interface CachedCatalogue {
  catalogue: InMemoryProductRepository;
  expiresAt: number;
  source: 'fakestore' | 'fallback';
}

/**
 * Reads the catalogue from fakestoreapi.com.
 *
 * Fake Store has 20 products and no search, so the adapter fetches the whole
 * catalogue once, caches it for `cacheTtlMs`, and answers queries in memory.
 * If a refresh fails it keeps serving the last good copy, because a slightly
 * stale catalogue is better than an error page, and it backs off so a slow
 * upstream doesn't make every request wait for a timeout.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private cached?: CachedCatalogue;
  private inFlight?: Promise<InMemoryProductRepository>;
  private readonly httpGet: HttpGetJson;
  private readonly now: () => number;

  constructor(private readonly options: FakeStoreOptions) {
    this.httpGet = options.httpGet ?? httpGetJson;
    this.now = options.now ?? Date.now;
    if (options.fallbackCatalogue) {
      // Already expired, so Fake Store is still tried first.
      this.cached = {
        catalogue: new InMemoryProductRepository(options.fallbackCatalogue),
        expiresAt: 0,
        source: 'fallback',
      };
    }
  }

  async list(query?: ProductQuery): Promise<Product[]> {
    return (await this.catalogue()).list(query);
  }

  async findById(id: string): Promise<Product | undefined> {
    return (await this.catalogue()).findById(id);
  }

  async listCategories(): Promise<Category[]> {
    return (await this.catalogue()).listCategories();
  }

  private async catalogue(): Promise<InMemoryProductRepository> {
    if (this.cached && this.now() < this.cached.expiresAt) return this.cached.catalogue;

    // Concurrent requests share one upstream call instead of stampeding it.
    this.inFlight ??= this.fetchCatalogue().finally(() => {
      this.inFlight = undefined;
    });

    try {
      return await this.inFlight;
    } catch (error) {
      if (!this.cached) throw error;
      this.cached.expiresAt = this.now() + (this.options.retryAfterFailureMs ?? 30_000);
      this.options.logger?.warn(
        { err: error, servedFrom: this.cached.source },
        'Fake Store is unavailable; serving the previous catalogue',
      );
      return this.cached.catalogue;
    }
  }

  private async fetchCatalogue(): Promise<InMemoryProductRepository> {
    let body: unknown;
    try {
      body = await this.httpGet(new URL(`${this.options.baseUrl}/products`), {
        timeoutMs: this.options.timeoutMs,
        headers: { 'user-agent': USER_AGENT },
      });
    } catch (error) {
      throw new UpstreamError('The product source is unavailable', { cause: error });
    }

    const parsed = fakeStoreCatalogueSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('The product source returned an unexpected response', {
        cause: parsed.error,
      });
    }

    const catalogue = new InMemoryProductRepository(
      parsed.data.map((raw) => toProduct(raw, this.options.currency)),
    );
    this.cached = {
      catalogue,
      expiresAt: this.now() + this.options.cacheTtlMs,
      source: 'fakestore',
    };
    return catalogue;
  }
}
