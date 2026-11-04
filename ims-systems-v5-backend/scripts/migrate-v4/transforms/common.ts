import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { mapModuleType } from "../module-type-map";

export function asId(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === "object" && value !== null && "_id" in value) {
    return asId((value as { _id: unknown })._id);
  }
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const s = String(value);
    if (Types.ObjectId.isValid(s) && s.length === 24) return s;
  }
  return String(value);
}

/**
 * Resolve organisation id from a V4 document.
 * Prefer the document's own `organization` / `organizationId` so shared
 * multi-org tenant DBs (e.g. ims_v4_db) are not stamped with openTenant's
 * first-org fallback.
 */
export function resolveOrganizationId(
  doc: Record<string, unknown>,
  fallback: string | null | undefined
): string {
  const fromDoc = asId(doc.organization ?? doc.organizationId);
  if (fromDoc) return fromDoc;
  if (fallback && fallback.trim()) return fallback.trim();
  return "";
}

export function asIdList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values.map(asId).filter((id): id is string => Boolean(id));
}

export function resolveUserId(
  value: unknown,
  remap: Map<string, string>
): string | null {
  const id = asId(value);
  if (!id) return null;
  return remap.get(id) ?? id;
}

export function oid(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function hashInvitationToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function mapSource(
  source: unknown,
  context: "default" | "chart" = "default"
): { moduleType: string; moduleId: string } | undefined {
  if (!source || typeof source !== "object") return undefined;
  const s = source as Record<string, unknown>;
  const moduleType = mapModuleType(
    (s.moduleType as string) ?? null,
    context
  );
  const moduleId = asId(s.module ?? s.moduleId);
  if (!moduleType || !moduleId) return undefined;
  return { moduleType, moduleId };
}

export function mapComplianceLinks(
  links: unknown
): Array<{ toolkitId: string; clauseIds: string[] }> {
  if (!Array.isArray(links)) return [];
  return links
    .map((link) => {
      if (!link || typeof link !== "object") return null;
      const l = link as Record<string, unknown>;
      const toolkitId = String(
        l.toolkitId ?? l.name ?? l.toolkit ?? ""
      ).trim();
      const clauseIds = Array.isArray(l.clauseIds)
        ? l.clauseIds.map(String)
        : l.clause
          ? [String(l.clause)]
          : [];
      if (!toolkitId) return null;
      return { toolkitId, clauseIds };
    })
    .filter((x): x is { toolkitId: string; clauseIds: string[] } => Boolean(x));
}

export function mapAttachments(
  attachments: unknown,
  fallbackUserId: string | null
): Array<Record<string, unknown>> {
  if (!Array.isArray(attachments)) return [];
  return attachments.map((att, index) => {
    const a = (att && typeof att === "object" ? att : {}) as Record<
      string,
      unknown
    >;
    const meta = (a.metadata ?? a.fileMetaInfo ?? a) as Record<string, unknown>;
    return {
      id: asId(a._id ?? a.id) ?? `migrated-att-${index}`,
      fileName: String(meta.fileName ?? a.fileName ?? "file"),
      mimeType: meta.mimeType ?? a.mimeType,
      sizeBytes: meta.size ?? meta.sizeBytes ?? a.sizeBytes,
      storageKey: meta.storageKey ?? a.storageKey ?? meta.key,
      url: a.url ?? a.signedUrl ?? meta.url,
      uploadedBy:
        resolveUserId(a.uploadedBy ?? a.createdBy ?? meta.uploadedBy, new Map()) ??
        fallbackUserId ??
        "migration",
      uploadedAt: (a.uploadedAt ?? a.createdAt ?? new Date()) as Date,
    };
  });
}

export function createdByOn(doc: Record<string, unknown>): {
  createdBy: string;
  createdOn: Date;
} {
  const created = doc.created as { by?: unknown; on?: Date } | undefined;
  return {
    createdBy: asId(created?.by ?? doc.createdBy) ?? "migration",
    createdOn: (created?.on ??
      doc.createdOn ??
      doc.createdAt ??
      new Date()) as Date,
  };
}

export function mapOrgRole(role: unknown): string {
  const r = String(role ?? "Basic").trim();
  const allowed = [
    "Super Admin",
    "Head of Service",
    "Basic",
    "Auditor",
  ];
  if (allowed.includes(r)) return r;
  const lower = r.toLowerCase();
  if (lower.includes("super")) return "Super Admin";
  if (lower.includes("head") || lower.includes("hos")) return "Head of Service";
  if (lower.includes("audit")) return "Auditor";
  return "Basic";
}

export function mapEmailVerifiedStatus(status: unknown): string {
  const s = String(status ?? "pending").toLowerCase();
  if (s === "varified" || s === "verified") return "verified";
  return "pending";
}

export function defaultAddress(doc: Record<string, unknown>) {
  const line1 =
    String(
      doc.addressStreet ??
        doc.addressBuilding ??
        (typeof doc.address === "string" ? doc.address : "") ??
        "Not set"
    ) || "Not set";
  const line2 = String(doc.addressBuilding ?? "");
  return {
    line1,
    line2: line2 === line1 ? "" : line2,
    city: String(doc.addressCity ?? "Not set"),
    county: String(doc.addressCounty ?? doc.county ?? "Not set"),
    postCode: String(doc.addressPostCode ?? "N/A"),
    country: String(
      (doc.country as { name?: string })?.name ?? doc.addressCountry ?? "United Kingdom"
    ),
  };
}

export function defaultCountry(doc: Record<string, unknown>) {
  const c = doc.country as
    | { name?: string; code?: string; currency?: string; phoneCode?: number }
    | string
    | undefined;
  if (c && typeof c === "object") {
    return {
      name: c.name ?? "United Kingdom",
      code: c.code ?? "GB",
      currency: c.currency ?? "GBP",
      phoneCode: c.phoneCode ?? 44,
    };
  }
  return {
    name: "United Kingdom",
    code: "GB",
    currency: "GBP",
    phoneCode: 44,
  };
}

export function msToHhMm(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** V4 soft-delete flag → V5 deletedAt. */
export function deletedAtFromV4(doc: Record<string, unknown>): Date | null {
  const marker = doc.deleteMarker as
    | { status?: boolean; deletedAt?: Date | null }
    | undefined;
  if (marker?.status) {
    return marker.deletedAt ?? (doc.deletedAt as Date) ?? new Date();
  }
  if (doc.deletedAt) return doc.deletedAt as Date;
  return null;
}

/**
 * V4 assignees are often `{ user: ObjectId, acceptance }` (not `userId`).
 * Never treat the assignment subdocument `_id` as the user id.
 */
export function mapV4Assignees(
  raw: unknown,
  remap: Map<string, string>
): Array<{ userId: string; acceptance: string }> {
  if (!Array.isArray(raw)) return [];
  const out: Array<{ userId: string; acceptance: string }> = [];
  for (const entry of raw) {
    if (entry == null) continue;
    let userId: string | null = null;
    let acceptance = "pending";
    if (typeof entry === "object") {
      const a = entry as Record<string, unknown>;
      userId = resolveUserId(
        a.user ?? a.userId ?? a.member ?? a.assignee,
        remap
      );
      const acc = String(a.acceptance ?? a.status ?? "pending").toLowerCase();
      // V5 AssigneeAcceptance: Pending | Accepted | Declined
      if (acc.includes("accept")) acceptance = "Accepted";
      else if (acc.includes("reject") || acc.includes("declin"))
        acceptance = "Declined";
      else acceptance = "Pending";
    } else {
      userId = resolveUserId(entry, remap);
    }
    if (userId) out.push({ userId, acceptance });
  }
  return out;
}

/** Map V4 task completion/status onto V5 TASK_STATUSES. */
export function mapTaskStatus(doc: Record<string, unknown>): string {
  const completed = doc.completed as
    | { status?: string | boolean }
    | undefined;
  const completedRaw = completed?.status;
  if (
    completedRaw === true ||
    completedRaw === "Complete" ||
    completedRaw === "Completed" ||
    completedRaw === "complete"
  ) {
    return "Complete";
  }
  const raw = String(doc.status ?? "Pending").trim().toLowerCase();
  if (raw === "complete" || raw === "completed" || raw === "done") {
    return "Complete";
  }
  if (raw.includes("progress") || raw === "in progress") return "In progress";
  if (raw === "open" || raw === "pending" || raw === "") return "Pending";
  if (raw === "in progress") return "In progress";
  return "Pending";
}

/** Normalize V4 repository privacy labels to V5 enums. */
export function mapDocumentPrivacy(raw: unknown): string {
  const s = String(raw ?? "Organisational").trim();
  const lower = s.toLowerCase();
  if (lower === "organisational" || lower === "organizational" || lower === "organisation") {
    return "Organisational";
  }
  if (lower === "business unit" || lower === "businessunit" || lower === "group") {
    return "Business unit";
  }
  if (lower === "only me" || lower === "private" || lower === "personal") {
    return "Only me";
  }
  if (lower === "custom") return "Custom";
  return "Organisational";
}

/** Normalize V4 file meta into V5 DocumentFileMeta shape. */
export function normalizeStorageInfo(
  raw: unknown
): { Name: string; Key: string; key: string; Bucket: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const name = String(s.Name ?? s.name ?? s.fileName ?? "").trim();
  const key = String(s.Key ?? s.key ?? s.storageKey ?? "").trim();
  const bucket = String(s.Bucket ?? s.bucket ?? "").trim();
  if (!name || !key || !bucket) return null;
  return { Name: name, Key: key, key, Bucket: bucket };
}

/** Map V4 compliance tool labels (often spaced) onto V5 enums. */
export function mapComplianceTools(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set([
    "DSPTNHS",
    "ISO27001",
    "ISO27001_2022",
    "ISO27001_2022_ANNEX_A",
    "ISO27002",
    "ISO9001",
    "ISO45001",
    "ISO20000",
    "CQC",
    "BS9997",
    "ISO14001",
    "CRM",
    "ISO15686_5",
    "ESG_ENVIRONMENTAL",
    "ESG_GOVERNANCE",
    "ESG_SOCIAL",
  ]);
  const out: string[] = [];
  for (const item of raw) {
    const compact = String(item ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/-/g, "_")
      .toUpperCase();
    // Keep known casing from allowed set
    const match = [...allowed].find((a) => a.toUpperCase() === compact);
    if (match) out.push(match);
  }
  return [...new Set(out)];
}

export function mapTaskPriority(raw: unknown): string {
  const s = String(raw ?? "Medium").trim().toLowerCase();
  if (s === "high" || s === "h") return "High";
  if (s === "low" || s === "l") return "Low";
  return "Medium";
}

/**
 * V4 rich-text fields are often Draft.js raw JSON strings
 * (`{"blocks":[{"text":"..."}],"entityMap":{}}`). V5 stores plain text.
 */
export function plainTextFromV4RichText(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "object") {
    return draftBlocksToText(raw as { blocks?: unknown });
  }
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("{") && trimmed.includes('"blocks"')) {
    try {
      return draftBlocksToText(JSON.parse(trimmed) as { blocks?: unknown });
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function draftBlocksToText(parsed: { blocks?: unknown }): string {
  if (!Array.isArray(parsed?.blocks)) return "";
  return parsed.blocks
    .map((block) => {
      if (!block || typeof block !== "object") return "";
      return String((block as { text?: unknown }).text ?? "");
    })
    .join("\n")
    .trim();
}
