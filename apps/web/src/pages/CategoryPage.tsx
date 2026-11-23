import { useParams } from 'react-router';
import { ApiError } from '../api/client';
import { useCategoryPage } from '../api/queries';
import { brand } from '../brand';
import { ProductGrid } from '../components/ProductGrid';
import { Loading, LoadError, NotFound } from '../components/Status';

export function CategoryPage() {
  const { slug = '' } = useParams();
  const page = useCategoryPage(slug);

  if (page.isPending) return <Loading label="Loading category…" />;
  if (page.isError) {
    if (page.error instanceof ApiError && page.error.status === 404) {
      return <NotFound title="Category not found" />;
    }
    return <LoadError onRetry={() => void page.refetch()} />;
  }

  const { category, topRated, more } = page.data;
  return (
    <>
      <title>{`${category.name} | ${brand.name}`}</title>
      <h1>{category.name}</h1>

      <section aria-labelledby="category-top-rated">
        <h2 id="category-top-rated">Top rated in {category.name}</h2>
        <ProductGrid products={topRated} label={`Top rated in ${category.name}`} />
      </section>

      {more.length > 0 && (
        <section aria-labelledby="category-more">
          <h2 id="category-more">More in {category.name}</h2>
          <ProductGrid products={more} label={`More in ${category.name}`} />
        </section>
      )}
    </>
  );
}
