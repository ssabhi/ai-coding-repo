import { describe, expect, it, vi } from 'vitest';
import { FakeStoreProductRepository } from '../src/catalogue/fakeStore/FakeStoreProductRepository.js';
import type { HttpGetJson } from '../src/catalogue/fakeStore/httpGetJson.js';
import { UpstreamError } from '../src/errors.js';

const backpack = {
  id: 1,
  title: 'Fjallraven Backpack ',
  price: 109.95,
  description: 'Your perfect pack.',
  category: "men's clothing",
  image: 'https://fakestoreapi.com/img/1.png',
  rating: { rate: 3.9, count: 120 },
};
const ring = {
  id: 5,
  title: 'Silver Ring',
  price: 0.1 + 0.2, // float noise must not leak into prices
  description: 'Shiny.',
  category: 'jewelery',
  image: 'https://fakestoreapi.com/img/5.png',
  rating: { rate: 4.6, count: 400 },
};

function setup(responses: Array<unknown | Error>) {
  let now = 0;
  const httpGet = vi.fn<HttpGetJson>(async () => {
    const next = responses.length > 1 ? responses.shift() : responses[0];
    if (next instanceof Error) throw next;
    return next;
  });
  const logger = { warn: vi.fn() };
  const repository = new FakeStoreProductRepository({
    baseUrl: 'https://fakestore.test',
    timeoutMs: 1000,
    cacheTtlMs: 60_000,
    currency: 'GBP',
    httpGet,
    logger,
    now: () => now,
  });
  const advanceClock = (ms: number) => {
    now += ms;
  };
  return { repository, httpGet, logger, advanceClock };
}

describe('FakeStoreProductRepository', () => {
  it('maps Fake Store products into the catalogue model', async () => {
    const { repository } = setup([[backpack, ring]]);

    expect(await repository.findById('1')).toEqual({
      id: '1',
      title: 'Fjallraven Backpack',
      description: 'Your perfect pack.',
      price: { amountMinor: 10995, currency: 'GBP' },
      category: { slug: 'mens-clothing', name: "Men's Clothing" },
      imageUrl: 'https://fakestoreapi.com/img/1.png',
      rating: { average: 3.9, count: 120 },
    });
    expect((await repository.findById('5'))?.price.amountMinor).toBe(30);
  });

  it('identifies itself honestly to the upstream API', async () => {
    const { repository, httpGet } = setup([[backpack]]);
    await repository.list();

    const [url, options] = httpGet.mock.calls[0]!;
    expect(url.href).toBe('https://fakestore.test/products');
    expect(options.headers).toEqual({ 'user-agent': 'product-catalogue-api/0.1' });
  });

  it('derives categories and filters by category and search term', async () => {
    const { repository } = setup([[backpack, ring]]);

    expect(await repository.listCategories()).toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'jewelery', name: 'Jewelery' },
    ]);
    expect((await repository.list({ categorySlug: 'jewelery' })).map((p) => p.id)).toEqual(['5']);
    expect((await repository.list({ search: 'backpack' })).map((p) => p.id)).toEqual(['1']);
  });

  it('fetches once while the cache is fresh, and again once it expires', async () => {
    const { repository, httpGet, advanceClock } = setup([[backpack]]);

    await repository.list();
    await repository.findById('1');
    await repository.listCategories();
    expect(httpGet).toHaveBeenCalledTimes(1);

    advanceClock(60_000);
    await repository.list();
    expect(httpGet).toHaveBeenCalledTimes(2);
  });

  it('shares one upstream request between concurrent callers', async () => {
    const { repository, httpGet } = setup([[backpack]]);

    await Promise.all([repository.list(), repository.list(), repository.findById('1')]);
    expect(httpGet).toHaveBeenCalledTimes(1);
  });

  it('raises UpstreamError when the API is unreachable and nothing is cached', async () => {
    const { repository } = setup([new Error('HTTP 403')]);
    await expect(repository.list()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('raises UpstreamError when the API returns an unexpected shape', async () => {
    const { repository } = setup([[{ id: 'not-a-number' }]]);
    await expect(repository.list()).rejects.toThrow('unexpected response');
  });

  it('serves the last good catalogue if a refresh fails', async () => {
    const { repository, logger, advanceClock } = setup([[backpack], new Error('timeout')]);

    await repository.list();
    advanceClock(60_000);

    expect((await repository.list()).map((p) => p.id)).toEqual(['1']);
    expect(logger.warn).toHaveBeenCalledOnce();
  });
});
