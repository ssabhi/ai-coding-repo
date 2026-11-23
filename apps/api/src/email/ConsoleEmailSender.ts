import type { Logger } from 'pino';
import type { EmailMessage, EmailSender } from './EmailSender.js';

/**
 * Development-only: writes the email to the log instead of sending it. The
 * log will contain the customer's contact details, so never use in production.
 */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly logger: Pick<Logger, 'info'>) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info({ email: message }, 'Email not sent (EMAIL_TRANSPORT=console)');
  }
}
