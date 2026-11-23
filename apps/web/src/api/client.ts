import type {
  Category,
  CategoryPage,
  EnquiryReceipt,
  EnquiryRequest,
  FieldErrors,
  Product,
} from './types';

/** Where the API lives. Same-origin `/api` by default; override for other deployments. */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: FieldErrors };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { accept: 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server');
  }

  // A proxy in front of the API may answer with HTML, so don't assume JSON.
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = (body as ErrorBody | undefined)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? `Request failed with status ${response.status}`,
      error?.details,
    );
  }
  return body as T;
}

export const api = {
  topRated: () =>
    request<{ products: Product[] }>('/products/top-rated').then((body) => body.products),

  categories: () =>
    request<{ categories: Category[] }>('/categories').then((body) => body.categories),

  categoryPage: (slug: string) => request<CategoryPage>(`/categories/${encodeURIComponent(slug)}`),

  searchProducts: (query: string) =>
    request<{ products: Product[] }>(`/products?${new URLSearchParams({ q: query })}`).then(
      (body) => body.products,
    ),

  product: (id: string) =>
    request<{ product: Product }>(`/products/${encodeURIComponent(id)}`).then(
      (body) => body.product,
    ),

  submitEnquiry: (enquiry: EnquiryRequest) =>
    request<EnquiryReceipt>('/enquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(enquiry),
    }),
};
