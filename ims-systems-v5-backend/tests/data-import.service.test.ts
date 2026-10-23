import { describe, expect, it, vi } from "vitest";
import {
  createDataImportService,
  validateDataSet,
  getImportableFields,
  InlineDataImportQueueAdapter,
  type DataImportNotificationPort,
  type DataImportQueuePort,
} from "../src/modules/data-import";
import type { Authorizer } from "../src/security";
import type { SecurityIdentity } from "../src/security";

const identity: SecurityIdentity = {
  subjectId: "507f1f77bcf86cd799439011",
  organizationId: "507f1f77bcf86cd799439012",
  email: "importer@example.com",
};

function allowAllAuthorizer(): Authorizer {
  return {
    allow: vi.fn(async () => true),
  };
}

describe("data-import validation", () => {
  it("exposes required fields for risks", () => {
    const schema = getImportableFields("risks");
    const required = schema.filter((field) => field.isRequired).map((f) => f.path);
    expect(required).toEqual(
      expect.arrayContaining([
        "businessUnitId",
        "title",
        "type",
        "description",
        "likelihood",
        "consequence",
      ])
    );
  });

  it("exposes KPI objective fields including value", () => {
    const schema = getImportableFields("kpiobjectives");
    const paths = schema.map((field) => field.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        "value",
        "targetValue",
        "currentValue",
        "unit",
        "privacy",
        "businessUnitId",
      ])
    );
    expect(schema.find((f) => f.path === "value")?.isRequired).toBe(true);
  });

  it("passes a valid KPI objective sheet", () => {
    const outcome = validateDataSet({
      module: "kpiobjectives",
      dateFormat: "DD/MM/YYYY",
      dataMap: {
        value: "KPI Col",
        targetValue: "Target Col",
        currentValue: "Current Col",
        unit: "Unit Col",
        privacy: "Privacy Col",
      },
      dataSet: [
        {
          "KPI Col": "Reduce incidents by 20%",
          "Target Col": "100",
          "Current Col": "25",
          "Unit Col": "%",
          "Privacy Col": "Organisational",
        },
      ],
    });
    expect(outcome.success).toBe(true);
    expect(outcome.result.every((row) => row.totalError === 0)).toBe(true);
  });

  it("fails when a required cell is empty", () => {
    const outcome = validateDataSet({
      module: "risks",
      dateFormat: "DD/MM/YYYY",
      dataMap: {
        businessUnitId: "507f1f77bcf86cd799439013",
        title: "Title Col",
        type: "Type Col",
        description: "Desc Col",
        likelihood: "Like Col",
        consequence: "Cons Col",
      },
      dataSet: [
        {
          "Title Col": "",
          "Type Col": "Organisational",
          "Desc Col": "Something",
          "Like Col": "3",
          "Cons Col": "2",
        },
      ],
    });
    expect(outcome.success).toBe(false);
    expect(outcome.result.find((r) => r.name === "Risk title")?.totalError).toBe(
      1
    );
  });

  it("passes a valid risk sheet", () => {
    const outcome = validateDataSet({
      module: "risks",
      dateFormat: "DD/MM/YYYY",
      dataMap: {
        businessUnitId: "507f1f77bcf86cd799439013",
        title: "Title Col",
        type: "Type Col",
        description: "Desc Col",
        likelihood: "Like Col",
        consequence: "Cons Col",
      },
      dataSet: [
        {
          "Title Col": "Fire risk",
          "Type Col": "Organisational",
          "Desc Col": "Kitchen fire risk",
          "Like Col": "3",
          "Cons Col": "4",
        },
      ],
    });
    expect(outcome.success).toBe(true);
  });
});

describe("data-import service", () => {
  it("rejects import when re-validation fails", async () => {
    const notifications: DataImportNotificationPort = {
      notifyImportStarted: vi.fn(),
      notifyImportCompleted: vi.fn(),
    };
    const queue: DataImportQueuePort = {
      enqueue: vi.fn(),
    };
    const service = createDataImportService({
      authorizer: allowAllAuthorizer(),
      notifications,
      queue,
    });

    await expect(
      service.startImport(identity, {
        module: "customers",
        dateFormat: "DD/MM/YYYY",
        dataMap: {
          businessUnitId: "507f1f77bcf86cd799439013",
          name: "Name",
          primaryEmail: "Email",
        },
        dataSet: [{ Name: "Acme", Email: "not-an-email" }],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Validation has failed. Please review your data.",
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(notifications.notifyImportStarted).not.toHaveBeenCalled();
  });

  it("queues a job and notifies Super Admins after successful re-validation", async () => {
    const notifications: DataImportNotificationPort = {
      notifyImportStarted: vi.fn(async () => undefined),
      notifyImportCompleted: vi.fn(),
    };
    const enqueue = vi.fn(async () => undefined);
    const service = createDataImportService({
      authorizer: allowAllAuthorizer(),
      notifications,
      queue: { enqueue },
    });

    const result = await service.startImport(identity, {
      module: "customers",
      dateFormat: "DD/MM/YYYY",
      dataMap: {
        businessUnitId: "507f1f77bcf86cd799439013",
        name: "Name",
        primaryEmail: "Email",
      },
      dataSet: [{ Name: "Acme", Email: "ops@acme.test" }],
    });

    expect(result.message).toMatch(/notified once import is complete/i);
    expect(notifications.notifyImportStarted).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledOnce();
    expect(enqueue.mock.calls[0]?.[0]).toMatchObject({
      module: "customers",
      organizationId: identity.organizationId,
      importerId: identity.subjectId,
    });
  });

  it("inline queue runs the migrator without throwing to the caller", async () => {
    const run = vi.fn(async () => undefined);
    const queue = new InlineDataImportQueueAdapter(run);
    await queue.enqueue({
      organizationId: identity.organizationId!,
      importerId: identity.subjectId,
      importerName: "Tester",
      module: "risks",
      dateFormat: "DD/MM/YYYY",
      dataMap: {},
      dataSet: [],
      startedAt: new Date().toISOString(),
    });
    // fire-and-forget — allow microtask flush
    await Promise.resolve();
    expect(run).toHaveBeenCalledOnce();
  });
});
