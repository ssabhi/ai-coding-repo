import { describe, expect, it } from 'vitest';
import { selectTopRated } from '../src/catalogue/topRated.js';
import { aProduct, rated } from './builders.js';

const ids = (products: { id: string }[]) => products.map((product) => product.id);

describe('selectTopRated', () => {
  const products = [
    aProduct('1', rated(2.0)),
    aProduct('2', rated(4.9)),
    aProduct('3', rated(3.5)),
    aProduct('4', rated(4.1)),
    aProduct('5', rated(1.0)),
    aProduct('6', rated(4.5)),
  ];

  it("returns the owner's picks in the order they were chosen, even if poorly rated", () => {
    expect(ids(selectTopRated(products, ['5', '1', '3'], 3))).toEqual(['5', '1', '3']);
  });

  it('fills remaining slots with the best customer-rated products', () => {
    expect(ids(selectTopRated(products, ['5'], 4))).toEqual(['5', '2', '6', '4']);
  });

  it('falls back to customer rating entirely when nothing is picked', () => {
    expect(ids(selectTopRated(products, [], 3))).toEqual(['2', '6', '4']);
  });

  it('ignores picks that no longer exist and duplicate picks', () => {
    expect(ids(selectTopRated(products, ['99', '3', '3'], 2))).toEqual(['3', '2']);
  });

  it('never returns more than the limit', () => {
    expect(selectTopRated(products, ['1', '2', '3', '4', '5', '6'], 5)).toHaveLength(5);
  });

  it('breaks rating ties by number of ratings, then by id', () => {
    const tied = [
      aProduct('b', rated(4, 10)),
      aProduct('a', rated(4, 10)),
      aProduct('c', rated(4, 50)),
    ];
    expect(ids(selectTopRated(tied, [], 3))).toEqual(['c', 'a', 'b']);
  });
});
