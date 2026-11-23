import type { Category, Product } from './product.js';

export interface ProductQuery {
  categorySlug?: string;
  search?: string;
}

/**
 * Port for the product data source. Callers describe what they want and the
 * implementation decides how to get it, so a database or search engine can
 * push filtering down instead of filtering in memory.
 */
export interface ProductRepository {
  list(query?: ProductQuery): Promise<Product[]>;
  findById(id: string): Promise<Product | undefined>;
  listCategories(): Promise<Category[]>;
}
