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
