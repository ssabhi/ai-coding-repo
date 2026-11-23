import type { Money, Product } from '../catalogue/product.js';
import type { EnquiryInput } from './enquiry.js';

export interface EnquiryEmailContent {
  subject: string;
  text: string;
}

export interface EnquiryEmailData {
  reference: string;
  product: Product;
  productUrl: string;
  enquiry: EnquiryInput;
  submittedAt: Date;
}

function formatMoney({ amountMinor, currency }: Money): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

/**
 * Plain text on purpose: no HTML means no HTML injection from customer input,
 * and every mail client renders it. A branded template can come later.
 */
export function buildEnquiryEmail({
  reference,
  product,
  productUrl,
  enquiry,
  submittedAt,
}: EnquiryEmailData): EnquiryEmailContent {
  const text = [
    `New product enquiry ${reference}`,
    '',
    'PRODUCT',
    `${product.title} (id ${product.id})`,
    `Price: ${formatMoney(product.price)}`,
    productUrl,
    '',
    'CUSTOMER',
    `Name:  ${enquiry.name}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone ?? 'not provided'}`,
    '',
    'MESSAGE',
    enquiry.message ?? '(no message)',
    '',
    `Submitted ${submittedAt.toISOString()}. Reply to this email to answer the customer directly.`,
  ].join('\n');

  return { subject: `Enquiry ${reference}: ${product.title}`, text };
}
