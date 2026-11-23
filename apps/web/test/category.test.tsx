import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categories, electronics, products, topRated } from './fixtures';
import { mockApi } from './mockApi';
import { renderApp } from './renderApp';

const titlesIn = (list: HTMLElement) =>
  within(list)
    .getAllByRole('heading')
    .map((heading) => heading.textContent);

describe('Category page', () => {
  it('GIVEN categories WHEN I click a category link THEN I see its top rated and additional products', async () => {
    mockApi({
      'GET /api/products/top-rated': { body: { products: topRated } },
      'GET /api/categories': { body: { categories } },
      'GET /api/categories/electronics': {
        body: {
          category: electronics,
          topRated: [products.monitor, products.drive],
          more: [products.cable],
        },
      },
    });
    const { user, location } = renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    await user.click(within(nav).getByRole('link', { name: 'Electronics' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Electronics' }),
    ).toBeInTheDocument();
    expect(location()).toBe('/categories/electronics');
    expect(titlesIn(screen.getByRole('list', { name: 'Top rated in Electronics' }))).toEqual([
      'Ultra-wide Monitor',
      'Portable SSD Drive',
    ]);
    expect(titlesIn(screen.getByRole('list', { name: 'More in Electronics' }))).toEqual([
      'Braided USB-C Cable',
    ]);
  });

  it('shows a not found message for an unknown category', async () => {
    mockApi({
      'GET /api/categories': { body: { categories } },
      'GET /api/categories/garden': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Category not found' } },
      },
    });

    renderApp('/categories/garden');

    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument();
  });
});
