import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../src/AppRoutes';

function LocationSpy({ onChange }: { onChange: (path: string) => void }) {
  const { pathname, search } = useLocation();
  useEffect(() => onChange(`${pathname}${search}`), [pathname, search, onChange]);
  return null;
}

/** Renders the whole app (layout, routes, data layer) at `path`. */
export function renderApp(path = '/') {
  let currentPath = path;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const user = userEvent.setup();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationSpy
          onChange={(next) => {
            currentPath = next;
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { user, location: () => currentPath };
}
