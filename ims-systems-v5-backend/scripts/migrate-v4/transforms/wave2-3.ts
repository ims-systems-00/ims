import type { MigrateContext } from "../types";
import {
  asId,
  asIdList,
  createdByOn,
  mapAttachments,
  mapComplianceLinks,
  mapSource,
  resolveUserId,
} from "./common";
import { mapModuleType } from "../module-type-map";

function orgId(
  doc: Record<string, unknown>,
  fallback: string
): string {
  return asId(doc.organization ?? doc.organizationId) ?? fallback;
}

function buId(doc: Record<string, unknown>): string | undefined {
  return asId(doc.group ?? doc.businessUnitId ?? doc.groupId) ?? undefined;
}

function lifecycleFlag(raw: unknown) {
  if (!raw || typeof raw !== "object") {
    return { status: false, by: null, on: null };
  }
  const r = raw as { status?: boolean | string; by?: unknown; on?: Date };
  return {
    status: Boolean(r.status),
    by: asId(r.by),
    on: r.on ?? null,
  };
}

const RISK_TYPES = new Set([
  "Hardware",
  "Software",
  "People",
  "Premise",
  "Organisational",
  "Clinical",
]);

function mapRiskType(raw: unknown): string {
  const s = String(raw ?? "Organisational");
  if (RISK_TYPES.has(s)) return s;
  const lower = s.toLowerCase();
  if (lower.includes("hardware")) return "Hardware";
  if (lower.includes("software")) return "Software";
  if (lower.includes("people") || lower.includes("staff")) return "People";
  if (lower.includes("premise") || lower.includes("site")) return "Premise";
  if (lower.includes("clinical")) return "Clinical";
  return "Organisational";
}

export function transformTag(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    name: String(doc.name ?? "Untitled tag"),
    description: String(doc.description ?? ""),
    applicableModules: Array.isArray(doc.applicableModules)
      ? doc.applicableModules.map((m) => mapModuleType(String(m)) ?? String(m))
      : [],
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    updatedBy: resolveUserId(
      (doc.updated as { by?: unknown })?.by,
      ctx.userIdRemap
    ),
    updatedOn: (doc.updated as { on?: Date })?.on ?? null,
  };
}

function baseAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext,
  nameField: "name" | "title" = "name"
): Record<string, unknown> {
  const id = asId(doc._id)!;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `AST-${id.slice(-6)}`),
    [nameField]: String(doc[nameField] ?? doc.name ?? doc.title ?? "Asset"),
    businessUnitId: buId(doc),
    categoryId: asId(doc.category ?? doc.categoryId ?? doc.tagsAndCategories),
    cost: doc.cost != null ? Number(doc.cost) : undefined,
    ownerId: resolveUserId(doc.owner ?? doc.ownerId, ctx.userIdRemap),
    deletedAt: null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function transformHardwareAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    ...baseAsset(doc, organizationId, ctx),
    name: String(doc.name ?? "Hardware"),
    tag: doc.tag ? String(doc.tag) : undefined,
    purchaseDate: doc.purchaseDate ?? undefined,
    warrantyExpiry: doc.warrantyExpiry ?? undefined,
  };
}

export function transformSoftwareAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    ...baseAsset(doc, organizationId, ctx),
    name: String(doc.name ?? "Software"),
    licenceCount: doc.licenceCount ?? doc.licenses,
    installCount: doc.installCount ?? doc.installs,
    keys: Array.isArray(doc.keys) ? doc.keys : [],
    documents: Array.isArray(doc.documents) ? doc.documents : [],
  };
}

export function transformInformationAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    ...baseAsset(doc, organizationId, ctx, "title"),
    title: String(doc.title ?? doc.name ?? "Information asset"),
    storage: doc.storage,
    format: doc.format,
    link: doc.link,
  };
}

export function transformPeopleAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    ...baseAsset(doc, organizationId, ctx),
    name: String(doc.name ?? "Person"),
    role: doc.role,
    responsibility: doc.responsibility,
    skill: doc.skill,
  };
}

