/**
 * Real AiContextPort — permission-scoped search + get-by-id for Alice chat.
 */

import type { Authorizer, SecurityIdentity } from "../../../security";
import { getActivityModel } from "../../activities/repositories/activity.model";
import { getAuditModel } from "../../audits/repositories/audit.model";
import { getControlStatusModel } from "../../compliance/repositories/control-status.model";
import { getDocumentTreeModel } from "../../document-management/repositories/document-tree.model";
import { getIncidentModel } from "../../incidents/repositories/incident.model";
import { getOfiModel } from "../../ofi/repositories/ofi.model";
import { getRiskModel } from "../../risks/repositories/risk.model";
import { getTaskModel } from "../../tasks/repositories/task.model";
import type { GlobalSearchService } from "../../search/services/search.service";
import {
  auditCard,
  complianceControlCard,
  documentCard,
  incidentCard,
  ofiCard,
  riskCard,
  taskCard,
  toListCard,
  truncate,
} from "../lib/context-cards";
import type { AiContextPort } from "../ports";
import type { AiContextCard } from "../types/chat";

async function canRead(
  authorizer: Authorizer,
  identity: SecurityIdentity,
  resourceType: string
): Promise<boolean> {
  try {
    return await authorizer.allow({
      identity,
      action: "read",
      resourceType,
      organizationId: identity.organizationId,
    });
  } catch {
    return false;
  }
}

function mapSearchItem(item: {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  route: string;
}): AiContextCard {
  const moduleMap: Record<string, string> = {
    Risk: "risks",
    Incident: "incidents",
    Audit: "audits",
    Document: "documents",
    OFI: "ofi",
    Compliance: "compliance",
    Supplier: "suppliers",
    Customer: "customers",
    User: "users",
    Task: "tasks",
  };
  const module = moduleMap[item.type] ?? item.type.toLowerCase();
  return toListCard({
    module,
    id: item.id,
    reference: item.subtitle,
    title: item.title,
    status: null,
    summary: truncate(
      [item.subtitle, item.title].filter(Boolean).join(" — "),
      160
    ),
    href: item.route,
  });
}

