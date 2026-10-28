/**
 * V5 transactional email template catalog.
 * Modules call renderEmail(...) then EmailSystem.send*.
 */

import {
  renderAccessRevoked,
  renderEmailVerification,
  renderInvitation,
  renderRegisterInterestConfirmation,
  renderWelcome,
} from "./catalog/access";
import {
  renderBugReportConfirmation,
  renderBugReportSupport,
  type BugReportConfirmationData,
  type BugReportSupportData,
} from "./catalog/bug-report";
import {
  renderContactDemoConfirmation,
  renderContactDemoSupport,
  renderContactGetStartedSupport,
  type ContactLeadData,
} from "./catalog/contact-ims";
import {
  renderDocumentShared,
  renderDocumentSignatureRequested,
  renderDocumentSignedCopy,
} from "./catalog/documents";
import {
  renderLicenceRequestGranted,
  renderLicenceRequestReceived,
  renderLicenceRequestSupport,
  type LicenceRequestEmailData,
} from "./catalog/licence";
import {
  renderAuditReport,
  renderCampaignWrap,
  renderGoLiveInvoiceInternal,
  renderGoLiveOnboardSuccess,
  renderInvoice,
  renderNotification,
  renderPartnershipApplicationReceived,
  renderPartnershipCodeReady,
} from "./catalog/misc";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  popEmailBranding,
  pushEmailBranding,
  type EmailBranding,
} from "./branding";
import type { EmailTemplateId, RenderedEmail } from "./types";

export type { EmailTemplateId, RenderedEmail, EmailLayoutInput, EmailMetaRow, EmailCta } from "./types";
export { renderEmailLayout } from "./layout";
export { escapeHtml, nl2br } from "./primitives";
export {
  DEFAULT_IMS_BRAND_COLORS,
  DEFAULT_IMS_EMAIL_BRANDING,
  normalizeBrandColors,
  normalizeOrganisationEmailBranding,
  resolveOrganisationEmailBranding,
  getActiveEmailBranding,
  type EmailBrandColors,
  type EmailBranding,
  type OrganisationEmailBrandingSettings,
} from "./branding";

export type RenderEmailOptions = {
  /** When omitted, iMS Systems default branding is used. */
  branding?: EmailBranding;
};

export type EmailTemplateDataMap = {
  "bug-report-support": BugReportSupportData;
  "bug-report-confirmation": BugReportConfirmationData;
  "contact-demo-support": ContactLeadData;
  "contact-demo-confirmation": { name: string; bookedDate: string };
  "contact-get-started-support": ContactLeadData;
  "register-interest-confirmation": Record<string, never>;
  invitation: {
    inviterName: string;
    organisationName: string;
    role: string;
    acceptUrl: string;
    expiresAt: Date;
  };
  welcome: { name: string };
  "access-revoked": { name: string };
  "email-verification": { name: string };
  "licence-request-support": LicenceRequestEmailData;
  "licence-request-received": LicenceRequestEmailData;
  "licence-request-granted": LicenceRequestEmailData;
  "partnership-application-received": { organisationName: string };
  "partnership-code-ready": {
    organisationName: string;
    partnerCode: string;
    htmlExtra?: string;
  };
  invoice: {
    recipientName: string;
    reference: string;
    customerName: string;
    totalLabel: string;
    dueDateLabel: string;
  };
  "document-shared": {
    documentName: string;
    message?: string;
    viewUrl?: string;
  };
  "document-signature-requested": {
    documentName: string;
    message?: string;
    signUrl?: string;
    expiresAt?: Date;
  };
  "document-signed-copy": { documentName: string; viewUrl: string };
  "audit-report": {
    recipientName: string;
    reference: string;
    title: string;
    summaryHtml: string;
  };
  notification: {
    title: string;
    body: string;
    actionUrl?: string;
    actionLabel?: string;
  };
  "campaign-wrap": { subject: string; bodyHtml: string };
  "go-live-onboard-success": {
    paymentType: string;
    superUser: number;
    users: number;
    groups: number;
    complianceTools: string[];
  };
  "go-live-invoice-internal": {
    organizationId: string;
    actorId: string;
    actorEmail?: string;
    superUser: number;
    users: number;
    groups: number;
    complianceTools: string[];
  };
};

type TemplateRenderer<K extends EmailTemplateId> = (
  data: EmailTemplateDataMap[K]
) => RenderedEmail;

const registry: { [K in EmailTemplateId]: TemplateRenderer<K> } = {
  "bug-report-support": renderBugReportSupport,
  "bug-report-confirmation": renderBugReportConfirmation,
  "contact-demo-support": renderContactDemoSupport,
  "contact-demo-confirmation": renderContactDemoConfirmation,
  "contact-get-started-support": renderContactGetStartedSupport,
  "register-interest-confirmation": () => renderRegisterInterestConfirmation(),
  invitation: renderInvitation,
  welcome: renderWelcome,
  "access-revoked": renderAccessRevoked,
  "email-verification": renderEmailVerification,
  "licence-request-support": renderLicenceRequestSupport,
  "licence-request-received": renderLicenceRequestReceived,
  "licence-request-granted": renderLicenceRequestGranted,
  "partnership-application-received": renderPartnershipApplicationReceived,
  "partnership-code-ready": renderPartnershipCodeReady,
  invoice: renderInvoice,
  "document-shared": renderDocumentShared,
  "document-signature-requested": renderDocumentSignatureRequested,
  "document-signed-copy": renderDocumentSignedCopy,
  "audit-report": renderAuditReport,
  notification: renderNotification,
  "campaign-wrap": renderCampaignWrap,
  "go-live-onboard-success": renderGoLiveOnboardSuccess,
  "go-live-invoice-internal": renderGoLiveInvoiceInternal,
};

export function renderEmail<K extends EmailTemplateId>(
  id: K,
  data: EmailTemplateDataMap[K],
  options?: RenderEmailOptions
): RenderedEmail {
  const branding = options?.branding ?? DEFAULT_IMS_EMAIL_BRANDING;
  pushEmailBranding(branding);
  try {
    const renderer = registry[id] as TemplateRenderer<K>;
    return renderer(data);
  } finally {
    popEmailBranding();
  }
}

/**
 * Resolve org branding then render. Use for any org-scoped transactional mail
 * so Customise email settings (logo + colours) actually apply.
 */
export async function renderEmailForOrganisation<K extends EmailTemplateId>(
  id: K,
  data: EmailTemplateDataMap[K],
  input: {
    organizationId?: string | null;
    resolveBranding?: (organizationId: string) => Promise<EmailBranding>;
  }
): Promise<RenderedEmail> {
  let branding = DEFAULT_IMS_EMAIL_BRANDING;
  if (input.organizationId && input.resolveBranding) {
    try {
      branding = await input.resolveBranding(input.organizationId);
    } catch {
      branding = DEFAULT_IMS_EMAIL_BRANDING;
    }
  }
  return renderEmail(id, data, { branding });
}

export function listEmailTemplateIds(): EmailTemplateId[] {
  return Object.keys(registry) as EmailTemplateId[];
}
