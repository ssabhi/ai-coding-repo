import type { Product } from './product.js';

function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents: "café" -> "cafe"
    .toLowerCase()
    .replace(/['’]/g, ''); // "men's" -> "mens"
}

export function toSearchTerms(text: string): string[] {
  return normalise(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * A product matches when every search term is the start of a word in its
 * title, description or category. Matching on word starts (not anywhere in the
 * text) stops "men" from matching "women", while still letting "jack" find
 * "jacket".
 */
export function matchesSearch(product: Product, search: string): boolean {
  const terms = toSearchTerms(search);
  const words = toSearchTerms(`${product.title} ${product.description} ${product.category.name}`);
  return terms.every((term) => words.some((word) => word.startsWith(term)));
}
