import type { Logger } from "../logging/logger";
import type { EmailTransport, OutgoingEmail, SendEmailResult } from "./types";

function asList(to: OutgoingEmail["to"]): string[] {
  return Array.isArray(to) ? to : [to];
}

/**
 * Dev/test transport — never delivers. Logs a redacted summary instead.
 */
export function createLoggingEmailTransport(logger: Logger): EmailTransport {
  return {
    name: "logging",
    async send(message: OutgoingEmail): Promise<SendEmailResult> {
      const accepted = asList(message.to);
      logger.info(
        {
          provider: "logging",
          toCount: accepted.length,
          subject: message.subject,
          category: message.category,
          correlationId: message.correlationId,
          organizationId: message.organizationId,
          hasText: Boolean(message.text),
          attachmentCount: message.attachments?.length ?? 0,
        },
        "Email skipped (logging transport)"
      );
      return {
        provider: "logging",
        messageId: `log-${Date.now()}`,
        accepted,
      };
    },
  };
}
