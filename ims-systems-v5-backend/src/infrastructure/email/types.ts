/**
 * Provider-agnostic outgoing email message.
 * Domain modules should enqueue this shape (or a template job later);
 * infrastructure owns delivery.
 */
export type EmailAttachment = {
  filename: string;
  /** Raw base64 content (no data-URI prefix). */
  contentBase64: string;
  type?: string;
  disposition?: "attachment" | "inline";
  contentId?: string;
};

export type EmailAddress = string;

export type OutgoingEmail = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: EmailAddress;
  attachments?: EmailAttachment[];
  /**
   * Free-form classification for logging / future analytics.
   * Examples: notification | transactional | customer-communication | bulk
   */
  category?: string;
  /** Opaque correlation for support / tracing. */
  correlationId?: string;
  organizationId?: string;
};

export type SendEmailResult = {
  provider: string;
  /** Provider message id when available. */
  messageId?: string;
  accepted: EmailAddress[];
};

export type EmailTransport = {
  readonly name: string;
  send: (message: OutgoingEmail) => Promise<SendEmailResult>;
};
