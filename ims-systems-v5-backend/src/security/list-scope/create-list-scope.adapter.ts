/**
 * Real list scopes for auth0-openfga (L-01…L-10).
 *
 * One canonical resolution shared by every module's *ListScopePort:
 *  - Super Admin / Auditor        → { mode: "all" }
 *  - Head of Service / Basic      → own functional units + unassigned
 *  - no membership / other / error → own functional units only (fail closed)
 *
 * Records store `businessUnitId`; unit memberships store
 * `functionalUnitId`. They are the same id space (business unit =
 * Functional Unit). Repositories already translate these scopes into
 * Mongo filters; this adapter only resolves role + unit ids from
 * `organisation_memberships` and `unit_memberships`.
 */

import { createOrganisationMembershipRepository } from "../../modules/organisation/repositories/organisation-membership.repository";
import { createUnitMembershipRepository } from "../../modules/users/repositories/unit-membership.repository";

export type CanonicalListScope =
  | { mode: "all" }
  | { mode: "scoped"; unitIds: string[]; includeUnassigned: boolean };

export interface ListScopeSources {
  findRole(organizationId: string, userId: string): Promise<string | null>;
  listUnitIds(organizationId: string, userId: string): Promise<string[]>;
}

const defaultSources = (): ListScopeSources => {
  const memberships = createOrganisationMembershipRepository();
  const units = createUnitMembershipRepository();
  return {
    async findRole(organizationId, userId) {
      const row = await memberships.findByUserAndOrg(userId, organizationId);
      return row?.role ?? null;
    },
    async listUnitIds(organizationId, userId) {
      return units.listUnitIdsForUser(organizationId, userId);
    },
  };
};

export const resolveCanonicalListScope = async (
  sources: ListScopeSources,
  input: { organizationId: string; subjectId: string },
): Promise<CanonicalListScope> => {
  try {
    const role = await sources.findRole(input.organizationId, input.subjectId);
    if (role === "Super Admin" || role === "Auditor") return { mode: "all" };
    const unitIds = await sources.listUnitIds(input.organizationId, input.subjectId);
    return {
      mode: "scoped",
      unitIds,
      includeUnassigned: role === "Head of Service" || role === "Basic",
    };
  } catch {
    // Fail closed: an error must never widen visibility.
    return { mode: "scoped", unitIds: [], includeUnassigned: false };
  }
};

type ScopeInput = { organizationId: string; subjectId: string };

/**
 * Creates per-module ListScopePorts over one shared resolver. Each
 * module's scope type differs only in flag names, mapped here.
 */
export const createListScopePorts = (sources: ListScopeSources = defaultSources()) => {
  const resolve = (input: ScopeInput) => resolveCanonicalListScope(sources, input);
  return {
    /** risks, incidents, audits: businessUnits + includeUnassigned */
    businessUnitsWithUnassigned: () => ({
      async resolveScope(input: ScopeInput) {
        const s = await resolve(input);
        return s.mode === "all"
          ? { mode: "all" as const }
          : {
              mode: "businessUnits" as const,
              businessUnitIds: s.unitIds,
              includeUnassigned: s.includeUnassigned,
            };
      },
    }),
    /** calendar, ofi, suppliers: businessUnits only (strict) */
    businessUnitsStrict: () => ({
      async resolveScope(input: ScopeInput) {
        const s = await resolve(input);
        return s.mode === "all"
          ? { mode: "all" as const }
          : { mode: "businessUnits" as const, businessUnitIds: s.unitIds };
      },
    }),
    /** customers: businessUnits + optional includeUnassigned */
    customers: () => ({
      async resolveScope(input: ScopeInput) {
        const s = await resolve(input);
        return s.mode === "all"
          ? { mode: "all" as const }
          : {
              mode: "businessUnits" as const,
              businessUnitIds: s.unitIds,
              includeUnassigned: s.includeUnassigned,
            };
      },
    }),
    /** kpi-objectives, management-reviews: includeOrganisational mirrors includeUnassigned */
    withOrganisational: () => ({
      async resolveScope(input: ScopeInput) {
        const s = await resolve(input);
        return s.mode === "all"
          ? { mode: "all" as const }
          : {
              mode: "businessUnits" as const,
              businessUnitIds: s.unitIds,
              includeOrganisational: s.includeUnassigned,
            };
      },
    }),
    /** activities: groups + includeNullGroup */
    groups: () => ({
      async resolveScope(input: ScopeInput) {
        const s = await resolve(input);
        return s.mode === "all"
          ? { mode: "all" as const }
          : {
              mode: "groups" as const,
              groupIds: s.unitIds,
              includeNullGroup: s.includeUnassigned,
            };
      },
    }),
  };
};

/** Scope check for single-record reads (getById does not apply list scope). */
export const isRecordInScope = (
  scope: CanonicalListScope,
  businessUnitId: string | null | undefined,
): boolean => {
  if (scope.mode === "all") return true;
  if (!businessUnitId) return scope.includeUnassigned;
  return scope.unitIds.includes(businessUnitId);
};

/**
 * Same check against any module's resolved scope shape (flag names
 * differ per module). Used by service getById paths so scoped users
 * cannot open out-of-scope records by URL.
 */
export const scopeAllowsUnit = (
  scope: unknown,
  unitId: string | null | undefined,
): boolean => {
  if (!scope || typeof scope !== "object") return false;
  const s = scope as {
    mode?: string;
    businessUnitIds?: string[];
    groupIds?: string[];
    includeUnassigned?: boolean;
    includeOrganisational?: boolean;
    includeNullGroup?: boolean;
  };
  if (s.mode === "all") return true;
  const ids = s.businessUnitIds ?? s.groupIds ?? [];
  if (!unitId) {
    return Boolean(s.includeUnassigned ?? s.includeOrganisational ?? s.includeNullGroup);
  }
  return ids.includes(unitId);
};
