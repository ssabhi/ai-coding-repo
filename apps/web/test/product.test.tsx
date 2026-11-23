import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categories, products, topRated } from './fixtures';
import { mockApi } from './mockApi';
import { renderApp } from './renderApp';

describe('Product page', () => {
  it('GIVEN I am browsing WHEN I click a product tile THEN I see the product details page', async () => {
    mockApi({
      'GET /api/products/top-rated': { body: { products: topRated } },
      'GET /api/categories': { body: { categories } },
      'GET /api/products/1': { body: { product: products.monitor } },
    });
    const { user, location } = renderApp('/');

    const grid = await screen.findByRole('list', { name: 'Top rated products' });
    await user.click(within(grid).getByRole('heading', { name: 'Ultra-wide Monitor' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ultra-wide Monitor' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/products/1');
    expect(screen.getByText('£599.99')).toBeInTheDocument();
    expect(screen.getByText(products.monitor.description)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ultra-wide Monitor' })).toHaveAttribute(
      'src',
      products.monitor.imageUrl,
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', {
        name: 'Electronics',
      }),
    ).toHaveAttribute('href', '/categories/electronics');
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows a not found message for an unknown product', async () => {
    mockApi({
      'GET /api/categories': { body: { categories } },
      'GET /api/products/999': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Product not found' } },
      },
    });

    renderApp('/products/999');

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});
