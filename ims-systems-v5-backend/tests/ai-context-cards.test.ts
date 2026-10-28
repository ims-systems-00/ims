import { describe, expect, it } from "vitest";
import {
  documentCard,
  incidentCard,
  riskCard,
  cardsToPromptBlock,
} from "../src/modules/ai/lib/context-cards";

describe("Alice context cards", () => {
  it("builds risk and incident cards with hrefs", () => {
    const risk = riskCard({
      _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
      reference: "RISK-1",
      title: "Fire",
      status: "Open",
      description: "Warehouse fire risk",
      likelihood: 3,
      consequence: 4,
    });
    expect(risk.href).toContain("/risks?risk=");
    expect(risk.reference).toBe("RISK-1");

    const incident = incidentCard({
      _id: "bbbbbbbbbbbbbbbbbbbbbbbb",
      reference: "INC-1",
      title: "Spill",
      status: "Open",
      priority: "P1",
    });
    expect(incident.href).toContain("/incidents?incident=");
    expect(incident.summary).toContain("P1");
  });

  it("builds document cards with repository deep link", () => {
    const doc = documentCard({
      _id: "cccccccccccccccccccccccc",
      repositoryId: "dddddddddddddddddddddddd",
      reference: "DOC-1",
      name: "Policy.pdf",
      status: "Published",
      documentData: { purpose: "Policy", complianceLinks: [] },
    });
    expect(doc.href).toContain("/documents/repositories/");
    expect(doc.href).toContain("/nodes/");
  });

  it("formats prompt block without inventing data", () => {
    const block = cardsToPromptBlock([]);
    expect(block).toMatch(/No organisation records/);
  });
});
