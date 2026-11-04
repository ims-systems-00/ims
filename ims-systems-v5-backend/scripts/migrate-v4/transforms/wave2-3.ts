import type { MigrateContext } from "../types";
import {
  asId,
  asIdList,
  createdByOn,
  deletedAtFromV4,
  mapAttachments,
  mapComplianceLinks,
  mapComplianceTools,
  mapDocumentPrivacy,
  mapSource,
  mapTaskPriority,
  mapTaskStatus,
  mapV4Assignees,
  normalizeStorageInfo,
  plainTextFromV4RichText,
  resolveOrganizationId,
  resolveUserId,
} from "./common";
import { mapModuleType } from "../module-type-map";

function orgId(
  doc: Record<string, unknown>,
  fallback: string
): string {
  return resolveOrganizationId(doc, fallback);
}

const NOTIFICATION_REF_MAP: Record<string, string> = {
  notifications: "notifications",
  tasks: "tasks",
  risks: "risks",
  incidents: "incidents",
  audits: "audits",
  managementreviews: "management-reviews",
  "management-reviews": "management-reviews",
  kpiobjectives: "kpi-objectives",
  "kpi-objectives": "kpi-objectives",
  cips: "ofi",
  ofi: "ofi",
  ofis: "ofi",
  suppliers: "suppliers",
  customers: "customers",
  users: "users",
  hardwareassets: "assets",
  softwareassets: "assets",
  informationassets: "assets",
  peopleassets: "assets",
  premiseassets: "assets",
  assets: "assets",
  groups: "functional-units",
  "functional-units": "functional-units",
  documentrepositories: "documents",
  documenttrees: "documents",
  documents: "documents",
  calendarevents: "calendar",
  calenderevents: "calendar",
  calendar: "calendar",
  controlstatuses: "compliance",
  compliance: "compliance",
  leaves: "leaves",
};

function mapNotificationReferenceType(raw: unknown): string {
  const key = String(raw ?? "notifications")
    .trim()
    .toLowerCase();
  return NOTIFICATION_REF_MAP[key] ?? "notifications";
}

function notificationFlag(
  raw: unknown,
  truthyStatus: string,
  falsyStatus: string
): { status: string; on: Date | null } {
  if (raw && typeof raw === "object" && "status" in (raw as object)) {
    const r = raw as { status?: string | boolean; on?: Date };
    const status =
      typeof r.status === "string"
        ? r.status
        : r.status
          ? truthyStatus
          : falsyStatus;
    return { status, on: r.on ?? null };
  }
  return {
    status: Boolean(raw) ? truthyStatus : falsyStatus,
    on: null,
  };
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
    description: plainTextFromV4RichText(doc.description),
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
  // Unique index (organizationId, number) — never leave number null.
  const numberRaw = doc.number ?? doc.invoiceNumber;
  let number = Number(numberRaw);
  if (!Number.isFinite(number) || number <= 0) {
    // Stable positive int from ObjectId hex (avoids colliding nulls).
    number = parseInt(id.slice(-8), 16) % 1_000_000_000 || 1;
  }
  const customerId = asId(doc.customer ?? doc.customerId) ?? "migration-unknown-customer";
  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `INV-${id.slice(-6)}`),
    number,
    customerId,
    customerName: String(doc.customerName ?? doc.customer ?? "Migrated customer"),
    groupId: buId(doc) ?? null,
    accountManagerId: resolveUserId(
      doc.accountManager ?? doc.accountManagerId,
      ctx.userIdRemap
    ),
    status: ["Draft", "Sent", "Paid"].includes(String(doc.status))
      ? String(doc.status)
      : "Draft",
    dueDate: (doc.dueDate as Date) ?? createdOn,
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
    description:
      plainTextFromV4RichText(doc.description) ||
      String(doc.title ?? "Migrated risk"),
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
    description:
      plainTextFromV4RichText(doc.description) ||
      String(doc.title ?? "Migrated incident"),
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
    opportunityForImprovement:
      plainTextFromV4RichText(
        doc.opportunityForImprovement ?? doc.description
      ) || String(doc.title ?? "Migrated OFI"),
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
  const assignees = mapV4Assignees(doc.assignedTo ?? doc.assignees, ctx.userIdRemap);
  const completed = doc.completed as
    | { by?: unknown; on?: Date; status?: unknown }
    | undefined;
  const status = mapTaskStatus(doc);

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `TSK-${id.slice(-6)}`),
    name: String(doc.name ?? doc.title ?? "Task"),
    description: doc.description
      ? plainTextFromV4RichText(doc.description)
      : undefined,
    businessUnitId: buId(doc),
    assignees,
    priority: mapTaskPriority(doc.priority),
    teamPriority: Boolean(doc.teamPriority),
    status,
    completedBy:
      status === "Complete"
        ? resolveUserId(completed?.by, ctx.userIdRemap)
        : null,
    completedOn: status === "Complete" ? (completed?.on ?? null) : null,
    // V4 field is `due` (not `dueDate`).
    dueDate: doc.dueDate ?? doc.due ?? null,
    source: mapSource(doc.source),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    nextNudgeAt: null,
    deletedAt: deletedAtFromV4(doc),
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
): Record<string, unknown> | null {
  const id = asId(doc._id)!;
  const recipientUserId = resolveUserId(
    doc.user ?? doc.recipientUserId ?? doc.recipient,
    ctx.userIdRemap
  );
  if (!recipientUserId) return null;

  const title = String(doc.title ?? doc.message ?? "Notification").trim() || "Notification";
  const message = String(doc.message ?? doc.body ?? doc.title ?? title).trim() || title;
  const { createdBy, createdOn } = createdByOn(doc);

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    recipientUserId,
    businessUnitId: buId(doc),
    title,
    message,
    referenceType: mapNotificationReferenceType(
      doc.referenceType ?? doc.moduleType ?? doc.module
    ),
    referenceModuleId: asId(
      doc.referenceModule ?? doc.module ?? doc.referenceModuleId
    ),
    screenIdentifier: doc.screenIdentifier ? String(doc.screenIdentifier) : undefined,
    params: {
      id: asId(doc.params && (doc.params as { id?: unknown }).id) ?? null,
      businessUnitId:
        asId(
          doc.params && (doc.params as { businessUnitId?: unknown }).businessUnitId
        ) ??
        buId(doc) ??
        null,
    },
    icon: doc.icon ? String(doc.icon) : undefined,
    sent: notificationFlag(doc.sent, "sent", "unsent"),
    read: notificationFlag(doc.read, "read", "unread"),
    popUp: notificationFlag(doc.popUp, "unread", "read"),
    isOrganizational: Boolean(doc.isOrganizational),
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
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
    description: doc.description
      ? plainTextFromV4RichText(doc.description)
      : undefined,
    privacy: mapDocumentPrivacy(doc.privacy),
    businessUnitId: buId(doc) ?? null,
    owners: asIdList(doc.owners).map((uid) => ctx.userIdRemap.get(uid) ?? uid),
    sharedWith: asIdList(doc.sharedWith).map(
      (uid) => ctx.userIdRemap.get(uid) ?? uid
    ),
    reviewInterval: doc.reviewInterval,
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: deletedAtFromV4(doc),
  };
}

