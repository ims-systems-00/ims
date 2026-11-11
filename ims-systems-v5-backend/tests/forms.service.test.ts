import { describe, expect, it, vi } from "vitest";
import { createFormService } from "../src/modules/forms/services/form.service";
import type { Form, FormElement } from "../src/modules/forms/types";
import type { SecurityIdentity } from "../src/security";

const identity = {
  subjectId: "user-basic",
  organizationId: "org1",
} as SecurityIdentity;

function makeForm(overrides: Partial<Form> = {}): Form {
  return {
    id: "form1",
    organizationId: "org1",
    title: "Staff check",
    description: "",
    status: "published",
    theme: {
      foregroundColor: "#111",
      backgroundColor: "#fff",
      accentColor: "#2563eb",
    },
    usagesType: null,
    availableForStandards: [],
    collaboration: [],
    submissionCount: 0,
    createdBy: "admin1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeService(opts: {
  form: Form;
  elements?: FormElement[];
  allow?: (action: string) => boolean;
}) {
  const allow = opts.allow ?? (() => true);
  const authorizer = {
    allow: vi.fn(async ({ action }: { action: string }) => allow(action)),
  };
  const forms = {
    findById: vi.fn(async () => opts.form),
    incrementSubmissionCount: vi.fn(async () => undefined),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
    restore: vi.fn(),
  };
  const elements = {
    listOrdered: vi.fn(async () => opts.elements ?? []),
    createManySequential: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    reorder: vi.fn(),
    hardDelete: vi.fn(),
  };
  const submissions = {
    create: vi.fn(async (_org: string, formId: string, submittedBy: string) => ({
      id: "sub1",
      organizationId: "org1",
      formId,
      submittedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    list: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    hardDelete: vi.fn(),
  };
  const responses = {
    createMany: vi.fn(async () => []),
    listBySubmission: vi.fn(async () => []),
    replaceForSubmission: vi.fn(),
  };
  const users = {
    findIdentitySummariesByIds: vi.fn(async () => [
      {
        id: "user-basic",
        name: "Basic User",
        email: "basic@example.com",
      },
    ]),
  };

  const service = createFormService({
    forms: forms as never,
    elements: elements as never,
    submissions: submissions as never,
    responses: responses as never,
    authorizer: authorizer as never,
    users: users as never,
  });

  return { service, authorizer, submissions, forms };
}

describe("form createSubmission share security", () => {
  it("lets any org member with read submit a published form", async () => {
    const { service, authorizer, submissions } = makeService({
      form: makeForm({ status: "published" }),
      allow: (action) => action === "read",
    });

    const result = await service.createSubmission(identity, "form1", {
      responses: [],
    });

    expect(authorizer.allow).toHaveBeenCalledWith(
      expect.objectContaining({ action: "read", resourceType: "forms" })
    );
    expect(submissions.create).toHaveBeenCalledWith(
      "org1",
      "form1",
      "user-basic",
      expect.any(Object)
    );
    expect(result.id).toBe("sub1");
  });

  it("rejects submissions for draft forms", async () => {
    const { service, submissions } = makeService({
      form: makeForm({ status: "draft" }),
    });

    await expect(
      service.createSubmission(identity, "form1", { responses: [] })
    ).rejects.toThrow(/Only published forms/);
    expect(submissions.create).not.toHaveBeenCalled();
  });

  it("rejects submissions when the caller lacks forms read", async () => {
    const { service, submissions } = makeService({
      form: makeForm({ status: "published" }),
      allow: () => false,
    });

    await expect(
      service.createSubmission(identity, "form1", { responses: [] })
    ).rejects.toThrow(/permission/);
    expect(submissions.create).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    const { service } = makeService({
      form: makeForm({ status: "published" }),
    });

    await expect(
      service.createSubmission(null, "form1", { responses: [] })
    ).rejects.toThrow();
  });
});
