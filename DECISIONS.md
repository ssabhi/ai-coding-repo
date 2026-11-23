# Decisions and assumptions

## Assumptions where the acceptance criteria were unclear

| #   | Gap in the criteria                                                      | Assumption                                                                                                                                                                                                                                                                                               | Why                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Who decides what is "top rated"?                                         | The owner. _"GIVEN I have chosen 5 products"_ reads as a merchandising choice, not a computed ranking. The picks are an ordered list of ids (`TOP_RATED_PRODUCT_IDS`). The home page shows them in that order.                                                                                           | It matches the wording, and it lets the owner feature a product that has no reviews yet.                                                                                                                                                                                       |
| 2   | What if fewer than 5 picks are valid, for example a product was removed? | The remaining slots go to the best customer-rated products (rating, then number of ratings, then id). At startup the API logs a warning naming any picks that don't exist, so a typo is noticed rather than silently papered over.                                                                       | The home page never looks broken, and the gaps are filled by a rule anyone can explain.                                                                                                                                                                                        |
| 3   | What is "top rated" on a category page?                                  | The same rule: the owner's picks in that category come first, then the best customer-rated products, up to 3 (`CATEGORY_TOP_RATED_LIMIT`).                                                                                                                                                               | One definition of "top rated" across the site. Fake Store has 4–6 products per category, so 3 leaves room for the "additional products" section.                                                                                                                               |
| 4   | What are "additional products"?                                          | The rest of the category, with no duplicates of the top rated section, in source order.                                                                                                                                                                                                                  | It's the simplest reading. Sorting and filtering can come later.                                                                                                                                                                                                               |
| 5   | What does "text matching the search term" mean?                          | Case-insensitive, ignoring accents and apostrophes. **Every word** of the term must match the **start of a word** in the title, description or category.                                                                                                                                                 | Plain substring matching makes `men` return women's clothing. Word-start matching avoids that and still lets `jack` find "jacket". Requiring every word narrows results as the customer types more.                                                                            |
| 6   | Search with an empty term?                                               | The search box requires a term, and whitespace is ignored. `/search` with no term shows a prompt. The API returns every product when `q` is absent, and **nothing** when `q` has no letters or digits (e.g. `!!!`).                                                                                      | Searching for nothing isn't useful. "Only matching products" must not turn into "everything" for an unsearchable term. Omitting `q` suits a future "browse all" page.                                                                                                          |
| 7   | Which contact details does the form collect?                             | Name and email are required. Phone and message are optional. One enquiry is about one product.                                                                                                                                                                                                           | Email is the minimum sales needs to reply. Every extra required field loses enquiries.                                                                                                                                                                                         |
| 8   | What does the sales inbox receive?                                       | A plain-text email with the product (title, id, price, link) and the customer's details. **Reply-To is the customer**, so sales can just hit reply.                                                                                                                                                      | It's fast for sales, and plain text cannot carry HTML injection.                                                                                                                                                                                                               |
| 9   | What happens if the email cannot be sent?                                | The customer sees an error and keeps what they typed. They do **not** see "Thank you".                                                                                                                                                                                                                   | Thanking someone for an enquiry nobody will receive is worse than asking them to retry.                                                                                                                                                                                        |
| 10  | Does the customer get a reference?                                       | Yes. A short `ENQ-XXXXXXXX` reference appears in the thank-you message and the email subject.                                                                                                                                                                                                            | It gives support and sales a shared handle with no database needed.                                                                                                                                                                                                            |
| 11  | Currency?                                                                | Fake Store prices are treated as **GBP**, since the brief is written in British English. The currency is configurable (`CATALOGUE_CURRENCY`) and stored on every price.                                                                                                                                  | Fake Store doesn't say. Storing the currency on each price keeps multi-currency possible.                                                                                                                                                                                      |
| 12  | Product images and "don't call Fake Store from the client"               | Image **URLs** come from our API, and the browser loads the image files from Fake Store's CDN. It never calls the Fake Store **API**. The CSP allows exactly that one image host (`PRODUCT_IMAGE_ORIGIN`). The snapshot keeps Fake Store's image URLs, so fixture mode still needs the CDN for pictures. | Images are static assets, not product data. Proxying them adds latency and an SSRF-shaped endpoint for no gain. In production, images move to our own CDN (S3 + CloudFront). That takes new image URLs from the backend and one config value for the CSP, with no code change. |
| 13  | Users, accounts, admin                                                   | None. The catalogue is public and the owner's picks are configuration.                                                                                                                                                                                                                                   | Nothing in the criteria needs them.                                                                                                                                                                                                                                            |

## Requirements dropped or simplified, and why

- **No admin UI for choosing top rated products.** The picks are an environment variable. That
  proves the behaviour, and the merchandising config is one object, so a CMS or admin screen can
  replace it later.
- **Enquiries are not stored, and there is no retry queue.** Delivery is synchronous SMTP. If it
  fails, the customer is told honestly (see assumption 9). A durable queue is the first
  production change (see "next").
- **No confirmation email to the customer.** It isn't in the criteria. It also turns a public form
  into a way to send email to any address someone types in, which needs abuse controls first.
- **Spam protection is a rate limit only:** 10 enquiries per IP per 15 minutes, plus strict
  validation. There is no CAPTCHA or honeypot yet.
