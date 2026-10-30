import type { MigrateContext } from "../types";
import {
  asId,
  asIdList,
  createdByOn,
  defaultAddress,
  defaultCountry,
  hashInvitationToken,
  mapEmailVerifiedStatus,
  mapOrgRole,
  msToHhMm,
  resolveUserId,
} from "./common";

const ACCESS_TYPES = new Set([
  "Internal business function",
  "External function",
  "Internal compliance function",
  "External compliance function",
]);

function mapAccessType(raw: unknown): string {
  const s = String(raw ?? "Internal business function");
  if (ACCESS_TYPES.has(s)) return s;
  const lower = s.toLowerCase();
  if (lower.includes("external") && lower.includes("compliance")) {
    return "External compliance function";
  }
  if (lower.includes("compliance")) return "Internal compliance function";
  if (lower.includes("external")) return "External function";
  return "Internal business function";
}

function mapOrgStatus(status: unknown): string {
  const s = String(status ?? "Running");
  if (s === "Active" || s === "Running") return "Running";
  if (s === "Paused" || s === "Suspended") return "Paused";
  return "Running";
}

export function transformOrganisation(
  doc: Record<string, unknown>
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  const licences = (doc.licenses ?? doc.licences ?? {}) as Record<
    string,
    unknown
  >;

  return {
    _id: id,
    reference: String(doc.reference ?? `ORG-${id.slice(-6)}`),
    name: String(doc.name ?? "Unnamed organisation"),
    industry: String(doc.industry ?? "Not set"),
    sizeOfOrganisation: Number(doc.sizeOfOrg ?? doc.sizeOfOrganisation ?? 1) || 1,
    officeEmail: String(doc.officeEmail ?? "unknown@example.com"),
    campaignEmail: doc.campaignEmail ? String(doc.campaignEmail) : undefined,
    contactNumber: String(doc.contactNumber ?? ""),
    companyNumber: String(doc.companyNumber ?? ""),
    vatNumber: String(doc.vatNumber ?? ""),
    address: defaultAddress(doc),
    country: defaultCountry(doc),
    isCustomer: Boolean(doc.isCustomer),
    isPartner: Boolean(doc.isPartner),
    status: mapOrgStatus(doc.status),
    licences: {
      superUser: licences.superUser ?? { allocated: 1, used: 0 },
      users: licences.users ?? { allocated: 0, used: 0 },
      groups: licences.groups ?? { allocated: 0, used: 0 },
      complianceTools: licences.complianceTools ?? [],
      additionalModules: licences.additionalModules ?? [],
      carbocalc: Boolean(licences.carbocalc),
      imsforms: Boolean(licences.imsforms),
      projectims: Boolean(licences.projectims),
    },
    paymentSystem: doc.paymentSystem ?? {
      status: "Trial",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
    systemDate: doc.systemDate ?? { start: null, end: null, unset: true },
    documentReviewReminderOffsets: [],
    incidentResolutionTargets: { P1: null, P2: null, P3: null, P4: null },
    referralSource: doc.referralSource ?? null,
    logoSrc: (doc.logo as { src?: string })?.src ?? doc.logoSrc ?? null,
    logoStorage: null,
    emailBranding: { enabled: false, themeId: null, colors: null },
    auth0OrganizationId: null,
    createdBy,
    createdOn,
  };
}

export function transformUser(
  doc: Record<string, unknown>,
  ctx: MigrateContext
): { doc: Record<string, unknown>; remapped: boolean } | null {
  const id = asId(doc._id)!;
  const email = String(doc.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return null;

  const existing = ctx.emailToUserId.get(email);
  if (existing && existing !== id) {
    ctx.userIdRemap.set(id, existing);
    return { doc: { _id: id }, remapped: true };
  }
  ctx.emailToUserId.set(email, id);

  const accessPolicies = Array.isArray(doc.accessPolicies)
    ? doc.accessPolicies.map((p: Record<string, unknown>) => ({
        groupId: asId(p.group ?? p.groupId) ?? "",
        roleId: asId(p.role ?? p.roleId) ?? undefined,
      })).filter((p) => p.groupId)
    : [];

  const { createdBy, createdOn } = createdByOn(doc);

  return {
    remapped: false,
    doc: {
      _id: id,
      reference: String(doc.reference ?? `USR-${id.slice(-6)}`),
      type: String(doc.type ?? "Internal"),
      firstName: String(doc.firstName ?? "Unknown"),
      lastName: String(doc.lastName ?? "User"),
      name: String(doc.name ?? `${doc.firstName ?? ""} ${doc.lastName ?? ""}`.trim()),
      email,
      auth0SubjectId: null,
      emailVerified: {
        status: mapEmailVerifiedStatus(
          (doc.emailVerified as { status?: string })?.status
        ),
        on: (doc.emailVerified as { on?: Date })?.on ?? null,
      },
      passwordHash: String(doc.password ?? doc.passwordHash ?? "NEEDS_RESET"),
      phone: String(doc.phone ?? ""),
      phoneVerified: doc.phoneVerified ?? { status: "pending", on: null },
      systemPassword: doc.systemPassword ?? { status: "active" },
      systemAccess: doc.systemAccess ?? {
        status: "Active",
        period: "Full time",
        expires: null,
        updatedOn: null,
      },
      accessPolicies,
      profileImage: doc.profileImage ?? {
        url: "https://assets.imssystems.tech/images/system/avatar-placeholder.jpg",
      },
      signatureInfo: doc.signatureInfo ?? {},
      preferences: doc.preferences ?? { darkMode: false, activeTheme: "blue" },
      country: {
        name: (doc.country as { name?: string })?.name ?? "United Kingdom",
        code: (doc.country as { code?: string })?.code ?? "GB",
      },
      locations: doc.locations ?? doc.workLocations ?? [],
      loggedIn: doc.loggedIn ?? { status: null, on: null },
      createdBy,
      createdOn,
      badAttempts: Number(doc.badAttempts ?? 0),
      lockedUntil: doc.lockedUntil ?? null,
      deletedAt: null,
    },
  };
}

export function transformMembership(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> | null {
  const userId = resolveUserId(doc.invitedUserId ?? doc.userId, ctx.userIdRemap);
  if (!userId) return null;

  const weekly = (doc.workShift as { weeklyHours?: Array<{ startTime?: number; endTime?: number }>; timeZone?: string })
    ?.weeklyHours;
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ] as const;
  const workShift: Record<string, unknown> = {
    timezone:
      (doc.workShift as { timeZone?: string })?.timeZone ?? "UTC",
  };
  days.forEach((day, i) => {
    const slot = weekly?.[i];
    if (slot && slot.startTime != null && slot.startTime >= 0) {
      workShift[day] = {
        start: msToHhMm(slot.startTime),
        end: msToHhMm(slot.endTime),
      };
    } else {
      workShift[day] = null;
    }
  });

  return {
    _id: asId(doc._id)!,
    organizationId,
    userId,
    role: mapOrgRole(doc.role),
    jobTitle: String(doc.jobTitle ?? "Not set"),
    workLocationType:
      String(doc.workLocationType ?? "On-site") === "Remote"
        ? "Remote"
        : "On-site",
    salary: Number(doc.salary ?? 0),
    country: {
      name: (doc.country as { name?: string })?.name ?? "United Kingdom",
      code: (doc.country as { code?: string })?.code ?? "GB",
    },
    leaveDaysEntitled: Number(doc.leaveDaysEntitledTo ?? doc.leaveDaysEntitled ?? 0),
    toilBalance: Number(doc.toilBalance ?? 0),
    workShift,
    complianceToolkits: [],
    lineManagerIds: asIdList(doc.lineManagers ?? doc.lineManagerIds).map(
      (id) => ctx.userIdRemap.get(id) ?? id
    ),
    createdOn: (doc.createdAt as Date) ?? new Date(),
  };
}

export function transformUnitMemberships(
  membershipDoc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown>[] {
  const userId = resolveUserId(
    membershipDoc.invitedUserId ?? membershipDoc.userId,
    ctx.userIdRemap
  );
  if (!userId) return [];
  const groups = asIdList(membershipDoc.groups);
  return groups.map((functionalUnitId) => ({
    organizationId,
    userId,
    functionalUnitId,
  }));
}

export function transformFunctionalUnit(
  doc: Record<string, unknown>,
  organizationId: string
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const licences = (doc.licenses ?? doc.userLicences ?? {}) as Record<
    string,
    unknown
  >;
  return {
    _id: id,
    organizationId,
    reference: String(doc.reference ?? `FU-${id.slice(-6)}`),
    name: String(doc.name ?? "Unnamed unit"),
    accessType: mapAccessType(doc.type ?? doc.accessType),
    responsibility: String(doc.responsibility ?? doc.description ?? "Not set"),
    operatingLocation: doc.operatingLocation
      ? String(doc.operatingLocation)
      : undefined,
    standards: doc.standards ? String(doc.standards) : undefined,
    totalMembers: Number(doc.totalMembers ?? 0),
    policyId: asId(doc.policy ?? doc.policyId) ?? undefined,
    complianceToolkits: Array.isArray(doc.complianceToolkits)
      ? doc.complianceToolkits.map(String)
      : [],
    userLicences: {
      superUser: licences.superUser ?? { allocated: 0, used: 0 },
      hosUser: licences.hosUser ?? licences.headOfService ?? { allocated: 0, used: 0 },
      basicUser: licences.basicUser ?? licences.users ?? { allocated: 0, used: 0 },
      auditorUser: licences.auditorUser ?? licences.auditor ?? { allocated: 0, used: 0 },
    },
    isSystemDefault: Boolean(doc.isSystemDefault ?? doc.default),
    deletedAt: null,
  };
}

export function transformBusinessPremise(
  doc: Record<string, unknown>,
  organizationId: string
): Record<string, unknown> {
  const id = asId(doc._id)!;
  const { createdBy, createdOn } = createdByOn(doc);
  return {
    _id: id,
    organizationId,
    reference: String(doc.reference ?? ""),
    name: String(doc.name ?? "Premise"),
    location: String(doc.location ?? "Not set"),
    address: String(doc.address ?? "Not set"),
    functionalUnitIds: asIdList(doc.groups ?? doc.functionalUnitIds),
    createdBy,
    createdOn,
    updatedBy: asId((doc.updated as { by?: unknown })?.by) ?? null,
    updatedOn: (doc.updated as { on?: Date })?.on ?? null,
  };
}

export function transformInvitation(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> | null {
  const expiresAt = doc.expiresAt
    ? new Date(doc.expiresAt as string | Date)
    : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) return null;

  const rawToken = String(doc.token ?? doc.rawToken ?? "");
  if (!rawToken) return null;

  return {
    _id: asId(doc._id)!,
    organizationId,
    email: String(doc.email ?? "")
      .trim()
      .toLowerCase(),
    role: mapOrgRole(doc.role),
    createdBy:
      resolveUserId(doc.createdBy, ctx.userIdRemap) ??
      asId(doc.createdBy) ??
      "migration",
    inviterName: String(doc.inviterName ?? ""),
    organisationName: String(doc.organisationName ?? doc.organizationName ?? ""),
    tokenHash: hashInvitationToken(rawToken),
    expiresAt: expiresAt ?? new Date(Date.now() + 72 * 3600 * 1000),
  };
}

export function transformPartnership(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const statusRaw = String(doc.status ?? "Pending").toLowerCase();
  const status =
    statusRaw.includes("accept") || statusRaw === "approved"
      ? "iMS Accepted"
      : "Pending";
  return {
    _id: asId(doc._id)!,
    organizationId,
    userId:
      resolveUserId(doc.userId, ctx.userIdRemap) ??
      asId(doc.userId) ??
      "migration",
    serviceProvision: String(doc.serviceProvision ?? "Not set"),
    customerReach: Number(doc.customerReach ?? 0),
    website: String(doc.website ?? "https://example.com"),
    standards: String(doc.standards ?? "Not set"),
    description: String(doc.description ?? "Migrated partnership"),
    status,
    deletedAt: null,
  };
}

export function transformLicenceRequest(
  doc: Record<string, unknown>,
  organizationId: string,
  ctx: MigrateContext
): Record<string, unknown> {
  const { createdBy } = createdByOn(doc);
  const statusRaw = String(doc.status ?? "Pending").toLowerCase();
  const status =
    statusRaw === "granted" || statusRaw === "approved"
      ? "Granted"
      : statusRaw === "cancelled" || statusRaw === "canceled" || statusRaw === "rejected"
        ? "Cancelled"
        : "Pending";
  return {
    _id: asId(doc._id)!,
    organizationId,
    reference: String(doc.reference ?? `LR-${asId(doc._id)!.slice(-6)}`),
    requestedBy:
      resolveUserId(doc.requestedBy, ctx.userIdRemap) ?? createdBy,
    superUser: Number(
      (doc as { superUser?: number }).superUser ??
        (doc.seats as { superUser?: number })?.superUser ??
        0
    ),
    users: Number(
      (doc as { users?: number }).users ??
        (doc.seats as { users?: number })?.users ??
        0
    ),
    groups: Number(
      (doc as { groups?: number }).groups ??
        (doc.seats as { groups?: number })?.groups ??
        0
    ),
    complianceTools: Array.isArray(doc.complianceTools)
      ? doc.complianceTools.map(String)
      : [],
    additionalModules: Array.isArray(doc.additionalModules)
      ? doc.additionalModules.map(String)
      : Array.isArray(doc.modules)
        ? doc.modules.map(String)
        : [],
    message: String(doc.message ?? ""),
    status,
    grantedBy: resolveUserId(doc.grantedBy, ctx.userIdRemap),
    grantedOn: (doc.grantedOn as Date) ?? null,
  };
}
