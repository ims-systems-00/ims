import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  listEmailTemplateIds,
  renderEmail,
  renderEmailLayout,
  resolveOrganisationEmailBranding,
} from "../src/infrastructure/email/templates";

const ORG_BRANDING = resolveOrganisationEmailBranding({
  name: "Acme Care",
  logoSrc: "https://cdn.example.com/logo.png",
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
});

describe("email templates", () => {
  it("escapes HTML in layout content and always returns text", () => {
    const rendered = renderEmailLayout("Alert <script>", {
      title: "Title <b>x</b>",
      greeting: 'Hi "Sam"',
      paragraphs: ["Line with <img src=x onerror=alert(1)>"],
      meta: [{ label: "Field", value: "a < b & c" }],
      cta: { label: "Open", href: "https://example.com/?a=1&b=2" },
    });

    expect(rendered.html).not.toContain("<script>");
    expect(rendered.html).toContain("&lt;b&gt;");
    expect(rendered.html).toContain("a &lt; b &amp; c");
    expect(rendered.html).toContain("https://example.com/?a=1&amp;b=2");
    expect(rendered.text.length).toBeGreaterThan(20);
    expect(rendered.text).toContain("a < b & c");
  });

  it("registers the planned catalog ids including parity templates", () => {
    const ids = listEmailTemplateIds();
    expect(ids).toContain("bug-report-support");
    expect(ids).toContain("invitation");
    expect(ids).toContain("licence-request-granted");
    expect(ids).toContain("licence-request-cancelled");
    expect(ids).toContain("document-signed-copy");
    expect(ids).toContain("campaign-wrap");
    expect(ids).toContain("account-past-due");
    expect(ids).toContain("account-blocked");
    expect(ids).toContain("account-reactivated");
    expect(ids).toContain("txn-email-invitation");
  });

  it("renders bug report support with structured meta", () => {
    const rendered = renderEmail("bug-report-support", {
      category: "Functional",
      title: "Save fails",
      description: "Details here",
      reporterName: "Alex",
      reporterEmail: "alex@example.com",
      organizationId: "org-1",
    });
    expect(rendered.subject).toContain("Save fails");
    expect(rendered.html).toContain("New bug report from customer");
    expect(rendered.html).toContain("alex@example.com");
    expect(rendered.text).toContain("Category: Functional");
  });

  it("renders invitation with CTA and purpose chrome", () => {
    const rendered = renderEmail("invitation", {
      inviterName: "Sam",
      organisationName: "Acme",
      role: "User",
      acceptUrl: "https://app.example.com/accept",
      expiresAt: new Date("2026-11-01T00:00:00Z"),
    });
    expect(rendered.subject).toContain("Acme");
    expect(rendered.html).toContain("Accept invitation");
    expect(rendered.html).toContain("https://app.example.com/accept");
    expect(rendered.html).toContain("Action required");
    expect(rendered.html).toContain("data:image/png;base64,");
    expect(rendered.html).toContain(DEFAULT_IMS_EMAIL_BRANDING.primaryDark);
    expect(rendered.html).not.toContain("linear-gradient");
  });

  it("renders document signature request and campaign wrap", () => {
    const signature = renderEmail("document-signature-requested", {
      documentName: "NDA.pdf",
      signUrl: "https://app.example.com/sign/1",
      expiresAt: new Date("2026-11-07T00:00:00Z"),
    });
    expect(signature.subject).toContain("NDA.pdf");
    expect(signature.html).toContain("Review and sign");

    const campaign = renderEmail("campaign-wrap", {
      subject: "Quarterly update",
      bodyHtml: "<p>Hello customer</p>",
    });
    expect(campaign.subject).toBe("Quarterly update");
    expect(campaign.html).toContain("Hello customer");
    expect(campaign.text.length).toBeGreaterThan(10);
  });

  it("uses iMS branding by default and org branding when enabled", () => {
    const defaulted = renderEmail("welcome", { name: "Alex" });
    expect(defaulted.html).toContain("iMS Systems");
    expect(defaulted.html).toContain(DEFAULT_IMS_EMAIL_BRANDING.primary);
    expect(defaulted.html).toContain("data:image/png;base64,");
    expect(defaulted.html).toContain(DEFAULT_IMS_EMAIL_BRANDING.primaryDark);
    expect(defaulted.html).not.toContain("linear-gradient");

    const branded = renderEmail("welcome", { name: "Alex" }, { branding: ORG_BRANDING });
    expect(branded.html).toContain("Acme Care");
    expect(branded.html).toContain("#15803D");
    expect(branded.html).toContain("#166534");
    expect(branded.html).toContain('src="https://cdn.example.com/logo.png"');
    expect(branded.html).toContain("Powered by iMS Systems");
    expect(branded.html).not.toContain(
      "iMS Systems. This message was sent automatically"
    );
  });

  it("applies org branding across high-traffic templates", () => {
    const ids = [
      "invitation",
      "document-shared",
      "campaign-wrap",
      "licence-request-received",
      "invoice",
    ] as const;

    for (const id of ids) {
      const rendered =
        id === "invitation"
          ? renderEmail(
              id,
              {
                inviterName: "Sam",
                organisationName: "Acme Care",
                role: "User",
                acceptUrl: "https://example.com/a",
                expiresAt: new Date("2026-11-01T00:00:00Z"),
              },
              { branding: ORG_BRANDING }
            )
          : id === "document-shared"
            ? renderEmail(
                id,
                { documentName: "Policy.pdf", viewUrl: "https://example.com/d" },
                { branding: ORG_BRANDING }
              )
            : id === "campaign-wrap"
              ? renderEmail(
                  id,
                  { subject: "Hi", bodyHtml: "<p>Body</p>" },
                  { branding: ORG_BRANDING }
                )
              : id === "licence-request-received"
                ? renderEmail(
                    id,
                    { reference: "LR-1", organisationName: "Acme Care" },
                    { branding: ORG_BRANDING }
                  )
                : renderEmail(
                    id,
                    {
                      recipientName: "Finance",
                      reference: "INV-1",
                      customerName: "Acme Care",
                      totalLabel: "£10",
                      dueDateLabel: "01-01-2027",
                    },
                    { branding: ORG_BRANDING }
                  );

      expect(rendered.html, id).toContain("#15803D");
      expect(rendered.html, id).toContain("Acme Care");
      expect(rendered.html, id).toContain("support@imssystems.tech");
    }
  });

  it("renders billing and txn parity templates", () => {
    expect(
      renderEmail("account-past-due", { organisationName: "Acme" }).subject
    ).toContain("past due");
    expect(
      renderEmail("account-blocked", { organisationName: "Acme" }).html
    ).toContain("Blocked");
    expect(
      renderEmail("account-reactivated", { organisationName: "Acme" }).html
    ).toContain("Reactivated");
    expect(
      renderEmail("txn-email-invitation", {
        organisationName: "Acme",
        acceptUrl: "https://example.com/txn",
      }).html
    ).toContain("Accept notification access");
    expect(
      renderEmail("licence-request-cancelled", {
        reference: "LR-9",
        organisationName: "Acme",
      }).html
    ).toContain("Cancelled");
  });

  it("keeps campaign body HTML while escaping layout chrome", () => {
    const rendered = renderEmail("campaign-wrap", {
      subject: "Launch <promo>",
      bodyHtml: "<p>Hello <strong>team</strong></p>",
    });
    expect(rendered.html).toContain("<strong>team</strong>");
    expect(rendered.html).toContain("Launch &lt;promo&gt;");
  });
});
