import { describe, expect, it, vi } from "vitest";
import { DEV_STUB_IDENTITY } from "../src/security";
import { createOrganisationService } from "../src/modules/organisation/services/organisation.service";
import type { OrganisationRepository } from "../src/modules/organisation/repositories/organisation.repository";
import type { OrganisationMembershipRepository } from "../src/modules/organisation/repositories/organisation-membership.repository";
import { ForbiddenError } from "../src/shared";

const ACME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const GLOBEX = "bbbbbbbbbbbbbbbbbbbbbbbb";

function setup(
  options: { organizationId: string; isDefault: boolean; joinedAt: Date }[],
  membership: unknown = { accessStatus: "Active" }
) {
  const organisations = {
    // Mongo `$in` order is arbitrary — return reversed to prove we re-order.
    findByIds: vi.fn(async (ids: string[]) =>
      [...ids].reverse().map((id) => ({ id, name: id }))
    ),
  } as unknown as OrganisationRepository;
  const memberships = {
    listLoginOptionsForUser: vi.fn().mockResolvedValue(options),
    findByUserAndOrg: vi.fn().mockResolvedValue(membership),
    setDefaultForUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as OrganisationMembershipRepository;
  const service = createOrganisationService({
    organisations,
    memberships,
    authorizer: { allow: vi.fn().mockResolvedValue(true) },
  });
  return { service, memberships };
}

describe("Organisation default (post-login)", () => {
  it("flags the starred organisation as default, in join order", async () => {
    const { service } = setup([
      { organizationId: ACME, isDefault: false, joinedAt: new Date(1) },
      { organizationId: GLOBEX, isDefault: true, joinedAt: new Date(2) },
    ]);
    const rows = await service.listMine(DEV_STUB_IDENTITY);
    expect(rows.map((r) => [r.id, r.isDefault])).toEqual([
      [ACME, false],
      [GLOBEX, true],
    ]);
  });

  it("falls back to the first-joined organisation", async () => {
    const { service } = setup([
      { organizationId: ACME, isDefault: false, joinedAt: new Date(1) },
      { organizationId: GLOBEX, isDefault: false, joinedAt: new Date(2) },
    ]);
    const rows = await service.listMine(DEV_STUB_IDENTITY);
    expect(rows.filter((r) => r.isDefault).map((r) => r.id)).toEqual([ACME]);
  });

  it("stores the default for a member", async () => {
    const { service, memberships } = setup([]);
    await expect(
      service.setDefault(DEV_STUB_IDENTITY, GLOBEX)
    ).resolves.toEqual({ organizationId: GLOBEX });
    expect(memberships.setDefaultForUser).toHaveBeenCalledWith(
      DEV_STUB_IDENTITY.subjectId,
      GLOBEX
    );
  });

  it("refuses an organisation the user does not belong to", async () => {
    const { service, memberships } = setup([], null);
    await expect(
      service.setDefault(DEV_STUB_IDENTITY, GLOBEX)
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(memberships.setDefaultForUser).not.toHaveBeenCalled();
  });
});
