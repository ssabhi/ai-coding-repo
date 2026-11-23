import { pino } from 'pino';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { CatalogueService } from '../src/catalogue/CatalogueService.js';
import { loadSnapshotProducts } from '../src/catalogue/fakeStore/snapshot.js';
import { InMemoryProductRepository } from '../src/catalogue/InMemoryProductRepository.js';
import type { ProductRepository } from '../src/catalogue/ProductRepository.js';
import type { EmailMessage, EmailSender } from '../src/email/EmailSender.js';
import { EnquiryService } from '../src/enquiries/EnquiryService.js';
import { UpstreamError } from '../src/errors.js';

interface SetupOptions {
  products?: ProductRepository;
  email?: EmailSender;
  enquiryLimit?: number;
  trustProxyHops?: number;
}

/** The real app wired to the bundled snapshot and an email sender that records messages. */
function setup({ products, email, enquiryLimit = 100, trustProxyHops = 0 }: SetupOptions = {}) {
  const repository = products ?? new InMemoryProductRepository(loadSnapshotProducts('GBP'));
  const sentEmails: EmailMessage[] = [];

  const app = createApp({
    catalogue: new CatalogueService(repository, {
      topRatedIds: ['1', '5', '11', '17', '19'],
      categoryTopRatedLimit: 3,
    }),
    enquiries: new EnquiryService({
      products: repository,
      email: email ?? {
        send: async (message) => {
          sentEmails.push(message);
        },
      },
      salesInbox: 'sales@shop.test',
      from: 'catalogue@shop.test',
      publicWebUrl: 'http://shop.test',
      newReference: () => 'ENQ-TEST',
    }),
    logger: pino({ level: 'silent' }),
    trustProxyHops,
    enquiryRateLimit: { windowMs: 60_000, limit: enquiryLimit },
  });

  return { app, sentEmails };
}

const ids = (products: Array<{ id: string }>) => products.map((product) => product.id);

const validEnquiry = {
  productId: '1',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Do you ship to Scotland?',
};

describe('Home page: GET /api/products/top-rated', () => {
  it('returns the five products the owner chose, in their chosen order', async () => {
    const res = await request(setup().app).get('/api/products/top-rated').expect(200);
    expect(ids(res.body.products)).toEqual(['1', '5', '11', '17', '19']);
  });
});

