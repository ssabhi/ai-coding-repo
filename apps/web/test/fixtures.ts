import type { Category, Product } from '../src/api/types';

export const electronics: Category = { slug: 'electronics', name: 'Electronics' };
export const jewelery: Category = { slug: 'jewelery', name: 'Jewelery' };
export const categories = [electronics, jewelery];

function product(id: string, title: string, category: Category, pence: number): Product {
  return {
    id,
    title,
    description: `${title}: a description long enough to read.`,
    price: { amountMinor: pence, currency: 'GBP' },
    category,
    imageUrl: `https://images.example/${id}.png`,
    rating: { average: 4.2, count: 120 },
  };
}

export const products = {
  monitor: product('1', 'Ultra-wide Monitor', electronics, 59999),
  drive: product('2', 'Portable SSD Drive', electronics, 8950),
  cable: product('3', 'Braided USB-C Cable', electronics, 1299),
  ring: product('4', 'Silver Ring', jewelery, 4500),
  bracelet: product('5', 'Gold Bracelet', jewelery, 19900),
  necklace: product('6', 'Pearl Necklace', jewelery, 12500),
};

export const topRated = [
  products.monitor,
  products.ring,
  products.drive,
  products.bracelet,
  products.necklace,
];
