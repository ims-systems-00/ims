/**
 * Business Premise application service.
 * Spec: docs/module-specifications/business-premise.md
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { BusinessPremiseFunctionalUnitPort } from "../ports";
import type { BusinessPremiseRepository } from "../repositories/business-premise.repository";
import {
  BUSINESS_PREMISES_RESOURCE,
  PREMISE_LINKABLE_ACCESS_TYPE,
  type AttachFunctionalUnitInput,
  type BusinessPremise,
  type CreateBusinessPremiseInput,
  type ListBusinessPremisesQuery,
  type PaginatedBusinessPremises,
  type UpdateBusinessPremiseInput,
} from "../types";

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

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export type BusinessPremiseServiceDeps = {
  repository: BusinessPremiseRepository;
  authorizer: Authorizer;
  functionalUnits: BusinessPremiseFunctionalUnitPort;
};

export type BusinessPremiseService = ReturnType<
  typeof createBusinessPremiseService
>;

export function createBusinessPremiseService(deps: BusinessPremiseServiceDeps) {
  const { repository, authorizer, functionalUnits } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: string,
    resourceId?: string
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: BUSINESS_PREMISES_RESOURCE,
      resourceId,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Business Premises"
      );
    }
  }

  async function requirePremise(
    organizationId: string,
    id: string
  ): Promise<BusinessPremise> {
    const premise = await repository.findById(organizationId, id);
    if (!premise) {
      throw new NotFoundError("Business Premise not found");
    }
    return premise;
  }

  /**
   * Validate Functional Unit ids exist in-org and are Internal business functions.
   * Spec confirmed meaning: premises associate Internal business-function units.
   */
  async function assertLinkableUnits(
    organizationId: string,
    functionalUnitIds: string[]
  ): Promise<string[]> {
    const ids = uniqueIds(functionalUnitIds);
    if (ids.length === 0) {
      throw new ValidationAppError(
        "At least one Functional Unit is required",
        [{ path: "functionalUnitIds", message: "Required" }]
      );
    }

    const found = await functionalUnits.findByIds(organizationId, ids);
    const foundById = new Map(found.map((unit) => [unit.id, unit]));

    const missing = ids.filter((id) => !foundById.has(id));
    if (missing.length > 0) {
      throw new ValidationAppError("One or more Functional Units were not found", [
        {
          path: "functionalUnitIds",
          message: `Unknown Functional Unit id(s): ${missing.join(", ")}`,
        },
      ]);
    }

    const nonInternal = ids.filter((id) => {
      const unit = foundById.get(id);
      return unit && unit.accessType !== PREMISE_LINKABLE_ACCESS_TYPE;
    });
    if (nonInternal.length > 0) {
      throw new ValidationAppError(
        "Only Internal business function units can be linked to a Business Premise",
        [
          {
            path: "functionalUnitIds",
            message: `Non-linkable Functional Unit id(s): ${nonInternal.join(", ")}`,
          },
        ]
      );
    }

    return ids;
  }

  return {
    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListBusinessPremisesQuery
    ): Promise<PaginatedBusinessPremises> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return repository.list(organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<BusinessPremise> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read", id);
      return requirePremise(organizationId, id);
    },

    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateBusinessPremiseInput
    ): Promise<BusinessPremise> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const functionalUnitIds = await assertLinkableUnits(
        organizationId,
        input.functionalUnitIds
      );

      return repository.create(organizationId, {
        name: input.name,
        location: input.location,
        address: input.address,
        functionalUnitIds,
        createdBy: actor.subjectId,
        createdOn: new Date(),
      });
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateBusinessPremiseInput
    ): Promise<BusinessPremise> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      // Spec / V4: update authorises with Create, not a separate Update action.
      await assertAllowed(actor, "create", id);
      await requirePremise(organizationId, id);

      let functionalUnitIds: string[] | undefined;
      if (input.functionalUnitIds !== undefined) {
        functionalUnitIds = await assertLinkableUnits(
          organizationId,
          input.functionalUnitIds
        );
      }

      const updated = await repository.update(organizationId, id, {
        name: input.name,
        location: input.location,
        address: input.address,
        functionalUnitIds,
        updatedBy: actor.subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("Business Premise not found");
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<void> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete", id);
      await requirePremise(organizationId, id);

      const deleted = await repository.hardDelete(organizationId, id);
      if (!deleted) {
        throw new NotFoundError("Business Premise not found");
      }
    },

    async attachFunctionalUnit(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: AttachFunctionalUnitInput
    ): Promise<BusinessPremise> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      // Spec / V4: attach authorises with Create.
      await assertAllowed(actor, "create", id);

      const existing = await requirePremise(organizationId, id);
      if (existing.functionalUnitIds.includes(input.functionalUnitId)) {
        throw new ConflictError("This Functional Unit is already attached");
      }

      await assertLinkableUnits(organizationId, [input.functionalUnitId]);

      const updated = await repository.attachFunctionalUnit(
        organizationId,
        id,
        input.functionalUnitId,
        actor.subjectId
      );
      if (!updated) {
        // Race: another request attached the same unit, or premise vanished.
        const again = await repository.findById(organizationId, id);
        if (
          again?.functionalUnitIds.includes(input.functionalUnitId)
        ) {
          throw new ConflictError("This Functional Unit is already attached");
        }
        throw new NotFoundError("Business Premise not found");
      }
      return updated;
    },
  };
}
