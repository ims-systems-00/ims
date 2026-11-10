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

/** Visual mode — drives hero band / chip treatment while sharing brand tokens. */
export type EmailLayoutMode =
  | "default"
  | "invite"
  | "action"
  | "receipt"
  | "alert"
  | "success"
  | "internal";

export type EmailStatusTone = "info" | "success" | "warning" | "danger";

export type EmailStatusChip = {
  label: string;
  tone?: EmailStatusTone;
};

export type EmailLayoutInput = {
  /** Main heading inside the card. */
  title: string;
  /** Optional preheader / eyebrow above the title. */
  eyebrow?: string;
  /** Layout variant for purpose-specific chrome. */
  mode?: EmailLayoutMode;
  /** Optional status chip under the eyebrow. */
  statusChip?: EmailStatusChip;
  /** Short hero line shown in the brand band (mode-dependent). */
  hero?: string;
  /** Greeting line, e.g. "Hi Alex," */
  greeting?: string;
  /** Body paragraphs (plain text; escaped in HTML). */
  paragraphs?: string[];
  /** Structured label/value rows. */
  meta?: EmailMetaRow[];
  /** Highlighted code / token (partner codes, references). */
  codeBlock?: { label?: string; value: string };
  /** Optional HTML block already escaped/safe (use sparingly). */
  safeHtmlBlock?: string;
  /** Note about attachments included with the message. */
  attachmentNote?: string;
  /** Single primary CTA. */
  cta?: EmailCta;
  /** Closing lines before footer. */
  closing?: string[];
  /** Override default footer note. */
  footerNote?: string;
  /** Inbox preheader (hidden preview text). Defaults to title. */
  preheader?: string;
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
  | "licence-request-cancelled"
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
  | "go-live-invoice-internal"
  | "account-past-due"
  | "account-blocked"
  | "account-reactivated"
  | "txn-email-invitation";
