/**
 * The catalogue's own product model. Adapters translate whatever a data source
 * returns into these types, so nothing outside an adapter depends on Fake Store.
 */

/** Integer minor units (e.g. pence) so prices never go through float arithmetic. */
export interface Money {
  amountMinor: number;
  currency: string;
}

export interface Category {
  /** URL-safe identifier, e.g. "mens-clothing". */
  slug: string;
  name: string;
}

export interface Rating {
  average: number;
  count: number;
}

export interface Product {
  /** Strings, not numbers, so a future source can use SKUs or UUIDs. */
  id: string;
  title: string;
  description: string;
  price: Money;
  category: Category;
  imageUrl: string;
  rating: Rating;
}
