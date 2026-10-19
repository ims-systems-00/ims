import { describe, expect, it, vi } from "vitest";
import {
  DEV_STUB_IDENTITY,
  DEV_STUB_ORGANIZATION_ID,
} from "../src/security";
import { createOrganisationService } from "../src/modules/organisation/services/organisation.service";
import type { OrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import type { OrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { NotFoundError } from "../src/shared";

describe("Organisation stub auto-provision gate (O-01)", () => {
  it("does not upsert the demo org when auto-provision is disabled", async () => {
    const organisations = {
      findById: vi.fn().mockResolvedValue(null),
      upsertDemoOrganisation: vi.fn(),
    } as unknown as OrganisationRepository;
    const memberships = {
      findByUserAndOrg: vi.fn(),
      create: vi.fn(),
    } as unknown as OrganisationMembershipRepository;
    const authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };

    const service = createOrganisationService({
      organisations,
      memberships,
      authorizer,
      allowStubOrganisationAutoProvision: false,
    });

    await expect(
      service.getCurrent({
        ...DEV_STUB_IDENTITY,
        organizationId: DEV_STUB_ORGANIZATION_ID,
      })
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(organisations.upsertDemoOrganisation).not.toHaveBeenCalled();
  });

  it("upserts the demo org when auto-provision is enabled", async () => {
    const demoOrg = {
      id: DEV_STUB_ORGANIZATION_ID,
      name: "Demo Organisation",
      reference: "ORG-DEV-001",
    };
    const organisations = {
      findById: vi.fn().mockResolvedValue(null),
      upsertDemoOrganisation: vi.fn().mockResolvedValue(demoOrg),
    } as unknown as OrganisationRepository;
    const memberships = {
      findByUserAndOrg: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          userId: DEV_STUB_IDENTITY.subjectId,
          role: "Super Admin",
          organizationId: DEV_STUB_ORGANIZATION_ID,
        }),
      create: vi.fn().mockResolvedValue({
        userId: DEV_STUB_IDENTITY.subjectId,
        role: "Super Admin",
        organizationId: DEV_STUB_ORGANIZATION_ID,
      }),
    } as unknown as OrganisationMembershipRepository;
    const authorizer = {
      allow: vi.fn().mockResolvedValue(true),
    };

    const service = createOrganisationService({
      organisations,
      memberships,
      authorizer,
      allowStubOrganisationAutoProvision: true,
    });

    const result = await service.getCurrent({
      ...DEV_STUB_IDENTITY,
      organizationId: DEV_STUB_ORGANIZATION_ID,
    });

    expect(organisations.upsertDemoOrganisation).toHaveBeenCalled();
    expect(result.id).toBe(DEV_STUB_ORGANIZATION_ID);
  });
});
