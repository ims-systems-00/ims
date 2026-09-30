/**
 * Charts application service — definition registry.
 * Spec: docs/module-specifications/charts.md
 *
 * No pipeline execution. No Stats/Dashboard coupling in Phase 1.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationAppError,
} from "../../../shared";
import type { ChartRepository } from "../repositories/chart.repository";
import {
  CHARTS_RESOURCE,
  type Chart,
  type CreateChartInput,
  type ListChartsQuery,
  type PaginatedCharts,
  type UpdateChartInput,
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

export type ChartsServiceDeps = {
  repository: ChartRepository;
  authorizer: Authorizer;
};

export type ChartsService = ReturnType<typeof createChartsService>;

/** Narrow public surface for future consumers (not Dashboard-wired yet). */
export type ChartsApplicationPort = {
  getById(organizationId: string, id: string): Promise<Chart | null>;
  listByOrganization(
    organizationId: string,
    query: ListChartsQuery
  ): Promise<PaginatedCharts>;
};

export function createChartsService(deps: ChartsServiceDeps) {
  const { repository, authorizer } = deps;

  async function assertAllowed(
    identity: SecurityIdentity,
    action: "read" | "create" | "update" | "delete"
  ): Promise<void> {
    const allowed = await authorizer.allow({
      identity,
      action,
      resourceType: CHARTS_RESOURCE,
      organizationId: identity.organizationId,
    });
    if (!allowed) {
      throw new ForbiddenError(
        "User does not have permission to access Charts"
      );
    }
  }

  return {
    async create(
      identity: SecurityIdentity | null | undefined,
      input: CreateChartInput
    ): Promise<Chart> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "create");

      const name = input.name.trim();
      const description = input.description.trim();
      if (!name) throw new ValidationAppError("Name is required");
      if (!description) throw new ValidationAppError("Description is required");

      const existing = await repository.findByName(organizationId, name);
      if (existing) {
        throw new ConflictError("A chart with the same name already exists.");
      }

      return repository.create(organizationId, {
        name,
        description,
        derivation: input.derivation,
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        config: input.config,
        createdBy: subjectId,
        createdOn: new Date(),
      });
    },

    async list(
      identity: SecurityIdentity | null | undefined,
      query: ListChartsQuery
    ): Promise<PaginatedCharts> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      return repository.list(organizationId, query);
    },

    async getById(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Chart> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "read");
      const chart = await repository.findById(organizationId, id);
      if (!chart) throw new NotFoundError("No chart found.");
      return chart;
    },

    async update(
      identity: SecurityIdentity | null | undefined,
      id: string,
      input: UpdateChartInput
    ): Promise<Chart> {
      const { identity: actor, organizationId, subjectId } =
        requireOrgIdentity(identity);
      await assertAllowed(actor, "update");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("No chart found.");

      if (
        input.description === undefined &&
        input.derivation === undefined &&
        input.moduleType === undefined &&
        input.moduleId === undefined &&
        input.config === undefined
      ) {
        throw new ValidationAppError("At least one field must be provided");
      }

      const updated = await repository.update(organizationId, id, {
        description: input.description?.trim(),
        derivation: input.derivation,
        moduleType: input.moduleType,
        moduleId: input.moduleId,
        config: input.config,
        updatedBy: subjectId,
        updatedOn: new Date(),
      });
      if (!updated) throw new NotFoundError("No chart found.");
      return updated;
    },

    async remove(
      identity: SecurityIdentity | null | undefined,
      id: string
    ): Promise<Chart> {
      const { identity: actor, organizationId } = requireOrgIdentity(identity);
      await assertAllowed(actor, "delete");

      const existing = await repository.findById(organizationId, id);
      if (!existing) throw new NotFoundError("No chart found.");

      const deleted = await repository.hardDelete(organizationId, id);
      if (!deleted) throw new NotFoundError("No chart found.");
      return existing;
    },

    /** Public application helpers (org-scoped; no HTTP authz — caller must gate). */
    async getByIdForOrganization(
      organizationId: string,
      id: string
    ): Promise<Chart | null> {
      return repository.findById(organizationId, id);
    },

    async listForOrganization(
      organizationId: string,
      query: ListChartsQuery
    ): Promise<PaginatedCharts> {
      return repository.list(organizationId, query);
    },
  };
}