export function transformPremiseAsset(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    ...baseAsset(doc, organizationId, ctx),
    name: String(doc.name ?? "Premise asset"),
    location: doc.location,
    address: doc.address,
  };
}

export function transformCustomer(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const { createdBy, createdOn } = createdByOn(doc);
  const id = asId(doc._id)!;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `CUS-${id.slice(-6)}`),
    name: String(doc.name ?? "Customer"),
    businessUnitId: buId(doc),
    categoryId: asId(doc.category ?? doc.categoryId),
    accountManager: resolveUserId(
      doc.accountManager ?? doc.accountManagerId,
      ctx.userIdRemap
    ),
    stage: doc.stage,
    status: doc.status,
    emails: doc.emails ?? [],
    contacts: doc.contacts ?? [],
    address: doc.address,
    contracts: doc.contracts ?? [],
    attachments: mapAttachments(doc.attachments, createdBy),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformSupplier(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const { createdBy, createdOn } = createdByOn(doc);
  const id = asId(doc._id)!;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `SUP-${id.slice(-6)}`),
    name: String(doc.name ?? "Supplier"),
    email: doc.email,
    businessUnitId: buId(doc),
    buyerId: resolveUserId(doc.buyer ?? doc.buyerId, ctx.userIdRemap),
    isCompliant: Boolean(doc.isCompliant),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformInvoice(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `INV-${id.slice(-6)}`),
    customerId: asId(doc.customer ?? doc.customerId),
    groupId: buId(doc),
    accountManagerId: resolveUserId(
      doc.accountManager ?? doc.accountManagerId,
      ctx.userIdRemap
    ),
    status: String(doc.status ?? "Draft"),
    entries: Array.isArray(doc.entries) ? doc.entries : [],
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformEmailCampaign(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `CAM-${id.slice(-6)}`),
    name: String(doc.name ?? "Campaign"),
    status: String(doc.status ?? "Draft"),
    target: doc.target,
    groupId: buId(doc),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformCampaignDelivery(
  doc: Record<string, unknown>,
  organizationId: string
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    campaignId: asId(doc.campaign ?? doc.campaignId),
    recipients: Array.isArray(doc.recipients) ? doc.recipients : [],
  };
}

export function transformRisk(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const raisedBy =
    resolveUserId(
      doc.raisedBy ?? (doc.created as { by?: unknown })?.by,
      ctx.userIdRemap
    ) ?? "migration";
  const initial = (doc.initialScore ?? doc.score ?? {
    likelihood: 1,
    impact: 1,
    total: 1,
  }) as Record<string, unknown>;
  const current = (doc.currentScore ?? initial) as Record<string, unknown>;

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `RSK-${id.slice(-6)}`),
    title: String(doc.title ?? "Risk"),
    description: String(doc.description ?? doc.title ?? "Migrated risk"),
    type: mapRiskType(doc.type),
    businessUnitId: buId(doc),
    categoryId: asId(doc.category ?? doc.categoryId ?? doc.tagsAndCategories),
    assetId: asId(doc.asset ?? doc.assetId),
    ownerId: resolveUserId(doc.owner ?? doc.ownerId, ctx.userIdRemap),
    initialScore: {
      likelihood: Number(initial.likelihood ?? 1),
      impact: Number(initial.impact ?? 1),
      total: Number(
        initial.total ??
          Number(initial.likelihood ?? 1) * Number(initial.impact ?? 1)
      ),
    },
    currentScore: {
      likelihood: Number(current.likelihood ?? 1),
      impact: Number(current.impact ?? 1),
      total: Number(
        current.total ??
          Number(current.likelihood ?? 1) * Number(current.impact ?? 1)
      ),
    },
    mitigationText: doc.mitigationText ? String(doc.mitigationText) : undefined,
    mitigated: lifecycleFlag(doc.mitigated),
    acceptanceRationale: doc.acceptanceRationale
      ? String(doc.acceptanceRationale)
      : undefined,
    decisionMaker: doc.decisionMaker ? String(doc.decisionMaker) : undefined,
    accepted: lifecycleFlag(doc.accepted),
    escalated: lifecycleFlag(doc.escalated),
    attachments: mapAttachments(doc.attachments, raisedBy),
    complianceLinks: mapComplianceLinks(doc.complianceLinks ?? doc.compliance),
    source: mapSource(doc.source),
    activity: Array.isArray(doc.activity) ? doc.activity : [],
    raisedBy,
    raisedOn:
      (doc.raisedOn as Date) ??
      (doc.created as { on?: Date })?.on ??
      (doc.createdAt as Date) ??
      new Date(),
    updatedBy: resolveUserId(
      doc.updatedBy ?? (doc.updated as { by?: unknown })?.by,
      ctx.userIdRemap
    ),
    updatedOn: (doc.updatedOn as Date) ?? (doc.updated as { on?: Date })?.on ?? null,
    nextNudgeAt: null,
    deletedAt: null,
  };
}