- **No pagination, sorting or filters.** Fake Store has 20 products. The responses are wrapped in
  objects (`{ products }`), so paging metadata can be added without breaking clients.
- **Placeholder branding.** "Shopfront" and a neutral palette, because the creative work is still
  in progress. All styling goes through design tokens.
- **No browser end-to-end tests.** Each criterion is covered by an API contract test and a
  web test that clicks through the real routes. The running Docker stack was checked by hand and
  with a headless browser. Playwright in CI is the first thing on the "next" list.
- **Front-end API types are hand-written.** They mirror the API rather than sharing a package, so
  the two apps stay independently deployable. Generating them from an OpenAPI spec is next.

## How the design supports growth beyond the PoC

```
web (React) ──/api──▶ API (Express)
                        ├─ CatalogueService ── ProductRepository ◀── FakeStore (HTTP, cached) │ InMemory (snapshot)
                        └─ EnquiryService ──── EmailSender ◀──────── SMTP (nodemailer) │ Console
                                               (ports)               (adapters, chosen in composition.ts)
```

| Expected change                                                       | What it takes today                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **New product data source** (Shopify, commercetools, Postgres, a PIM) | Implement `ProductRepository` (three methods) and add a case in `composition.ts`. Fake Store's JSON shape is confined to `catalogue/fakeStore/` and mapped into our own `Product` type (string ids, money in minor units, category slugs). The interface takes a query object, so a real database or search engine can do filtering itself instead of in memory. **This is already proven:** the Fake Store and snapshot adapters both run behind the same interface and share the same tests. |
| **New email provider** (SES, Postmark, SendGrid)                      | Most need only `SMTP_*` config. For an HTTP API, write one `EmailSender` adapter (one method). The email content is built in the enquiry use case, not in the adapter.                                                                                                                                                                                                                                                                                                                         |
| **New look and feel**                                                 | Replace the values in `theme/tokens.css` and `brand.ts`. Components use only tokens and semantic markup.                                                                                                                                                                                                                                                                                                                                                                                       |
| **Merchandising moves to a CMS**                                      | Today it is `MerchandisingConfig` passed to `CatalogueService`. Load it from the CMS instead.                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Mobile app**                                                        | The API is client-agnostic JSON with stable error codes. It needs no CORS changes, because native apps don't use CORS.                                                                                                                                                                                                                                                                                                                                                                         |
| **Deploy to AWS**                                                     | Both apps are containers. The API runs on ECS Fargate or App Runner. The web app becomes static files on S3 + CloudFront, with `/api/*` routed to the API. Email goes through SES, over SMTP or a small adapter. Config comes from SSM or Secrets Manager as environment variables, already validated at startup.                                                                                                                                                                              |

### Other trade-offs worth knowing

- **Fake Store's Cloudflare protection rejects Node's built-in `fetch` (403).** `curl` and
  `node:https` with an honest User-Agent are accepted. The adapter uses a small `node:https`
  client and does not pretend to be a browser. Because this could change at any time, there are two
  explicit switches. `PRODUCT_SOURCE=fixture` uses only the bundled snapshot.
  `FAKESTORE_FALLBACK=snapshot` tries Fake Store first, and serves the snapshot with a logged
  warning only if Fake Store has never been reachable. The fallback is **off by default** in the API,
  because silently serving old data hides an outage. It is **on in docker-compose.yml**, because
  a reviewer must be able to run the demo even if Cloudflare blocks their network.
- **Caching:** the catalogue is cached for 5 minutes. Concurrent requests share one upstream
  call. If a refresh fails, the last good copy keeps being served and Fake Store is not retried
  for 30 seconds, so a hanging upstream doesn't make every request wait for the 5-second timeout. The cache is per process,
  so with several API instances it should move to Redis or ElastiCache. The rate limiter's store
  is also in-memory and needs the same move.
- **Whole-catalogue fetch:** with 20 products, one upstream call answers every page. A large
  catalogue would use the query object to push filters to the source.
- **Express over NestJS or Fastify:** fewer concepts to defend, and the boundaries are explicit
  in plain TypeScript. Nothing here depends on Express beyond `app.ts` and `http/`.
- **TanStack Query** instead of hand-written fetch hooks. It handles caching, retries and race
  conditions, and 4xx errors are not retried.

## What I would do next with another day

1. **Reliable enquiries:** store each enquiry (Postgres or DynamoDB) and send the email from a queue
   (SQS) with retries, so a mail outage never loses a lead. Return `202 Accepted`.
2. **Playwright end-to-end tests** against `docker compose` in CI, including reading the email
   back from Mailpit's API.
3. **An OpenAPI spec** for the API, with generated client types to replace `web/src/api/types.ts`.
4. **Observability:** request ids returned in error responses and email headers, metrics and
   tracing with OpenTelemetry, and an alert on `EMAIL_DELIVERY_FAILED`.
5. **Abuse and privacy:** a honeypot field or Turnstile, a privacy notice on the form, and a
   retention policy for enquiry data (GDPR).
6. **Infrastructure as code** (CDK or Terraform) for the AWS layout above, plus a shared cache
   and rate-limit store.
7. **Accessibility checks** (axe) in the web tests. The semantics are there already: labelled
   landmarks, field errors linked with `aria-describedby`, and focus moved to the confirmation.
