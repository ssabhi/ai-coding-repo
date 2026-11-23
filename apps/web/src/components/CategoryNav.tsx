import { NavLink } from 'react-router';
import { useCategories } from '../api/queries';

export function CategoryNav() {
  const { data: categories } = useCategories();

  // Navigation is secondary: while loading or on error, pages still work without it.
  if (!categories?.length) return null;

  return (
    <nav aria-label="Categories" className="category-nav">
      <ul>
        {categories.map((category) => (
          <li key={category.slug}>
            <NavLink to={`/categories/${encodeURIComponent(category.slug)}`}>
              {category.name}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
