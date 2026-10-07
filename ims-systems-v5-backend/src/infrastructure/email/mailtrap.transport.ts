import nodemailer from "nodemailer";
import type { Logger } from "../logging/logger";
import type { EmailTransport, OutgoingEmail, SendEmailResult } from "./types";

export type MailtrapTransportOptions = {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  logger: Logger;
};

function asList(to: OutgoingEmail["to"]): string[] {
  return Array.isArray(to) ? to : [to];
}

/**
 * Mailtrap SMTP transport (Nodemailer) — recommended for local/dev testing.
 * Messages land in the Mailtrap inbox instead of real recipients.
 */
export function createMailtrapEmailTransport(
  options: MailtrapTransportOptions
): EmailTransport {
  const { host, port, user, pass, fromEmail, fromName, logger } = options;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return {
    name: "mailtrap",
    async send(message: OutgoingEmail): Promise<SendEmailResult> {
      const accepted = asList(message.to);

      try {
        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: accepted.join(", "),
          subject: message.subject,
          html: message.html,
          ...(message.text ? { text: message.text } : {}),
          ...(message.replyTo ? { replyTo: message.replyTo } : {}),
          ...(message.attachments?.length
            ? {
                attachments: message.attachments.map((item) => ({
                  filename: item.filename,
                  content: Buffer.from(item.contentBase64, "base64"),
                  contentType: item.type,
                  contentDisposition: item.disposition,
                  cid: item.contentId,
                })),
              }
            : {}),
        });

        logger.info(
          {
            provider: "mailtrap",
            toCount: accepted.length,
            subject: message.subject,
            category: message.category,
            correlationId: message.correlationId,
            organizationId: message.organizationId,
            messageId: info.messageId,
          },
          "Email sent via Mailtrap"
        );

        return {
          provider: "mailtrap",
          ...(info.messageId ? { messageId: String(info.messageId) } : {}),
          accepted,
        };
      } catch (error) {
        logger.error(
          {
            err: error,
            provider: "mailtrap",
            toCount: accepted.length,
            subject: message.subject,
            category: message.category,
            correlationId: message.correlationId,
          },
          "Mailtrap email send failed"
        );
        throw error;
      }
    },
  };
}
