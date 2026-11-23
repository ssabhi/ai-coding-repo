import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailMessage, EmailSender } from './EmailSender.js';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

/**
 * Sends over SMTP. Locally that is Mailpit; in production any provider with an
 * SMTP endpoint (Amazon SES, SendGrid, Postmark) works through config alone.
 */
export class SmtpEmailSender implements EmailSender {
  constructor(private readonly transporter: Transporter) {}

  static fromConfig(config: SmtpConfig): SmtpEmailSender {
    return new SmtpEmailSender(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user ? { user: config.user, pass: config.pass } : undefined,
        // nodemailer waits up to 2 minutes by default; fail fast so the
        // customer gets an answer while they are still on the page.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      }),
    );
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail(message);
  }
}
