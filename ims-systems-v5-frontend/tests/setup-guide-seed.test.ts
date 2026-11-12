import { beforeEach, describe, expect, it, vi } from "vitest";

const listDocumentRepositories = vi.fn();
const listRepoNodes = vi.fn();
const createDocumentRepository = vi.fn();
const createFileNodes = vi.fn();
const uploadFileViaHandler = vi.fn();
const provisionComplianceToolkit = vi.fn();
const listComplianceControls = vi.fn();
const listRisks = vi.fn();
const createRisk = vi.fn();
const listAudits = vi.fn();
const createAudit = vi.fn();
const listFunctionalUnits = vi.fn();

vi.mock("@/modules/document-management/api/document-management", () => ({
  listDocumentRepositories: (...args: unknown[]) =>
    listDocumentRepositories(...args),
  listRepoNodes: (...args: unknown[]) => listRepoNodes(...args),
  createDocumentRepository: (...args: unknown[]) =>
    createDocumentRepository(...args),
  createFileNodes: (...args: unknown[]) => createFileNodes(...args),
}));

vi.mock("@/modules/files", () => ({
  uploadFileViaHandler: (...args: unknown[]) => uploadFileViaHandler(...args),
}));

vi.mock("@/modules/compliance/api/compliance", () => ({
  provisionComplianceToolkit: (...args: unknown[]) =>
    provisionComplianceToolkit(...args),
  listComplianceControls: (...args: unknown[]) =>
    listComplianceControls(...args),
}));

vi.mock("@/modules/risks/api/risks", () => ({
  listRisks: (...args: unknown[]) => listRisks(...args),
  createRisk: (...args: unknown[]) => createRisk(...args),
}));

vi.mock("@/modules/audits/api/audits", () => ({
  listAudits: (...args: unknown[]) => listAudits(...args),
  createAudit: (...args: unknown[]) => createAudit(...args),
}));

vi.mock("@/modules/functional-units/api/functional-units", () => ({
  listFunctionalUnits: (...args: unknown[]) => listFunctionalUnits(...args),
}));

import {
  ensureSetupAudit,
  ensureSetupControl,
  ensureSetupDocument,
  ensureSetupRepository,
  ensureSetupRepositoryCreate,
  ensureSetupRisk,
} from "@/modules/setup-guide/lib/seed-record";

describe("setup guide seed-record", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the create-repository sheet path", () => {
    expect(ensureSetupRepositoryCreate().path).toBe(
      "/documents?tab=repositories&createRepo=1"
    );
  });

  it("reuses preferred repository workspace", async () => {
    const seeded = await ensureSetupRepository({
      ownerId: "user-1",
      preferred: { repositoryId: "repo-1" },
    });
    expect(seeded.path).toBe("/documents/repositories/repo-1");
    expect(listDocumentRepositories).not.toHaveBeenCalled();
  });

  it("creates Policies & Procedures when no repositories exist", async () => {
    listDocumentRepositories.mockResolvedValue({ items: [] });
    createDocumentRepository.mockResolvedValue({ id: "repo-new" });

    const seeded = await ensureSetupRepository({ ownerId: "user-1" });

    expect(createDocumentRepository).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Policies & Procedures" })
    );
    expect(seeded).toEqual({
      repositoryId: "repo-new",
      path: "/documents/repositories/repo-new",
    });
  });

  it("reuses preferred document and opens compliance tab", async () => {
    const seeded = await ensureSetupDocument({
      ownerId: "user-1",
      preferred: { repositoryId: "repo-1", nodeId: "node-1" },
      tab: "compliance-settings",
    });
    expect(seeded).toEqual({
      repositoryId: "repo-1",
      nodeId: "node-1",
      path: "/documents/repositories/repo-1/nodes/node-1?tab=compliance-settings",
    });
    expect(listDocumentRepositories).not.toHaveBeenCalled();
  });

  it("creates a starter policy when no documents exist", async () => {
    listDocumentRepositories.mockResolvedValue({ items: [] });
    createDocumentRepository.mockResolvedValue({ id: "repo-new" });
    uploadFileViaHandler.mockResolvedValue({
      Bucket: "b",
      Key: "k",
      Name: "information-security-policy.txt",
    });
    createFileNodes.mockResolvedValue({
      created: [{ id: "node-new" }],
      skipped: [],
    });

    const seeded = await ensureSetupDocument({ ownerId: "user-1" });

    expect(createDocumentRepository).toHaveBeenCalled();
    expect(uploadFileViaHandler).toHaveBeenCalled();
    expect(createFileNodes).toHaveBeenCalled();
    expect(seeded.path).toBe(
      "/documents/repositories/repo-new/nodes/node-new"
    );
  });

  it("reuses preferred control path", async () => {
    const seeded = await ensureSetupControl({
      preferred: { toolkitName: "ISO 9001", controlId: "ctrl-1" },
    });
    expect(seeded.path).toBe(
      "/compliance/ISO%209001?tab=toolkit&control=ctrl-1"
    );
    expect(listComplianceControls).not.toHaveBeenCalled();
  });

  it("provisions toolkit and opens first unlocked control", async () => {
    provisionComplianceToolkit.mockResolvedValue({});
    listComplianceControls.mockResolvedValue({
      items: [
        { id: "locked", isLocked: true, clause: "4" },
        { id: "leaf", isLocked: false, clause: "4.1" },
      ],
    });

    const seeded = await ensureSetupControl({});

    expect(provisionComplianceToolkit).toHaveBeenCalledWith("ISO 9001");
    expect(seeded).toEqual({
      toolkitName: "ISO 9001",
      controlId: "leaf",
      path: "/compliance/ISO%209001?tab=toolkit&control=leaf",
    });
  });

  it("reuses preferred risk for Analyse coaching", async () => {
    const seeded = await ensureSetupRisk({
      ownerId: "user-1",
      preferred: { riskId: "risk-1" },
    });
    expect(seeded.path).toBe("/risks?risk=risk-1");
    expect(listRisks).not.toHaveBeenCalled();
  });

  it("creates a starter risk when none exist", async () => {
    listRisks.mockResolvedValue({ items: [] });
    createRisk.mockResolvedValue({ id: "risk-new" });

    const seeded = await ensureSetupRisk({ ownerId: "user-1" });

    expect(createRisk).toHaveBeenCalled();
    expect(seeded).toEqual({
      riskId: "risk-new",
      path: "/risks?risk=risk-new",
    });
  });

  it("reuses preferred audit for Assist coaching", async () => {
    const seeded = await ensureSetupAudit({
      auditorId: "user-1",
      preferred: { auditId: "audit-1" },
    });
    expect(seeded.path).toBe("/audits/internal?audit=audit-1");
    expect(listAudits).not.toHaveBeenCalled();
  });

  it("creates a starter audit when none exist", async () => {
    listAudits.mockResolvedValue({ items: [] });
    listFunctionalUnits.mockResolvedValue({
      items: [{ id: "fu-1" }, { id: "fu-2" }],
    });
    createAudit.mockResolvedValue({ items: [{ id: "audit-new" }] });

    const seeded = await ensureSetupAudit({ auditorId: "user-1" });

    expect(createAudit).toHaveBeenCalled();
    expect(seeded).toEqual({
      auditId: "audit-new",
      path: "/audits/internal?audit=audit-new",
    });
  });
});
