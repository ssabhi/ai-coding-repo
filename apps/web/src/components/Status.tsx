import type { ReactNode } from 'react';
import { Link } from 'react-router';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="status">
      {label}
    </p>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="status status--error">
      <p>Sorry, we couldn't load this right now.</p>
      <button type="button" className="button button--secondary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function NotFound({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="status">
      <title>{title}</title>
      <h1>{title}</h1>
      {children}
      <p>
        <Link to="/">Back to the home page</Link>
      </p>
    </section>
  );
}
