import { z } from 'zod';
import type { Category, Product } from '../product.js';

/** The shape Fake Store returns. Validated so a breaking upstream change fails loudly. */
const fakeStoreProductSchema = z.object({
  id: z.number().int(),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string(),
  category: z.string().min(1),
  image: z.url(),
  rating: z.object({
    rate: z.number().min(0).max(5),
    count: z.number().int().nonnegative(),
  }),
});

export const fakeStoreCatalogueSchema = z.array(fakeStoreProductSchema);

export type FakeStoreProduct = z.infer<typeof fakeStoreProductSchema>;

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitleCase(text: string): string {
  return text.replace(/(^|\s)\p{Ll}/gu, (letter) => letter.toUpperCase());
}

export function toCategory(name: string): Category {
  return { slug: toSlug(name), name: toTitleCase(name) };
}

export function toProduct(raw: FakeStoreProduct, currency: string): Product {
  return {
    id: String(raw.id),
    title: raw.title.trim(),
    description: raw.description.trim(),
    price: { amountMinor: Math.round(raw.price * 100), currency },
    category: toCategory(raw.category),
    imageUrl: raw.image,
    rating: { average: raw.rating.rate, count: raw.rating.count },
  };
}
