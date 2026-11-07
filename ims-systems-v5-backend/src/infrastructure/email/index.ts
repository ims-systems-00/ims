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
export {
  renderEmail,
  renderEmailForOrganisation,
  renderEmailLayout,
  listEmailTemplateIds,
  escapeHtml,
  nl2br,
  DEFAULT_IMS_BRAND_COLORS,
  DEFAULT_IMS_EMAIL_BRANDING,
  normalizeBrandColors,
  normalizeOrganisationEmailBranding,
  resolveOrganisationEmailBranding,
  getActiveEmailBranding,
} from "./templates";
export type {
  EmailTemplateId,
  RenderedEmail,
  EmailLayoutInput,
  EmailMetaRow,
  EmailCta,
  EmailTemplateDataMap,
  RenderEmailOptions,
  EmailBrandColors,
  EmailBranding,
  OrganisationEmailBrandingSettings,
} from "./templates";
