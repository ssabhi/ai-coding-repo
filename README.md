# Product catalogue PoC

A product catalogue that customers can browse and search, and use to send an enquiry about a
product. It is built as the first slice of a real product, not a throwaway prototype. The product
data source, the look and feel, and the email provider can each be replaced without touching the
rest of the code.

- **Client:** React 19 + TypeScript (Vite, React Router, TanStack Query)
- **Backend:** Node.js 24 + TypeScript (Express 5, zod, nodemailer)
- **Product data:** [Fake Store API](https://fakestoreapi.com). Only the backend calls its API; the
  browser loads product images from its CDN (see DECISIONS.md #12)

Further reading: [DECISIONS.md](DECISIONS.md) covers assumptions, trade-offs and next steps.
[AI_USAGE.md](AI_USAGE.md) covers how AI was used. [docs/PLAN.md](docs/PLAN.md) is the plan written
before coding.

## Run it (about 3 minutes)

You need Docker with Compose v2. Nothing else is required: no accounts, keys or paid services.

```bash
docker compose up --build
```

| What                                          | URL                   |
| --------------------------------------------- | --------------------- |
| The shop                                      | http://localhost:8080 |
| The sales inbox (Mailpit catches every email) | http://localhost:8025 |

Stop it with `Ctrl+C`, then run `docker compose down`.

> **If Fake Store is unreachable:** fakestoreapi.com sits behind Cloudflare, which sometimes blocks
> server-side requests. In Docker, the API then serves a bundled snapshot of the same 20 products
> and logs a warning (`docker compose logs api`), so the shop still works. To use only the
> snapshot, run `PRODUCT_SOURCE=fixture docker compose up --build`. On Windows PowerShell, run
> `$env:PRODUCT_SOURCE="fixture"; docker compose up --build`.

If port 8080 is taken, run `WEB_PORT=8081 docker compose up --build`.

## Try the acceptance criteria

| Criterion                                             | Where to check it                                                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Home page** shows the 5 chosen "top rated" products | http://localhost:8080. Change the picks with `TOP_RATED_PRODUCT_IDS=2,4,6,8,10 docker compose up`        |
| **Category page** shows top rated, then more products | Click a category in the navigation bar                                                                   |
| **Search** shows only matching products               | Type `jacket`, or `men` (which won't match "women"), and click **Search**                                |
| **Product page** opens from a tile                    | Click any product tile                                                                                   |
| **Enquiry** emails sales and thanks the customer      | On a product, click **Enquire**, fill in the form and submit. The email appears at http://localhost:8025 |

## Why this stack

The brief offers React, iOS or Android for the client, and Node.js or Laravel for the backend.

- **React web over native mobile:** a reviewer can run it with one command and no simulator. The
  entrepreneur can also share a link while the vision firms up. The API is client-agnostic, so a
  mobile app can be added later against the same endpoints.
- **Node.js + TypeScript over Laravel:** one language and toolchain across the stack, and the
  brief prefers TypeScript. Express 5 is small and unopinionated, which keeps the architecture
  (ports and adapters) visible rather than hidden in framework conventions.

## Run without Docker

You need Node.js 22.22 or later (24 recommended; see `.nvmrc`).

```bash
npm install
npm run dev          # API on :4000, web on http://localhost:5173 (it proxies /api)
```

By default emails are written to the API log (`EMAIL_TRANSPORT=console`). To receive them in a real
inbox, run `docker compose up mailpit`, copy `.env.example` to `.env` and set
`EMAIL_TRANSPORT=smtp`.

## Tests and checks

```bash
npm test             # 88 tests: API (unit and HTTP contract) and web (one per acceptance criterion)
npm run check        # what CI runs: format, lint, typecheck, test
```

- **API tests** (`apps/api/test`): pure rules (top-rated selection, search), the Fake Store adapter
  (mapping, caching, stale-on-error, back-off, snapshot fallback, and timeouts against a real local
  HTTP server), the enquiry use case, config validation, and a supertest suite grouped by
  acceptance criterion, including rate limiting behind a proxy.
- **Web tests** (`apps/web/test`): render the real routes and data layer with only `fetch` stubbed,
  then click through each acceptance criterion as a user would.

## Configuration

Every setting has a working default. [.env.example](.env.example) documents them all. The ones
you are most likely to change:

| Variable                                                          | Default                       | Purpose                                                   |
| ----------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `PRODUCT_SOURCE`                                                  | `fakestore`                   | `fakestore` (live) or `fixture` (bundled snapshot)        |
| `FAKESTORE_FALLBACK`                                              | `none` (`snapshot` in Docker) | Serve the snapshot if Fake Store has never been reachable |
| `PRODUCT_IMAGE_ORIGIN` (web)                                      | `https://fakestoreapi.com`    | The one image host the CSP allows                         |
| `TOP_RATED_PRODUCT_IDS`                                           | `1,5,11,17,19`                | The owner's "top rated" picks, in display order           |
| `CATEGORY_TOP_RATED_LIMIT`                                        | `3`                           | Top rated products at the head of each category page      |
| `EMAIL_TRANSPORT`                                                 | `console` (`smtp` in Docker)  | `smtp` sends through `SMTP_*`; `console` logs the email   |
| `ENQUIRY_TO_EMAIL`                                                | `sales@example.com`           | The sales inbox                                           |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Mailpit                       | Any SMTP provider (SES, SendGrid, Postmark)               |

Invalid configuration stops the API at startup with a message that names each bad variable.

## Project structure

```
apps/
  api/src/
    catalogue/            domain types, ProductRepository port, CatalogueService, top-rated and search rules
      fakeStore/          Fake Store adapter: HTTP client, mapping, cache, offline snapshot
    enquiries/            enquiry validation, EnquiryService, email content
    email/                EmailSender port, SMTP and console adapters
    http/                 routes, validation, the single error handler
    config.ts             env vars validated with zod
    composition.ts        the one place adapters are chosen
  web/src/
    api/                  typed API client and TanStack Query hooks
    components/           layout, search bar, nav, product grid, enquiry form
    pages/                home, category, search, product
    theme/tokens.css      design tokens: the seam for the creative agency's work
docker-compose.yml        api + web (nginx) + mailpit
```

## API

| Method | Path                      | Returns                                                                                                  |
| ------ | ------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/api/products/top-rated` | `{ products }`: the home page's 5                                                                        |
| GET    | `/api/categories`         | `{ categories }`                                                                                         |
| GET    | `/api/categories/:slug`   | `{ category, topRated, more }`                                                                           |
| GET    | `/api/products?q=term`    | `{ products }`: matches for `term` (none if it has no letters or digits), or everything if `q` is absent |
| GET    | `/api/products/:id`       | `{ product }`                                                                                            |
| POST   | `/api/enquiries`          | `201 { reference }`. Body: `productId`, `name`, `email`, optional `phone`, `message`                     |
| GET    | `/api/health`             | `{ status: "ok" }`                                                                                       |

Every error has the same shape: `{ error: { code, message, details? } }`. The codes are
`VALIDATION_FAILED` (400, with per-field `details`), `NOT_FOUND` (404), `RATE_LIMITED` (429),
`UPSTREAM_UNAVAILABLE` (502) and `EMAIL_DELIVERY_FAILED` (502).

## Time spent

See [AI_USAGE.md](AI_USAGE.md#time-spent).