export function transformIncident(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const raisedBy =
    resolveUserId(
      doc.raisedBy ?? (doc.created as { by?: unknown })?.by,
      ctx.userIdRemap
    ) ?? "migration";
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `INC-${id.slice(-6)}`),
    title: String(doc.title ?? "Incident"),
    description: String(doc.description ?? doc.title ?? "Migrated incident"),
    priority: String(doc.priority ?? "P3"),
    privacy: doc.privacy,
    businessUnitId: buId(doc),
    categoryId: asId(doc.category ?? doc.categoryId),
    ownerId: resolveUserId(doc.owner ?? doc.ownerId, ctx.userIdRemap),
    resolved: lifecycleFlag(doc.resolved),
    escalated: lifecycleFlag(doc.escalated),
    attachments: mapAttachments(doc.attachments, raisedBy),
    complianceLinks: mapComplianceLinks(doc.complianceLinks ?? doc.compliance),
    source: mapSource(doc.source),
    activity: Array.isArray(doc.activity) ? doc.activity : [],
    raisedBy,
    raisedOn:
      (doc.raisedOn as Date) ??
      (doc.created as { on?: Date })?.on ??
      (doc.createdAt as Date) ??
      new Date(),
    nextNudgeAt: null,
    deletedAt: null,
  };
}

export function transformOfi(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  const implemented = doc.implemented as
    | { status?: string | boolean; by?: unknown; on?: Date }
    | undefined;
  let implStatus = "Pending";
  if (implemented?.status === true || implemented?.status === "Implemented") {
    implStatus = "Implemented";
  } else if (
    implemented?.status === "In Progress" ||
    implemented?.status === "In progress"
  ) {
    implStatus = "In Progress";
  }

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `OFI-${id.slice(-6)}`),
    title: String(doc.title ?? "OFI"),
    opportunityForImprovement: String(
      doc.opportunityForImprovement ?? doc.description ?? doc.title ?? "Migrated OFI"
    ),
    ownerId: resolveUserId(doc.owner ?? doc.ownerId, ctx.userIdRemap),
    businessUnitId: buId(doc) ?? "unknown",
    cost: doc.cost != null ? Number(doc.cost) : undefined,
    implemented: {
      status: implStatus,
      by: resolveUserId(implemented?.by, ctx.userIdRemap),
      on: implemented?.on ?? null,
    },
    attachments: mapAttachments(doc.attachments, createdBy),
    complianceLinks: mapComplianceLinks(doc.complianceLinks ?? doc.compliance),
    source: mapSource(doc.source),
    activity: Array.isArray(doc.activity) ? doc.activity : [],
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    updatedBy: resolveUserId(
      doc.updatedBy ?? (doc.updated as { by?: unknown })?.by,
      ctx.userIdRemap
    ),
    updatedOn: (doc.updatedOn as Date) ?? null,
    nextNudgeAt: null,
    deletedAt: null,
  };
}

