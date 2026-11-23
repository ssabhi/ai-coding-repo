import { Router } from 'express';
import { z } from 'zod';
import type { CatalogueService } from '../catalogue/CatalogueService.js';
import { NotFoundError } from '../errors.js';
import { parseOrThrow } from './validation.js';

const productListQuerySchema = z.object({
  q: z.string().trim().max(100, 'Search term must be 100 characters or fewer').optional(),
});

export function catalogueRoutes(catalogue: CatalogueService): Router {
  const router = Router();

  router.get('/categories', async (_req, res) => {
    res.json({ categories: await catalogue.listCategories() });
  });

  router.get('/categories/:slug', async (req, res) => {
    const page = await catalogue.categoryPage(req.params.slug);
    if (!page) throw new NotFoundError('Category not found');
    res.json(page);
  });

  router.get('/products', async (req, res) => {
    const { q } = parseOrThrow(productListQuerySchema, req.query);
    res.json({ products: await catalogue.listProducts(q) });
  });

  // Registered before /products/:id so "top-rated" is not read as an id.
  router.get('/products/top-rated', async (_req, res) => {
    res.json({ products: await catalogue.topRated() });
  });

  router.get('/products/:id', async (req, res) => {
    const product = await catalogue.findProduct(req.params.id);
    if (!product) throw new NotFoundError('Product not found');
    res.json({ product });
  });

  return router;
}
