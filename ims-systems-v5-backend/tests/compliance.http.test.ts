import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers/create-test-app";
import { buildCatalogueFromJson } from "../src/modules/compliance/lib/catalogue-builder";
import { createComplianceControlRepository } from "../src/modules/compliance/repositories/compliance-control.repository";
import { getComplianceControlModel } from "../src/modules/compliance/repositories/compliance-control.model";
import { getControlStatusModel } from "../src/modules/compliance/repositories/control-status.model";
import { getComplianceOverviewModel } from "../src/modules/compliance/repositories/compliance-overview.model";
import { getControlEvidenceModel } from "../src/modules/compliance/repositories/control-evidence.model";
import { DEV_STUB_ORGANIZATION_ID } from "../src/security";

const otherOrgId = "000000000000000000000099";
const toolkit = "ISO 9001";
const toolkitPath = encodeURIComponent(toolkit);

async function seedCatalogue(): Promise<void> {
  const repository = createComplianceControlRepository();
  const rows = buildCatalogueFromJson(toolkit, [
    { clause: "4", title: "Context of the organisation", type: "Clause" },
    {
      clause: "4.1",
      title: "Understanding the organisation",
      type: "Control",
      description: "Org context requirement",
    },
    {
      clause: "4.1.a",
      title: "External issues",
      type: "Sub-control",
      description: "Leaf control",
    },
    {
      clause: "4.2",
      title: "Interested parties",
      type: "Control",
    },
  ]);
  await repository.upsertCatalogue(toolkit, rows);
}