export function transformDocumentTree(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  const type = String(doc.type ?? "document") === "folder" ? "folder" : "document";
  const rawData = (doc.documentData ?? null) as Record<string, unknown> | null;
  const storageInfo = normalizeStorageInfo(
    rawData?.storageInfo ??
      doc.storageInfo ??
      doc.storage ??
      rawData?.fileMetaInfo
  );

  let documentData: Record<string, unknown> | null = null;
  if (type === "document") {
    const purposeRaw = String(rawData?.purpose ?? doc.purpose ?? "Document");
    documentData = {
      storageInfo,
      purpose: purposeRaw,
      owners: asIdList(rawData?.owners ?? doc.owners).map(
        (uid) => ctx.userIdRemap.get(uid) ?? uid
      ),
      applicableModules: Array.isArray(rawData?.applicableModules)
        ? rawData!.applicableModules
        : [],
      complianceTools: mapComplianceTools(rawData?.complianceTools),
      complianceLinks: mapComplianceLinks(
        rawData?.complianceLinks ??
          doc.complianceLinks ??
          doc.compliance ??
          doc.isoControls
      ),
      authorisation: Array.isArray(rawData?.authorisation)
        ? (rawData!.authorisation as unknown[]).map((entry) => {
            const a = (entry ?? {}) as Record<string, unknown>;
            return {
              userId:
                resolveUserId(a.user ?? a.userId, ctx.userIdRemap) ?? "migration",
              status: String(a.status ?? "Pending"),
              handledOn: a.handledOn ?? null,
              message: String(a.message ?? ""),
            };
          })
        : [],
      classification: String(rawData?.classification ?? ""),
      dvID: Number(rawData?.dvID ?? 0) || 0,
      conformance: Number(rawData?.conformance ?? -1),
      threadId: String(rawData?.threadId ?? ""),
      reviewDate: rawData?.reviewDate ?? doc.reviewDate ?? null,
    };
  }

  const v4Folder = (doc.folderData ?? null) as Record<string, unknown> | null;
  const folderModified = (v4Folder?.modified ?? null) as
    | { by?: unknown; on?: Date }
    | null;

  return {
    _id: id,
    organizationId: orgId(doc, organizationId),
    reference: String(doc.reference ?? `DT-${id.slice(-6)}`),
    repositoryId: asId(doc.repository ?? doc.repositoryId),
    // V4 field is `parentNode` (not `parent` / `parentNodeId`).
    parentNodeId: asId(
      doc.parentNode ?? doc.parent ?? doc.parentNodeId ?? doc.parentId
    ),
    type,
    status: String(doc.status ?? "Published"),
    name: String(doc.name ?? doc.title ?? "Document"),
    documentData,
    folderData:
      type === "folder"
        ? {
            reviewDate: v4Folder?.reviewDate ?? doc.reviewDate ?? null,
            modifiedBy: resolveUserId(folderModified?.by, ctx.userIdRemap),
            modifiedOn: folderModified?.on ?? null,
          }
        : null,
    createdBy: resolveUserId(createdBy, ctx.userIdRemap) ?? createdBy,
    createdOn,
    deletedAt: deletedAtFromV4(doc),
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
