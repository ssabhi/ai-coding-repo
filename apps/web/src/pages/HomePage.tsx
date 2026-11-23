import { useTopRatedProducts } from '../api/queries';
import { brand } from '../brand';
import { ProductGrid } from '../components/ProductGrid';
import { Loading, LoadError } from '../components/Status';

export function HomePage() {
  const topRated = useTopRatedProducts();

  return (
    <>
      <title>{`${brand.name} | Home`}</title>
      <section className="hero">
        <h1>{brand.name}</h1>
        <p>{brand.tagline}</p>
      </section>

      <section aria-labelledby="top-rated-heading">
        <h2 id="top-rated-heading">Top rated</h2>
        {topRated.isPending && <Loading label="Loading top rated products…" />}
        {topRated.isError && <LoadError onRetry={() => void topRated.refetch()} />}
        {topRated.isSuccess && <ProductGrid products={topRated.data} label="Top rated products" />}
      </section>
    </>
  );
}
