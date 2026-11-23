import { randomUUID } from 'node:crypto';
import type { ProductRepository } from '../catalogue/ProductRepository.js';
import type { EmailSender } from '../email/EmailSender.js';
import { EmailDeliveryError, ValidationError } from '../errors.js';
import type { EnquiryInput } from './enquiry.js';
import { buildEnquiryEmail } from './enquiryEmail.js';

export interface EnquiryServiceOptions {
  products: ProductRepository;
  email: EmailSender;
  /** The sales inbox that receives enquiries. */
  salesInbox: string;
  from: string;
  /** Base URL of the web app (no trailing slash), used to link the product. */
  publicWebUrl: string;
  /** Injectable for tests. */
  newReference?: () => string;
  now?: () => Date;
}

export interface EnquiryReceipt {
  reference: string;
}

const randomReference = () => `ENQ-${randomUUID().slice(0, 8).toUpperCase()}`;

export class EnquiryService {
  private readonly newReference: () => string;
  private readonly now: () => Date;

  constructor(private readonly options: EnquiryServiceOptions) {
    this.newReference = options.newReference ?? randomReference;
    this.now = options.now ?? (() => new Date());
  }

  async submit(enquiry: EnquiryInput): Promise<EnquiryReceipt> {
    // Look the product up rather than trusting anything the client sent about it.
    const product = await this.options.products.findById(enquiry.productId);
    if (!product) {
      throw new ValidationError('The enquiry is invalid', {
        productId: ['This product does not exist'],
      });
    }

    const reference = this.newReference();
    const { subject, text } = buildEnquiryEmail({
      reference,
      product,
      productUrl: `${this.options.publicWebUrl}/products/${encodeURIComponent(product.id)}`,
      enquiry,
      submittedAt: this.now(),
    });

    try {
      await this.options.email.send({
        to: this.options.salesInbox,
        from: this.options.from,
        replyTo: enquiry.email,
        subject,
        text,
      });
    } catch (error) {
      // Don't say "thank you" for an enquiry nobody will receive.
      throw new EmailDeliveryError('The enquiry email could not be sent', { cause: error });
    }

    return { reference };
  }
}
