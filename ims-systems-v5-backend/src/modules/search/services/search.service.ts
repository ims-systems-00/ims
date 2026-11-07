/**
 * Global search (F-07): org-scoped, authorizer-checked matches across
 * core modules. A resource type is only searched when the caller may
 * `read` it, and visibility follows the Phase 1 business-unit list
 * scopes for record modules (documents/users are org-level).
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import { ForbiddenError } from "../../../shared";
import { getAuditModel } from "../../audits/repositories/audit.model";
import { getControlStatusModel } from "../../compliance/repositories/control-status.model";
import { createCustomerRepository } from "../../customers/repositories/customer.repository";
import { getDocumentTreeModel } from "../../document-management/repositories/document-tree.model";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getOfiModel } from "../../ofi/repositories/ofi.model";
import { createOrganisationMembershipRepository } from "../../organisation/repositories/organisation-membership.repository";
import { getRiskModel } from "../../risks/repositories/risk.model";
import { getSupplierModel } from "../../suppliers/repositories/supplier.model";
import { getTaskModel } from "../../tasks/repositories/task.model";
import { getUserModel } from "../../users/repositories/user.model";
import {
  resolveCanonicalListScope,
  type ListScopeSources,
} from "../../../security/list-scope/create-list-scope.adapter";

export type SearchResultItem = {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  route: string;
};

export type SearchResults = {
  query: string;
  items: SearchResultItem[];
};

type Counter = {
  find: (filter: Record<string, unknown>) => {
    limit: (n: number) => { lean: () => Promise<Record<string, unknown>[]> };
  };
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createGlobalSearchService(deps: {
  authorizer: Authorizer;
  scopeSources?: ListScopeSources;
  counters?: Record<string, Counter>;
  listMemberUserIds?: (organizationId: string) => Promise<string[]>;
}) {
  const models = (): Record<string, Counter> =>
    deps.counters ?? {
      risks: getRiskModel() as unknown as Counter,
      incidents: getIncidentModel() as unknown as Counter,
      audits: getAuditModel() as unknown as Counter,
      suppliers: getSupplierModel() as unknown as Counter,
      documents: getDocumentTreeModel() as unknown as Counter,
      ofi: getOfiModel() as unknown as Counter,
      compliance: getControlStatusModel() as unknown as Counter,
      tasks: getTaskModel() as unknown as Counter,
      users: getUserModel() as unknown as Counter,
    };

  async function canRead(identity: SecurityIdentity, resourceType: string) {
    try {
      return await deps.authorizer.allow({
        identity,
        action: "read",
        resourceType,
        organizationId: identity.organizationId,
      });
    } catch {
      return false;
    }
  }

  function scopeFilter(
    scope: Awaited<ReturnType<typeof resolveCanonicalListScope>>,
  ): Record<string, unknown> {
    if (scope.mode === "all") return {};
    const clauses: Record<string, unknown>[] = [
      { businessUnitId: { $in: scope.unitIds } },
    ];
    if (scope.includeUnassigned) {
      clauses.push({ businessUnitId: { $in: [null, ""] } }, { businessUnitId: { $exists: false } });
    }
    return { $or: clauses };
  }

  return {
    async search(
      identity: SecurityIdentity | null | undefined,
      query: string,
      limitPerType = 5,
    ): Promise<SearchResults> {
      if (!identity?.organizationId) {
        throw new ForbiddenError("Organisation context is required");
      }
      const q = query.trim();
      if (q.length < 2) return { query: q, items: [] };
      const org = identity.organizationId;
      const pattern = { $regex: escapeRegex(q), $options: "i" };
      const scope = deps.scopeSources
        ? await resolveCanonicalListScope(deps.scopeSources, {
            organizationId: org,
            subjectId: identity.subjectId,
          })
        : ({ mode: "all" } as const);
      const sf = scopeFilter(scope);
      const m = models();
      const items: SearchResultItem[] = [];
      const limit = Math.min(10, Math.max(1, limitPerType));

      const run = async (
        type: string,
        resourceType: string,
        model: Counter | undefined,
        filter: Record<string, unknown>,
        map: (doc: Record<string, unknown>) => SearchResultItem,
        scoped = true,
      ) => {
        if (!model) return;
        if (!(await canRead(identity, resourceType))) return;
        const docs = await model
          .find({ organizationId: org, deletedAt: null, ...filter, ...(scoped ? sf : {}) })
          .limit(limit)
          .lean()
          .catch(() => []);
        items.push(...docs.map(map));
      };

      await Promise.all([
        run("risk", "risks", m.risks!, { $or: [{ title: pattern }, { reference: pattern }] }, (d) => {
          const id = String(d._id);
          return {
            type: "Risk",
            id,
            title: String(d.title ?? d.reference ?? "Risk"),
            subtitle: (d.reference as string) ?? null,
            route: `/risks?risk=${encodeURIComponent(id)}`,
          };
        }),
        run("incident", "incidents", m.incidents!, { $or: [{ title: pattern }, { reference: pattern }] }, (d) => {
          const id = String(d._id);
          return {
            type: "Incident",
            id,
            title: String(d.title ?? d.reference ?? "Incident"),
            subtitle: (d.reference as string) ?? null,
            route: `/incidents?incident=${encodeURIComponent(id)}`,
          };
        }),
        run("audit", "audits", m.audits!, { $or: [{ title: pattern }, { reference: pattern }] }, (d) => {
          const id = String(d._id);
          const auditType =
            String(d.type ?? "").toLowerCase() === "external"
              ? "external"
              : "internal";
          return {
            type: "Audit",
            id,
            title: String(d.title ?? d.reference ?? "Audit"),
            subtitle: (d.reference as string) ?? null,
            route: `/audits/${auditType}?audit=${encodeURIComponent(id)}`,
          };
        }),
        run("supplier", "suppliers", m.suppliers!, { $or: [{ name: pattern }, { reference: pattern }] }, (d) => {
          const id = String(d._id);
          return {
            type: "Supplier",
            id,
            title: String(d.name ?? "Supplier"),
            subtitle: (d.reference as string) ?? null,
            route: `/suppliers?supplier=${encodeURIComponent(id)}`,
          };
        }),
        run("document", "document-management", m.documents!, { name: pattern }, (d) => {
          const id = String(d._id);
          const repositoryId = d.repositoryId ? String(d.repositoryId) : null;
          return {
            type: "Document",
            id,
            title: String(d.name ?? "Document"),
            subtitle: (d.reference as string) ?? null,
            route: repositoryId
              ? `/documents/repositories/${encodeURIComponent(repositoryId)}/nodes/${encodeURIComponent(id)}`
              : "/documents",
          };
        }, false),
        run(
          "ofi",
          "ofi",
          m.ofi!,
          { $or: [{ title: pattern }, { reference: pattern }] },
          (d) => {
            const id = String(d._id);
            return {
              type: "OFI",
              id,
              title: String(d.title ?? d.reference ?? "OFI"),
              subtitle: (d.reference as string) ?? null,
              route: `/ofi?ofi=${encodeURIComponent(id)}`,
            };
          }
        ),
        run(
          "compliance",
          "compliance",
          m.compliance!,
          {
            isLocked: false,
            $or: [{ title: pattern }, { clause: pattern }, { name: pattern }],
          },
          (d) => {
            const id = String(d._id);
            const toolkit = String(d.name ?? "compliance");
            const clause = d.clause ? String(d.clause) : null;
            return {
              type: "Compliance",
              id,
              title: String(d.title ?? clause ?? "Control"),
              subtitle: clause,
              route: `/compliance/${encodeURIComponent(toolkit)}?control=${encodeURIComponent(id)}`,
            };
          },
          false
        ),
        run(
          "task",
          "tasks",
          m.tasks!,
          { $or: [{ name: pattern }, { reference: pattern }] },
          (d) => {
            const id = String(d._id);
            return {
              type: "Task",
              id,
              title: String(d.name ?? d.reference ?? "Task"),
              subtitle: (d.reference as string) ?? null,
              route: `/tasks?task=${encodeURIComponent(id)}`,
            };
          }
        ),
      ]);

      // Customers via repository text search (its list already applies scope).
      if (await canRead(identity, "customers")) {
        const listed = await createCustomerRepository()
          .list(org, { search: q, page: 1, pageSize: limit } as never, { mode: "all" } as never)
          .catch(() => null);
        for (const c of listed?.items ?? []) {
          items.push({
            type: "Customer",
            id: c.id,
            title: c.name,
            subtitle: c.reference ?? null,
            route: `/customers?customer=${encodeURIComponent(c.id)}`,
          });
        }
      }

      // Users: only members of the caller's organisation.
      if (await canRead(identity, "users")) {
        const memberIds = deps.listMemberUserIds
          ? await deps.listMemberUserIds(org)
          : (await createOrganisationMembershipRepository().listByOrganization(org)).map(
              (r) => r.userId,
            );
        if (memberIds.length > 0) {
          const docs = await m.users!
            .find({
              _id: { $in: memberIds },
              deletedAt: null,
              $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }],
            })
            .limit(limit)
            .lean()
            .catch(() => []);
          for (const d of docs) {
            const id = String(d._id);
            items.push({
              type: "User",
              id,
              title: `${String(d.firstName ?? "")} ${String(d.lastName ?? "")}`.trim() || String(d.email ?? "User"),
              subtitle: (d.email as string) ?? null,
              route: `/users?user=${encodeURIComponent(id)}`,
            });
          }
        }
      }

      return { query: q, items: items.slice(0, 40) };
    },
  };
}

export type GlobalSearchService = ReturnType<typeof createGlobalSearchService>;
