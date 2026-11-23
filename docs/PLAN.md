# Build plan (written before any code)

This is the plan the AI agent worked from. It is kept as written, with corrections
noted at the bottom, so reviewers can see how the plan and the result differ.

## Stack

| Layer   | Choice                                                     | Why                                                                                                                                                                                      |
| ------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | React 19 + TypeScript + Vite, React Router, TanStack Query | The brief names React web as an option, and web needs no simulator setup from the reviewer. TanStack Query gives caching, loading and error states without hand-rolled race-prone hooks. |
| Backend | Node.js + TypeScript + Express 5, zod, pino                | Same language across the stack keeps one toolchain. Express 5 forwards async errors natively. zod validates env, upstream payloads and request bodies with one library.                  |
| Email   | nodemailer (SMTP) → Mailpit in Docker                      | Free, needs no account, and the reviewer can see the "sales inbox" at http://localhost:8025. Any real provider that speaks SMTP (SES, SendGrid, Postmark) works through config alone.    |
| Run     | `docker compose up --build`                                | One command. nginx serves the SPA and proxies `/api`, so the browser only ever talks to our origin.                                                                                      |

## Boundaries (the things the brief says will change)

```
web (React) ──HTTP /api──▶ api (Express)
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
   CatalogueService    EnquiryService       config (env, zod)
             │                │
   ProductRepository     EmailSender         ◀── ports (interfaces)
   ├─ FakeStore (HTTP)   ├─ SMTP (nodemailer)
   └─ InMemory (fixture) └─ Console (dev)    ◀── adapters, picked in index.ts
```

- **Product data source:** the `ProductRepository` port is the only place that knows
  where products come from. The Fake Store adapter maps its JSON into our own `Product`
  domain type: string ids, money in minor units, category slug and name. Nothing
  outside the adapter sees Fake Store's shape.
- **Email provider:** the `EmailSender` port. The enquiry use case builds the message
  and the adapter only delivers it.
- **Look and feel:** design tokens are CSS custom properties in `theme/tokens.css`.
  Components only use tokens, so the creative agency's output lands in one file.
  Brand name and locale live in `brand.ts`.
- **Merchandising ("top rated"):** the owner's picks are an ordered list of ids in
  config. Moving them to a CMS or admin later only changes config loading.

## API

| Method | Path                    | Purpose                                                         |
| ------ | ----------------------- | --------------------------------------------------------------- |
| GET    | /api/health             | liveness                                                        |
| GET    | /api/categories         | category nav                                                    |
| GET    | /api/categories/:slug   | `{ category, topRated, more }` for the category page            |
| GET    | /api/products?q=        | search (no `q` returns all)                                     |
| GET    | /api/products/top-rated | the home page's 5 picks                                         |
| GET    | /api/products/:id       | product details                                                 |
| POST   | /api/enquiries          | validate, send email to the sales inbox, return `{ reference }` |

Responses are wrapped in objects, never bare arrays, so pagination metadata can be added later
without breaking clients. Errors use one shape: `{ error: { code, message, details? } }`.

## Assumptions to record (gaps in the acceptance criteria)

1. "Top rated" is a merchandising choice made by the owner, not computed from reviews. On the
   home page the configured picks are shown in the configured order. If fewer than 5 are
   configured or valid, the rest is filled by customer rating so the page never looks broken.
2. Category "top rated" uses the same rule: the owner's picks that fall in the category come first,
   then the best customer-rated products, up to 3. "Additional products" are the rest of the
   category.
3. Search is case-insensitive. Every whitespace-separated word must appear somewhere in the title,
   description or category.
4. An enquiry is about one product. Name and email are required. Phone and message are optional.
5. If the email cannot be sent, the customer sees an error, not "Thank you". We do not lie
   about delivery. A durable queue is the next step.
6. Fake Store prices are treated as GBP, since the brief is written in British English.

## Risks found during planning

- `fakestoreapi.com` is behind Cloudflare. Node's built-in `fetch` (undici) gets a **403 challenge**
  even with a custom User-Agent, while `curl` and `node:https` with an honest UA get 200.
  - Mitigation 1: the Fake Store adapter uses a small `node:https` client with an honest
    `User-Agent`. It does not pretend to be a browser.
  - Mitigation 2: a bundled snapshot of the 20 products backs an `InMemoryProductRepository`,
    switchable with `PRODUCT_SOURCE=fixture`. This proves the data-source boundary is real, keeps
    tests offline and deterministic, and gives the reviewer a fallback if Cloudflare blocks them.
  - The API does not silently fall back to the snapshot, because that would hide outages. It is
    an explicit switch.
- The latest TypeScript (7.x) is not yet supported by typescript-eslint, so TypeScript is pinned to 6.0.x.

## Order of work

1. Scaffold the workspace (npm workspaces: `apps/api`, `apps/web`), lint and format.
2. API: domain and ports → pure functions (top rated, search) → adapters → services → HTTP → composition root.
3. API tests: unit tests for the pure functions, adapters and services; supertest for the HTTP contract.
4. Web: API client → query hooks → layout, search and nav → pages → enquiry form.
5. Web tests: one test per acceptance criterion against a stubbed `fetch`.
6. Docker (api, web/nginx, mailpit), CI workflow, then the README, DECISIONS, AI_USAGE and
   CLAUDE.md docs.
7. Independent review pass by a second agent that has not seen my reasoning. Fix findings and record them.
