import { describe, expect, it, vi } from "vitest";
import {
  buildAuditReportHtml,
  createAuditReportAdapter,
} from "../src/modules/audits";
import { NoOpAuditReportAdapter } from "../src/modules/audits/ports";
import type { Audit } from "../src/modules/audits";
import type { EmailSystem } from "../src/infrastructure/queue";

function sampleAudit(): Audit {
  return {
    id: "audit-1",
    organizationId: "org-1",
    reference: "AUD-001",
    title: "QMS <Internal> Audit",
    type: "Internal",
    focusArea: "Quality",
    businessUnitId: "bu-1",
    complianceBodyId: "body-1",
    auditorId: "user-1",
    startDate: new Date("2026-01-15T00:00:00.000Z"),
    interval: "Annually",
    identifications: [
      { id: "n1", nonConformity: "Missing record", rootCause: "No owner" },
    ],
    risks: [
      {
        id: "r1",
        title: "Supplier risk",
        description: "Single source",
        likelihood: 2,
        consequence: 3,
        total: 6,
      },
    ],
    ofis: [
      { id: "o1", title: "Digitise log", opportunityForImprovement: "Use forms" },
    ],
    attachments: [],
    complianceLinks: [],
    completed: { status: false, by: null, on: null },
    createdBy: "user-1",
    createdOn: new Date(),
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    displayStatus: "Open",
  } as Audit;
}

describe("AuditReportAdapter (N-14)", () => {
  it("NoOps when EmailSystem is absent", () => {
    expect(createAuditReportAdapter(undefined)).toBeInstanceOf(
      NoOpAuditReportAdapter
    );
  });

  it("builds an escaped HTML report with all sections", () => {
    const html = buildAuditReportHtml(sampleAudit());
    expect(html).toContain("AUD-001");
    expect(html).toContain("QMS &lt;Internal&gt; Audit");
    expect(html).toContain("Missing record");
    expect(html).toContain("Supplier risk");
    expect(html).toContain("Digitise log");
  });

  it("emails the report with an HTML attachment", async () => {
    const sendTransactional = vi.fn().mockResolvedValue({ mode: "direct" });
    const adapter = createAuditReportAdapter({
      sendTransactional,
    } as unknown as EmailSystem);

    await adapter.enqueueExtractReport({
      organizationId: "org-1",
      audit: sampleAudit(),
      recipientName: "Rita",
      recipientEmail: "rita@example.com",
      senderSubjectId: "user-1",
    });

    expect(sendTransactional).toHaveBeenCalledTimes(1);
    const input = sendTransactional.mock.calls[0]![0] as {
      to: string;
      subject: string;
      category: string;
      attachments: Array<{ filename: string; contentBase64: string; type?: string }>;
    };
    expect(input.to).toBe("rita@example.com");
    expect(input.subject).toContain("AUD-001");
    expect(input.category).toBe("transactional");
    expect(input.attachments).toHaveLength(1);
    expect(input.attachments[0]!.filename).toBe("audit-report-AUD-001.html");
    const decoded = Buffer.from(
      input.attachments[0]!.contentBase64,
      "base64"
    ).toString("utf8");
    expect(decoded).toContain("Missing record");
  });
});
