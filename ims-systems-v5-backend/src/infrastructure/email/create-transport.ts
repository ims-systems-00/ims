import type { AppConfig } from "../../config";
import type { Logger } from "../logging/logger";
import { createLoggingEmailTransport } from "./logging.transport";
import { createMailtrapEmailTransport } from "./mailtrap.transport";
import { createSendGridEmailTransport } from "./sendgrid.transport";
import type { EmailTransport } from "./types";

/**
 * Build the configured email transport.
 * When EMAIL_ENABLED=false, always use logging (safe default).
 */
export function createEmailTransport(
  config: AppConfig,
  logger: Logger
): EmailTransport {
  if (!config.EMAIL_ENABLED || config.EMAIL_PROVIDER === "logging") {
    return createLoggingEmailTransport(logger);
  }

  if (config.EMAIL_PROVIDER === "mailtrap") {
    return createMailtrapEmailTransport({
      host: config.MAILTRAP_HOST,
      port: config.MAILTRAP_PORT,
      user: config.MAILTRAP_USER,
      pass: config.MAILTRAP_PASS,
      fromEmail: config.MAIL_FROM,
      fromName: config.MAIL_FROM_NAME,
      logger,
    });
  }

  if (config.EMAIL_PROVIDER === "sendgrid") {
    return createSendGridEmailTransport({
      apiKey: config.SENDGRID_API_KEY,
      fromEmail: config.MAIL_FROM,
      fromName: config.MAIL_FROM_NAME,
      logger,
    });
  }

  return createLoggingEmailTransport(logger);
}
