import type { Category, Product } from './product.js';
import type { ProductRepository } from './ProductRepository.js';
import { selectTopRated } from './topRated.js';

/** The home page shows exactly five top rated products (acceptance criteria). */
export const HOME_TOP_RATED_COUNT = 5;

export interface MerchandisingConfig {
  /** Product ids the owner has chosen as "top rated", in display order. */
  topRatedIds: readonly string[];
  /** How many top rated products head each category page. */
  categoryTopRatedLimit: number;
}

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  /** The rest of the category, excluding anything already in `topRated`. */
  more: Product[];
}

export class CatalogueService {
  constructor(
    private readonly products: ProductRepository,
    private readonly merchandising: MerchandisingConfig,
  ) {}

  async topRated(): Promise<Product[]> {
    const all = await this.products.list();
    return selectTopRated(all, this.merchandising.topRatedIds, HOME_TOP_RATED_COUNT);
  }

  listCategories(): Promise<Category[]> {
    return this.products.listCategories();
  }

  async categoryPage(slug: string): Promise<CategoryPage | undefined> {
    const categories = await this.products.listCategories();
    const category = categories.find((candidate) => candidate.slug === slug);
    if (!category) return undefined;

    const inCategory = await this.products.list({ categorySlug: slug });
    const topRated = selectTopRated(
      inCategory,
      this.merchandising.topRatedIds,
      this.merchandising.categoryTopRatedLimit,
    );
    const topRatedIds = new Set(topRated.map((product) => product.id));

    return {
      category,
      topRated,
      more: inCategory.filter((product) => !topRatedIds.has(product.id)),
    };
  }

  /** Lists every product, or only those matching `search` when one is given. */
  listProducts(search?: string): Promise<Product[]> {
    return this.products.list(search ? { search } : {});
  }

  findProduct(id: string): Promise<Product | undefined> {
    return this.products.findById(id);
  }
}
