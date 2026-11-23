import type { Money } from './api/types';
import { brand } from './brand';

export function formatPrice(
  { amountMinor, currency }: Money,
  locale: string = brand.locale,
): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountMinor / 100);
}
