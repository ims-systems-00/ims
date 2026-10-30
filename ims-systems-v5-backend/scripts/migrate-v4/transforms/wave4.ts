import type { MigrateContext } from "../types";
import {
  asId,
  mapAttachments,
  resolveUserId,
} from "./common";

function orgId(doc: Record<string, unknown>, fallback: string): string {
  return asId(doc.organization ?? doc.organizationId) ?? fallback;
}

function naturalKey(toolkit: string, clause: string): string {
  return `${toolkit}|${clause}`;
}

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
  doc: Record<string, unknown>,
  ctx: MigrateContext
): string {
  const toolkit = String(doc.name ?? doc.toolkit ?? "");
  const clause = String(doc.clause ?? "");
  if (toolkit && clause) {
    const mapped = ctx.complianceNaturalKeyToId.get(
      naturalKey(toolkit, clause)
    );
    if (mapped) return mapped;
  }
  return asId(doc.control ?? doc.controlId) ?? asId(doc._id)!;
}

export function transformControlStatus(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const toolkit = String(doc.name ?? "ISO 27001");
  const clause = String(doc.clause ?? "unknown");
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    name: toolkit,
    controlId: resolveControlId(doc, ctx),
    clause,
    title: String(doc.title ?? clause),
    description: String(doc.description ?? ""),
    annex: String(doc.annex ?? ""),
    note: String(doc.note ?? ""),
    isLocked: Boolean(doc.isLocked),
    parentClause: doc.parentClause ? String(doc.parentClause) : null,
    childrenClauses: Array.isArray(doc.childrenClauses)
      ? doc.childrenClauses.map(String)
      : [],
    moreInfo: doc.moreInfo ?? null,
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
    relatedCipId: asId(doc.cip ?? doc.relatedCipId ?? doc.ofi),
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