export function transformTask(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  const assignees = Array.isArray(doc.assignedTo)
    ? doc.assignedTo.map((a: unknown) => {
        if (typeof a === "object" && a && "userId" in a) {
          return {
            userId: resolveUserId(
              (a as { userId: unknown }).userId,
              ctx.userIdRemap
            ),
            acceptance: (a as { acceptance?: string }).acceptance ?? "pending",
          };
        }
        return {
          userId: resolveUserId(a, ctx.userIdRemap),
          acceptance: "pending",
        };
      })
    : [];

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `TSK-${id.slice(-6)}`),
    name: String(doc.name ?? doc.title ?? "Task"),
    description: doc.description ? String(doc.description) : undefined,
    businessUnitId: buId(doc),
    assignees,
    priority: String(doc.priority ?? "Medium"),
    status: doc.completed?.status ? "Completed" : String(doc.status ?? "Open"),
    dueDate: doc.dueDate ?? doc.due ?? null,
    source: mapSource(doc.source),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    nextNudgeAt: null,
    deletedAt: null,
  };
}

export function transformAudit(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `AUD-${id.slice(-6)}`),
    title: String(doc.title ?? "Audit"),
    type: String(doc.type ?? "Internal"),
    auditorId: resolveUserId(doc.auditor ?? doc.auditorId, ctx.userIdRemap),
    businessUnitId: buId(doc),
    complianceBodyId: asId(doc.complianceBody ?? doc.complianceBodyId),
    identifications: doc.identifications ?? [],
    risks: asIdList(doc.risks),
    ofis: asIdList(doc.cips ?? doc.ofis),
    attachments: mapAttachments(doc.attachments, createdBy),
    complianceLinks: mapComplianceLinks(doc.complianceLinks ?? doc.compliance),
    completed: lifecycleFlag(doc.completed),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformActivity(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    moduleType: mapModuleType(String(doc.moduleType ?? "")) ?? "tasks",
    moduleId: asId(doc.module ?? doc.moduleId) ?? "unknown",
    groupId: buId(doc),
    assignedTo: resolveUserId(doc.assignedTo, ctx.userIdRemap),
    message: doc.message ?? doc.activity ?? "",
    createdBy: resolveUserId(
      (doc.created as { by?: unknown })?.by ?? doc.createdBy,
      ctx.userIdRemap
    ),
    createdOn:
      (doc.created as { on?: Date })?.on ??
      (doc.createdAt as Date) ??
      new Date(),
    extraLogs: doc.extraLogs ?? [],
    metaInfo: doc.metaInfo ?? {},
  };
}

export function transformCalendarEvent(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `EVT-${id.slice(-6)}`),
    title: String(doc.title ?? "Event"),
    start: doc.start ?? doc.startDate,
    end: doc.end ?? doc.endDate,
    attendeeIds: asIdList(doc.attendees ?? doc.attendeeIds).map(
      (id) => ctx.userIdRemap.get(id) ?? id
    ),
    groupIds: asIdList(doc.groups ?? doc.groupIds),
    systemEventId: asId(doc.systemEventId),
    eventReference: doc.eventReference,
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformNotification(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `NTF-${id.slice(-6)}`),
    recipientUserId: resolveUserId(
      doc.user ?? doc.recipientUserId ?? doc.recipient,
      ctx.userIdRemap
    ),
    referenceType: mapModuleType(String(doc.referenceType ?? doc.moduleType ?? "")) ,
    referenceModuleId: asId(doc.referenceModule ?? doc.module ?? doc.referenceModuleId),
    title: doc.title ?? doc.message,
    body: doc.body ?? doc.message,
    sent: Boolean(doc.sent),
    read: Boolean(doc.read),
    popUp: Boolean(doc.popUp),
    isOrganizational: Boolean(doc.isOrganizational),
    createdAt: doc.createdAt,
  };
}

