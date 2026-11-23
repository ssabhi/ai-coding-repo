# CLAUDE.md

Instructions for AI coding agents working in this repository. Humans may find it a useful
summary too.

## What this is

A product catalogue proof of concept that is meant to grow into the real product. It has two
apps in one npm workspace:

- `apps/api`: Node.js 24, TypeScript, Express 5. It owns all product data and sends enquiry emails.
- `apps/web`: React 19, TypeScript, Vite, React Router, TanStack Query.

## Commands (run from the repo root)

| Task                            | Command                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| Full stack (what reviewers run) | `docker compose up --build`: shop at :8080, inbox at :8025 |
| Dev servers with hot reload     | `npm run dev`: web at :5173, which proxies `/api` to :4000 |
| Everything CI runs              | `npm run check`                                            |
| Tests only                      | `npm test`, or `npm test -w apps/api` / `-w apps/web`      |

Run `npm run check` before you say a change is done.

## Architecture rules (do not break these)

1. **The browser never talks to Fake Store's API.** All product data goes through `apps/api`.
   Product images are the only exception (see DECISIONS.md).
2. **Fake Store's JSON shape stays inside `apps/api/src/catalogue/fakeStore/`.** Everything else
   uses the domain types in `catalogue/product.ts`. To add a data source, implement
   `ProductRepository` and add a case in `composition.ts`. Don't touch the services or routes.
3. **Email goes through the `EmailSender` port.** To change provider, add an adapter in `src/email/`
   and a case in `composition.ts`.
4. **`composition.ts` is the only file that picks adapters.** Services take their dependencies
   through the constructor.
5. **Errors:** throw the `AppError` subclasses from `src/errors.ts`. `http/errorHandler.ts` is the
   only place that turns errors into HTTP responses, and it never returns internal messages.
6. **Validate at the edges with zod:** env in `config.ts`, request input in routes, and upstream
   payloads in adapters.
7. **Styling:** components use the CSS custom properties in `apps/web/src/theme/tokens.css`. Never
   hard-code colours, fonts or spacing. Brand copy and locale live in `apps/web/src/brand.ts`.
8. **Web data access:** the only modules that know API URLs are `apps/web/src/api/client.ts` and
   `queries.ts`. Components use the hooks.

## Conventions

- TypeScript is strict, including `noUncheckedIndexedAccess`. Don't use `any`.
- API imports use the `.js` extension (NodeNext ESM).
- Money is in integer minor units (`amountMinor`). Never do float arithmetic on prices.
- Product ids are strings.
- Comments explain _why_, not _what_.

## Tests

- API: `apps/api/test`. There are unit tests for the pure rules (`topRated`, `search`), adapter
  tests with injected fakes, and supertest contract tests in `http.test.ts` grouped by acceptance
  criterion.
- Web: `apps/web/test`. Each acceptance criterion has a test that renders the real routes and
  stubs only `fetch` (`mockApi.ts`).
- Every behaviour change needs a test. Query the DOM by role and accessible name, not by CSS class.
- Don't change tests just to make them pass. If a test is wrong, say why in the commit.

## Gotchas

- Cloudflare blocks Node's built-in `fetch` to fakestoreapi.com with a 403. The adapter uses
  `node:https` on purpose. Don't "simplify" it back to `fetch`.
- In nginx, `add_header` in a `location` block discards the server-level security headers. Set
  caching with `expires` instead.
- `FAKESTORE_FALLBACK=snapshot` (on in docker-compose.yml, off by default) serves the snapshot
  only if Fake Store has never been reachable. Keep it off by default: silent stale data hides
  outages.
- jest-dom is inlined in `apps/web/vite.config.ts` (`server.deps.inline`). Without it the web
  tests fail on Windows when the working directory's drive letter is lowercase (`c:` not `C:`).
- `PRODUCT_SOURCE=fixture` serves the bundled snapshot, for offline work or if Fake Store is down.
