import { describe, expect, it } from 'vitest';
import { CatalogueService } from '../src/catalogue/CatalogueService.js';
import { InMemoryProductRepository } from '../src/catalogue/InMemoryProductRepository.js';
import { aProduct } from './builders.js';

describe('CatalogueService', () => {
  it('reports top rated picks that are not in the catalogue, so a typo is noticed', async () => {
    const catalogue = new CatalogueService(
      new InMemoryProductRepository([aProduct('1'), aProduct('2')]),
      { topRatedIds: ['1', '7', '2', '9'], categoryTopRatedLimit: 3 },
    );

    expect(await catalogue.missingTopRatedIds()).toEqual(['7', '9']);
  });
});
