/**
 * Organisation application service.
 * Spec: docs/module-specifications/organisation.md
 * Onboard: docs/module-specifications/organisation-onboarding.md
 *
 * Create does not require an existing organisation context.
 * Creator becomes Super Admin and consumes one super-user licence slot.
 * Go Live activates customer status, licence pools, and system dates.
 */

import {
  DEV_STUB_ORGANIZATION_ID,
  type Authorizer,
  type SecurityIdentity,
} from "../../../security";
import type { MembershipProjection } from "../../../security/openfga/membership-projection";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import {
  NoOpOrganisationGoLiveSideEffectsAdapter,
  type OrganisationGoLiveSideEffectsPort,
} from "../ports";
import type { OrganisationMembershipRepository } from "../repositories/organisation-membership.repository";
import type { OrganisationRepository } from "../repositories/organisation.repository";
import {
  ORGANISATION_RESOURCE,
  type CreateOrganisationInput,
  type CreateOrganisationResult,
  type GoLiveOrganisationInput,
  type GoLiveOrganisationResult,
  type Organisation,
  type OrganisationProfile,
  type RequestOrganisationLicenceInput,
  type UpdateDocumentReviewRemindersInput,
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
  membershipProjection?: MembershipProjection;
  goLiveSideEffects?: OrganisationGoLiveSideEffectsPort;
};

export type OrganisationService = ReturnType<typeof createOrganisationService>;

export function createOrganisationService(deps: OrganisationServiceDeps) {
  const { organisations, memberships, authorizer } = deps;
  const membershipProjection = deps.membershipProjection;
  const goLiveSideEffects =
    deps.goLiveSideEffects ?? new NoOpOrganisationGoLiveSideEffectsAdapter();

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

  async function assertSuperAdmin(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const membership = await memberships.findByUserAndOrg(
      userId,
      organizationId
    );
    if (!membership || membership.role !== "Super Admin") {
      throw new ForbiddenError(
        "Only a Super Admin can activate this organisation"
      );
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

      if (membershipProjection) {
        await membershipProjection.onMembershipCreated({
          userId: subjectId,
          organizationId: organisation.id,
          role: "Super Admin",
        });
      }

      await organisations.incrementSuperUserUsed(organisation.id, 1);
      const refreshed = await organisations.findById(organisation.id);

      return {
        organisation: refreshed ?? organisation,
        membership,
      };
    },

    async goLive(
      identity: SecurityIdentity | null | undefined,
      organizationId: string,
      input: GoLiveOrganisationInput
    ): Promise<GoLiveOrganisationResult> {
      const { identity: authed, subjectId } = requireIdentity(identity);

      if (!authed.organizationId || authed.organizationId !== organizationId) {
        throw new ForbiddenError(
          "You don't have permission to go live for this organisation."
        );
      }

      await assertAllowed(authed, "manage", organizationId);
      await assertSuperAdmin(subjectId, organizationId);

      const existing = await organisations.findById(organizationId);
      if (!existing) {
        throw new NotFoundError("Organisation not found");
      }
      if (existing.isCustomer) {
        throw new ConflictError(
          "This organisation already has an iMS setup."
        );
      }
      if (input.superUser < existing.licences.superUser.used) {
        throw new ValidationAppError(
          "Super Admin licence allocation cannot be below seats already used."
        );
      }

      const systemStart = new Date();
      const systemEnd = new Date(systemStart.getTime() + 86400000 * 365);
      const paymentStatus =
        input.paymentType === "Monthly invoice" ? "Subscribed" : "Trial";

      const activated = await organisations.applyGoLive({
        id: organizationId,
        data: input,
        paymentStatus,
        systemStart,
        systemEnd,
      });
      if (!activated) {
        throw new ConflictError(
          "This organisation already has an iMS setup."
        );
      }

      const toolkitNames = input.complianceTools ?? [];
      try {
        await goLiveSideEffects.provisionComplianceToolkits({
          organizationId,
          actorId: subjectId,
          toolkitNames,
        });
      } catch {
        // Best-effort: org is already customer; toolkits can be provisioned later.
      }

      let paymentSession: { url: string } | null = null;
      if (input.paymentType === "Card") {
        try {
          paymentSession = await goLiveSideEffects.createCardCheckoutSession({
            organizationId,
            actorId: subjectId,
          });
        } catch {
          paymentSession = null;
        }
      }

      try {
        await goLiveSideEffects.notifyGoLive({
          organizationId,
          actorId: subjectId,
          paymentType: input.paymentType,
          licences: {
            superUser: input.superUser,
            users: input.users,
            groups: input.groups,
            complianceTools: toolkitNames,
          },
        });
      } catch {
        // Best-effort notifications.
      }

      const organisation =
        (await organisations.findById(organizationId)) ?? activated;

      return { organisation, paymentSession };
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
          if (membershipProjection) {
            await membershipProjection.onMembershipCreated({
              userId: subjectId,
              organizationId: organisation.id,
              role: "Super Admin",
            });
          }
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

    /**
     * Demo-grade licence request: apply seats/toolkits immediately (no Stripe).
     * Full License Request module (emails, LR refs, admin approve) comes later.
     */
    async requestLicence(
      identity: SecurityIdentity | null | undefined,
      input: RequestOrganisationLicenceInput
    ): Promise<OrganisationProfile> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      if (!authed.organizationId) {
        throw new ForbiddenError("Organisation context is required");
      }
      await assertAllowed(authed, "manage", authed.organizationId);
      await assertMember(subjectId, authed.organizationId);

      const hasSeats =
        (input.superUser ?? 0) > 0 ||
        (input.users ?? 0) > 0 ||
        (input.groups ?? 0) > 0;
      const hasTools = (input.complianceTools?.length ?? 0) > 0;
      const hasModules = (input.additionalModules?.length ?? 0) > 0;
      if (!hasSeats && !hasTools && !hasModules) {
        throw new ValidationAppError(
          "Request at least one licence seat, toolkit, or module"
        );
      }

      const updated = await organisations.applyLicenceRequest(
        authed.organizationId,
        {
          superUser: input.superUser ?? 0,
          users: input.users ?? 0,
          groups: input.groups ?? 0,
          complianceTools: input.complianceTools ?? [],
          additionalModules: input.additionalModules ?? [],
        }
      );
      if (!updated) {
        throw new NotFoundError("Organisation not found");
      }

      const membership = await memberships.findByUserAndOrg(
        subjectId,
        updated.id
      );
      return { ...updated, membership };
    },

    async updateDocumentReviewReminders(
      identity: SecurityIdentity | null | undefined,
      input: UpdateDocumentReviewRemindersInput
    ): Promise<OrganisationProfile> {
      const { identity: authed, subjectId } = requireIdentity(identity);
      if (!authed.organizationId) {
        throw new ForbiddenError("Organisation context is required");
      }
      await assertAllowed(authed, "manage", authed.organizationId);
      await assertMember(subjectId, authed.organizationId);

      const updated = await organisations.updateDocumentReviewReminders(
        authed.organizationId,
        input.documentReviewReminderOffsets
      );
      if (!updated) {
        throw new NotFoundError("Organisation not found");
      }

      const membership = await memberships.findByUserAndOrg(
        subjectId,
        updated.id
      );
      return { ...updated, membership };
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
