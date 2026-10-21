import { describe, expect, it, vi } from "vitest";
import { createLicenceRequestService } from "../src/modules/licence-requests/services/licence-request.service";
import type { LicenceRequestRepository } from "../src/modules/licence-requests/repositories/licence-request.repository";
import type { LicenceRequest } from "../src/modules/licence-requests/types";
import type { EmailSystem } from "../src/infrastructure/queue";
import type { SecurityIdentity } from "../src/security";

const identity: SecurityIdentity = {
  subjectId: "user-1",
  organizationId: "org-1",
  email: "admin@acme.example",
};

const pendingRequest: LicenceRequest = {
  id: "lr-1",
  reference: "LR-7",
  organizationId: "org-1",
  requestedBy: "user-1",
  superUser: 0,
  users: 3,
  groups: 0,
  complianceTools: [],
  additionalModules: ["CRM"],
  message: "",
  status: "Pending",
  grantedBy: null,
  grantedOn: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function fakeRepository() {
  const state: LicenceRequest[] = [{ ...pendingRequest }];
  const repository = {
    createPending: vi.fn(async () => ({ ...state[0]! })),
    markGranted: vi.fn(async (id: string, grantedBy: string) => ({
      ...state[0]!,
      id,
      status: "Granted" as const,
      grantedBy,
      grantedOn: new Date(),
    })),
    listByOrganization: vi.fn(async (organizationId: string) => ({
      items: state.filter((row) => row.organizationId === organizationId),
      total: state.length,
      page: 1,
      pageSize: 20,
    })),
    findByIdForOrganization: vi.fn(async () => state[0]!),
  };
  return repository as unknown as LicenceRequestRepository & typeof repository;
}

function fakeEmail() {
  const sent: Array<{ to: unknown; subject: string; category?: string }> = [];
  const email = {
    sendTransactional: vi.fn(async (input: (typeof sent)[number]) => {
      sent.push(input);
      return { mode: "direct" as const, accepted: [] };
    }),
  };
  return { email: email as unknown as EmailSystem, sent };
}

const recipients = {
  listSuperAdminEmails: vi.fn(async () => ["admin@acme.example"]),
  getOrganisationName: vi.fn(async () => "Acme Ltd"),
};

describe("createLicenceRequestService", () => {
  it("records LR- reference, auto-grants, and sends all emails", async () => {
    const repository = fakeRepository();
    const { email, sent } = fakeEmail();
    const allocateLicences = vi.fn(async () => ({ id: "org-1" }) as never);
    const service = createLicenceRequestService({
      repository,
      allocation: { allocateLicences },
      email,
      supportEmails: ["support@imssystems.tech"],
      recipients,
    });

    const result = await service.create(identity, {
      users: 3,
      additionalModules: ["CRM"],
    });

    expect(repository.createPending).toHaveBeenCalledOnce();
    expect(allocateLicences).toHaveBeenCalledOnce();
    expect(repository.markGranted).toHaveBeenCalledWith("lr-1", "user-1");
    expect(result.request.reference).toBe("LR-7");
    expect(result.request.status).toBe("Granted");
    // support alert + received confirmation + processed notice
    expect(sent).toHaveLength(3);
    expect(sent[0]?.to).toEqual(["support@imssystems.tech"]);
    expect(sent[0]?.subject).toContain("LR-7");
    expect(sent[2]?.subject).toContain("granted");
  });

  it("leaves the record Pending and rethrows when allocation fails", async () => {
    const repository = fakeRepository();
    const { email, sent } = fakeEmail();
    const service = createLicenceRequestService({
      repository,
      allocation: {
        allocateLicences: vi.fn(async () => {
          throw new Error("Stripe upgrade failed");
        }),
      },
      email,
      supportEmails: ["support@imssystems.tech"],
      recipients,
    });

    await expect(
      service.create(identity, { users: 1 })
    ).rejects.toThrow("Stripe upgrade failed");
    expect(repository.markGranted).not.toHaveBeenCalled();
    // Support was still alerted on submission.
    expect(sent.some((row) => row.category === "system")).toBe(true);
    expect(sent.some((row) => row.subject.includes("granted"))).toBe(false);
  });

  it("rejects empty requests before creating a record", async () => {
    const repository = fakeRepository();
    const service = createLicenceRequestService({
      repository,
      allocation: { allocateLicences: vi.fn(async () => ({}) as never) },
    });

    await expect(service.create(identity, {})).rejects.toThrow(
      "Request at least one licence seat, toolkit, or module"
    );
    expect(repository.createPending).not.toHaveBeenCalled();
  });

  it("lists requests scoped to the identity organisation", async () => {
    const repository = fakeRepository();
    const service = createLicenceRequestService({
      repository,
      allocation: { allocateLicences: vi.fn(async () => ({}) as never) },
    });

    const page = await service.list(identity, {});
    expect(repository.listByOrganization).toHaveBeenCalledWith("org-1", {});
    expect(page.items[0]?.reference).toBe("LR-7");
  });
});