export function createAiContextAdapter(deps: {
  authorizer: Authorizer;
  search: GlobalSearchService;
}): AiContextPort {
  return {
    async searchRecords(input) {
      const results = await deps.search.search(
        input.identity,
        input.query,
        input.limit ?? 6
      );
      return results.items.map(mapSearchItem);
    },

    async getRecordCard(input) {
      const { organizationId, identity, module, id } = input;
      const resourceType =
        module === "documents"
          ? "document-management"
          : module === "ofi"
            ? "ofi"
            : module === "compliance"
              ? "compliance"
              : module;

      if (!(await canRead(deps.authorizer, identity, resourceType))) {
        return null;
      }

      if (module === "risks") {
        const doc = await getRiskModel()
          .findOne({ _id: id, organizationId, deletedAt: null })
          .lean();
        return doc ? riskCard(doc as Record<string, unknown>) : null;
      }
      if (module === "incidents") {
        const doc = await getIncidentModel()
          .findOne({ _id: id, organizationId, deletedAt: null })
          .lean();
        return doc ? incidentCard(doc as Record<string, unknown>) : null;
      }
      if (module === "audits") {
        const doc = await getAuditModel()
          .findOne({ _id: id, organizationId, deletedAt: null })
          .lean();
        return doc ? auditCard(doc as Record<string, unknown>) : null;
      }
      if (module === "documents" || module === "documenttrees") {
        const doc = await getDocumentTreeModel()
          .findOne({
            _id: id,
            organizationId,
            deletedAt: null,
            type: "document",
          })
          .lean();
        if (!doc) return null;
        const card = documentCard(doc as Record<string, unknown>);
        // Lightweight "extraction": metadata only (binary OCR/text extract later).
        const data = (doc as { documentData?: Record<string, unknown> })
          .documentData;
        const fileName =
          (data?.storageInfo as { Name?: string } | undefined)?.Name ??
          String((doc as { name?: string }).name ?? "");
        card.summary = truncate(
          `${card.summary}\nFile: ${fileName}. Full-file text extraction is not enabled; use document metadata and linked compliance evidence.`
        );
        return card;
      }
      if (module === "ofi" || module === "cips") {
        const doc = await getOfiModel()
          .findOne({ _id: id, organizationId, deletedAt: null })
          .lean();
        return doc ? ofiCard(doc as Record<string, unknown>) : null;
      }
      if (module === "compliance") {
        const doc = await getControlStatusModel()
          .findOne({ _id: id, organizationId })
          .lean();
        return doc
          ? complianceControlCard(doc as Record<string, unknown>)
          : null;
      }
      if (module === "tasks") {
        const doc = await getTaskModel()
          .findOne({ _id: id, organizationId, deletedAt: null })
          .lean();
        return doc ? taskCard(doc as Record<string, unknown>) : null;
      }
      return null;
    },

    async listOpenByModule(input) {
      const { organizationId, identity, module } = input;
      const limit = Math.min(10, Math.max(1, input.limit ?? 5));
      const filters = input.filters ?? {};
      const resourceType =
        module === "documents"
          ? "document-management"
          : module === "ofi"
            ? "ofi"
            : module === "compliance"
              ? "compliance"
              : module;
      if (!(await canRead(deps.authorizer, identity, resourceType))) {
        return [];
      }

      const asList = (cards: AiContextCard[]) => cards.map(toListCard);

      if (module === "tasks") {
        const filter: Record<string, unknown> = {
          organizationId,
          deletedAt: null,
        };
        if (filters.openOnly !== false) {
          filter.status = { $ne: "Complete" };
        }
        if (filters.priorityHigh) {
          filter.priority = "High";
        }
        if (filters.overdue) {
          filter.dueDate = { $lt: new Date() };
          filter.status = { $ne: "Complete" };
        }
        const docs = await getTaskModel()
          .find(filter)
          .sort({ priority: 1, dueDate: 1, updatedAt: -1 })
          .limit(limit)
          .lean();
        // Priority enum sorts alphabetically (High before Low before Medium) —
        // re-rank High first for prompt quality.
        const ranked = [...docs].sort((a, b) => {
          const rank = (p: unknown) =>
            p === "High" ? 0 : p === "Medium" ? 1 : 2;
          const pr =
            rank((a as { priority?: string }).priority) -
            rank((b as { priority?: string }).priority);
          if (pr !== 0) return pr;
          const da = (a as { dueDate?: Date }).dueDate
            ? new Date(String((a as { dueDate?: Date }).dueDate)).getTime()
            : Number.POSITIVE_INFINITY;
          const db = (b as { dueDate?: Date }).dueDate
            ? new Date(String((b as { dueDate?: Date }).dueDate)).getTime()
            : Number.POSITIVE_INFINITY;
          return da - db;
        });
        return asList(ranked.map((d) => taskCard(d as Record<string, unknown>)));
      }

      if (module === "risks") {
        const docs = await getRiskModel()
          .find({
            organizationId,
            deletedAt: null,
            status: { $nin: ["Mitigated", "Closed", "Deleted"] },
          })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(docs.map((d) => riskCard(d as Record<string, unknown>)));
      }
      if (module === "incidents") {
        const incidentFilter: Record<string, unknown> = {
          organizationId,
          deletedAt: null,
          status: { $nin: ["Resolved", "Closed"] },
        };
        if (filters.priorityHigh) {
          incidentFilter.priority = { $in: ["P1", "Critical", "High"] };
        }
        const docs = await getIncidentModel()
          .find(incidentFilter)
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(
          docs.map((d) => incidentCard(d as Record<string, unknown>))
        );
      }
      if (module === "audits") {
        const docs = await getAuditModel()
          .find({
            organizationId,
            deletedAt: null,
            status: { $nin: ["Completed", "Cancelled"] },
          })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(docs.map((d) => auditCard(d as Record<string, unknown>)));
      }
      if (module === "ofi" || module === "cips") {
        const docs = await getOfiModel()
          .find({
            organizationId,
            deletedAt: null,
            status: { $nin: ["Completed", "Closed", "Cancelled"] },
          })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(docs.map((d) => ofiCard(d as Record<string, unknown>)));
      }
      if (module === "documents") {
        const docs = await getDocumentTreeModel()
          .find({
            organizationId,
            deletedAt: null,
            type: "document",
            status: "Published",
          })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(
          docs.map((d) => documentCard(d as Record<string, unknown>))
        );
      }
      if (module === "compliance") {
        const docs = await getControlStatusModel()
          .find({
            organizationId,
            selected: "Selected",
            state: { $ne: "Implemented" },
            isLocked: false,
          })
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean();
        return asList(
          docs.map((d) =>
            complianceControlCard(d as Record<string, unknown>)
          )
        );
      }
      return [];
    },

    async getActivitiesSummary(input) {
      const moduleType =
        input.module === "documents"
          ? "documenttrees"
          : input.module === "ofi"
            ? "cips"
            : input.module === "compliance"
              ? "controlstatuses"
              : input.module === "tasks"
                ? "tasks"
                : input.module;
      const docs = await getActivityModel()
        .find({
          organizationId: input.organizationId,
          moduleType: moduleType as
            | "risks"
            | "incidents"
            | "audits"
            | "tasks"
            | "documenttrees"
            | "cips"
            | "controlstatuses",
          moduleId: input.id,
        })
        .sort({ createdAt: -1 })
        .limit(input.limit ?? 5)
        .lean()
        .catch(() => []);
      return docs.map((row) =>
        truncate(String((row as { value?: string }).value ?? ""), 160)
      );
    },
  };
}