export function transformChart(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    name: String(doc.name ?? "Chart"),
    moduleType: mapModuleType(String(doc.moduleType ?? ""), "chart"),
    moduleId: asId(doc.module ?? doc.moduleId),
    derivation: doc.derivation ?? doc.pipeline ?? {},
    createdBy: resolveUserId(doc.createdBy, ctx.userIdRemap),
    deletedAt: null,
  };
}

export function transformManagementReview(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `MR-${id.slice(-6)}`),
    title: String(doc.title ?? "Management review"),
    businessUnitId: buId(doc),
    date: doc.date ?? createdOn,
    attendees: asIdList(doc.attendees).map(
      (id) => ctx.userIdRemap.get(id) ?? id
    ),
    agenda: doc.agenda ?? [],
    minutes: doc.minutes ?? [],
    completed: Boolean(
      (doc.completed as { status?: boolean })?.status ?? doc.completed
    ),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformKpi(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `KPI-${id.slice(-6)}`),
    title: String(doc.title ?? doc.name ?? "KPI"),
    target: Number(doc.target ?? 0),
    current: Number(doc.current ?? 0),
    moduleType: mapModuleType(
      doc.moduleType ? String(doc.moduleType) : null
    ),
    moduleId: asId(doc.module ?? doc.moduleId),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformLeave(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  const submission = (doc.submission ?? {}) as Record<string, unknown>;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `LV-${id.slice(-6)}`),
    type: String(doc.type ?? "Annual"),
    days: Number(doc.days ?? doc.fractions ?? 0),
    startDate: doc.startDate ?? doc.from,
    endDate: doc.endDate ?? doc.to,
    userId: resolveUserId(doc.user ?? doc.userId, ctx.userIdRemap),
    submission: {
      status: String(submission.status ?? "Pending"),
      lineManagerIds: asIdList(submission.lineManagers ?? submission.lineManagerIds),
      decisionMakerId: resolveUserId(
        submission.decisionMaker ?? submission.decisionMakerId,
        ctx.userIdRemap
      ),
    },
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformDocumentRepository(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `DR-${id.slice(-6)}`),
    name: String(doc.name ?? "Repository"),
    privacy: String(doc.privacy ?? "Private"),
    businessUnitId: buId(doc) ?? null,
    owners: asIdList(doc.owners).map((id) => ctx.userIdRemap.get(id) ?? id),
    sharedWith: asIdList(doc.sharedWith),
    reviewInterval: doc.reviewInterval,
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: null,
  };
}

export function transformDocumentTree(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `DT-${id.slice(-6)}`),
    repositoryId: asId(doc.repository ?? doc.repositoryId),
    parentNodeId: asId(doc.parent ?? doc.parentNodeId),
    type: String(doc.type ?? "document"),
    name: String(doc.name ?? doc.title ?? "Document"),
    documentData: doc.documentData ?? {
      owners: asIdList(doc.owners),
      complianceLinks: mapComplianceLinks(doc.complianceLinks ?? doc.compliance),
      reviewDate: doc.reviewDate,
      storageInfo: doc.storageInfo ?? doc.storage,
    },
    deletedAt: null,
  };
}

export function transformDocumentSignature(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    repositoryId: asId(doc.repository ?? doc.repositoryId),
    documentNodeId: asId(doc.document ?? doc.documentNodeId ?? doc.tree),
    type: String(doc.type ?? "Internal"),
    status: String(doc.status ?? "Pending"),
    signerUserId: resolveUserId(doc.signer ?? doc.user, ctx.userIdRemap),
    signedAt: doc.signedAt ?? null,
  };
}

export function transformDocumentReviewReminder(
  doc: Record<string, unknown>,
  organizationId: string
): Record<string, unknown> {
  return {
    _id: asId(doc._id)!,
    organizationId: orgId(doc, organizationId),
    documentNodeId: asId(doc.entityId ?? doc.documentNodeId),
    offset: doc.offset ?? doc.entityType,
    reviewDateKey: doc.reviewDateKey ?? String(doc.reviewDate ?? ""),
    sentAt: doc.sentAt ?? null,
    recipients: asIdList(doc.recipients),
  };
}
