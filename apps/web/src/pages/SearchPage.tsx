import { useSearchParams } from 'react-router';
import { useProductSearch } from '../api/queries';
import { brand } from '../brand';
import { ProductGrid } from '../components/ProductGrid';
import { Loading, LoadError } from '../components/Status';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();
  const results = useProductSearch(query);

  if (!query) {
    return (
      <>
        <title>{`Search | ${brand.name}`}</title>
        <h1>Search</h1>
        <p>Enter a search term above to find products.</p>
      </>
    );
  }

  return (
    <>
      <title>{`Search: ${query} | ${brand.name}`}</title>
      <h1>Results for “{query}”</h1>
      {results.isPending && <Loading label="Searching…" />}
      {results.isError && <LoadError onRetry={() => void results.refetch()} />}
      {results.isSuccess && (
        <>
          <p role="status">
            {results.data.length === 0
              ? `No products match “${query}”. Try a different word.`
              : `${results.data.length} ${results.data.length === 1 ? 'product' : 'products'} found`}
          </p>
          {results.data.length > 0 && (
            <ProductGrid products={results.data} label="Search results" />
          )}
        </>
      )}
    </>
  );
}
