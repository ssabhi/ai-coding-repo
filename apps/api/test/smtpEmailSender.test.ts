import nodemailer from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import { SmtpEmailSender } from '../src/email/SmtpEmailSender.js';

describe('SmtpEmailSender', () => {
  it('hands nodemailer a message with sender, recipient, reply-to and body', async () => {
    // jsonTransport runs nodemailer's real message building without a network.
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    const sendMail = vi.spyOn(transporter, 'sendMail');

    await new SmtpEmailSender(transporter).send({
      to: 'sales@shop.test',
      from: 'catalogue@shop.test',
      replyTo: 'ada@example.com',
      subject: 'Enquiry ENQ-0001: Backpack',
      text: 'Hello',
    });

    const info = (await sendMail.mock.results[0]?.value) as { message: string };
    const built = JSON.parse(info.message);
    expect(built.to).toEqual([{ address: 'sales@shop.test', name: '' }]);
    expect(built.from).toEqual({ address: 'catalogue@shop.test', name: '' });
    expect(built.replyTo).toEqual([{ address: 'ada@example.com', name: '' }]);
    expect(built.subject).toBe('Enquiry ENQ-0001: Backpack');
    expect(built.text).toBe('Hello');
  });

  it('propagates transport failures so the caller can report them', async () => {
    const transporter = nodemailer.createTransport({ jsonTransport: true });
    vi.spyOn(transporter, 'sendMail').mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      new SmtpEmailSender(transporter).send({
        to: 'a@b.test',
        from: 'c@d.test',
        subject: 's',
        text: 't',
      }),
    ).rejects.toThrow('ECONNREFUSED');
  });
});
