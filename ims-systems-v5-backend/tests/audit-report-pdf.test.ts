import { describe, expect, it } from "vitest";
import { buildAuditReportPdf } from "../src/modules/audits";
import type { Audit } from "../src/modules/audits";

function sampleAudit(): Audit {
  return {
    id: "audit-1",
    organizationId: "org-1",
    reference: "AUD-001",
    title: "QMS Internal Audit",
    type: "Internal",
    focusArea: "Quality",
    businessUnitId: "bu-1",
    complianceBodyId: "body-1",
    auditorId: "user-1",
    startDate: new Date("2026-01-15T00:00:00.000Z"),
    interval: "Annually",
    comment: "Site walkthrough complete",
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
    attachments: [
      {
        id: "a1",
        fileName: "notes.pdf",
        uploadedBy: "user-1",
        uploadedAt: new Date(),
      },
    ],
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

describe("buildAuditReportPdf", () => {
  it("produces a valid PDF document", async () => {
    const bytes = await buildAuditReportPdf(sampleAudit());
    expect(Buffer.from(bytes).subarray(0, 4).toString("utf8")).toBe("%PDF");
    expect(bytes.byteLength).toBeGreaterThan(800);
  });
});
