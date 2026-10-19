import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { createComplianceEvidenceLinkAdapter } from "../src/modules/compliance";
import { createRiskRepository } from "../src/modules/risks/repositories/risk.repository";
import { getRiskModel } from "../src/modules/risks/repositories/risk.model";
import { createDocumentTreeStore } from "../src/modules/document-management/repositories/document-tree.repository";
import { getDocumentTreeModel } from "../src/modules/document-management/repositories/document-tree.model";

const ORG_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const ORG_B = "bbbbbbbbbbbbbbbbbbbbbbbb";

describe("ComplianceEvidenceLinkAdapter (C-02)", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getRiskModel().deleteMany({});
    await getDocumentTreeModel().deleteMany({});
  });

  it("riskExists is true only for the owning organisation", async () => {
    const risks = createRiskRepository();
    const score = { likelihood: 2, consequence: 2, total: 4 };
    const risk = await risks.create(ORG_A, {
      reference: "RK-TEST-1",
      title: "Evidence risk",
      description: "For C-02",
      type: "Organisational",
      ownerId: null,
      businessUnitId: undefined,
      categoryId: undefined,
      assetId: null,
      initialScore: score,
      currentScore: score,
      attachments: [],
      activity: [],
      raisedBy: "tester",
      raisedOn: new Date(),
    });

    const port = createComplianceEvidenceLinkAdapter();
    expect(await port.riskExists(ORG_A, risk.id)).toBe(true);
    expect(await port.riskExists(ORG_B, risk.id)).toBe(false);
    expect(await port.riskExists(ORG_A, "000000000000000000000099")).toBe(
      false
    );
  });

  it("riskExists is false after soft-delete", async () => {
    const risks = createRiskRepository();
    const score = { likelihood: 1, consequence: 1, total: 1 };
    const risk = await risks.create(ORG_A, {
      reference: "RK-TEST-2",
      title: "Deleted risk",
      description: "Soft deleted",
      type: "Organisational",
      ownerId: null,
      businessUnitId: undefined,
      categoryId: undefined,
      assetId: null,
      initialScore: score,
      currentScore: score,
      attachments: [],
      activity: [],
      raisedBy: "tester",
      raisedOn: new Date(),
    });
    await risks.softDelete(ORG_A, risk.id);

    const port = createComplianceEvidenceLinkAdapter();
    expect(await port.riskExists(ORG_A, risk.id)).toBe(false);
  });

  it("documentExists uses document tree store", async () => {
    const trees = createDocumentTreeStore();
    const node = await trees.createFolder(ORG_A, {
      repositoryId: "cccccccccccccccccccccccc",
      reference: "DOC-FOLDER-1",
      name: "Evidence folder",
      parentNodeId: null,
      reviewDate: null,
      createdBy: "tester",
      createdOn: new Date(),
    });

    const port = createComplianceEvidenceLinkAdapter();
    expect(await port.documentExists(ORG_A, node.id)).toBe(true);
    expect(await port.documentExists(ORG_B, node.id)).toBe(false);
    expect(await port.documentExists(ORG_A, "000000000000000000000099")).toBe(
      false
    );
  });
});
