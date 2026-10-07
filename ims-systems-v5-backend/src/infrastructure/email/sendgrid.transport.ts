import sgMail from "@sendgrid/mail";
import type { Logger } from "../logging/logger";
import type { EmailTransport, OutgoingEmail, SendEmailResult } from "./types";

export type SendGridTransportOptions = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  logger: Logger;
};

function asList(to: OutgoingEmail["to"]): string[] {
  return Array.isArray(to) ? to : [to];
}

/**
 * Production SendGrid transport (@sendgrid/mail).
 */
export function createSendGridEmailTransport(
  options: SendGridTransportOptions
): EmailTransport {
  const { apiKey, fromEmail, fromName, logger } = options;
  sgMail.setApiKey(apiKey);

  return {
    name: "sendgrid",
    async send(message: OutgoingEmail): Promise<SendEmailResult> {
      const accepted = asList(message.to);
      const payload = {
        to: accepted.length === 1 ? accepted[0]! : accepted,
        from: { email: fromEmail, name: fromName },
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((item) => ({
                filename: item.filename,
                content: item.contentBase64,
                type: item.type,
                disposition: item.disposition,
                contentId: item.contentId,
              })),
            }
          : {}),
        trackingSettings: {
          clickTracking: { enable: false, enableText: false },
          openTracking: { enable: true },
        },
        // Prefer personalizations for multi-recipient so each gets a unique send
        // without exposing the full recipient list in To headers when many.
        mailSettings: {
          sandboxMode: { enable: false },
        },
      };

      try {
        const [response] = await sgMail.send(payload, accepted.length > 1);
        const messageIdHeader = response?.headers?.["x-message-id"];
        const messageId = Array.isArray(messageIdHeader)
          ? messageIdHeader[0]
          : messageIdHeader;

        logger.info(
          {
            provider: "sendgrid",
            toCount: accepted.length,
            subject: message.subject,
            category: message.category,
            correlationId: message.correlationId,
            organizationId: message.organizationId,
            statusCode: response?.statusCode,
            messageId,
          },
          "Email sent via SendGrid"
        );

        return {
          provider: "sendgrid",
          ...(messageId ? { messageId: String(messageId) } : {}),
          accepted,
        };
      } catch (error) {
        logger.error(
          {
            err: error,
            provider: "sendgrid",
            toCount: accepted.length,
            subject: message.subject,
            category: message.category,
            correlationId: message.correlationId,
          },
          "SendGrid email send failed"
        );
        throw error;
      }
    },
  };
}
