/**
 * KPI Objective application service.
 * Spec: docs/module-specifications/kpi-objective.md
 *
 * Hard-delete CRUD registry. Creator owns update/delete.
 * Measurement fields exist but are optional (not UI-driven).
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type {
  KpiObjectiveBusinessUnitPort,
  KpiObjectiveListScopePort,
  KpiObjectiveNotificationPort,
} from "../ports";
import type { KpiObjectiveRepository } from "../repositories/kpi-objective.repository";
import {
  KPI_OBJECTIVES_RESOURCE,
  type CreateKpiObjectiveInput,
  type KpiObjective,
  type KpiObjectiveStatement,
  type KpiPrivacy,
  type ListKpiObjectivesQuery,
  type PaginatedKpiObjectives,
  type UpdateKpiObjectiveInput,
} from "../types";

function requireOrgIdentity(identity: SecurityIdentity | null | undefined): {
  identity: SecurityIdentity;
  organizationId: string;
  subjectId: string;
} {
  if (!identity?.subjectId) throw new UnauthorizedError();
  if (!identity.organizationId) {
    throw new ForbiddenError("Organisation context is required");
  }
  return {
    identity,
    organizationId: identity.organizationId,
    subjectId: identity.subjectId,
  };
}

/** Spec format KPI-{number}; V5 uses concurrency-safe stamp like other modules. */
function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KPI-${stamp}-${rand}`;
}

export function computeProgressPercentage(
  targetValue: number,
  currentValue: number
): number {
  if (targetValue <= 0) return 0;
  const raw = (currentValue / targetValue) * 100;
  return Math.min(100, Math.round(raw * 100) / 100);
}

function toStatement(kpi: KpiObjective): KpiObjectiveStatement {
  return {
    id: kpi.id,
    reference: kpi.reference,
    value: kpi.value,
    privacy: kpi.privacy,
    businessUnitId: kpi.businessUnitId,
    createdBy: kpi.createdBy,
    createdOn: kpi.createdOn,
  };
}

function assertCreator(
  kpi: KpiObjective,
  subjectId: string,
  action: "update" | "delete"
): void {
  if (kpi.createdBy !== subjectId) {
    throw new ForbiddenError(
      action === "delete"
        ? "Only the creator can delete this KPI objective"
        : "Only the creator can update this KPI objective"
    );
  }
}

export type KpiObjectivesServiceDeps = {
  repository: KpiObjectiveRepository;
  authorizer: Authorizer;
  notifications: KpiObjectiveNotificationPort;
  businessUnits: KpiObjectiveBusinessUnitPort;
  listScope: KpiObjectiveListScopePort;
};

export type KpiObjectivesService = ReturnType<typeof createKpiObjectivesService>;

/**
 * Narrow public surface for Audit / Dashboard consumers.
 * Do not import the repository or Mongoose model from outside this module.
 */
export type KpiObjectivesApplicationPort = {
  listOrganisationalStatements(
    organizationId: string
  ): Promise<KpiObjectiveStatement[]>;
  listBusinessUnitStatements(
    organizationId: string,
    businessUnitId: string
  ): Promise<KpiObjectiveStatement[]>;
  getById(
    organizationId: string,
    id: string
  ): Promise<KpiObjective | null>;
};

export function createKpiObjectivesService(deps: KpiObjectivesServiceDeps) {
  const { repository, authorizer, notifications, businessUnits, listScope } =
    deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: KPI_OBJECTIVES_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access KPI Objectives"
      );
    }
  }

  async function resolvePrivacyAndUnit(
    organizationId: string,
    privacy: KpiPrivacy,
    businessUnitId: string | null | undefined
  ): Promise<{ privacy: KpiPrivacy; businessUnitId?: string }> {
    if (privacy === "Organisational") {
      return { privacy, businessUnitId: undefined };
    }

    const unitId = businessUnitId?.trim();
    if (!unitId) {
      throw new ValidationAppError(
        "businessUnitId is required when privacy is Business unit"
      );
    }
    const exists = await businessUnits.exists(organizationId, unitId);
    if (!exists) {
      throw new ValidationAppError("Business unit was not found");
    }
    return { privacy, businessUnitId: unitId };
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateKpiObjectiveInput
    ): Promise<KpiObjective> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const value = input.value?.trim() ?? "";
      if (!value) {
        throw new ValidationAppError("KPI/Objective value is required");
      }

      const privacy = input.privacy ?? "Organisational";
      const scoped = await resolvePrivacyAndUnit(
        organizationId,
        privacy,
        input.businessUnitId
      );

      const targetValue = input.targetValue ?? 0;
      const currentValue = 0;
      if (targetValue < 0) {
        throw new ValidationAppError("Target value must be zero or greater");
      }

      const created = await repository.create(organizationId, {
        reference: nextReference(),
        value,
        privacy: scoped.privacy,
        businessUnitId: scoped.businessUnitId,
        targetValue,
        currentValue,
        progressPercentage: computeProgressPercentage(targetValue, currentValue),
        unit: input.unit?.trim() ?? "",
        moduleType: input.moduleType,
        moduleId: input.moduleId ?? undefined,
        createdBy: subjectId,
        createdOn: new Date(),
      });

      if (created.privacy === "Business unit" && created.businessUnitId) {
        await notifications.notifyBusinessUnitKpiCreated({
          organizationId,
          createdBy: subjectId,
          kpiId: created.id,
          reference: created.reference,
          value: created.value,
          businessUnitId: created.businessUnitId,
        });
      }

      return created;
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListKpiObjectivesQuery
    ): Promise<PaginatedKpiObjectives> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const scope = await listScope.resolveScope({ organizationId, subjectId });
      return repository.list(organizationId, query, scope);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<KpiObjective> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const kpi = await repository.findById(organizationId, id);
      if (!kpi) throw new NotFoundError("Kpi Objectives not found with given id");
      return kpi;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateKpiObjectiveInput
    ): Promise<KpiObjective> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const existing = await repository.findById(organizationId, id);
      if (!existing) {
        throw new NotFoundError("Kpi Objectives not found with given id");
      }
      assertCreator(existing, subjectId, "update");

      if (
        input.value === undefined &&
        input.privacy === undefined &&
        input.businessUnitId === undefined &&
        input.targetValue === undefined &&
        input.currentValue === undefined &&
        input.unit === undefined &&
        input.moduleType === undefined &&
        input.moduleId === undefined
      ) {
        throw new ValidationAppError("At least one field must be provided");
      }

      const nextPrivacy = input.privacy ?? existing.privacy;
      let nextBusinessUnitId: string | null | undefined =
        input.businessUnitId !== undefined
          ? input.businessUnitId
          : existing.businessUnitId ?? null;

      if (input.privacy !== undefined || input.businessUnitId !== undefined) {
        const scoped = await resolvePrivacyAndUnit(
          organizationId,
          nextPrivacy,
          nextBusinessUnitId
        );
        nextBusinessUnitId = scoped.businessUnitId ?? null;
      } else if (nextPrivacy === "Organisational") {
        nextBusinessUnitId = null;
      }

      const nextTarget =
        input.targetValue !== undefined
          ? input.targetValue
          : existing.targetValue;
      const nextCurrent =
        input.currentValue !== undefined
          ? input.currentValue
          : existing.currentValue;

      if (nextCurrent > nextTarget) {
        throw new ValidationAppError(
          "Current value must not exceed target value"
        );
      }

      const updated = await repository.update(organizationId, id, {
        value: input.value?.trim(),
        privacy: input.privacy !== undefined ? nextPrivacy : undefined,
        businessUnitId:
          input.privacy !== undefined || input.businessUnitId !== undefined
            ? nextBusinessUnitId
            : undefined,
        targetValue: input.targetValue,
        currentValue: input.currentValue,
        progressPercentage: computeProgressPercentage(nextTarget, nextCurrent),
        unit: input.unit?.trim(),
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) {
        throw new NotFoundError("Kpi Objectives not found with given id");
      }
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<KpiObjective> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const existing = await repository.findById(organizationId, id);
      if (!existing) {
        throw new NotFoundError("Kpi Objectives not found with given id");
      }
      assertCreator(existing, subjectId, "delete");

      const deleted = await repository.hardDelete(organizationId, id);
      if (!deleted) {
        throw new NotFoundError("Kpi Objectives not found with given id");
      }
      return existing;
    },

    async listOrganisationalStatements(
      organizationId: string
    ): Promise<KpiObjectiveStatement[]> {
      const items = await repository.listOrganisational(organizationId);
      return items.map(toStatement);
    },

    async listBusinessUnitStatements(
      organizationId: string,
      businessUnitId: string
    ): Promise<KpiObjectiveStatement[]> {
      const items = await repository.listByBusinessUnit(
        organizationId,
        businessUnitId
      );
      return items.map(toStatement);
    },

    async getByIdForOrganization(
      organizationId: string,
      id: string
    ): Promise<KpiObjective | null> {
      return repository.findById(organizationId, id);
    },
  };
}
