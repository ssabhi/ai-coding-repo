# Product catalogue PoC: browse, search and enquire

## Summary

This is the first slice of the catalogue: a React + TypeScript web app and a Node.js + TypeScript
API. All product data comes through the API from the Fake Store API. Enquiries are emailed to a
sales inbox, which is Mailpit locally.

It is built to be kept, not thrown away. The three things the brief says will change each sit
behind a seam:

| Will change         | Seam                                                                      | Proof it works                                                                                         |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Product data source | `ProductRepository` port. The Fake Store shape is confined to one folder. | Two adapters already run behind it: live Fake Store and a bundled snapshot (`PRODUCT_SOURCE=fixture`). |
| Email provider      | `EmailSender` port                                                        | SMTP adapter (Mailpit, or SES/SendGrid via config) and a console adapter                               |
| Look and feel       | `theme/tokens.css` and `brand.ts`                                         | Components use only design tokens                                                                      |

## How to review

```bash
docker compose up --build     # shop at http://localhost:8080, sales inbox at http://localhost:8025
npm install && npm run check  # format, lint, typecheck and 88 tests
```

If Fake Store's Cloudflare protection blocks your network, the Docker stack serves a bundled
snapshot of the same products and logs a warning, so the shop still works.

Suggested reading order: `apps/api/src/composition.ts` (how everything is wired), then
`catalogue/CatalogueService.ts` and `topRated.ts`, `enquiries/EnquiryService.ts`, and
`apps/web/src/api/client.ts`.

## Acceptance criteria

| Criterion                                          | Implemented by                                           | Tested in                                                                                     |
| -------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Home shows the 5 chosen top rated products         | `TOP_RATED_PRODUCT_IDS` → `selectTopRated`               | `api/test/http.test.ts`, `web/test/home.test.tsx`                                             |
| Category shows top rated, then additional products | `CatalogueService.categoryPage`                          | `http.test.ts`, `category.test.tsx`                                                           |
| Search shows only matching products                | `matchesSearch` (every word matches the start of a word) | `search.test.ts`, `http.test.ts`, `web/test/search.test.tsx`                                  |
| A product tile opens the product page              | `ProductTile`, `ProductPage`                             | `product.test.tsx`                                                                            |
| Enquiry emails sales and thanks the customer       | `EnquiryService`, `SmtpEmailSender`, `EnquiryForm`       | `enquiryService.test.ts`, `http.test.ts`, `enquiry.test.tsx`; manually end to end via Mailpit |

## Decisions worth challenging

Full list in [DECISIONS.md](../DECISIONS.md).

- **"Top rated" means the owner's picks**, topped up by customer rating, using the same rule on the
  home and category pages.
- **Search matches the start of words**, so `men` doesn't return women's clothing.
- **No "Thank you" if the email fails.** The customer sees an error and keeps their input. A
  durable queue is the next step.
- **The snapshot fallback is opt-in.** Cloudflare blocks Node's `fetch`, so the adapter uses
  `node:https`. Serving the snapshot when Fake Store is unreachable is off by default in the API,
  so outages stay visible. It is on in `docker-compose.yml`, so the demo always runs.
- **Product images load from Fake Store's CDN.** Image URLs come from our API, and the browser
  never calls Fake Store's API.

## Security basics

- Every input is validated with zod: env, request bodies and upstream payloads.
- Single-line name rule, so customer input can't forge email content.
- Plain-text email only.
- Rate limit on enquiries, 10kb body limit, helmet.
- nginx sets the CSP, `nosniff` and referrer-policy headers.
- Errors never leak internals.
- No secrets in the repo; `.env.example` only.

## Not in this PR

Admin UI for the picks, persisted enquiries with retries, a customer confirmation email,
pagination, Playwright end-to-end tests, and an OpenAPI-generated client. Reasons and order are in
DECISIONS.md under "What I would do next".

## AI usage

Built with Claude Code (Claude Opus 5.5) under my direction. An independent review by a second
agent found 9 issues, all fixed in the last commit. One of them: the web tests failed on Windows
when the drive letter was lowercase. Details of what it got wrong and how each issue was caught are in
[AI_USAGE.md](../AI_USAGE.md).
