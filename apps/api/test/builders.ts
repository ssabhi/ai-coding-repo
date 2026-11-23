import type { Product } from '../src/catalogue/product.js';

const categories = {
  electronics: { slug: 'electronics', name: 'Electronics' },
  jewelery: { slug: 'jewelery', name: 'Jewelery' },
} as const;

export function aProduct(id: string, overrides: Partial<Omit<Product, 'id'>> = {}): Product {
  return {
    id,
    title: `Product ${id}`,
    description: 'A perfectly ordinary product.',
    price: { amountMinor: 1999, currency: 'GBP' },
    category: categories.electronics,
    imageUrl: `https://images.example/${id}.png`,
    rating: { average: 3, count: 10 },
    ...overrides,
  };
}

export const rated = (average: number, count = 10) => ({ rating: { average, count } });

export const inJewelery = { category: categories.jewelery };
