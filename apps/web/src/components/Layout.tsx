import { Link, Outlet } from 'react-router';
import { brand } from '../brand';
import { CategoryNav } from './CategoryNav';
import { SearchBar } from './SearchBar';

export function Layout() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="site-header__brand">
            {brand.name}
          </Link>
          <SearchBar />
        </div>
        <CategoryNav />
      </header>
      <main id="main" className="page">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>
          © {new Date().getFullYear()} {brand.name}
        </p>
      </footer>
    </>
  );
}
