import { describe, expect, it } from 'vitest';
import { loadSnapshotProducts } from '../src/catalogue/fakeStore/snapshot.js';

describe('bundled Fake Store snapshot', () => {
  it('parses with the same schema as live data', () => {
    const products = loadSnapshotProducts('GBP');

    expect(products).toHaveLength(20);
    expect(new Set(products.map((product) => product.category.slug))).toEqual(
      new Set(['mens-clothing', 'jewelery', 'electronics', 'womens-clothing']),
    );
    expect(products.every((product) => Number.isInteger(product.price.amountMinor))).toBe(true);
  });
});
