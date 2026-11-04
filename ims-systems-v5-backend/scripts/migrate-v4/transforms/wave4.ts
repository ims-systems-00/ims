import type { MigrateContext } from "../types";
import {
  asId,
  mapAttachments,
  resolveOrganizationId,
  resolveUserId,
} from "./common";

function orgId(doc: Record<string, unknown>, fallback: string): string {
  return resolveOrganizationId(doc, fallback);
}

function naturalKey(toolkit: string, clause: string): string {
  return `${toolkit.trim()}|${clause.trim()}`;
}

export type V4ControlMeta = {
  name: string;
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: unknown;
};

function mapEvidenceType(raw: unknown): string {
  const s = String(raw ?? "raw-file").toLowerCase();
  if (s.includes("risk")) return "risk-management";
  if (s.includes("incident")) return "incident-management";
  if (s.includes("cip") || s.includes("ofi")) return "cip";
  if (s.includes("document")) return "document-management";
  if (s.includes("text") || s.includes("plain")) return "text-content";
  if (
    [
      "raw-file",
      "text-content",
      "risk-management",
      "incident-management",
      "cip",
      "document-management",
    ].includes(String(raw))
  ) {
    return String(raw);
  }
  return "raw-file";
}

/**
 * Resolve V5 catalogue control id from toolkit+clause.
 * Falls back to V4 control id if catalogue map has no entry.
 */
export function resolveControlId(
  toolkit: string,
  clause: string,
  doc: Record<string, unknown>,
  ctx: MigrateContext
): string {
  if (toolkit && clause && clause !== "unknown") {
    const mapped = ctx.complianceNaturalKeyToId.get(naturalKey(toolkit, clause));
    if (mapped) return mapped;
  }
  return asId(doc.control ?? doc.controlId) ?? asId(doc._id)!;
}

export function enrichFromV4Control(
  doc: Record<string, unknown>,
  ctx: MigrateContext
): {
  toolkit: string;
  clause: string;
  title: string;
  description: string;
  annex: string;
  note: string;
  isLocked: boolean;
  parentClause: string | null;
  childrenClauses: string[];
  moreInfo: unknown;
} {
  const controlId = asId(doc.control ?? doc.controlId);
  const meta = controlId ? ctx.v4ControlMeta.get(controlId) : undefined;

  const toolkit = String(
    meta?.name ?? doc.name ?? doc.toolkit ?? "ISO 27001"
  ).trim();
  const clause = String(meta?.clause ?? doc.clause ?? "").trim() || "unknown";
  const title = String(
    meta?.title ?? doc.title ?? (clause !== "unknown" ? clause : toolkit)
  );

  return {
    toolkit,
    clause,
    title,
    description: String(meta?.description ?? doc.description ?? ""),
    annex: String(meta?.annex ?? doc.annex ?? ""),
    note: String(meta?.note ?? doc.note ?? ""),
    isLocked: Boolean(meta?.isLocked ?? doc.isLocked),
    parentClause:
      meta?.parentClause ??
      (doc.parentClause ? String(doc.parentClause) : null),
    childrenClauses: meta?.childrenClauses?.length
      ? meta.childrenClauses
      : Array.isArray(doc.childrenClauses)
        ? doc.childrenClauses.map(String)
        : [],
    moreInfo: meta?.moreInfo ?? doc.moreInfo ?? null,
  };
}

export function transformControlStatus(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const enriched = enrichFromV4Control(doc, ctx);
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    name: enriched.toolkit,
    controlId: resolveControlId(
      enriched.toolkit,
      enriched.clause,
      doc,
      ctx
    ),
    clause: enriched.clause,
    title: enriched.title,
    description: enriched.description,
    annex: enriched.annex,
    note: enriched.note,
    isLocked: enriched.isLocked,
    parentClause: enriched.parentClause,
    childrenClauses: enriched.childrenClauses,
    moreInfo: enriched.moreInfo,
    selected: String(doc.selected ?? "Not selected"),
    state: String(doc.state ?? "Not implemented"),
    compliancePercentage: Number(doc.compliancePercentage ?? 0),
    numberOfCompliantChildren: Number(doc.numberOfCompliantChildren ?? 0),
    evidences: mapAttachments(doc.evidences, null),
    responsibleUserId: resolveUserId(
      doc.responsible ?? doc.responsibleUserId,
      ctx.userIdRemap
    ),
    accountableUserId: resolveUserId(
      doc.accountable ?? doc.accountableUserId,
      ctx.userIdRemap
    ),
    consultedUserId: resolveUserId(
      doc.consulted ?? doc.consultedUserId,
      ctx.userIdRemap
    ),
    informedUserId: resolveUserId(
      doc.informed ?? doc.informedUserId,
      ctx.userIdRemap
    ),
    groupId: asId(doc.group ?? doc.groupId),
    updatedBy: resolveUserId(doc.updatedBy, ctx.userIdRemap),
    updatedOn: (doc.updatedOn as Date) ?? null,
    deletedAt: null,
  };
}

export function transformControlEvidence(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    controlStatusId: asId(doc.controlStatusId ?? doc.controlStatus) ?? "",
    evidenceType: mapEvidenceType(doc.evidenceType),
    relatedRiskId: asId(doc.risk ?? doc.relatedRiskId),
    relatedIncidentId: asId(doc.incident ?? doc.relatedIncidentId),
    relatedCipId: asId(
      doc.cip ?? doc.relatedCip ?? doc.relatedCipId ?? doc.ofi
    ),
    relatedDocumentId: asId(
      doc.document ?? doc.documenttree ?? doc.relatedDocumentId
    ),
    textContent: doc.textContent ?? doc.plainText ?? null,
    fileStorage: doc.fileStorage ?? null,
    groupId: asId(doc.group ?? doc.groupId),
    updatedBy: resolveUserId(doc.updatedBy, ctx.userIdRemap),
    deletedAt: null,
  };
}

export function transformComplianceOverview(
  doc: Record<string, unknown>,
  organizationId: string
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    name: String(doc.name ?? "ISO 27001"),
    totalPercentage: Number(doc.totalPercentage ?? doc.progress ?? 0),
    controlsSelected: Number(doc.controlsSelected ?? 0),
    controlsImplemented: Number(doc.controlsImplemented ?? 0),
    deletedAt: null,
  };
}

export { naturalKey };
