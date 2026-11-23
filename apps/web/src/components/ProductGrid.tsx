import { Link } from 'react-router';
import type { Product } from '../api/types';
import { formatPrice } from '../format';
import { Rating } from './Rating';

export function ProductTile({ product }: { product: Product }) {
  return (
    <Link to={`/products/${encodeURIComponent(product.id)}`} className="product-tile">
      <div className="product-tile__image">
        {/* Decorative: the title right below already names the product. */}
        <img src={product.imageUrl} alt="" loading="lazy" />
      </div>
      <h3 className="product-tile__title">{product.title}</h3>
      <p className="product-tile__price">{formatPrice(product.price)}</p>
      <Rating rating={product.rating} />
    </Link>
  );
}

interface ProductGridProps {
  products: Product[];
  /** Labels the list for screen readers, e.g. "Top rated products". */
  label: string;
}

export function ProductGrid({ products, label }: ProductGridProps) {
  return (
    <ul className="product-grid" aria-label={label}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
