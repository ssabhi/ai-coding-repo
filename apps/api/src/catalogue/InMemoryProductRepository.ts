import type { Category, Product } from './product.js';
import type { ProductQuery, ProductRepository } from './ProductRepository.js';
import { matchesSearch } from './search.js';

/**
 * Serves a fixed list of products. Used for the offline snapshot
 * (PRODUCT_SOURCE=fixture), in tests, and by the Fake Store adapter, which has
 * no search API of its own.
 */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: readonly Product[];

  constructor(products: readonly Product[]) {
    this.products = [...products];
  }

  async list(query: ProductQuery = {}): Promise<Product[]> {
    const { categorySlug, search } = query;
    return this.products.filter(
      (product) =>
        (!categorySlug || product.category.slug === categorySlug) &&
        (!search || matchesSearch(product, search)),
    );
  }

  async findById(id: string): Promise<Product | undefined> {
    return this.products.find((product) => product.id === id);
  }

  async listCategories(): Promise<Category[]> {
    const bySlug = new Map<string, Category>();
    for (const { category } of this.products) {
      if (!bySlug.has(category.slug)) bySlug.set(category.slug, category);
    }
    return [...bySlug.values()];
  }
}
