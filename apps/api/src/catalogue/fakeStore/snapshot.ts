import type { Product } from '../product.js';
import { fakeStoreCatalogueSchema, toProduct } from './fakeStoreMapping.js';
import snapshot from './snapshot.json' with { type: 'json' };

/**
 * The Fake Store catalogue as captured on 2026-11-23, mapped through the same
 * schema and mapper as live data. Backs PRODUCT_SOURCE=fixture.
 */
export function loadSnapshotProducts(currency: string): Product[] {
  return fakeStoreCatalogueSchema.parse(snapshot).map((raw) => toProduct(raw, currency));
}
