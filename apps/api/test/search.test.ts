import { describe, expect, it } from 'vitest';
import { matchesSearch } from '../src/catalogue/search.js';
import { aProduct } from './builders.js';

const jacket = aProduct('1', {
  title: "Men's Cotton Jacket",
  description: 'Great outerwear for spring, autumn and winter.',
  category: { slug: 'mens-clothing', name: "Men's Clothing" },
});
const dress = aProduct('2', {
  title: 'Café Summer Dress',
  description: 'Lightweight and breathable.',
  category: { slug: 'womens-clothing', name: "Women's Clothing" },
});

describe('matchesSearch', () => {
  it('ignores case', () => {
    expect(matchesSearch(jacket, 'JACKET')).toBe(true);
  });

  it('matches the start of words, so partial typing works', () => {
    expect(matchesSearch(jacket, 'jack')).toBe(true);
  });

  it('does not match the middle of words, so "men" does not find women\'s clothing', () => {
    expect(matchesSearch(jacket, 'men')).toBe(true);
    expect(matchesSearch(dress, 'men')).toBe(false);
  });

  it('searches the description and category as well as the title', () => {
    expect(matchesSearch(jacket, 'outerwear')).toBe(true);
    expect(matchesSearch(dress, 'clothing')).toBe(true);
  });

  it('requires every word of the search term to match', () => {
    expect(matchesSearch(jacket, 'cotton winter')).toBe(true);
    expect(matchesSearch(jacket, 'cotton dress')).toBe(false);
  });

  it('treats apostrophes and accents as optional', () => {
    expect(matchesSearch(jacket, 'mens')).toBe(true);
    expect(matchesSearch(dress, 'cafe')).toBe(true);
  });

  it('does not match unrelated words', () => {
    expect(matchesSearch(jacket, 'zzz')).toBe(false);
  });

  it('matches nothing when the search has no letters or digits', () => {
    for (const search of ['', '   ', '!!!', ' - ', "'"]) {
      expect(matchesSearch(jacket, search)).toBe(false);
    }
  });
});