describe("Compliance HTTP", () => {
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    ctx = await createTestApp();
  }, 60_000);

  afterAll(async () => {
    if (ctx) await ctx.cleanup();
  });

  beforeEach(async () => {
    await getControlEvidenceModel().deleteMany({});
    await getControlStatusModel().deleteMany({});
    await getComplianceOverviewModel().deleteMany({});
    await getComplianceControlModel().deleteMany({});
    await seedCatalogue();
  });

  it("lists licensed toolkits and provisions ISO 9001", async () => {
    const listed = await request(ctx!.app).get("/api/v1/compliance/toolkits");
    expect(listed.status).toBe(200);
    expect(listed.body.success).toBe(true);
    expect(
      listed.body.data.some(
        (row: { name: string; provisioned: boolean }) =>
          row.name === toolkit && row.provisioned === false
      )
    ).toBe(true);

    const provisioned = await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    expect(provisioned.status).toBe(201);
    expect(provisioned.body.data.controlCount).toBe(4);

    const again = await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    expect(again.status).toBe(409);

    const after = await request(ctx!.app).get("/api/v1/compliance/toolkits");
    const row = after.body.data.find(
      (item: { name: string }) => item.name === toolkit
    );
    expect(row.provisioned).toBe(true);
  });

  it("rejects provision when catalogue is missing", async () => {
    await getComplianceControlModel().deleteMany({});
    const response = await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    expect(response.status).toBe(400);
  });

  it("lists global catalogue controls without provisioning", async () => {
    const response = await request(ctx!.app).get(
      `/api/v1/compliance/catalogues/${encodeURIComponent(toolkit)}/controls`
    );
    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(4);
    expect(response.body.data.items[0].clause).toBeTruthy();

    const search = await request(ctx!.app).get(
      `/api/v1/compliance/catalogues/${encodeURIComponent(toolkit)}/controls?search=4.1`
    );
    expect(search.status).toBe(200);
    expect(
      search.body.data.items.every((row: { clause: string }) =>
        row.clause.includes("4.1")
      )
    ).toBe(true);
  });

  it("lists/search/filters controls and never leaks other-org rows", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });

    await getControlStatusModel().create({
      organizationId: otherOrgId,
      name: toolkit,
      controlId: "0000000000000000000000aa",
      clause: "9.9",
      title: "Other org secret",
      description: "",
      annex: "",
      note: "",
      isLocked: false,
      parentClause: null,
      childrenClauses: [],
      moreInfo: null,
      selected: "Selected",
      state: "Implemented",
      compliancePercentage: 100,
      numberOfCompliantChildren: 0,
      evidences: [],
      deletedAt: null,
    });

    const listed = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls`
    );
    expect(listed.status).toBe(200);
    expect(listed.body.data.total).toBe(4);
    expect(
      listed.body.data.items.every(
        (row: { organizationId: string; clause: string }) =>
          row.organizationId === DEV_STUB_ORGANIZATION_ID && row.clause !== "9.9"
      )
    ).toBe(true);

    const search = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    expect(search.body.data.total).toBe(1);
    expect(search.body.data.items[0].clause).toBe("4.1.a");

    const section = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?section=4.1`
    );
    expect(section.body.data.items.map((r: { clause: string }) => r.clause)).toEqual(
      expect.arrayContaining(["4.1", "4.1.a"])
    );
  });

  it("updates leaf status, rolls up parents, and refreshes overview", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });

    const listed = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?pageSize=50`
    );
    const leaf = listed.body.data.items.find(
      (row: { clause: string }) => row.clause === "4.1.a"
    );
    const locked = listed.body.data.items.find(
      (row: { clause: string }) => row.clause === "4"
    );

    const lockedUpdate = await request(ctx!.app)
      .put(`/api/v1/compliance/controls/${locked.id}/status`)
      .send({ selected: "Selected", state: "Implemented" });
    expect(lockedUpdate.status).toBe(400);

    const badCombo = await request(ctx!.app)
      .put(`/api/v1/compliance/controls/${leaf.id}/status`)
      .send({ selected: "Not selected", state: "Implemented" });
    expect(badCombo.status).toBe(400);

    const updated = await request(ctx!.app)
      .put(`/api/v1/compliance/controls/${leaf.id}/status`)
      .send({ selected: "Selected", state: "Implemented" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.state).toBe("Implemented");
    expect(updated.body.data.compliancePercentage).toBe(100);

    const overview = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/overview`
    );
    expect(overview.status).toBe(200);
    expect(overview.body.data.controlsImplemented).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.sections.length).toBeGreaterThan(0);

    const parent = (
      await request(ctx!.app).get(
        `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=Understanding`
      )
    ).body.data.items[0];
    expect(parent.state).toBe("Implemented");
  });

  it("adds/lists/removes control evidence with duplicate rejection", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    const listed = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    const leafId = listed.body.data.items[0].id;

    const risk = await request(ctx!.app)
      .post("/api/v1/risks")
      .send({
        title: "Evidence risk",
        description: "Linked as compliance evidence",
        type: "Organisational",
        likelihood: 2,
        consequence: 2,
      });
    expect(risk.status).toBe(201);
    const riskId = risk.body.data.id as string;

    const created = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "risk-management",
        relatedRiskId: riskId,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.relatedRiskId).toBe(riskId);

    const duplicate = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "risk-management",
        relatedRiskId: riskId,
      });
    expect(duplicate.status).toBe(409);

    const missingRisk = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "risk-management",
        relatedRiskId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      });
    expect(missingRisk.status).toBe(400);

    const evidenceList = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(evidenceList.body.data.total).toBe(1);

    const removed = await request(ctx!.app).delete(
      `/api/v1/compliance/controls/${leafId}/control-evidence/${created.body.data.id}`
    );
    expect(removed.status).toBe(200);

    const after = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(after.body.data.total).toBe(0);
  });

  it("supports embedded evidence and picker", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    const listed = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    const leafId = listed.body.data.items[0].id;

    const attached = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/evidence`)
      .send({ fileName: "policy.pdf", mimeType: "application/pdf" });
    expect(attached.status).toBe(201);
    expect(attached.body.data.evidences).toHaveLength(1);

    const attachmentId = attached.body.data.evidences[0].id;
    const detached = await request(ctx!.app).delete(
      `/api/v1/compliance/controls/${leafId}/evidence/${attachmentId}`
    );
    expect(detached.status).toBe(200);
    expect(detached.body.data.evidences).toHaveLength(0);

    const picker = await request(ctx!.app).get(
      `/api/v1/compliance/picker?name=${toolkitPath}&search=External`
    );
    expect(picker.status).toBe(200);
    expect(picker.body.data.total).toBe(1);
    expect(picker.body.data.items[0].clause).toBe("4.1.a");
  });

  it("soft-deletes toolkit within organisation only", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });

    await getControlStatusModel().create({
      organizationId: otherOrgId,
      name: toolkit,
      controlId: "0000000000000000000000bb",
      clause: "1",
      title: "Other org keep",
      description: "",
      annex: "",
      note: "",
      isLocked: false,
      parentClause: null,
      childrenClauses: [],
      moreInfo: null,
      deletedAt: null,
    });
    await getComplianceOverviewModel().create({
      organizationId: otherOrgId,
      name: toolkit,
      totalPercentage: 10,
      controlsSelected: 1,
      controlsImplemented: 1,
      deletedAt: null,
    });

    const deleted = await request(ctx!.app).delete(
      `/api/v1/compliance/toolkits/${toolkitPath}`
    );
    expect(deleted.status).toBe(200);

    const overview = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/overview`
    );
    expect(overview.status).toBe(404);

    const otherStatuses = await getControlStatusModel().countDocuments({
      organizationId: otherOrgId,
      deletedAt: null,
    });
    expect(otherStatuses).toBe(1);
  });

  it("updates RACI fields on a control status", async () => {
    await request(ctx!.app)
      .post("/api/v1/compliance/toolkits")
      .send({ name: toolkit });
    const listed = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    const leafId = listed.body.data.items[0].id;

    const patched = await request(ctx!.app)
      .patch(`/api/v1/compliance/controls/${leafId}`)
      .send({ responsibleUserId: "dev-stub-user" });
    expect(patched.status).toBe(200);
    expect(patched.body.data.responsibleUserId).toBe("dev-stub-user");
  });

  it("syncs risk linked controls bidirectionally with control evidence", async () => {
    const risk = await request(ctx!.app)
      .post("/api/v1/risks")
      .send({
        title: "Linked control risk",
        description: "Risk used for compliance sync",
        type: "Organisational",
        likelihood: 2,
        consequence: 2,
      });
    expect(risk.status).toBe(201);
    const riskId = risk.body.data.id as string;

    const linked = await request(ctx!.app)
      .put(`/api/v1/risks/${riskId}/compliance-links`)
      .send({
        links: [{ toolkitId: toolkit, clauseIds: ["4.1.a"] }],
      });
    expect(linked.status).toBe(200);
    expect(linked.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    const controls = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    expect(controls.status).toBe(200);
    const leafId = controls.body.data.items[0].id as string;

    const evidence = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(evidence.status).toBe(200);
    expect(evidence.body.data.total).toBe(1);
    expect(evidence.body.data.items[0]).toMatchObject({
      evidenceType: "risk-management",
      relatedRiskId: riskId,
    });
    const evidenceId = evidence.body.data.items[0].id as string;

    const unlinked = await request(ctx!.app)
      .put(`/api/v1/risks/${riskId}/compliance-links`)
      .send({ links: [] });
    expect(unlinked.status).toBe(200);

    const afterUnlink = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(afterUnlink.body.data.total).toBe(0);

    const fromCompliance = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "risk-management",
        relatedRiskId: riskId,
      });
    expect(fromCompliance.status).toBe(201);

    const riskAfter = await request(ctx!.app).get(`/api/v1/risks/${riskId}`);
    expect(riskAfter.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    await request(ctx!.app).delete(
      `/api/v1/compliance/controls/${leafId}/control-evidence/${fromCompliance.body.data.id}`
    );
    const riskCleared = await request(ctx!.app).get(`/api/v1/risks/${riskId}`);
    expect(riskCleared.body.data.complianceLinks).toEqual([]);

    // evidenceId from first sync should stay soft-deleted; no conflict on re-add
    expect(evidenceId).toBeTruthy();
  });

  it("syncs incident linked controls bidirectionally with control evidence", async () => {
    const incident = await request(ctx!.app)
      .post("/api/v1/incidents")
      .send({
        title: "Linked control incident",
        description: "Incident used for compliance sync",
        priority: "P3",
      });
    expect(incident.status).toBe(201);
    const incidentId = incident.body.data.id as string;

    const linked = await request(ctx!.app)
      .put(`/api/v1/incidents/${incidentId}/compliance-links`)
      .send({
        links: [{ toolkitId: toolkit, clauseIds: ["4.1.a"] }],
      });
    expect(linked.status).toBe(200);
    expect(linked.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    const controls = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    expect(controls.status).toBe(200);
    const leafId = controls.body.data.items[0].id as string;

    const evidence = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(evidence.status).toBe(200);
    expect(evidence.body.data.total).toBe(1);
    expect(evidence.body.data.items[0]).toMatchObject({
      evidenceType: "incident-management",
      relatedIncidentId: incidentId,
    });
    const evidenceId = evidence.body.data.items[0].id as string;

    const unlinked = await request(ctx!.app)
      .put(`/api/v1/incidents/${incidentId}/compliance-links`)
      .send({ links: [] });
    expect(unlinked.status).toBe(200);

    const afterUnlink = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(afterUnlink.body.data.total).toBe(0);

    const fromCompliance = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "incident-management",
        relatedIncidentId: incidentId,
      });
    expect(fromCompliance.status).toBe(201);

    const incidentAfter = await request(ctx!.app).get(
      `/api/v1/incidents/${incidentId}`
    );
    expect(incidentAfter.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    await request(ctx!.app).delete(
      `/api/v1/compliance/controls/${leafId}/control-evidence/${fromCompliance.body.data.id}`
    );
    const incidentCleared = await request(ctx!.app).get(
      `/api/v1/incidents/${incidentId}`
    );
    expect(incidentCleared.body.data.complianceLinks).toEqual([]);

    expect(evidenceId).toBeTruthy();
  });

  it("syncs ofi linked controls bidirectionally with control evidence", async () => {
    const ofi = await request(ctx!.app)
      .post("/api/v1/ofi")
      .send({
        title: "Linked control OFI",
        opportunityForImprovement: "OFI used for compliance sync",
        ownerId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        businessUnitId: "cccccccccccccccccccccccc",
      });
    expect(ofi.status).toBe(201);
    const ofiId = ofi.body.data.id as string;

    const linked = await request(ctx!.app)
      .put(`/api/v1/ofi/${ofiId}/compliance-links`)
      .send({
        links: [{ toolkitId: toolkit, clauseIds: ["4.1.a"] }],
      });
    expect(linked.status).toBe(200);
    expect(linked.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    const controls = await request(ctx!.app).get(
      `/api/v1/compliance/toolkits/${toolkitPath}/controls?search=External`
    );
    expect(controls.status).toBe(200);
    const leafId = controls.body.data.items[0].id as string;

    const evidence = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(evidence.status).toBe(200);
    expect(evidence.body.data.total).toBe(1);
    expect(evidence.body.data.items[0]).toMatchObject({
      evidenceType: "cip",
      relatedCipId: ofiId,
    });
    const evidenceId = evidence.body.data.items[0].id as string;

    const unlinked = await request(ctx!.app)
      .put(`/api/v1/ofi/${ofiId}/compliance-links`)
      .send({ links: [] });
    expect(unlinked.status).toBe(200);

    const afterUnlink = await request(ctx!.app).get(
      `/api/v1/compliance/controls/${leafId}/control-evidence`
    );
    expect(afterUnlink.body.data.total).toBe(0);

    const fromCompliance = await request(ctx!.app)
      .post(`/api/v1/compliance/controls/${leafId}/control-evidence`)
      .send({
        evidenceType: "cip",
        relatedCipId: ofiId,
      });
    expect(fromCompliance.status).toBe(201);

    const ofiAfter = await request(ctx!.app).get(`/api/v1/ofi/${ofiId}`);
    expect(ofiAfter.body.data.complianceLinks).toEqual([
      { toolkitId: toolkit, clauseIds: ["4.1.a"] },
    ]);

    await request(ctx!.app).delete(
      `/api/v1/compliance/controls/${leafId}/control-evidence/${fromCompliance.body.data.id}`
    );
    const ofiCleared = await request(ctx!.app).get(`/api/v1/ofi/${ofiId}`);
    expect(ofiCleared.body.data.complianceLinks).toEqual([]);

    expect(evidenceId).toBeTruthy();
  });
});
