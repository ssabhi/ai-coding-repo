import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

export function SearchBar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentQuery = searchParams.get('q') ?? '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (!term) return;
    navigate(`/search?${new URLSearchParams({ q: term })}`);
  }

  return (
    <form role="search" className="search-bar" onSubmit={handleSubmit}>
      <label htmlFor="search-input" className="visually-hidden">
        Search products
      </label>
      {/* Keyed on the URL so the box follows back/forward navigation. */}
      <input
        key={currentQuery}
        id="search-input"
        name="q"
        type="search"
        defaultValue={currentQuery}
        placeholder="Search products"
        maxLength={100}
        required
      />
      <button type="submit" className="button">
        Search
      </button>
    </form>
  );
}
