import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { NotFound } from './components/Status';
import { CategoryPage } from './pages/CategoryPage';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';

/** Kept separate from the router so tests can render it inside a MemoryRouter. */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="*" element={<NotFound title="Page not found" />} />
      </Route>
    </Routes>
  );
}
