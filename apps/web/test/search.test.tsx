import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categories, products, topRated } from './fixtures';
import { mockApi } from './mockApi';
import { renderApp } from './renderApp';

const homeRoutes = {
  'GET /api/products/top-rated': { body: { products: topRated } },
  'GET /api/categories': { body: { categories } },
};

describe('Search', () => {
  it('GIVEN a search term WHEN I click Search THEN I only see matching products', async () => {
    const calls = mockApi({
      ...homeRoutes,
      'GET /api/products?q=silver+ring': { body: { products: [products.ring] } },
    });
    const { user, location } = renderApp('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '  silver ring ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    const results = await screen.findByRole('list', { name: 'Search results' });
    expect(within(results).getAllByRole('link')).toHaveLength(1);
    expect(within(results).getByRole('heading', { name: 'Silver Ring' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 product found');

    // The term is trimmed, lives in the URL (shareable) and is searched server-side.
    expect(location()).toBe('/search?q=silver+ring');
    expect(calls.map((call) => call.path)).toContain('/api/products?q=silver+ring');
  });

  it('says so when nothing matches', async () => {
    mockApi({ ...homeRoutes, 'GET /api/products?q=trampoline': { body: { products: [] } } });

    renderApp('/search?q=trampoline');

    expect(
      await screen.findByText('No products match “trampoline”. Try a different word.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument();
  });

  it('does not search for a blank term', async () => {
    const calls = mockApi(homeRoutes);
    const { user, location } = renderApp('/');

    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(location()).toBe('/');
    expect(calls.some((call) => call.path.startsWith('/api/products?'))).toBe(false);
  });

  it('keeps the search term in the search box on the results page', async () => {
    mockApi({ ...homeRoutes, 'GET /api/products?q=ring': { body: { products: [products.ring] } } });

    renderApp('/search?q=ring');

    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('ring');
  });
});
