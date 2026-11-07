import { describe, expect, it, vi } from "vitest";
import { createPartnershipService } from "../src/modules/partnerships/services/partnership.service";
import type { PartnershipRepository } from "../src/modules/partnerships/repositories/partnership.repository";
import type { Partnership } from "../src/modules/partnerships/types";
import type { EmailSystem } from "../src/infrastructure/queue";
import type { SecurityIdentity } from "../src/security";

const identity: SecurityIdentity = {
  subjectId: "user-1",
  organizationId: "org-1",
  email: "partner@acme.example",
};

const pending: Partnership = {
  id: "partner-1",
  userId: "user-1",
  organizationId: "org-1",
  serviceProvision: "ISO consultancy",
  customerReach: 50,
  website: "https://acme.example",
  standards: "ISO 9001",
  description: "We help care providers",
  status: "Pending",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const applyInput = {
  serviceProvision: "ISO consultancy",
  customerReach: 50,
  website: "https://acme.example",
  standards: "ISO 9001",
  description: "We help care providers",
};

function fakeRepository(existing: Partnership | null = null) {
  const repository = {
    create: vi.fn(async () => ({ ...pending })),
    markAccepted: vi.fn(async (id: string) => ({
      ...pending,
      id,
      status: "iMS Accepted" as const,
    })),
    findById: vi.fn(async () => ({ ...pending, status: "iMS Accepted" as const })),
    findForUserOrOrg: vi.fn(async () => existing),
    findByOrganizationId: vi.fn(async () => existing),
    listByUser: vi.fn(async () => [{ ...pending, status: "iMS Accepted" as const }]),
    findAcceptedByUser: vi.fn(async () => ({
      ...pending,
      status: "iMS Accepted" as const,
    })),
    findAcceptedByOrganization: vi.fn(async () =>
      existing === null
        ? { ...pending, status: "iMS Accepted" as const }
        : existing.status === "iMS Accepted"
          ? existing
          : { ...pending, status: "iMS Accepted" as const }
    ),
  };
  return repository as unknown as PartnershipRepository & typeof repository;
}

function fakeOrganisations(referred: unknown[] = []) {
  return {
    findById: vi.fn(async () => ({ id: "org-1", name: "Acme Ltd" }) as never),
    markAsPartner: vi.fn(async () => ({ id: "org-1" }) as never),
    listByReferralSource: vi.fn(async () => referred as never),
  };
}

function fakeEmail() {
  const sent: Array<{ to: unknown; subject: string; html: string }> = [];
  const email = {
    sendTransactional: vi.fn(async (input: (typeof sent)[number]) => {
      sent.push(input);
      return { mode: "direct" as const, accepted: [] };
    }),
  };
  return { email: email as unknown as EmailSystem, sent };
}

describe("createPartnershipService", () => {
  it("applies, auto-accepts, flags the org, and emails the partner code", async () => {
    const repository = fakeRepository();
    const organisations = fakeOrganisations();
    const { email, sent } = fakeEmail();
    const service = createPartnershipService({
      repository,
      organisations,
      memberships: { isMember: vi.fn(async () => true) },
      email,
      clientUrl: "http://localhost:3000",
    });

    const result = await service.apply(identity, applyInput);

    expect(result.status).toBe("iMS Accepted");
    expect(organisations.markAsPartner).toHaveBeenCalledWith("org-1");
    expect(repository.markAccepted).toHaveBeenCalledWith("partner-1");
    expect(sent).toHaveLength(2);
    expect(sent[1]?.html).toContain("partner-1");
    expect(sent[1]?.html).toContain(
      "http://localhost:3000/onboard/organisation?partnerCode=partner-1"
    );
  });

  it("blocks duplicate enrolment for the same organisation", async () => {
    const repository = fakeRepository({ ...pending });
    const service = createPartnershipService({
      repository,
      organisations: fakeOrganisations(),
      memberships: { isMember: vi.fn(async () => true) },
      clientUrl: "http://localhost:3000",
    });

    await expect(service.apply(identity, applyInput)).rejects.toThrow(
      "already enrolled"
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.findByOrganizationId).toHaveBeenCalledWith("org-1");
  });

  it("requires organisation context and membership", async () => {
    const service = createPartnershipService({
      repository: fakeRepository(),
      organisations: fakeOrganisations(),
      memberships: { isMember: vi.fn(async () => false) },
      clientUrl: "http://localhost:3000",
    });

    await expect(
      service.apply({ subjectId: "user-1" }, applyInput)
    ).rejects.toThrow("without an organisation id");
    await expect(service.apply(identity, applyInput)).rejects.toThrow(
      "not a member"
    );
  });

  it("aggregates referral analytics on the dashboard", async () => {
    const referred = [
      {
        id: "ref-1",
        name: "Referred One",
        createdAt: new Date(),
        isCustomer: true,
        licences: {
          superUser: { allocated: 2, used: 1 },
          users: { allocated: 10, used: 4 },
          groups: { allocated: 3, used: 1 },
          complianceTools: ["ISO 9001", "DSPT"],
          additionalModules: ["CRM"],
        },
      },
      {
        id: "ref-2",
        name: "Referred Two",
        createdAt: new Date(),
        isCustomer: false,
        licences: {
          superUser: { allocated: 1, used: 0 },
          users: { allocated: 5, used: 0 },
          groups: { allocated: 1, used: 0 },
          complianceTools: ["ISO 9001"],
          additionalModules: [],
        },
      },
    ];
    const service = createPartnershipService({
      repository: fakeRepository(),
      organisations: fakeOrganisations(referred),
      memberships: { isMember: vi.fn(async () => true) },
      clientUrl: "http://localhost:3000",
    });

    const dashboard = await service.dashboard(identity);

    expect(dashboard.partnerCode).toBe("partner-1");
    expect(dashboard.stats).toEqual({
      organisations: 2,
      groups: 4,
      users: 15,
      superUsers: 3,
      crmModules: 1,
    });
    expect(dashboard.complianceBreakdown).toEqual([
      { toolkit: "ISO 9001", count: 2 },
      { toolkit: "DSPT", count: 1 },
    ]);
    expect(dashboard.organisations.map((org) => org.name)).toEqual([
      "Referred One",
      "Referred Two",
    ]);
  });
});
