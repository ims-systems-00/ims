export type {
  EmailAddress,
  EmailAttachment,
  EmailTransport,
  OutgoingEmail,
  SendEmailResult,
} from "./types";
export { createEmailTransport } from "./create-transport";
export { createLoggingEmailTransport } from "./logging.transport";
export { createMailtrapEmailTransport } from "./mailtrap.transport";
export { createSendGridEmailTransport } from "./sendgrid.transport";
