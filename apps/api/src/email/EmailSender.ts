export interface EmailMessage {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
}

/** Port for outbound email. Swapping provider means writing one adapter. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
