import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY, type Authorizer } from "../src/security";
import { ValidationAppError } from "../src/shared";
import type {
  AslEmailPort,
  AslFilesPort,
  AslIncidentPort,
  AslNotificationPort,
  AslOrgPort,
  AslTaskPort,
} from "../src/modules/supplier/ports";
import type { AslSettingsRepository } from "../src/modules/supplier/repositories/asl-settings.repository";
import type { AslSupplierRepository } from "../src/modules/supplier/repositories/asl-supplier.repository";
import { createAslSupplierService } from "../src/modules/supplier/services/asl-supplier.service";
import { signUploadToken } from "../src/modules/supplier/lib/tokens";
import {
  DEFAULT_ASL_CRITERIA,
  DEFAULT_ASL_INTERVAL,
  type AslSettings,
  type AslSupplier,
} from "../src/modules/supplier/types";

const TOKEN_SECRET = "test-asl-secret";
const ORG = DEV_STUB_IDENTITY.organizationId!;

function makeSettings(overrides: Partial<AslSettings> = {}): AslSettings {
  return {
    id: "settings1",
    organizationId: ORG,
    lead: 30,
    follow: 7,
    esc: 14,
    from: "asl@example.com",
    interval: { ...DEFAULT_ASL_INTERVAL },
    criteria: [...DEFAULT_ASL_CRITERIA],
    updatedBy: null,
    updatedOn: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<AslSupplier> = {}): AslSupplier {
  return {
    id: "aaaaaaaaaaaaaaaaaaaaaaaa",
    organizationId: ORG,
    reference: "ASL-1",
    name: "Acme Materials",
    cat: "Raw materials",
    crit: "Standard",
    status: "Prospective",
    contact: "Jane",
    email: "jane@acme.example",
    stds: ["ISO 9001"],
    scope: "Supply of materials",
    reqs: "PO terms",
    appby: "",
    appon: null,
    docs: [
      {
        id: "doc1",
        type: "Insurance (PL/EL)",
        exp: "2099-01-01",
        ref: "POL-1",
        req: true,
        chased: null,
      },
    ],
    evals: [],
    comms: [],
    trail: [],
    createdBy: DEV_STUB_IDENTITY.subjectId,
    createdOn: "2025-01-01T00:00:00.000Z",
    updatedBy: null,
    updatedOn: null,
    deletedAt: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("AslSupplierService", () => {
  let suppliers: AslSupplierRepository;
  let settings: AslSettingsRepository;
  let authorizer: Authorizer;
  let email: AslEmailPort;
  let files: AslFilesPort;
  let tasks: AslTaskPort;
  let incidents: AslIncidentPort;
  let org: AslOrgPort;
  let notifications: AslNotificationPort;
  let service: ReturnType<typeof createAslSupplierService>;
  let store: Map<string, AslSupplier>;
  let currentSettings: AslSettings;

  beforeEach(() => {
    store = new Map();
    currentSettings = makeSettings();
    authorizer = {
      allow: vi.fn(async () => true),
      assert: vi.fn(async () => undefined),
    } as unknown as Authorizer;
    email = { send: vi.fn(async () => undefined) };
    files = {
      createViewUrl: vi.fn(async () => "https://files.example/view"),
      writeStoredFile: vi.fn(async () => undefined),
    };
    tasks = { createEscalationTask: vi.fn(async () => ({ id: "task1" })) };
    incidents = {
      createLowScoreIncident: vi.fn(async () => ({ id: "inc1" })),
    };
    org = {
      getOrganizationName: vi.fn(async () => "Test Org"),
    };
    notifications = { notifyEscalation: vi.fn(async () => undefined) };

    suppliers = {
      create: vi.fn(async (_orgId, input) => {
        const row = makeSupplier({
          ...input,
          id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        } as Partial<AslSupplier>);
        store.set(row.id, row);
        return row;
      }),
      findById: vi.fn(async (_orgId, id) => store.get(id) ?? null),
      replace: vi.fn(async (_orgId, id, next) => {
        store.set(id, next);
        return next;
      }),
      list: vi.fn(async () => ({
        items: [...store.values()],
        total: store.size,
        page: 1,
        pageSize: 50,
      })),
      listAll: vi.fn(async () => [...store.values()]),
      softDelete: vi.fn(async () => true),
      listOrganizationIds: vi.fn(async () => [ORG]),
    } as unknown as AslSupplierRepository;

    settings = {
      getOrCreate: vi.fn(async () => currentSettings),
      update: vi.fn(async (_orgId, input) => {
        currentSettings = { ...currentSettings, ...input } as AslSettings;
        return currentSettings;
      }),
    } as unknown as AslSettingsRepository;

    service = createAslSupplierService({
      suppliers,
      settings,
      authorizer,
      email,
      files,
      tasks,
      incidents,
      org,
      notifications,
      tokenSecret: TOKEN_SECRET,
      publicApiBaseUrl: "http://api.example",
      clientUrl: "http://app.example",
    });
  });

  it("creates prospective then approves on strong evaluation", async () => {
    const created = await service.create(DEV_STUB_IDENTITY, {
      name: "Acme Materials",
      email: "jane@acme.example",
      crit: "Standard",
    });
    expect(created.status).toBe("Prospective");
    store.set(created.id, created);

    const approved = await service.addEvaluation(
      DEV_STUB_IDENTITY,
      created.id,
      {
        scores: {
          quality: 4,
          delivery: 4,
          hse: 4,
          resp: 4,
          comm: 4,
        },
      }
    );
    expect(approved.status).toBe("Approved");
    expect(approved.appby).toBeTruthy();
    expect(approved.appon).toBeTruthy();
    expect(approved.evals[0]?.score).toBe(4);
  });

  it("moves approved supplier to Conditional when mandatory docs expired", async () => {
    const supplier = makeSupplier({
      status: "Approved",
      appby: "QA",
      appon: "2025-01-01",
      crit: "Critical",
      docs: [
        {
          id: "doc1",
          type: "Insurance (PL/EL)",
          exp: "2000-01-01",
          ref: "old",
          req: true,
          chased: null,
        },
      ],
      evals: [
        {
          id: "e1",
          date: "2026-01-01",
          by: "QA",
          scores: { quality: 4, delivery: 4, hse: 4, resp: 4, comm: 4 },
          note: "",
          score: 4,
        },
      ],
    });
    store.set(supplier.id, supplier);

    const updated = await service.update(DEV_STUB_IDENTITY, supplier.id, {
      scope: "Updated scope",
    });
    expect(updated.status).toBe("Conditional");
    expect(updated.trail.some((t) => /Conditional/.test(t.what))).toBe(true);
  });

  it("logs comms on notify", async () => {
    const supplier = makeSupplier({ status: "Approved", appby: "QA", appon: "2025-01-01" });
    store.set(supplier.id, supplier);

    const results = await service.notify(DEV_STUB_IDENTITY, [supplier.id]);
    expect(results[0]?.sent).toBe(true);
    expect(email.send).toHaveBeenCalled();
    const saved = store.get(supplier.id)!;
    expect(saved.comms.length).toBe(1);
    expect(saved.comms[0]?.subject).toBeTruthy();
  });

  it("rejects settings criteria that do not sum to 100", async () => {
    await expect(
      service.updateSettings(DEV_STUB_IDENTITY, {
        criteria: [{ k: "a", n: "A", w: 40 }],
      })
    ).rejects.toBeInstanceOf(ValidationAppError);
  });

  it("public upload updates document via token", async () => {
    const supplier = makeSupplier({
      status: "Approved",
      appby: "QA",
      appon: "2025-01-01",
      docs: [],
    });
    store.set(supplier.id, supplier);
    const token = await signUploadToken(TOKEN_SECRET, {
      organizationId: ORG,
      supplierId: supplier.id,
    });

    const updated = await service.publicUpload(token, {
      type: "Insurance (PL/EL)",
      exp: "2099-06-01",
      ref: "NEW-POL",
      storageInfo: {
        Name: "insurance.pdf",
        Key: "org/ins.pdf",
        Bucket: "ims-files",
        Size: 1200,
      },
    });
    expect(updated.docs[0]?.type).toBe("Insurance (PL/EL)");
    expect(updated.docs[0]?.file?.Key).toBe("org/ins.pdf");
    expect(
      updated.comms.some(
        (c) => c.type === "Upload" && /Received/i.test(c.outcome)
      )
    ).toBe(true);
  });

  it("creates incident when evaluation score is below 3", async () => {
    const supplier = makeSupplier({
      status: "Approved",
      appby: "QA",
      appon: "2025-01-01",
      crit: "Standard",
      docs: [
        {
          id: "doc1",
          type: "Insurance (PL/EL)",
          exp: "2099-01-01",
          ref: "P",
          req: true,
          chased: null,
        },
      ],
    });
    store.set(supplier.id, supplier);

    const next = await service.addEvaluation(DEV_STUB_IDENTITY, supplier.id, {
      scores: {
        quality: 2,
        delivery: 2,
        hse: 2,
        resp: 2,
        comm: 2,
      },
      note: "Poor delivery",
    });
    expect(next.evals.at(-1)?.score).toBe(2);
    expect(incidents.createLowScoreIncident).toHaveBeenCalled();
  });
});
