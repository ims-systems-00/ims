/**
 * Shared email template types for V5 transactional mail.
 */

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailMetaRow = {
  label: string;
  value: string;
};

export type EmailCta = {
  label: string;
  href: string;
};

export type EmailLayoutInput = {
  /** Main heading inside the card. */
  title: string;
  /** Optional preheader / eyebrow above the title. */
  eyebrow?: string;
  /** Greeting line, e.g. "Hi Alex," */
  greeting?: string;
  /** Body paragraphs (plain text; escaped in HTML). */
  paragraphs?: string[];
  /** Structured label/value rows. */
  meta?: EmailMetaRow[];
  /** Optional HTML block already escaped/safe (use sparingly). */
  safeHtmlBlock?: string;
  /** Single primary CTA. */
  cta?: EmailCta;
  /** Closing lines before footer. */
  closing?: string[];
  /** Override default footer note. */
  footerNote?: string;
};

export type EmailTemplateId =
  | "bug-report-support"
  | "bug-report-confirmation"
  | "contact-demo-support"
  | "contact-demo-confirmation"
  | "contact-get-started-support"
  | "register-interest-confirmation"
  | "invitation"
  | "welcome"
  | "access-revoked"
  | "email-verification"
  | "licence-request-support"
  | "licence-request-received"
  | "licence-request-granted"
  | "partnership-application-received"
  | "partnership-code-ready"
  | "invoice"
  | "document-shared"
  | "document-signature-requested"
  | "document-signed-copy"
  | "audit-report"
  | "notification"
  | "campaign-wrap"
  | "go-live-onboard-success"
  | "go-live-invoice-internal";
