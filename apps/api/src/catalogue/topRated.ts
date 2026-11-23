import type { Product } from './product.js';

function byCustomerRating(a: Product, b: Product): number {
  return (
    b.rating.average - a.rating.average ||
    b.rating.count - a.rating.count ||
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
}

/**
 * "Top rated" is a merchandising decision: the owner's picks come first, in the
 * order they were chosen. If there are fewer picks than `limit` (or a pick no
 * longer exists), the remaining slots go to the best customer-rated products.
 */
export function selectTopRated(
  products: readonly Product[],
  pickedIds: readonly string[],
  limit: number,
): Product[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const picked = [...new Set(pickedIds)].flatMap((id) => productsById.get(id) ?? []);
  const pickedIdSet = new Set(picked.map((product) => product.id));
  const rest = products.filter((product) => !pickedIdSet.has(product.id)).sort(byCustomerRating);

  return [...picked, ...rest].slice(0, limit);
}
