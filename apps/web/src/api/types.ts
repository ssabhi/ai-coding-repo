// Response shapes of the catalogue API. Declared here rather than imported from
// the API package so the two apps stay independently deployable. Generating
// these from an OpenAPI spec is the next step once the contract settles.

export interface Money {
  amountMinor: number;
  currency: string;
}

export interface Category {
  slug: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: Money;
  category: Category;
  imageUrl: string;
  rating: { average: number; count: number };
}

export interface CategoryPage {
  category: Category;
  topRated: Product[];
  more: Product[];
}

export interface EnquiryRequest {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export interface EnquiryReceipt {
  reference: string;
}

export type FieldErrors = Partial<Record<string, string[]>>;
