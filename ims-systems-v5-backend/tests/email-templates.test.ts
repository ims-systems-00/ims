import { describe, expect, it } from "vitest";
import {
  DEFAULT_IMS_EMAIL_BRANDING,
  listEmailTemplateIds,
  renderEmail,
  renderEmailLayout,
  resolveOrganisationEmailBranding,
} from "../src/infrastructure/email/templates";

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

  it("registers the planned catalog ids", () => {
    const ids = listEmailTemplateIds();
    expect(ids).toContain("bug-report-support");
    expect(ids).toContain("invitation");
    expect(ids).toContain("licence-request-granted");
    expect(ids).toContain("document-signed-copy");
    expect(ids).toContain("campaign-wrap");
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

  it("renders invitation with CTA", () => {
    const rendered = renderEmail("invitation", {
      inviterName: "Sam",
      organisationName: "Acme",
      role: "User",
      acceptUrl: "https://app.example.com/accept",
      expiresAt: new Date("2026-11-01T00:00:00Z"),
    });
    expect(rendered.subject).toBe("iMS Invitation");
    expect(rendered.html).toContain("Accept invitation");
    expect(rendered.html).toContain("https://app.example.com/accept");
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
    expect(defaulted.html).toContain("border-radius:14px");

    const branding = resolveOrganisationEmailBranding({
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
    const branded = renderEmail(
      "welcome",
      { name: "Alex" },
      { branding }
    );
    expect(branded.html).toContain("Acme Care");
    expect(branded.html).toContain("#15803D");
    expect(branded.html).toContain('src="https://cdn.example.com/logo.png"');
    expect(branded.html).toContain("Powered by iMS Systems");
    expect(branded.html).not.toContain(
      "iMS Systems — this message was sent automatically"
    );
  });
});