describe('Category page', () => {
  it('GET /api/categories lists every category for navigation', async () => {
    const res = await request(setup().app).get('/api/categories').expect(200);
    expect(res.body.categories).toEqual([
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'jewelery', name: 'Jewelery' },
      { slug: 'electronics', name: 'Electronics' },
      { slug: 'womens-clothing', name: "Women's Clothing" },
    ]);
  });

  it('GET /api/categories/:slug returns top rated products then the rest of the category', async () => {
    const res = await request(setup().app).get('/api/categories/electronics').expect(200);

    expect(res.body.category).toEqual({ slug: 'electronics', name: 'Electronics' });
    // 11 is the owner's pick in this category; 12 and 9 are the best customer-rated of the rest.
    expect(ids(res.body.topRated)).toEqual(['11', '12', '9']);
    expect(ids(res.body.more)).toEqual(['10', '13', '14']);
  });

  it('only ever includes products from the requested category', async () => {
    const res = await request(setup().app).get('/api/categories/womens-clothing').expect(200);
    const all = [...res.body.topRated, ...res.body.more];
    expect(
      all.every((p: { category: { slug: string } }) => p.category.slug === 'womens-clothing'),
    ).toBe(true);
  });

  it('returns 404 for an unknown category', async () => {
    const res = await request(setup().app).get('/api/categories/garden').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('Search: GET /api/products?q=', () => {
  it('returns only products whose text matches the search term', async () => {
    const res = await request(setup().app)
      .get('/api/products')
      .query({ q: 'backpack' })
      .expect(200);
    expect(ids(res.body.products)).toEqual(['1']);
  });

  it('does not return women\'s clothing when searching for "men"', async () => {
    const res = await request(setup().app).get('/api/products').query({ q: 'men' }).expect(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(
      res.body.products.every(
        (p: { category: { slug: string } }) => p.category.slug !== 'womens-clothing',
      ),
    ).toBe(true);
  });

  it('returns nothing for a term with no letters or digits, rather than everything', async () => {
    for (const q of ['!!!', ' ', '']) {
      const res = await request(setup().app).get('/api/products').query({ q }).expect(200);
      expect(res.body.products).toEqual([]);
    }
  });

  it('returns an empty list when nothing matches', async () => {
    const res = await request(setup().app)
      .get('/api/products')
      .query({ q: 'trampoline' })
      .expect(200);
    expect(res.body.products).toEqual([]);
  });

  it('returns every product when no search term is given', async () => {
    const res = await request(setup().app).get('/api/products').expect(200);
    expect(res.body.products).toHaveLength(20);
  });

  it('rejects an overly long search term', async () => {
    const res = await request(setup().app)
      .get('/api/products')
      .query({ q: 'x'.repeat(101) })
      .expect(400);
    expect(res.body.error.details.q).toBeDefined();
  });

  it('rejects a repeated search parameter', async () => {
    await request(setup().app).get('/api/products?q=a&q=b').expect(400);
  });
});

describe('Product page: GET /api/products/:id', () => {
  it('returns the product details', async () => {
    const res = await request(setup().app).get('/api/products/1').expect(200);
    expect(res.body.product).toMatchObject({
      id: '1',
      title: 'Fjallraven - Foldsack No. 1 Backpack, Fits 15 Laptops',
      price: { amountMinor: 10995, currency: 'GBP' },
      category: { slug: 'mens-clothing' },
    });
  });

  it('returns 404 for an unknown product', async () => {
    const res = await request(setup().app).get('/api/products/999').expect(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  });
});

describe('Enquiry: POST /api/enquiries', () => {
  it('emails the sales inbox and returns a reference for the thank-you message', async () => {
    const { app, sentEmails } = setup();

    const res = await request(app).post('/api/enquiries').send(validEnquiry).expect(201);

    expect(res.body).toEqual({ reference: 'ENQ-TEST' });
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({ to: 'sales@shop.test', replyTo: 'ada@example.com' });
    expect(sentEmails[0]?.text).toContain('Do you ship to Scotland?');
  });

  it('returns field-level errors for invalid contact details and sends nothing', async () => {
    const { app, sentEmails } = setup();

    const res = await request(app)
      .post('/api/enquiries')
      .send({ productId: '1', name: '  ', email: 'not-an-email' })
      .expect(400);

    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toEqual({
      name: ['Please enter your name'],
      email: ['Please enter a valid email address'],
    });
    expect(sentEmails).toHaveLength(0);
  });

  it('rejects a multi-line name, which could be used to forge email content', async () => {
    const res = await request(setup().app)
      .post('/api/enquiries')
      .send({ ...validEnquiry, name: 'Ada\nBcc: everyone@example.com' })
      .expect(400);
    expect(res.body.error.details.name).toEqual(['Name must be on a single line']);
  });

  it('rejects an enquiry for an unknown product', async () => {
    const res = await request(setup().app)
      .post('/api/enquiries')
      .send({ ...validEnquiry, productId: '999' })
      .expect(400);
    expect(res.body.error.details.productId).toEqual(['This product does not exist']);
  });

  it('returns 502 when the email cannot be sent, so the customer is not thanked', async () => {
    const email = { send: vi.fn().mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:1025')) };

    const res = await request(setup({ email }).app)
      .post('/api/enquiries')
      .send(validEnquiry)
      .expect(502);

    expect(res.body.error.code).toBe('EMAIL_DELIVERY_FAILED');
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(setup().app)
      .post('/api/enquiries')
      .set('content-type', 'application/json')
      .send('{"name":')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 413 for an oversized body', async () => {
    await request(setup().app)
      .post('/api/enquiries')
      .send({ ...validEnquiry, message: 'x'.repeat(20_000) })
      .expect(413);
  });

  it('rate limits repeated enquiries from the same client', async () => {
    const { app } = setup({ enquiryLimit: 2 });

    await request(app).post('/api/enquiries').send(validEnquiry).expect(201);
    await request(app).post('/api/enquiries').send(validEnquiry).expect(201);
    const res = await request(app).post('/api/enquiries').send(validEnquiry).expect(429);

    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('behind nginx, limits each real client separately and ignores spoofed addresses', async () => {
    // nginx appends the address it saw to X-Forwarded-For; with one trusted
    // hop the API uses that right-most entry and ignores anything the client sent.
    const { app } = setup({ enquiryLimit: 1, trustProxyHops: 1 });
    const from = (forwardedFor: string) =>
      request(app).post('/api/enquiries').set('X-Forwarded-For', forwardedFor).send(validEnquiry);

    await from('203.0.113.1').expect(201);
    await from('203.0.113.2').expect(201);
    await from('198.51.100.99, 203.0.113.1').expect(429);
  });
});

describe('Failures and unknown routes', () => {
  it('returns 502 without leaking internals when the product source is down', async () => {
    const unavailable: ProductRepository = {
      list: () => Promise.reject(new UpstreamError('The product source is unavailable')),
      findById: () => Promise.reject(new UpstreamError('The product source is unavailable')),
      listCategories: () => Promise.reject(new UpstreamError('The product source is unavailable')),
    };

    const res = await request(setup({ products: unavailable }).app)
      .get('/api/products/top-rated')
      .expect(502);

    expect(res.body).toEqual({
      error: { code: 'UPSTREAM_UNAVAILABLE', message: 'The product source is unavailable' },
    });
  });

  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await request(setup().app).get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('sets basic security headers', async () => {
    const res = await request(setup().app).get('/api/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
