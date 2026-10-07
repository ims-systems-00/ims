import type { Authorizer, SecurityIdentity } from "../../../security";
import type { FunctionalUnitUsersPort } from "../../users";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { FunctionalUnitRepository } from "../repositories/functional-unit.repository";
import {
  InsufficientGroupLicenceError,
  type DashboardInitPort,
  type GroupLicencePort,
  type InvitationPort,
} from "../ports";
import {
  isBusinessAccessType,
  isComplianceAccessType,
  type CreateFunctionalUnitInput,
  type FunctionalUnit,
  type ListFunctionalUnitsQuery,
  type PaginatedFunctionalUnits,
  type UpdateFunctionalUnitInput,
} from "../types";

const RESOURCE = "functional-units";
const USERS_RESOURCE = "users";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
} {
  if (!identity?.subjectId) {
    throw new UnauthorizedError();
  }
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return { identity, organizationId: identity.organizationId };
}

function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FU-${stamp}-${rand}`;
}

export type FunctionalUnitServiceDeps = {
  repository: FunctionalUnitRepository;
  authorizer: Authorizer;
  groupLicence: GroupLicencePort;
  dashboardInit: DashboardInitPort;
  unitUsers: FunctionalUnitUsersPort;
  invitations: InvitationPort;
};

export function createFunctionalUnitService(deps: FunctionalUnitServiceDeps) {
  const {
    repository,
    authorizer,
    groupLicence,
    dashboardInit,
    unitUsers,
    invitations,
  } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string,
    resourceType: string = RESOURCE
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        resourceType === USERS_RESOURCE
          ? "User does not have permission to manage unit members"
          : "User does not have permission to access functional units"
      );
    }
  }

  function validateTypeFields(input: CreateFunctionalUnitInput): void {
    if (isBusinessAccessType(input.accessType) && !input.operatingLocation) {
      throw new ValidationAppError(
        "Operating location is required for business function types"
      );
    }
    if (isComplianceAccessType(input.accessType) && !input.standards) {
      throw new ValidationAppError(
        "Standards are required for compliance function types"
      );
    }
  }

  async function requireUnit(
    organizationId: string,
    id: string
  ): Promise<FunctionalUnit> {
    const unit = await repository.findById(organizationId, id);
    if (!unit) {
      throw new NotFoundError("Functional unit not found");
    }
    return unit;
  }

  async function syncMemberCount(
    organizationId: string,
    id: string
  ): Promise<FunctionalUnit> {
    const totalMembers = await unitUsers.countMembers(organizationId, id);
    const updated = await repository.setTotalMembers(
      organizationId,
      id,
      totalMembers
    );
    if (!updated) {
      throw new NotFoundError("Functional unit not found");
    }
    return updated;
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateFunctionalUnitInput
    ): Promise<FunctionalUnit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create");
      validateTypeFields(input);

      try {
        await groupLicence.assertCanCreateUnit(actor.organizationId);
      } catch (error) {
        if (error instanceof InsufficientGroupLicenceError) {
          throw new ForbiddenError(error.message);
        }
        throw error;
      }

      const created = await repository.create(actor.organizationId, {
        ...input,
        reference: nextReference(),
      });

      await groupLicence.consumeUnitLicence(actor.organizationId);

      if (isBusinessAccessType(created.accessType)) {
        await dashboardInit.initialiseBusinessFunctionDashboard({
          organizationId: actor.organizationId,
          functionalUnitId: created.id,
          accessType: created.accessType,
        });
      }

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListFunctionalUnitsQuery
    ): Promise<PaginatedFunctionalUnits> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read");
      return repository.list(actor.organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<FunctionalUnit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      return requireUnit(actor.organizationId, id);
    },

    /**
     * Cross-module existence check (org-scoped). No authorizer —
     * callers must already be inside a trusted application flow.
     */
    async existsForOrganization(
      organizationId: string,
      id: string
    ): Promise<boolean> {
      const unit = await repository.findById(organizationId, id);
      return unit != null && unit.deletedAt == null;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateFunctionalUnitInput
    ): Promise<FunctionalUnit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const existing = await requireUnit(actor.organizationId, id);
      if (existing.isSystemDefault) {
        throw new ForbiddenError(
          "System default functional unit cannot be edited"
        );
      }

      if (
        isBusinessAccessType(existing.accessType) &&
        input.operatingLocation !== undefined &&
        input.operatingLocation.length === 0
      ) {
        throw new ValidationAppError("Operating location cannot be empty");
      }
      if (
        isComplianceAccessType(existing.accessType) &&
        input.standards !== undefined &&
        input.standards.length === 0
      ) {
        throw new ValidationAppError("Standards cannot be empty");
      }

      const updated = await repository.update(actor.organizationId, id, input);
      if (!updated) {
        throw new NotFoundError("Functional unit not found");
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "delete", id);

      const existing = await requireUnit(actor.organizationId, id);
      if (existing.isSystemDefault) {
        throw new ForbiddenError(
          "System default functional unit cannot be deleted"
        );
      }

      const deleted = await repository.softDelete(actor.organizationId, id);
      if (!deleted) {
        throw new ConflictError("Functional unit could not be deleted");
      }
    },

    async attachPolicy(
      identity: SecurityIdentity | null | undefined,
      id: string,
      policyId: string
    ): Promise<FunctionalUnit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);

      const updated = await repository.attachPolicy(
        actor.organizationId,
        id,
        policyId
      );
      if (!updated) {
        throw new NotFoundError("Functional unit not found");
      }
      return updated;
    },

    async assignComplianceToolkits(
      identity: SecurityIdentity | null | undefined,
      id: string,
      complianceToolkits: string[]
    ): Promise<FunctionalUnit> {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "manage", id);

      const updated = await repository.assignComplianceToolkits(
        actor.organizationId,
        id,
        complianceToolkits
      );
      if (!updated) {
        throw new NotFoundError("Functional unit not found");
      }
      return updated;
    },

    async listMembers(
      identity: SecurityIdentity | null | undefined,
      id: string
    ) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "read", id);
      await requireUnit(actor.organizationId, id);
      return unitUsers.listMembers(actor.organizationId, id);
    },

    async listEligibleMembers(
      identity: SecurityIdentity | null | undefined,
      id: string,
      search?: string
    ) {
      const actor = requireOrgIdentity(identity);
      // Spec: Add members panel gated on Our iMS Update → map to FU create.
      await assertAllowed(actor.identity, "create", id);
      await requireUnit(actor.organizationId, id);
      // Invitation onboards to the organisation only; existing-user add path
      // does not invite. Port is retained for a future invite-then-assign flow.
      void (await invitations.isAvailable());
      return unitUsers.listEligible(actor.organizationId, id, search);
    },

    async addMembers(
      identity: SecurityIdentity | null | undefined,
      id: string,
      userIds: string[]
    ) {
      const actor = requireOrgIdentity(identity);
      await assertAllowed(actor.identity, "create", id);
      const unit = await requireUnit(actor.organizationId, id);
      if (unit.isSystemDefault) {
        throw new ForbiddenError(
          "Members cannot be managed on the system default functional unit"
        );
      }

      const added = [];
      for (const userId of userIds) {
        const member = await unitUsers.addMember(
          actor.organizationId,
          id,
          userId
        );
        added.push(member);
      }
      const updatedUnit = await syncMemberCount(actor.organizationId, id);
      return { members: added, unit: updatedUnit };
    },

    async removeMember(
      identity: SecurityIdentity | null | undefined,
      id: string,
      userId: string
    ) {
      const actor = requireOrgIdentity(identity);
      // Spec: Remove requires Users Create permission.
      await assertAllowed(actor.identity, "create", id, USERS_RESOURCE);
      const unit = await requireUnit(actor.organizationId, id);
      if (unit.isSystemDefault) {
        throw new ForbiddenError(
          "Members cannot be managed on the system default functional unit"
        );
      }

      const removed = await unitUsers.removeMember(
        actor.organizationId,
        id,
        userId
      );
      if (!removed) {
        throw new NotFoundError("Member not found in this functional unit");
      }
      const updatedUnit = await syncMemberCount(actor.organizationId, id);
      return { unit: updatedUnit };
    },
  };
}

export type FunctionalUnitService = ReturnType<
  typeof createFunctionalUnitService
>;
