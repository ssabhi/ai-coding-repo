import { describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../src/api/client';
import { formatPrice } from '../src/format';

describe('api client', () => {
  it('turns a non-JSON error page (e.g. from a proxy) into an ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>502 Bad Gateway</html>', { status: 502 }),
    );

    const error = await api.topRated().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('turns a network failure into an ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.categories()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('encodes path segments and query strings', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ products: [] })));

    await api.searchProducts('rings & things');

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/products?q=rings+%26+things');
  });
});

describe('formatPrice', () => {
  it('formats minor units in the brand locale', () => {
    expect(formatPrice({ amountMinor: 10995, currency: 'GBP' })).toBe('£109.95');
    expect(formatPrice({ amountMinor: 30, currency: 'GBP' })).toBe('£0.30');
  });
});
