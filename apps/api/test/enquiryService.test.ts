import { describe, expect, it, vi } from 'vitest';
import { InMemoryProductRepository } from '../src/catalogue/InMemoryProductRepository.js';
import type { EmailMessage, EmailSender } from '../src/email/EmailSender.js';
import { EnquiryService } from '../src/enquiries/EnquiryService.js';
import { EmailDeliveryError, ValidationError } from '../src/errors.js';
import { aProduct } from './builders.js';

const backpack = aProduct('1', {
  title: 'Fjallraven Backpack',
  price: { amountMinor: 10995, currency: 'GBP' },
});

function setup(email?: EmailSender) {
  const sent: EmailMessage[] = [];
  const service = new EnquiryService({
    products: new InMemoryProductRepository([backpack]),
    email: email ?? { send: async (message) => void sent.push(message) },
    salesInbox: 'sales@shop.test',
    from: 'catalogue@shop.test',
    publicWebUrl: 'https://shop.test',
    newReference: () => 'ENQ-0001',
    now: () => new Date('2026-11-23T10:00:00Z'),
  });
  return { service, sent };
}

describe('EnquiryService', () => {
  it('emails the sales inbox with the product and customer details', async () => {
    const { service, sent } = setup();

    const receipt = await service.submit({
      productId: '1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+44 7700 900123',
      message: 'Is this waterproof?',
    });

    expect(receipt).toEqual({ reference: 'ENQ-0001' });
    expect(sent).toHaveLength(1);
    const [email] = sent;
    expect(email).toMatchObject({
      to: 'sales@shop.test',
      from: 'catalogue@shop.test',
      replyTo: 'ada@example.com',
      subject: 'Enquiry ENQ-0001: Fjallraven Backpack',
    });
    expect(email?.text).toContain('Fjallraven Backpack (id 1)');
    expect(email?.text).toContain('Price: £109.95');
    expect(email?.text).toContain('https://shop.test/products/1');
    expect(email?.text).toContain('Name:  Ada Lovelace');
    expect(email?.text).toContain('Phone: +44 7700 900123');
    expect(email?.text).toContain('Is this waterproof?');
    expect(email?.text).toContain('2026-11-23T10:00:00.000Z');
  });

  it('notes optional details the customer left out', async () => {
    const { service, sent } = setup();
    await service.submit({ productId: '1', name: 'Ada', email: 'ada@example.com' });

    expect(sent[0]?.text).toContain('Phone: not provided');
    expect(sent[0]?.text).toContain('(no message)');
  });

  it('rejects an enquiry for a product that does not exist, without sending email', async () => {
    const { service, sent } = setup();

    const attempt = service.submit({ productId: '999', name: 'Ada', email: 'ada@example.com' });

    await expect(attempt).rejects.toBeInstanceOf(ValidationError);
    await expect(attempt).rejects.toMatchObject({
      fieldErrors: { productId: ['This product does not exist'] },
    });
    expect(sent).toHaveLength(0);
  });

  it('reports a delivery failure instead of pretending the enquiry was sent', async () => {
    const failing = { send: vi.fn().mockRejectedValue(new Error('SMTP connection refused')) };
    const { service } = setup(failing);

    await expect(
      service.submit({ productId: '1', name: 'Ada', email: 'ada@example.com' }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
  });
});
