import { QueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from './client';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Retrying a 404 or 400 won't change the answer; retry only server and network errors.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.isClientError) && failureCount < 2,
      },
    },
  });
}

export const useTopRatedProducts = () =>
  useQuery({ queryKey: ['products', 'top-rated'], queryFn: api.topRated });

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: api.categories });

export const useCategoryPage = (slug: string) =>
  useQuery({ queryKey: ['categories', slug], queryFn: () => api.categoryPage(slug) });

export const useProductSearch = (query: string) =>
  useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () => api.searchProducts(query),
    enabled: query.length > 0,
  });

export const useProduct = (id: string) =>
  useQuery({ queryKey: ['products', id], queryFn: () => api.product(id) });

export const useSubmitEnquiry = () => useMutation({ mutationFn: api.submitEnquiry });
