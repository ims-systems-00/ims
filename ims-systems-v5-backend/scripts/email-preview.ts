/**
 * Preview a V5 email template as HTML.
 *
 * Usage:
 *   pnpm email:preview bug-report-support
 *   pnpm email:preview invitation --out /tmp/invite.html
 */

import { writeFileSync } from "node:fs";
import {
  listEmailTemplateIds,
  renderEmail,
  resolveOrganisationEmailBranding,
  type EmailTemplateId,
} from "../src/infrastructure/email/templates";

const SAMPLE: Record<string, unknown> = {
  "bug-report-support": {
    category: "Functional",
    title: "Risk sheet save fails",
    description: "Clicking Save on a mitigated risk shows a generic error.",
    reporterName: "Alex Reporter",
    reporterEmail: "alex@example.com",
    organizationId: "000000000000000000000001",
  },
  "bug-report-confirmation": {
    reporterName: "Alex Reporter",
    title: "Risk sheet save fails",
  },
  "contact-demo-support": {
    organisationName: "Acme Care Ltd",
    name: "Jordan Lee",
    email: "jordan@acme.example",
    jobTitle: "Compliance Manager",
    phone: "+44 7700 900123",
    bookedDate: "2026-11-03",
    additionalInformation: "Prefer afternoon slots.",
  },
  "contact-demo-confirmation": {
    name: "Jordan Lee",
    bookedDate: "2026-11-03",
  },
  "contact-get-started-support": {
    organisationName: "Acme Care Ltd",
    name: "Jordan Lee",
    email: "jordan@acme.example",
    jobTitle: "Compliance Manager",
    phone: "+44 7700 900123",
    service: "Full platform",
    isoRows: [
      { label: "ISO 27001", value: "true" },
      { label: "ISO 9001", value: "false" },
    ],
  },
  "register-interest-confirmation": {},
  invitation: {
    inviterName: "Sam Admin",
    organisationName: "Acme Care Ltd",
    role: "User",
    acceptUrl: "https://app.example.com/invitations/accept?token=demo",
    expiresAt: new Date("2026-11-01T12:00:00Z"),
  },
  welcome: { name: "Alex" },
  "access-revoked": { name: "Alex" },
  "email-verification": { name: "Alex" },
  "licence-request-support": {
    reference: "LR-1001",
    organisationName: "Acme Care Ltd",
    meta: [
      { label: "Super users", value: "2" },
      { label: "Users", value: "10" },
    ],
  },
  "licence-request-received": {
    reference: "LR-1001",
    organisationName: "Acme Care Ltd",
    meta: [{ label: "Users", value: "10" }],
  },
  "licence-request-granted": {
    reference: "LR-1001",
    organisationName: "Acme Care Ltd",
    meta: [{ label: "Users", value: "10" }],
  },
  "partnership-application-received": { organisationName: "Acme Partners" },
  "partnership-code-ready": {
    organisationName: "Acme Partners",
    partnerCode: "PARTNER-ACME",
  },
  invoice: {
    recipientName: "Finance Team",
    reference: "INV-2044",
    customerName: "Acme Care Ltd",
    totalLabel: "£1,200.00",
    dueDateLabel: "15-11-2026",
  },
  "document-shared": {
    documentName: "Information Security Policy.pdf",
    message: "Please review the updated policy.",
    viewUrl: "https://app.example.com/documents/abc",
  },
  "document-signature-requested": {
    documentName: "NDA.pdf",
    message: "Please sign by Friday.",
    signUrl: "https://app.example.com/sign/xyz",
    expiresAt: new Date("2026-11-07T00:00:00Z"),
  },
  "document-signed-copy": {
    documentName: "NDA.pdf",
    viewUrl: "https://app.example.com/documents/signed/xyz",
  },
  "audit-report": {
    recipientName: "Auditor",
    reference: "AUD-12",
    title: "Internal Q3 audit",
    summaryHtml: "<p><strong>Summary:</strong> 3 findings recorded.</p>",
  },
  notification: {
    title: "Risk nudged",
    body: "Sam nudged you about risk RSK-001 Fire exit clearance.",
    actionUrl: "https://app.example.com/risks/1",
    actionLabel: "View risk",
  },
  "campaign-wrap": {
    subject: "Autumn compliance update",
    bodyHtml: "<p>Hello,</p><p>Here is this quarter's compliance digest.</p>",
  },
  "go-live-onboard-success": {
    paymentType: "Monthly invoice",
    superUser: 2,
    users: 10,
    groups: 3,
    complianceTools: ["ISO 27001", "ISO 9001"],
  },
  "go-live-invoice-internal": {
    organizationId: "000000000000000000000001",
    actorId: "user-1",
    actorEmail: "admin@acme.example",
    superUser: 2,
    users: 10,
    groups: 3,
    complianceTools: ["ISO 27001"],
  },
};

function main() {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--")) as EmailTemplateId | undefined;
  const outFlag = args.indexOf("--out");
  const outPath = outFlag >= 0 ? args[outFlag + 1] : undefined;
  const branded = args.includes("--branded");

  if (!id) {
    console.error(
      "Usage: pnpm email:preview <templateId> [--out file.html] [--branded]"
    );
    console.error("Available:", listEmailTemplateIds().join(", "));
    process.exit(1);
  }

  if (!listEmailTemplateIds().includes(id)) {
    console.error(`Unknown template id: ${id}`);
    console.error("Available:", listEmailTemplateIds().join(", "));
    process.exit(1);
  }

  const data = (SAMPLE[id] ?? {}) as never;
  const branding = branded
    ? resolveOrganisationEmailBranding({
        name: "Acme Care Ltd",
        logoSrc: "https://placehold.co/280x96/png?text=Acme+Care",
        emailBranding: {
          enabled: true,
          themeId: "forest",
          colors: {
            primary: "#15803D",
            primaryDark: "#166534",
            primaryLight: "#BBF7D0",
            primaryExtraLight: "#F0FDF4",
          },
        },
      })
    : undefined;
  const rendered = renderEmail(id, data, branding ? { branding } : undefined);
  console.log("Subject:", rendered.subject);
  console.log("--- text ---");
  console.log(rendered.text);
  if (outPath) {
    writeFileSync(outPath, rendered.html, "utf8");
    console.log(`Wrote HTML to ${outPath}`);
  } else {
    console.log("--- html (first 500 chars) ---");
    console.log(rendered.html.slice(0, 500));
  }
}

main();
