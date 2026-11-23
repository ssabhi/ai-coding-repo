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
  logger?: Pick<Logger, 'warn'>;
  /** Injectable for tests. */
  httpGet?: HttpGetJson;
  now?: () => number;
}

/**
 * Reads the catalogue from fakestoreapi.com.
 *
 * Fake Store has 20 products and no search, so the adapter fetches the whole
 * catalogue once, caches it for `cacheTtlMs`, and answers queries in memory.
 * If a refresh fails it keeps serving the last good copy, because a slightly
 * stale catalogue is better than an error page.
 */
export class FakeStoreProductRepository implements ProductRepository {
  private cached?: { catalogue: InMemoryProductRepository; expiresAt: number };
  private inFlight?: Promise<InMemoryProductRepository>;
  private readonly httpGet: HttpGetJson;
  private readonly now: () => number;

  constructor(private readonly options: FakeStoreOptions) {
    this.httpGet = options.httpGet ?? httpGetJson;
    this.now = options.now ?? Date.now;
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
      this.options.logger?.warn(
        { err: error },
        'Fake Store refresh failed; serving cached catalogue',
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
    this.cached = { catalogue, expiresAt: this.now() + this.options.cacheTtlMs };
    return catalogue;
  }
}
