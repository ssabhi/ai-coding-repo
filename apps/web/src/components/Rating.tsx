import type { Product } from '../api/types';

export function Rating({ rating }: { rating: Product['rating'] }) {
  const average = rating.average.toFixed(1);
  return (
    <p className="rating">
      <span aria-hidden="true">
        ★ {average} <span className="rating__count">({rating.count})</span>
      </span>
      <span className="visually-hidden">
        Rated {average} out of 5 from {rating.count} reviews
      </span>
    </p>
  );
}
