/**
 * Organisation application service.
 * Spec: docs/module-specifications/organisation.md (create + view current).
 *
 * Create does not require an existing organisation context.
 * Creator becomes Super Admin and consumes one super-user licence slot.
 * Go-live / licences / branding are out of scope for this foundation.
 */

import {
  DEV_STUB_ORGANIZATION_ID,
  type Authorizer,
  type SecurityIdentity,
} from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../../shared";
import type { OrganisationMembershipRepository } from "../repositories/organisation-membership.repository";
import type { OrganisationRepository } from "../repositories/organisation.repository";
import {
  ORGANISATION_RESOURCE,
  type CreateOrganisationInput,
  type CreateOrganisationResult,
  type Organisation,
  type OrganisationProfile,
} from "../types";

function requireIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  return { identity, subjectId: identity.subjectId };
}

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORG-${stamp}-${rand}`;
}

export type OrganisationServiceDeps = {
  organisations: OrganisationRepository;
  memberships: OrganisationMembershipRepository;
  authorizer: Authorizer;
};

export type OrganisationService = ReturnType<typeof createOrganisationService>;

export function createOrganisationService(deps: OrganisationServiceDeps) {
  const { organisations, memberships, authorizer } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "manage",
    organizationId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: ORGANISATION_RESOURCE,
      organizationId: organizationId ?? identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access organisations"
      );
    }
  }

  async function assertMember(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const membership = await memberships.findByUserAndOrg(
      userId,
      organizationId
    );
    if (!membership) {
      throw new ForbiddenError("You are not a member of this organisation");
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateOrganisationInput
    ): Promise<CreateOrganisationResult> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      await assertAllowed(authed, "create");

      const createdOn = new Date();
      const organisation = await organisations.create({
        reference: nextReference(),
        data: input,
        createdBy: subjectId,
        createdOn,
      });

      const membership = await memberships.create({
        organizationId: organisation.id,
        userId: subjectId,
        role: "Super Admin",
        jobTitle: "",
        createdOn,
      });

      await organisations.incrementSuperUserUsed(organisation.id, 1);
      const refreshed = await organisations.findById(organisation.id);

      return {
        organisation: refreshed ?? organisation,
        membership,
      };
    },

    async getCurrent(
      identity: SecurityIdentity | null | undefined
    ): Promise<OrganisationProfile> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      if (!authed.organizationId) {
        throw new ForbiddenError("Organisation context is required");
      }
      await assertAllowed(authed, "read", authed.organizationId);

      let organisation = await organisations.findById(authed.organizationId);

      // Dev stub tenant: auto-provision when seed:demo has not been run yet.
      if (
        !organisation &&
        authed.organizationId === DEV_STUB_ORGANIZATION_ID
      ) {
        organisation = await organisations.upsertDemoOrganisation({
          id: DEV_STUB_ORGANIZATION_ID,
          reference: "ORG-DEV-001",
          createdBy: "dev-stub-bootstrap",
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        });
        const existingMembership = await memberships.findByUserAndOrg(
          subjectId,
          organisation.id
        );
        if (!existingMembership) {
          await memberships.create({
            organizationId: organisation.id,
            userId: subjectId,
            role: "Super Admin",
            jobTitle: "Platform operator",
            createdOn: new Date("2024-01-01T00:00:00.000Z"),
          });
        }
      }

      if (!organisation) {
        throw new NotFoundError("Organisation not found");
      }

      const membership = await memberships.findByUserAndOrg(
        subjectId,
        organisation.id
      );

      return { ...organisation, membership };
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<OrganisationProfile> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      await assertAllowed(authed, "read", id);
      await assertMember(subjectId, id);

      const organisation = await organisations.findById(id);
      if (!organisation) {
        throw new NotFoundError("Organisation not found");
      }

      const membership = await memberships.findByUserAndOrg(subjectId, id);
      return { ...organisation, membership };
    },

    async listMine(
      identity: SecurityIdentity | null | undefined
    ): Promise<Organisation[]> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      await assertAllowed(authed, "read");

      const ids = await memberships.listOrganizationIdsForUser(subjectId);
      return organisations.findByIds(ids);
    },

    async ensureNotDuplicateMembership(
      userId: string,
      organizationId: string
    ): Promise<void> {
      const existing = await memberships.findByUserAndOrg(
        userId,
        organizationId
      );
      if (existing) {
        throw new ConflictError(
          "User is already a member of the organisation."
        );
      }
    },
  };
}
