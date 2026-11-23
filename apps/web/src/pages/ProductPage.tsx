import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/client';
import { useProduct } from '../api/queries';
import { brand } from '../brand';
import { EnquiryForm } from '../components/EnquiryForm';
import { Rating } from '../components/Rating';
import { Loading, LoadError, NotFound } from '../components/Status';
import { formatPrice } from '../format';

export function ProductPage() {
  const { id = '' } = useParams();
  // Keyed on id: moving between products (e.g. with the back button) must not
  // carry an open enquiry form or a "thank you" over to a different product.
  return <ProductDetails key={id} id={id} />;
}

function ProductDetails({ id }: { id: string }) {
  const product = useProduct(id);
  const [enquiring, setEnquiring] = useState(false);

  if (product.isPending) return <Loading label="Loading product…" />;
  if (product.isError) {
    if (product.error instanceof ApiError && product.error.status === 404) {
      return <NotFound title="Product not found" />;
    }
    return <LoadError onRetry={() => void product.refetch()} />;
  }

  const { title, description, price, category, imageUrl, rating } = product.data;
  return (
    <article className="product">
      <title>{`${title} | ${brand.name}`}</title>
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/categories/${encodeURIComponent(category.slug)}`}>{category.name}</Link>
      </nav>

      <div className="product__layout">
        <div className="product__image">
          <img src={imageUrl} alt={title} />
        </div>

        <div className="product__info">
          <h1>{title}</h1>
          <p className="product__price">{formatPrice(price)}</p>
          <Rating rating={rating} />
          <p className="product__description">{description}</p>

          {enquiring ? (
            <EnquiryForm productId={id} productTitle={title} />
          ) : (
            <button type="button" className="button" onClick={() => setEnquiring(true)}>
              Enquire
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
