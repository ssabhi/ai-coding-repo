import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { categories, topRated } from './fixtures';
import { mockApi } from './mockApi';
import { renderApp } from './renderApp';

describe('Home page', () => {
  it('GIVEN 5 products chosen as top rated WHEN viewing the home page THEN those 5 are featured', async () => {
    mockApi({
      'GET /api/products/top-rated': { body: { products: topRated } },
      'GET /api/categories': { body: { categories } },
    });

    renderApp('/');

    const grid = await screen.findByRole('list', { name: 'Top rated products' });
    const tiles = within(grid).getAllByRole('link');
    expect(tiles).toHaveLength(5);
    expect(tiles.map((tile) => within(tile).getByRole('heading').textContent)).toEqual(
      topRated.map((product) => product.title),
    );
    expect(within(tiles[0]!).getByText('£599.99')).toBeInTheDocument();
  });

  it('links to every category from the navigation', async () => {
    mockApi({
      'GET /api/products/top-rated': { body: { products: topRated } },
      'GET /api/categories': { body: { categories } },
    });

    renderApp('/');

    const nav = await screen.findByRole('navigation', { name: 'Categories' });
    expect(within(nav).getByRole('link', { name: 'Electronics' })).toHaveAttribute(
      'href',
      '/categories/electronics',
    );
    expect(within(nav).getByRole('link', { name: 'Jewelery' })).toBeInTheDocument();
  });

  it('offers a retry when the products cannot be loaded', async () => {
    mockApi({
      'GET /api/products/top-rated': {
        status: 502,
        body: { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'down' } },
      },
      'GET /api/categories': { body: { categories } },
    });

    renderApp('/');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Sorry, we couldn't load this right now.");
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
